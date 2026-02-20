import { describe, expect, it } from "vitest";

import { createOrderSchema, pixCreateChargeSchema, waiterCallSchema } from "@/lib/validation";

describe("validation schemas", () => {
  it("valida payload de criação de pedido", () => {
    const parsed = createOrderSchema.safeParse({
      qrToken: "mesa_123",
      customerName: "Ana",
      items: [
        {
          productId: "11111111-1111-4111-8111-111111111111",
          qty: 2,
          note: "Sem cebola",
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejeita pedido com quantidade inválida", () => {
    const parsed = createOrderSchema.safeParse({
      qrToken: "mesa_123",
      items: [
        {
          productId: "11111111-1111-4111-8111-111111111111",
          qty: 0,
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it("valida chamado de garçom", () => {
    const parsed = waiterCallSchema.safeParse({
      qrToken: "mesa_abc",
      type: "bill",
      message: "Pode trazer a conta?",
    });

    expect(parsed.success).toBe(true);
  });

  it("valida payload de pix", () => {
    const parsed = pixCreateChargeSchema.safeParse({
      qrToken: "mesa_abc",
      orderId: "22222222-2222-4222-8222-222222222222",
    });

    expect(parsed.success).toBe(true);
  });
});
