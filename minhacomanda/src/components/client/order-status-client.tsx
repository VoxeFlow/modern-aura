"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { WaiterCallModal } from "@/components/client/waiter-call-modal";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/format";

type OrderPayload = {
  table: {
    number: number;
  };
  order: {
    id: string;
    status: keyof typeof ORDER_STATUS_LABELS;
    payment_status: keyof typeof PAYMENT_STATUS_LABELS;
    total_cents: number;
    customer_name: string | null;
    created_at: string;
  };
  items: Array<{
    id: string;
    qty: number;
    note: string | null;
    price_cents: number;
    products: { name: string } | null;
  }>;
  events: Array<{
    id: string;
    to_status: string;
    source: string;
    created_at: string;
  }>;
};

type PixState = {
  loading: boolean;
  error: string | null;
  qrCodeBase64?: string;
  copiaECola?: string;
  instructions?: string;
};

export function OrderStatusClient({
  qrToken,
  orderId,
}: {
  qrToken: string;
  orderId: string;
}) {
  const [data, setData] = useState<OrderPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pixState, setPixState] = useState<PixState>({ loading: false, error: null });

  const loadOrder = useCallback(async () => {
    const response = await fetch(
      `/api/public/order/get?qrToken=${encodeURIComponent(qrToken)}&orderId=${encodeURIComponent(orderId)}`,
    );

    const payload = (await response.json()) as {
      success: boolean;
      data?: OrderPayload;
      error?: string;
    };

    if (!response.ok || !payload.success || !payload.data) {
      setError(payload.error || "Não foi possível carregar o pedido.");
      setLoading(false);
      return;
    }

    setData(payload.data);
    setLoading(false);
  }, [orderId, qrToken]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    loadOrder();

    interval = setInterval(() => {
      loadOrder();
    }, 4000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [loadOrder, qrToken, orderId]);

  const statusLabel = useMemo(() => {
    if (!data) return "";
    return ORDER_STATUS_LABELS[data.order.status];
  }, [data]);

  async function handlePixPayment() {
    setPixState({ loading: true, error: null });

    const response = await fetch("/api/pix/create-charge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ qrToken, orderId }),
    });

    const payload = (await response.json()) as {
      success: boolean;
      data?: {
        alreadyPaid?: boolean;
        pix?: {
          qrCodeBase64?: string;
          copiaECola: string;
          instructions: string;
        };
      };
      error?: string;
    };

    if (!response.ok || !payload.success || !payload.data) {
      setPixState({
        loading: false,
        error: payload.error || "Não foi possível gerar cobrança Pix.",
      });
      return;
    }

    if (payload.data.alreadyPaid) {
      setPixState({
        loading: false,
        error: "Pedido já está pago.",
      });
      return;
    }

    setPixState({
      loading: false,
      error: null,
      qrCodeBase64: payload.data.pix?.qrCodeBase64,
      copiaECola: payload.data.pix?.copiaECola,
      instructions: payload.data.pix?.instructions,
    });
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-xl px-4 py-6">
        <p className="text-sm text-slate-600">Carregando pedido...</p>
      </main>
    );
  }

  if (!data || error) {
    return (
      <main className="mx-auto min-h-screen max-w-xl px-4 py-6">
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error || "Pedido não encontrado"}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-5">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Mesa {data.table.number}</p>
        <h1 className="text-2xl font-semibold text-slate-900">Pedido #{data.order.id.slice(0, 8)}</h1>
        <p className="mt-1 text-sm text-slate-600">{formatDateTime(data.order.created_at)}</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">Status</p>
        <p className="mt-1 text-xl font-semibold text-slate-900">{statusLabel}</p>
        <p className="mt-1 text-sm text-slate-600">
          Pagamento: {PAYMENT_STATUS_LABELS[data.order.payment_status]}
        </p>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-900">Itens</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {data.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3">
              <div>
                {item.qty}x {item.products?.name || "Produto"}
                {item.note ? ` (${item.note})` : ""}
              </div>
              <div>{formatCurrency(item.qty * item.price_cents)}</div>
            </li>
          ))}
        </ul>

        <p className="mt-4 border-t border-slate-100 pt-3 text-right text-base font-semibold text-slate-900">
          Total: {formatCurrency(data.order.total_cents)}
        </p>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Pagamento Pix</h2>
          <button
            type="button"
            onClick={handlePixPayment}
            disabled={pixState.loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pixState.loading ? "Gerando Pix..." : "Pagar com Pix"}
          </button>
        </div>

        {pixState.error && <p className="mt-2 text-sm text-slate-600">{pixState.error}</p>}

        {pixState.copiaECola && (
          <div className="mt-3 space-y-2">
            {pixState.qrCodeBase64 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${pixState.qrCodeBase64}`}
                alt="QR Code Pix"
                className="mx-auto h-48 w-48 rounded-lg border border-slate-200"
              />
            )}

            <label className="block text-xs text-slate-500">Pix copia e cola</label>
            <textarea
              readOnly
              value={pixState.copiaECola}
              className="h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
            <button
              type="button"
              onClick={() => {
                if (pixState.copiaECola) {
                  navigator.clipboard.writeText(pixState.copiaECola);
                }
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
            >
              Copiar código
            </button>
            {pixState.instructions && <p className="text-xs text-slate-600">{pixState.instructions}</p>}
          </div>
        )}
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-900">Atualizações</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {data.events.length === 0 && <li className="text-slate-500">Aguardando atualizações...</li>}
          {data.events.map((event) => (
            <li key={event.id} className="text-slate-700">
              {event.to_status} via {event.source} em {formatDateTime(event.created_at)}
            </li>
          ))}
        </ul>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl justify-end">
          <WaiterCallModal qrToken={qrToken} />
        </div>
      </div>
    </main>
  );
}
