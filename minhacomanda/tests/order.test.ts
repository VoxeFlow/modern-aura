import { describe, expect, it } from "vitest";

import { calculateOrderTotal } from "@/lib/order";

describe("calculateOrderTotal", () => {
  it("soma corretamente os itens", () => {
    const total = calculateOrderTotal([
      { productId: "1", qty: 2, unitPriceCents: 1500 },
      { productId: "2", qty: 1, unitPriceCents: 900 },
      { productId: "3", qty: 3, unitPriceCents: 200 },
    ]);

    expect(total).toBe(4500);
  });

  it("retorna zero com lista vazia", () => {
    expect(calculateOrderTotal([])).toBe(0);
  });
});
