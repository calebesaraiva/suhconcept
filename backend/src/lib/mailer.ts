import nodemailer from 'nodemailer';
import type { PrismaClient } from '../generated/prisma';
import { getStoreSettingsMap, parseBool } from './storeSettings';

type MailerConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
};

type DeliveryNotificationPayload = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  items: Array<{ productName: string; quantity: number; size?: string; color?: string }>;
  address?: Record<string, unknown> | null;
  storeName?: string;
};

type OrderStatusMailPayload = DeliveryNotificationPayload & {
  status: string;
  deliveryMethod?: string | null;
};

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getAddressLines(address?: Record<string, unknown> | null) {
  if (!address) return [];

  const street = String(address.street || '');
  const number = String(address.number || '');
  const neighborhood = String(address.neighborhood || '');
  const city = String(address.city || '');
  const state = String(address.state || '');
  const cep = String(address.zipCode || address.cep || '');
  const complement = String(address.complement || '');

  const line1 = [street, number].filter(Boolean).join(', ');
  const line2 = [neighborhood, city, state].filter(Boolean).join(' - ');
  const line3 = [cep ? `CEP ${cep}` : '', complement].filter(Boolean).join(' · ');

  return [line1, line2, line3].filter(Boolean);
}

async function getMailerConfig(prisma: PrismaClient): Promise<MailerConfig | null> {
  const settings = await getStoreSettingsMap(prisma);

  const host = settings.smtpHost || process.env.SMTP_HOST || '';
  const port = Number(settings.smtpPort || process.env.SMTP_PORT || 587);
  const secure = parseBool(settings.smtpSecure, String(process.env.SMTP_SECURE || 'false') === 'true');
  const user = settings.smtpUser || process.env.SMTP_USER || '';
  const pass = settings.smtpPass || process.env.SMTP_PASS || '';
  const fromEmail = settings.smtpFromEmail || process.env.SMTP_FROM_EMAIL || user;
  const fromName = settings.smtpFromName || process.env.SMTP_FROM_NAME || settings.storeName || 'Loja';

  if (!host || !port || !user || !pass || !fromEmail) return null;

  return { host, port, secure, user, pass, fromEmail, fromName };
}

export async function sendOrderOutForDeliveryEmail(
  prisma: PrismaClient,
  payload: DeliveryNotificationPayload,
): Promise<{ sent: boolean; reason?: string }> {
  return sendOrderStatusEmail(prisma, {
    ...payload,
    status: 'saiu_para_entrega',
  });
}

function getStatusMailMeta(status: string, deliveryMethod?: string | null) {
  const pickup = String(deliveryMethod || '').toLowerCase() === 'pickup';

  const map: Record<string, { title: string; intro: string; nextStep: string }> = {
    pago: {
      title: 'Pagamento confirmado',
      intro: 'Seu pagamento foi confirmado e o pedido já entrou na fila de separação da loja.',
      nextStep: 'Agora nossa equipe vai separar os itens e te avisar quando o pedido estiver pronto para envio ou retirada.',
    },
    em_preparo: {
      title: 'Pedido em preparação',
      intro: 'Nossa equipe já começou a separar e preparar os itens do seu pedido.',
      nextStep: 'Assim que tudo estiver pronto, você receberá a próxima atualização automaticamente.',
    },
    enviado: {
      title: pickup ? 'Pedido pronto para retirada' : 'Pedido pronto para envio',
      intro: pickup
        ? 'Seu pedido já está separado e pronto para retirada na loja.'
        : 'Seu pedido já está separado e pronto para seguir para entrega.',
      nextStep: pickup
        ? 'Você já pode combinar sua retirada com a equipe da loja.'
        : 'Em breve ele seguirá para entrega e você será avisado.',
    },
    saiu_para_entrega: {
      title: 'Seu pedido saiu para entrega',
      intro: 'Seu pedido já está em rota e em breve chegará até você.',
      nextStep: 'Fique atento ao seu telefone e e-mail. Se precisar de suporte, responda esta mensagem e nossa equipe te ajuda rapidamente.',
    },
    entregue: {
      title: pickup ? 'Pedido retirado com sucesso' : 'Pedido entregue com sucesso',
      intro: pickup
        ? 'Registramos a retirada do seu pedido com sucesso.'
        : 'Registramos a entrega do seu pedido com sucesso.',
      nextStep: 'Obrigado por comprar com a SUH CONCEPT. Sempre que quiser, estaremos por aqui.',
    },
    cancelado: {
      title: 'Pedido cancelado',
      intro: 'Seu pedido foi cancelado e não seguirá para as próximas etapas.',
      nextStep: 'Se precisar de ajuda para refazer a compra ou tirar dúvidas, fale com a equipe da loja.',
    },
  };

  return map[status] || {
    title: 'Atualização do pedido',
    intro: 'Seu pedido recebeu uma nova atualização no sistema da loja.',
    nextStep: 'Se precisar de ajuda, fale com a equipe da loja.',
  };
}

export async function sendOrderStatusEmail(
  prisma: PrismaClient,
  payload: OrderStatusMailPayload,
): Promise<{ sent: boolean; reason?: string }> {
  const config = await getMailerConfig(prisma);
  if (!config) {
    return { sent: false, reason: 'SMTP não configurado no painel' };
  }

  const statusMeta = getStatusMailMeta(payload.status, payload.deliveryMethod);

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const orderLabel = `#${payload.orderId.slice(-8).toUpperCase()}`;
  const addressLines = getAddressLines(payload.address);
  const itemsHtml = payload.items
    .map((item) => {
      const meta = [item.size ? `Tam. ${item.size}` : '', item.color ? item.color : '']
        .filter(Boolean)
        .join(' · ');
      return `
        <tr>
          <td style="padding:10px 0;color:#f5f5f5;font-size:14px;font-weight:600;">${item.productName}</td>
          <td style="padding:10px 0;color:#bdbdc7;font-size:14px;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 0;color:#8d8d99;font-size:12px;text-align:right;">${meta || '-'}</td>
        </tr>
      `;
    })
    .join('');

  const html = `
    <div style="margin:0;padding:0;background:#0a0a0f;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
      <div style="max-width:680px;margin:0 auto;padding:32px 20px;">
        <div style="background:linear-gradient(135deg,#171722,#0f0f16);border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden;">
          <div style="padding:28px 28px 20px;background:linear-gradient(135deg,#8b5cf6 0%,#ec4899 100%);">
            <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;opacity:.92;">${payload.storeName || 'Loja'}</div>
            <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.15;">${statusMeta.title}</h1>
            <p style="margin:0;font-size:15px;line-height:1.7;opacity:.95;">${payload.customerName}, ${statusMeta.intro} Pedido ${orderLabel}.</p>
          </div>

          <div style="padding:28px;">
            <div style="background:#111117;border:1px solid rgba(255,255,255,0.06);border-radius:18px;padding:20px 22px;margin-bottom:18px;">
              <div style="font-size:12px;color:#a1a1aa;letter-spacing:.12em;text-transform:uppercase;font-weight:700;margin-bottom:10px;">Resumo do pedido</div>
              <table style="width:100%;border-collapse:collapse;">
                <thead>
                  <tr>
                    <th style="text-align:left;padding-bottom:10px;color:#8d8d99;font-size:11px;text-transform:uppercase;letter-spacing:.1em;">Item</th>
                    <th style="text-align:center;padding-bottom:10px;color:#8d8d99;font-size:11px;text-transform:uppercase;letter-spacing:.1em;">Qtd</th>
                    <th style="text-align:right;padding-bottom:10px;color:#8d8d99;font-size:11px;text-transform:uppercase;letter-spacing:.1em;">Detalhes</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>
              <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;gap:12px;">
                <span style="color:#bdbdc7;font-size:14px;">Total pago</span>
                <strong style="color:#ffffff;font-size:20px;">${formatCurrency(payload.total)}</strong>
              </div>
            </div>

            <div style="background:#111117;border:1px solid rgba(255,255,255,0.06);border-radius:18px;padding:20px 22px;margin-bottom:18px;">
              <div style="font-size:12px;color:#a1a1aa;letter-spacing:.12em;text-transform:uppercase;font-weight:700;margin-bottom:10px;">Endereço de entrega</div>
              ${addressLines.length
                ? addressLines.map((line) => `<p style="margin:0 0 8px;color:#f5f5f5;font-size:14px;line-height:1.6;">${line}</p>`).join('')
                : '<p style="margin:0;color:#f5f5f5;font-size:14px;line-height:1.6;">Seu pedido está em rota para o endereço informado no checkout.</p>'}
            </div>

            <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.22);border-radius:18px;padding:18px 22px;">
              <div style="font-size:12px;color:#c4b5fd;letter-spacing:.12em;text-transform:uppercase;font-weight:700;margin-bottom:8px;">Próximo passo</div>
              <p style="margin:0;color:#ede9fe;font-size:14px;line-height:1.7;">${statusMeta.nextStep}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const text = [
    `${payload.storeName || 'Loja'} - ${statusMeta.title}`,
    '',
    `${payload.customerName}, ${statusMeta.intro} Pedido ${orderLabel}.`,
    `Total pago: ${formatCurrency(payload.total)}`,
    '',
    'Itens:',
    ...payload.items.map((item) => `- ${item.productName} x${item.quantity}`),
    '',
    ...(addressLines.length ? ['Endereço de entrega:', ...addressLines, ''] : []),
    statusMeta.nextStep,
  ].join('\n');

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: payload.customerEmail,
    subject: `${payload.storeName || 'Loja'} • ${statusMeta.title} ${orderLabel}`,
    html,
    text,
  });

  return { sent: true };
}
