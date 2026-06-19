import { Router } from 'express';
import { prisma } from '../lib/prisma';
import {
  getPagBankCheckoutStatus,
  getPagBankConfig,
  mapPagBankStatus,
  validatePagBankWebhookSignature,
} from '../lib/pagbank';

const router = Router();

function getOrderPaymentMeta(order: { address: unknown }) {
  const address = order.address && typeof order.address === 'object' ? order.address as Record<string, unknown> : {};
  const payment = address.payment && typeof address.payment === 'object' ? address.payment as Record<string, unknown> : {};
  return { address, payment };
}

function getStringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
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
    const paymentMeta = {
      ...payment,
      status: externalStatus || getStringValue(payment.status),
      chargeId: externalId || getStringValue(payment.chargeId),
      lastWebhookAt: new Date().toISOString(),
      webhookScope: String(req.query.scope || 'payment'),
      lastWebhookEventId: externalId || getStringValue(payment.chargeId),
    };

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: mapPagBankStatus(externalStatus),
        address: {
          ...address,
          payment: paymentMeta,
        },
      },
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
    const checkoutId = typeof payment.checkoutId === 'string' ? payment.checkoutId : '';
    const config = await getPagBankConfig(prisma);

    if (!checkoutId || !config) {
      return res.json({
        order,
        payment: payment || null,
      });
    }

    const providerStatus = await getPagBankCheckoutStatus(config, checkoutId);
    const internalStatus = mapPagBankStatus(providerStatus.chargeStatus || providerStatus.status);

    const nextPaymentMeta = {
      ...payment,
      checkoutId: providerStatus.checkoutId,
      redirectUrl: providerStatus.redirectUrl || getStringValue(payment.redirectUrl),
      status: providerStatus.chargeStatus || providerStatus.status,
      chargeId: providerStatus.chargeId || getStringValue(payment.chargeId),
      syncedAt: new Date().toISOString(),
      paidAt: providerStatus.paidAt || getStringValue(payment.paidAt),
    };

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: internalStatus,
        address: {
          ...address,
          payment: nextPaymentMeta,
        },
      },
      include: { items: true },
    });

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
