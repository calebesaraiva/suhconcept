import { Router } from 'express';
import { prisma } from '../lib/prisma';
import {
  getPagBankCheckoutStatus,
  getPagBankConfig,
  getPagBankOrderStatus,
  mapPagBankStatus,
  validatePagBankWebhookSignature,
} from '../lib/pagbank';
import { appendOrderStatusHistoryIfChanged } from '../lib/orderStatus';
import { sendOrderStatusEmail } from '../lib/mailer';
import { getStoreSettingsMap } from '../lib/storeSettings';

const router = Router();

function getOrderPaymentMeta(order: { address: unknown }) {
  const address = order.address && typeof order.address === 'object' ? order.address as Record<string, unknown> : {};
  const payment = address.payment && typeof address.payment === 'object' ? address.payment as Record<string, unknown> : {};
  return { address, payment };
}

function getStringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

async function resolvePagBankPaymentSnapshot(
  config: NonNullable<Awaited<ReturnType<typeof getPagBankConfig>>>,
  payment: Record<string, unknown>,
) {
  const storedChargeId = getStringValue(payment.chargeId);
  const providerOrderId = getStringValue(payment.providerOrderId) || (storedChargeId.startsWith('ORDE_') ? storedChargeId : '');
  const checkoutId = getStringValue(payment.checkoutId);

  if (providerOrderId) {
    const providerOrder = await getPagBankOrderStatus(config, providerOrderId);
    return {
      providerOrderId: providerOrder.providerOrderId,
      checkoutId,
      redirectUrl: getStringValue(payment.redirectUrl),
      status: providerOrder.chargeStatus || providerOrder.status,
      chargeId: providerOrder.chargeId || getStringValue(payment.chargeId),
      paidAt: providerOrder.paidAt || getStringValue(payment.paidAt),
      source: 'order' as const,
    };
  }

  if (!checkoutId) {
    return {
      providerOrderId: '',
      checkoutId: '',
      redirectUrl: getStringValue(payment.redirectUrl),
      status: getStringValue(payment.status),
      chargeId: getStringValue(payment.chargeId),
      paidAt: getStringValue(payment.paidAt),
      source: 'stored' as const,
    };
  }

  const providerCheckout = await getPagBankCheckoutStatus(config, checkoutId);
  if (providerCheckout.providerOrderId) {
    const providerOrder = await getPagBankOrderStatus(config, providerCheckout.providerOrderId);
    return {
      providerOrderId: providerOrder.providerOrderId,
      checkoutId: providerCheckout.checkoutId,
      redirectUrl: providerCheckout.redirectUrl || getStringValue(payment.redirectUrl),
      status: providerOrder.chargeStatus || providerOrder.status,
      chargeId: providerOrder.chargeId || providerCheckout.chargeId || getStringValue(payment.chargeId),
      paidAt: providerOrder.paidAt || providerCheckout.paidAt || getStringValue(payment.paidAt),
      source: 'checkout+order' as const,
    };
  }

  return {
    providerOrderId: '',
    checkoutId: providerCheckout.checkoutId,
    redirectUrl: providerCheckout.redirectUrl || getStringValue(payment.redirectUrl),
    status: providerCheckout.chargeStatus || providerCheckout.status,
    chargeId: providerCheckout.chargeId || getStringValue(payment.chargeId),
    paidAt: providerCheckout.paidAt || getStringValue(payment.paidAt),
    source: 'checkout' as const,
  };
}

router.post('/pagbank/webhook', async (req, res) => {
  try {
    const orderId = String(req.query.orderId || '');
    if (!orderId) return res.status(400).json({ error: 'orderId obrigatório' });

    const config = await getPagBankConfig(prisma);
    if (!config) return res.status(200).json({ ok: true });

    const signature = req.headers['x-authenticity-token'];
    const rawBody = (req as typeof req & { rawBody?: string }).rawBody || '';
    const signatureValue = Array.isArray(signature) ? signature[0] : signature;
    if (!validatePagBankWebhookSignature(rawBody, signatureValue, config.token)) {
      return res.status(401).json({ error: 'Assinatura inválida' });
    }

    const payload = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const externalStatus = String(payload.status || '');
    const externalId = String(payload.id || '');

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

    const { address, payment } = getOrderPaymentMeta(order);
    const providerOrderId =
      externalId.startsWith('ORDE_')
        ? externalId
        : getStringValue(payment.providerOrderId) || (getStringValue(payment.chargeId).startsWith('ORDE_') ? getStringValue(payment.chargeId) : '');
    const providerStatus = providerOrderId
      ? await getPagBankOrderStatus(config, providerOrderId)
      : null;
    const resolvedStatus = providerStatus?.chargeStatus || providerStatus?.status || externalStatus || getStringValue(payment.status);
    const paymentMeta = {
      ...payment,
      providerOrderId,
      status: resolvedStatus,
      chargeId: providerStatus?.chargeId || (externalId.startsWith('CHAR_') ? externalId : getStringValue(payment.chargeId)),
      paidAt: providerStatus?.paidAt || getStringValue(payment.paidAt),
      lastWebhookAt: new Date().toISOString(),
      webhookScope: String(req.query.scope || 'payment'),
      lastWebhookEventId: externalId || getStringValue(payment.chargeId),
    };

    const nextStatus = mapPagBankStatus(resolvedStatus);
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
          address: {
            ...address,
            payment: paymentMeta,
          },
        },
      });

      await appendOrderStatusHistoryIfChanged(tx, {
        orderId,
        previousStatus: order.status,
        nextStatus,
        deliveryMethod: order.deliveryMethod,
        source: 'pagbank-webhook',
      });
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error('Erro no webhook PagBank:', error);
    return res.status(500).json({ error: 'Erro ao processar webhook' });
  }
});

router.get('/pagbank/orders/:orderId/status', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

    const { address, payment } = getOrderPaymentMeta(order);
    const config = await getPagBankConfig(prisma);

    if (!config) {
      return res.json({
        order,
        payment: payment || null,
      });
    }

    const providerStatus = await resolvePagBankPaymentSnapshot(config, payment);
    const internalStatus = mapPagBankStatus(providerStatus.status);

    const nextPaymentMeta = {
      ...payment,
      providerOrderId: providerStatus.providerOrderId || getStringValue(payment.providerOrderId),
      checkoutId: providerStatus.checkoutId || getStringValue(payment.checkoutId),
      redirectUrl: providerStatus.redirectUrl || getStringValue(payment.redirectUrl),
      status: providerStatus.status,
      chargeId: providerStatus.chargeId || getStringValue(payment.chargeId),
      syncedAt: new Date().toISOString(),
      paidAt: providerStatus.paidAt || getStringValue(payment.paidAt),
    };

    const previousStatus = order.status;
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const nextOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: internalStatus,
          address: {
            ...address,
            payment: nextPaymentMeta,
          },
        },
        include: {
          items: true,
          history: { orderBy: { createdAt: 'asc' } },
        },
      });

      await appendOrderStatusHistoryIfChanged(tx, {
        orderId: order.id,
        previousStatus,
        nextStatus: internalStatus,
        deliveryMethod: order.deliveryMethod,
        source: 'pagbank-status-check',
      });

      return nextOrder;
    });

    if (previousStatus !== internalStatus && ['pago', 'cancelado'].includes(internalStatus)) {
      try {
        const settings = await getStoreSettingsMap(prisma);
        await sendOrderStatusEmail(prisma, {
          orderId: updatedOrder.id,
          customerName: updatedOrder.customerName,
          customerEmail: updatedOrder.customerEmail,
          total: updatedOrder.total,
          status: internalStatus,
          deliveryMethod: updatedOrder.deliveryMethod,
          items: updatedOrder.items.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
          })),
          address,
          storeName: settings.smtpFromName || settings.storeName || 'Loja',
        });
      } catch (error) {
        console.error('Erro ao enviar e-mail após confirmação PagBank:', error);
      }
    }

    return res.json({
      order: updatedOrder,
      payment: nextPaymentMeta,
    });
  } catch (error) {
    console.error('Erro ao consultar status PagBank:', error);
    return res.status(500).json({ error: 'Erro ao consultar pagamento' });
  }
});

export default router;
