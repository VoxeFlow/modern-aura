import { z } from "zod";

export const qrTokenSchema = z
  .string()
  .min(3)
  .max(120)
  .regex(/^[a-zA-Z0-9-_]+$/, "qrToken inválido");

export const uuidSchema = z.uuid();

export const createOrderItemSchema = z.object({
  productId: uuidSchema,
  qty: z.coerce.number().int().positive().max(99),
  note: z.string().trim().max(280).optional(),
});

export const createOrderSchema = z.object({
  qrToken: qrTokenSchema,
  customerName: z.string().trim().max(80).optional(),
  items: z.array(createOrderItemSchema).min(1).max(40),
});

export const waiterCallSchema = z.object({
  qrToken: qrTokenSchema,
  type: z.enum(["waiter", "bill", "other"]),
  message: z.string().trim().max(280).optional(),
});

export const getOrderSchema = z.object({
  qrToken: qrTokenSchema,
  orderId: uuidSchema,
});

export const pixCreateChargeSchema = z.object({
  qrToken: qrTokenSchema,
  orderId: uuidSchema,
});

export const updateOrderStatusSchema = z.object({
  orderId: uuidSchema,
  toStatus: z.enum([
    "awaiting",
    "confirmed",
    "preparing",
    "delivered",
    "closed",
    "canceled",
  ]),
  source: z.enum(["telegram", "admin", "system"]),
});

export const telegramCallbackSchema = z.object({
  orderId: uuidSchema,
  toStatus: z.enum(["confirmed", "preparing", "delivered", "canceled"]),
});
