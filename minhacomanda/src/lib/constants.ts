import type { OrderStatus, PaymentStatus, WaiterCallStatus, WaiterCallType } from "@/types/domain";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting: "Aguardando",
  confirmed: "Confirmado",
  preparing: "Em preparo",
  delivered: "Entregue",
  closed: "Fechado",
  canceled: "Cancelado",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Não pago",
  pending: "Pagamento pendente",
  paid: "Pago",
};

export const WAITER_CALL_TYPE_LABELS: Record<WaiterCallType, string> = {
  waiter: "Atendimento",
  bill: "Pedir conta",
  other: "Outro",
};

export const WAITER_CALL_STATUS_LABELS: Record<WaiterCallStatus, string> = {
  open: "Aberto",
  acknowledged: "Em atendimento",
  closed: "Fechado",
};

export const ORDER_STATUS_SEQUENCE: OrderStatus[] = [
  "awaiting",
  "confirmed",
  "preparing",
  "delivered",
  "closed",
];
