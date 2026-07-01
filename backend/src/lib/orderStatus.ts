import type { Prisma, PrismaClient } from '../generated/prisma';

type DbClient = PrismaClient | Prisma.TransactionClient;

type StatusKey =
  | 'pendente'
  | 'aguardando_pagamento'
  | 'pago'
  | 'em_preparo'
  | 'enviado'
  | 'saiu_para_entrega'
  | 'entregue'
  | 'cancelado';

function isPickup(deliveryMethod?: string | null) {
  return String(deliveryMethod || '').toLowerCase() === 'pickup';
}

export function getOrderStatusMeta(status: string, deliveryMethod?: string | null) {
  const pickup = isPickup(deliveryMethod);
  const map: Record<StatusKey, { label: string; description: string }> = {
    pendente: {
      label: 'Pendente',
      description: 'Recebemos o pedido e ele está aguardando validação inicial da loja.',
    },
    aguardando_pagamento: {
      label: 'Aguardando pagamento',
      description: 'O pedido foi criado e está aguardando a confirmação do pagamento.',
    },
    pago: {
      label: 'Pago',
      description: 'Pagamento confirmado. O pedido entrou na fila de separação.',
    },
    em_preparo: {
      label: 'Em preparação',
      description: 'A equipe já iniciou a separação e preparação do pedido.',
    },
    enviado: {
      label: pickup ? 'Aguardando retirada' : 'Pronto para envio',
      description: pickup
        ? 'O pedido já está separado e pronto para retirada na loja.'
        : 'O pedido foi separado e está pronto para sair para entrega.',
    },
    saiu_para_entrega: {
      label: 'Saiu para entrega',
      description: 'O pedido já saiu com a equipe e está em rota para o cliente.',
    },
    entregue: {
      label: pickup ? 'Retirado' : 'Entregue',
      description: pickup
        ? 'O cliente retirou o pedido com sucesso na loja.'
        : 'O pedido foi entregue com sucesso ao cliente.',
    },
    cancelado: {
      label: 'Cancelado',
      description: 'O pedido foi cancelado e não seguirá no fluxo de atendimento.',
    },
  };

  return map[(status as StatusKey) || 'pendente'] || map.pendente;
}

export async function createOrderStatusHistory(
  prisma: DbClient,
  input: {
    orderId: string;
    status: string;
    deliveryMethod?: string | null;
    actorName?: string | null;
    actorRole?: string | null;
    source?: string | null;
  },
) {
  const meta = getOrderStatusMeta(input.status, input.deliveryMethod);
  return prisma.orderStatusHistory.create({
    data: {
      orderId: input.orderId,
      status: input.status,
      label: meta.label,
      description: meta.description,
      actorName: input.actorName || null,
      actorRole: input.actorRole || null,
      source: input.source || 'system',
    },
  });
}

export async function appendOrderStatusHistoryIfChanged(
  prisma: DbClient,
  input: {
    orderId: string;
    previousStatus?: string | null;
    nextStatus: string;
    deliveryMethod?: string | null;
    actorName?: string | null;
    actorRole?: string | null;
    source?: string | null;
  },
) {
  if (input.previousStatus === input.nextStatus) {
    return null;
  }

  return createOrderStatusHistory(prisma, {
    orderId: input.orderId,
    status: input.nextStatus,
    deliveryMethod: input.deliveryMethod,
    actorName: input.actorName,
    actorRole: input.actorRole,
    source: input.source,
  });
}
