"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAdminContext } from "@/components/admin/admin-provider";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type DashboardState = {
  openOrders: Array<{
    id: string;
    status: string;
    payment_status: string;
    total_cents: number;
    created_at: string;
    tables: { number: number } | null;
  }>;
  openCalls: Array<{
    id: string;
    type: string;
    status: string;
    created_at: string;
    tables: { number: number } | null;
  }>;
};

export function AdminDashboardClient() {
  const { restaurant, loading } = useAdminContext();
  const supabase = getSupabaseBrowserClient();

  const [state, setState] = useState<DashboardState>({ openOrders: [], openCalls: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!restaurant) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const [ordersResult, callsResult] = await Promise.all([
      supabase
        .from("orders")
        .select("id, status, payment_status, total_cents, created_at, tables(number)")
        .eq("restaurant_id", restaurant.id)
        .in("status", ["awaiting", "confirmed", "preparing", "delivered"])
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("waiter_calls")
        .select("id, type, status, created_at, tables(number)")
        .eq("restaurant_id", restaurant.id)
        .in("status", ["open", "acknowledged"])
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (ordersResult.error || callsResult.error) {
      console.error("[admin/dashboard] load", ordersResult.error, callsResult.error);
      setError("Falha ao carregar dados do painel.");
      setIsLoading(false);
      return;
    }

    setState({
      openOrders: ordersResult.data || [],
      openCalls: callsResult.data || [],
    });

    setIsLoading(false);
  }, [restaurant, supabase]);

  useEffect(() => {
    if (loading || !restaurant) {
      return;
    }

    loadData();

    const orderChannel = supabase
      .channel(`admin-orders-${restaurant.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    const callsChannel = supabase
      .channel(`admin-calls-${restaurant.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "waiter_calls",
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(callsChannel);
    };
  }, [loadData, loading, restaurant, supabase]);

  const summary = useMemo(() => {
    return {
      openOrders: state.openOrders.length,
      openCalls: state.openCalls.length,
    };
  }, [state.openCalls.length, state.openOrders.length]);

  if (loading || !restaurant) {
    return null;
  }

  if (isLoading) {
    return <p className="text-sm text-slate-600">Carregando resumo...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Pedidos abertos</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{summary.openOrders}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Chamados abertos</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{summary.openCalls}</p>
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Últimos pedidos</h2>
        <div className="mt-3 space-y-2">
          {state.openOrders.length === 0 && <p className="text-sm text-slate-500">Sem pedidos em aberto.</p>}
          {state.openOrders.map((order) => (
            <div key={order.id} className="rounded-lg border border-slate-100 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-800">Mesa {order.tables?.number ?? "-"}</p>
                <p className="text-slate-600">{formatCurrency(order.total_cents)}</p>
              </div>
              <p className="mt-1 text-slate-600">
                {order.status} | {order.payment_status} | {formatDateTime(order.created_at)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Últimos chamados</h2>
        <div className="mt-3 space-y-2">
          {state.openCalls.length === 0 && <p className="text-sm text-slate-500">Sem chamados em aberto.</p>}
          {state.openCalls.map((call) => (
            <div key={call.id} className="rounded-lg border border-slate-100 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-800">Mesa {call.tables?.number ?? "-"}</p>
                <p className="text-slate-600">{call.type}</p>
              </div>
              <p className="mt-1 text-slate-600">
                {call.status} | {formatDateTime(call.created_at)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
