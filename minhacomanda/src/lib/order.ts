export type OrderCalculationItem = {
  productId: string;
  qty: number;
  unitPriceCents: number;
};

export function calculateOrderTotal(items: OrderCalculationItem[]) {
  return items.reduce((acc, item) => {
    return acc + item.qty * item.unitPriceCents;
  }, 0);
}
