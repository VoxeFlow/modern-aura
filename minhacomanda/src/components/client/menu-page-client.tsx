"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { WaiterCallModal } from "@/components/client/waiter-call-modal";
import { readCart, saveCart } from "@/lib/cart-storage";
import { formatCurrency } from "@/lib/format";
import type { CartItem, MenuPayload, Product } from "@/types/domain";

function applySearch(products: Product[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return products;
  }

  return products.filter((product) => {
    return (
      product.name.toLowerCase().includes(normalized) ||
      product.description.toLowerCase().includes(normalized)
    );
  });
}

export function MenuPageClient({ qrToken }: { qrToken: string }) {
  const router = useRouter();

  const [menu, setMenu] = useState<MenuPayload | null>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMenu = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/public/menu?qrToken=${encodeURIComponent(qrToken)}`);
    const payload = (await response.json()) as {
      success: boolean;
      data?: MenuPayload;
      error?: string;
    };

    if (!response.ok || !payload.success || !payload.data) {
      setLoading(false);
      setError(payload.error || "Falha ao carregar cardápio");
      return;
    }

    setMenu(payload.data);
    setLoading(false);
  }, [qrToken]);

  useEffect(() => {
    loadMenu();
    setCart(readCart(qrToken));
  }, [loadMenu, qrToken]);

  useEffect(() => {
    saveCart(qrToken, cart);
  }, [cart, qrToken]);

  const filteredProducts = useMemo(() => {
    if (!menu) return [];
    return applySearch(menu.products, search);
  }, [menu, search]);

  const productsByCategory = useMemo(() => {
    if (!menu) return [];

    return menu.categories
      .map((category) => ({
        category,
        products: filteredProducts.filter((product) => product.category_id === category.id),
      }))
      .filter((item) => item.products.length > 0);
  }, [filteredProducts, menu]);

  const cartSummary = useMemo(() => {
    return cart.reduce(
      (acc, item) => {
        acc.qty += item.qty;
        acc.total += item.qty * item.priceCents;
        return acc;
      },
      { qty: 0, total: 0 },
    );
  }, [cart]);

  function addToCart(product: Product) {
    setCart((current) => {
      const index = current.findIndex((item) => item.productId === product.id);

      if (index === -1) {
        return [
          ...current,
          {
            productId: product.id,
            name: product.name,
            priceCents: product.price_cents,
            qty: 1,
          },
        ];
      }

      const next = [...current];
      next[index] = {
        ...next[index],
        qty: next[index].qty + 1,
      };
      return next;
    });
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-xl px-4 py-6">
        <p className="text-sm text-slate-600">Carregando cardápio...</p>
      </main>
    );
  }

  if (!menu || error) {
    return (
      <main className="mx-auto min-h-screen max-w-xl px-4 py-6">
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error || "Não foi possível carregar esta mesa."}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-5">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">{menu.restaurant.name}</p>
        <h1 className="text-2xl font-semibold text-slate-900">Mesa {menu.table.number}</h1>
        <p className="mt-1 text-sm text-slate-600">Peça pelo celular e agilize o atendimento da equipe.</p>
      </header>

      <div className="sticky top-0 z-20 mb-4 rounded-xl border border-slate-200 bg-white/95 p-3 backdrop-blur">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar no cardápio"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-6">
        {productsByCategory.length === 0 && (
          <p className="text-sm text-slate-500">Nenhum item encontrado para a busca.</p>
        )}

        {productsByCategory.map(({ category, products }) => (
          <section key={category.id}>
            <h2 className="mb-2 text-lg font-semibold text-slate-900">{category.name}</h2>
            <div className="space-y-2">
              {products.map((product) => (
                <article key={product.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-medium text-slate-900">{product.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">{product.description}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {formatCurrency(product.price_cents)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
                    >
                      Adicionar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <WaiterCallModal qrToken={qrToken} />
          <button
            type="button"
            onClick={() => router.push(`/m/${qrToken}/cart`)}
            className="flex-1 rounded-full bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow hover:bg-emerald-500"
          >
            Carrinho {cartSummary.qty > 0 ? `(${cartSummary.qty})` : ""} - {formatCurrency(cartSummary.total)}
          </button>
        </div>
      </div>
    </main>
  );
}
