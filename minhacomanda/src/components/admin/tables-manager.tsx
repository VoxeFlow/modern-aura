"use client";

import QRCode from "qrcode";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { useAdminContext } from "@/components/admin/admin-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type TableRow = {
  id: string;
  number: number;
  qr_token: string;
  active: boolean;
  created_at: string;
};

function generateQrToken() {
  const randomPart = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
  return `tbl_${randomPart}`;
}

export function AdminTablesManager() {
  const supabase = getSupabaseBrowserClient();
  const { restaurant, loading } = useAdminContext();

  const [tables, setTables] = useState<TableRow[]>([]);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTables = useCallback(async () => {
    if (!restaurant) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("tables")
      .select("id, number, qr_token, active, created_at")
      .eq("restaurant_id", restaurant.id)
      .order("number", { ascending: true });

    if (queryError) {
      console.error("[admin/tables] load", queryError);
      setError("Falha ao carregar mesas.");
      setIsLoading(false);
      return;
    }

    setTables(data || []);
    setIsLoading(false);
  }, [restaurant, supabase]);

  useEffect(() => {
    if (loading || !restaurant) {
      return;
    }

    loadTables();
  }, [loadTables, loading, restaurant]);

  async function createTable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!restaurant) {
      return;
    }

    const tableNumber = Number(newTableNumber);
    if (Number.isNaN(tableNumber) || tableNumber <= 0) {
      setError("Número da mesa inválido.");
      return;
    }

    const { error: insertError } = await supabase.from("tables").insert({
      restaurant_id: restaurant.id,
      number: tableNumber,
      qr_token: generateQrToken(),
      active: true,
    });

    if (insertError) {
      console.error("[admin/tables] create", insertError);
      setError("Não foi possível criar mesa. Verifique se o número já existe.");
      return;
    }

    setNewTableNumber("");
    await loadTables();
  }

  async function toggleActive(table: TableRow) {
    const { error: updateError } = await supabase
      .from("tables")
      .update({ active: !table.active })
      .eq("id", table.id);

    if (updateError) {
      setError("Falha ao atualizar mesa.");
      return;
    }

    await loadTables();
  }

  async function regenerateToken(table: TableRow) {
    if (!window.confirm(`Gerar novo QR token para mesa ${table.number}?`)) {
      return;
    }

    const { error: updateError } = await supabase
      .from("tables")
      .update({ qr_token: generateQrToken() })
      .eq("id", table.id);

    if (updateError) {
      setError("Falha ao gerar novo token.");
      return;
    }

    await loadTables();
  }

  async function deleteTable(table: TableRow) {
    if (!window.confirm(`Excluir mesa ${table.number}?`)) {
      return;
    }

    const { error: deleteError } = await supabase.from("tables").delete().eq("id", table.id);

    if (deleteError) {
      setError("Falha ao excluir mesa.");
      return;
    }

    await loadTables();
  }

  async function downloadQr(table: TableRow) {
    try {
      const baseUrl = window.location.origin;
      const tableUrl = `${baseUrl}/m/${table.qr_token}`;
      const dataUrl = await QRCode.toDataURL(tableUrl, {
        width: 640,
        margin: 1,
      });

      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = `mesa-${table.number}-qrcode.png`;
      anchor.click();
    } catch (downloadError) {
      console.error("[admin/tables] qr", downloadError);
      setError("Falha ao gerar QR Code.");
    }
  }

  if (loading || !restaurant) {
    return null;
  }

  if (isLoading) {
    return <p className="text-sm text-slate-600">Carregando mesas...</p>;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Cadastrar mesa</h2>
        <form onSubmit={createTable} className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            type="number"
            min={1}
            value={newTableNumber}
            onChange={(event) => setNewTableNumber(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Número da mesa"
            required
          />
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800">
            Criar mesa
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Mesas</h2>
        <div className="mt-3 space-y-2">
          {tables.length === 0 && <p className="text-sm text-slate-500">Nenhuma mesa cadastrada.</p>}
          {tables.map((table) => (
            <div key={table.id} className="rounded-lg border border-slate-100 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800">Mesa {table.number}</p>
                  <p className="text-xs text-slate-500">Token: {table.qr_token}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => downloadQr(table)}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
                  >
                    Baixar QR
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(table)}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
                  >
                    {table.active ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => regenerateToken(table)}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
                  >
                    Novo token
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTable(table)}
                    className="rounded-lg border border-rose-200 px-3 py-1 text-sm text-rose-700"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
