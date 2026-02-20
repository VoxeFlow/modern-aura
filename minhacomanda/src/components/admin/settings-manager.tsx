"use client";

import { FormEvent, useEffect, useState } from "react";

import { useAdminContext } from "@/components/admin/admin-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AdminSettingsManager() {
  const supabase = getSupabaseBrowserClient();
  const { restaurant, loading, refresh } = useAdminContext();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [pixProvider, setPixProvider] = useState("disabled");
  const [pixKey, setPixKey] = useState("");
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurant) {
      return;
    }

    setName(restaurant.name || "");
    setSlug(restaurant.slug || "");
    setTelegramChatId(restaurant.telegram_chat_id || "");
    setPixProvider(restaurant.pix_provider || "disabled");
    setPixKey(restaurant.pix_key || "");
    setStatus(restaurant.status || "active");
  }, [restaurant]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!restaurant) return;

    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("restaurants")
      .update({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        telegram_chat_id: telegramChatId.trim() || null,
        pix_provider: pixProvider,
        pix_key: pixKey.trim() || null,
        status,
      })
      .eq("id", restaurant.id);

    setSaving(false);

    if (error) {
      console.error("[admin/settings] update", error);
      setMessage("Falha ao salvar configurações.");
      return;
    }

    setMessage("Configurações salvas.");
    await refresh();
  }

  if (loading || !restaurant) {
    return null;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-slate-900">Configurações do restaurante</h2>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-slate-700">Nome</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-700">Slug</label>
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-700">Status</label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-700">Telegram chat_id</label>
          <input
            value={telegramChatId}
            onChange={(event) => setTelegramChatId(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="-100123456789"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-700">Provider Pix</label>
          <select
            value={pixProvider}
            onChange={(event) => setPixProvider(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="disabled">Fallback (chave)</option>
            <option value="mercadopago">Mercado Pago</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-slate-700">Chave Pix</label>
          <input
            value={pixKey}
            onChange={(event) => setPixKey(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="email, telefone, CPF/CNPJ ou chave aleatória"
          />
        </div>

        <button
          type="submit"
          className="sm:col-span-2 rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60"
          disabled={saving}
        >
          {saving ? "Salvando..." : "Salvar configurações"}
        </button>
      </form>

      {message && <p className="mt-3 text-sm text-slate-700">{message}</p>}
    </section>
  );
}
