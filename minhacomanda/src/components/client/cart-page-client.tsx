"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { WaiterCallModal } from "@/components/client/waiter-call-modal";
import { clearCart, readCart, saveCart } from "@/lib/cart-storage";
import { formatCurrency } from "@/lib/format";
import type { CartItem, MenuPayload } from "@/types/domain";

export function CartPageClient({ qrToken }: { qrToken: string }) {
  const router = useRouter();

  const [menu, setMenu] = useState<MenuPayload | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      const [menuResponse] = await Promise.all([
        fetch(`/api/public/menu?qrToken=${encodeURIComponent(qrToken)}`),
      ]);

      const menuPayload = (await menuResponse.json()) as {
        success: boolean;
        data?: MenuPayload;
        error?: string;
      };

      if (!mounted) {
        return;
      }

      if (!menuResponse.ok || !menuPayload.success || !menuPayload.data) {
        setError(menuPayload.error || "Não foi possível carregar o carrinho.");
        setLoading(false);
        return;
      }

      setMenu(menuPayload.data);
      setCart(readCart(qrToken));
      setLoading(false);
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [qrToken]);

  useEffect(() => {
    saveCart(qrToken, cart);
  }, [cart, qrToken]);

  const totals = useMemo(() => {
    return cart.reduce(
      (acc, item) => {
        acc.qty += item.qty;
        acc.total += item.qty * item.priceCents;
        return acc;
      },
      { qty: 0, total: 0 },
    );
  }, [cart]);

  function updateQty(productId: string, delta: number) {
    setCart((current) => {
      return current
        .map((item) => {
          if (item.productId !== productId) {
            return item;
          }

          return {
            ...item,
            qty: item.qty + delta,
          };
        })
        .filter((item) => item.qty > 0);
    });
  }

  function updateNote(productId: string, note: string) {
    setCart((current) =>
      current.map((item) =>
        item.productId === productId
          ? {
              ...item,
              note,
            }
          : item,
      ),
    );
  }

  async function submitOrder() {
    if (!cart.length) {
      setError("Seu carrinho está vazio.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/public/order/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        qrToken,
        customerName: customerName.trim() || undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          qty: item.qty,
          note: item.note?.trim() || undefined,
        })),
      }),
    });

    const payload = (await response.json()) as {
      success: boolean;
      data?: { orderId: string };
      error?: string;
    };

    setSubmitting(false);

    if (!response.ok || !payload.success || !payload.data) {
      setError(payload.error || "Não foi possível enviar o pedido.");
      return;
    }

    clearCart(qrToken);
    router.push(`/m/${qrToken}/order/${payload.data.orderId}`);
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-xl px-4 py-6">
        <p className="text-sm text-slate-600">Carregando carrinho...</p>
      </main>
    );
  }

  if (!menu || error) {
    return (
      <main className="mx-auto min-h-screen max-w-xl px-4 py-6">
        <button
          type="button"
          onClick={() => router.push(`/m/${qrToken}`)}
          className="mb-3 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
        >
          Voltar ao cardápio
        </button>
        {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-5">
      <header className="mb-4">
        <button
          type="button"
          onClick={() => router.push(`/m/${qrToken}`)}
          className="mb-3 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
        >
          Voltar ao cardápio
        </button>
        <p className="text-xs uppercase tracking-wide text-slate-500">{menu.restaurant.name}</p>
        <h1 className="text-2xl font-semibold text-slate-900">Carrinho da mesa {menu.table.number}</h1>
      </header>

      <div className="space-y-3">
        {cart.length === 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">Seu carrinho está vazio.</p>
          </section>
        )}

        {cart.map((item) => (
          <section key={item.productId} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-medium text-slate-900">{item.name}</h2>
                <p className="text-sm text-slate-600">{formatCurrency(item.priceCents)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="h-8 w-8 rounded-lg border border-slate-300 text-slate-700"
                  onClick={() => updateQty(item.productId, -1)}
                >
                  -
                </button>
                <span className="w-7 text-center text-sm font-medium">{item.qty}</span>
                <button
                  type="button"
                  className="h-8 w-8 rounded-lg border border-slate-300 text-slate-700"
                  onClick={() => updateQty(item.productId, 1)}
                >
                  +
                </button>
              </div>
            </div>

            <textarea
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              rows={2}
              placeholder="Observação do item (opcional)"
              value={item.note || ""}
              onChange={(event) => updateNote(item.productId, event.target.value)}
            />
          </section>
        ))}
      </div>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <label className="mb-1 block text-sm text-slate-700">Nome/apelido (opcional)</label>
        <input
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Ex: Jefferson"
        />
      </section>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <WaiterCallModal qrToken={qrToken} />
          <button
            type="button"
            onClick={submitOrder}
            disabled={submitting || cart.length === 0}
            className="flex-1 rounded-full bg-emerald-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting
              ? "Enviando pedido..."
              : `Confirmar pedido (${totals.qty}) - ${formatCurrency(totals.total)}`}
          </button>
        </div>
      </div>
    </main>
  );
}
