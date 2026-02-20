"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AdminLoginForm() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const result = await supabase.auth.getSession();

      if (!cancelled && result.data.session?.user) {
        router.replace("/admin");
      }
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const queryError = new URLSearchParams(window.location.search).get("error");

    if (queryError === "unauthorized") {
      setError("Usuário autenticado, mas sem acesso ao restaurante.");
    }

    if (queryError === "restaurant_not_found") {
      setError("Restaurante não encontrado para este usuário.");
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Falha ao entrar. Verifique email e senha.");
      setLoading(false);
      return;
    }

    router.push("/admin");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-0 focus:border-slate-500"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-0 focus:border-slate-500"
          required
        />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button
        type="submit"
        className="w-full rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>

      <p className="text-xs text-slate-500">
        Use um usuário já criado no Supabase Auth e vinculado em <code>admin_users</code>.
      </p>
    </form>
  );
}
