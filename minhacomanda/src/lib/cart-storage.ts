import type { CartItem } from "@/types/domain";

function getKey(qrToken: string) {
  return `minhacomanda:cart:${qrToken}`;
}

export function readCart(qrToken: string): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(getKey(qrToken));
  if (!raw) {
    return [];
  }

  try {
    const data = JSON.parse(raw) as CartItem[];
    return data.filter((item) => item.qty > 0);
  } catch {
    return [];
  }
}

export function saveCart(qrToken: string, items: CartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getKey(qrToken), JSON.stringify(items));
}

export function clearCart(qrToken: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getKey(qrToken));
}
