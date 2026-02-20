"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAdminContext } from "@/components/admin/admin-provider";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { OrderStatus } from "@/types/domain";

type OrderRow = {
  id: string;
  status: OrderStatus;
  payment_status: "unpaid" | "pending" | "paid";
  total_cents: number;
  customer_name: string | null;
  created_at: string;
  updated_at: string;
  table_id: string;
  tables: { number: number } | null;
  order_items: Array<{
    id: string;
    qty: number;
    note: string | null;
    price_cents: number;
    products: { name: string } | null;
  }>;
};

const statusOptions: Array<{ value: "all" | OrderStatus; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "awaiting", label: ORDER_STATUS_LABELS.awaiting },
  { value: "confirmed", label: ORDER_STATUS_LABELS.confirmed },
  { value: "preparing", label: ORDER_STATUS_LABELS.preparing },
  { value: "delivered", label: ORDER_STATUS_LABELS.delivered },
  { value: "closed", label: ORDER_STATUS_LABELS.closed },
  { value: "canceled", label: ORDER_STATUS_LABELS.canceled },
];

const editableStatus: OrderStatus[] = [
  "awaiting",
  "confirmed",
  "preparing",
  "delivered",
  "closed",
  "canceled",
];

export function AdminOrdersManager() {
  const supabase = getSupabaseBrowserClient();
  const { restaurant, loading } = useAdminContext();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<"all" | OrderStatus>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!restaurant) {
      return;
    }

    setIsLoading(true);
    setError(null);

    let query = supabase
      .from("orders")
      .select(
        "id, status, payment_status, total_cents, customer_name, table_id, created_at, updated_at, tables(number), order_items(id, qty, note, price_cents, products(name))",
      )
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false })
      .limit(80);

    if (selectedStatus !== "all") {
      query = query.eq("status", selectedStatus);
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      console.error("[admin/orders] load", queryError);
      setError("Falha ao carregar pedidos.");
      setIsLoading(false);
      return;
    }

    setOrders((data as OrderRow[]) || []);
    setIsLoading(false);
  }, [restaurant, selectedStatus, supabase]);

  useEffect(() => {
    if (loading || !restaurant) {
      return;
    }

    loadOrders();
  }, [loadOrders, loading, restaurant, selectedStatus]);

  async function updateOrderStatus(order: OrderRow, toStatus: OrderStatus) {
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: toStatus })
      .eq("id", order.id);

    if (updateError) {
      setError("Falha ao atualizar status do pedido.");
      return;
    }

    const { error: eventError } = await supabase.from("order_events").insert({
      order_id: order.id,
      from_status: order.status,
      to_status: toStatus,
      source: "admin",
    });

    if (eventError) {
      console.error("[admin/orders] event", eventError);
    }

    await loadOrders();
  }

  async function markAsPaid(order: OrderRow) {
    const toStatus: OrderStatus = order.status === "closed" ? "closed" : "closed";

    const { error: updateError } = await supabase
      .from("orders")
      .update({ payment_status: "paid", status: toStatus })
      .eq("id", order.id);

    if (updateError) {
      setError("Falha ao marcar pagamento.");
      return;
    }

    const { error: eventError } = await supabase.from("order_events").insert({
      order_id: order.id,
      from_status: order.status,
      to_status: toStatus,
      source: "admin",
    });

    if (eventError) {
      console.error("[admin/orders] event paid", eventError);
    }

    await loadOrders();
  }

  const activeOrdersCount = useMemo(() => {
    return orders.filter((order) => !["closed", "canceled"].includes(order.status)).length;
  }, [orders]);

  if (loading || !restaurant) {
    return null;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Pedidos</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Abertos: {activeOrdersCount}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedStatus(option.value)}
              className={`rounded-full px-3 py-1 text-sm ${
                selectedStatus === option.value
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {isLoading && <p className="text-sm text-slate-600">Carregando pedidos...</p>}

      {!isLoading && orders.length === 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Nenhum pedido para este filtro.</p>
        </section>
      )}

      {!isLoading &&
        orders.map((order) => (
          <section key={order.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Pedido #{order.id.slice(0, 8)}</h3>
                <p className="text-sm text-slate-600">
                  Mesa {order.tables?.number ?? "-"} | {order.customer_name || "Sem nome"}
                </p>
                <p className="text-xs text-slate-500">{formatDateTime(order.created_at)}</p>
              </div>

              <div className="text-right">
                <p className="text-sm font-medium text-slate-800">{ORDER_STATUS_LABELS[order.status]}</p>
                <p className="text-xs text-slate-500">{PAYMENT_STATUS_LABELS[order.payment_status]}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(order.total_cents)}</p>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-slate-100 p-3 text-sm">
              <p className="mb-2 font-medium text-slate-700">Itens</p>
              <ul className="space-y-1 text-slate-600">
                {order.order_items.map((item) => (
                  <li key={item.id}>
                    {item.qty}x {item.products?.name || "Produto"}
                    {item.note ? ` (${item.note})` : ""} - {formatCurrency(item.price_cents)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {editableStatus.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => updateOrderStatus(order, status)}
                  className={`rounded-lg border px-3 py-1 text-sm ${
                    order.status === status
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {ORDER_STATUS_LABELS[status]}
                </button>
              ))}

              {order.payment_status !== "paid" && (
                <button
                  type="button"
                  onClick={() => markAsPaid(order)}
                  className="rounded-lg border border-emerald-300 px-3 py-1 text-sm text-emerald-700 hover:bg-emerald-50"
                >
                  Marcar como pago
                </button>
              )}
            </div>
          </section>
        ))}

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
