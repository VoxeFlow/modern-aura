"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useAdminContext } from "@/components/admin/admin-provider";

const links = [
  { href: "/admin", label: "Resumo" },
  { href: "/admin/menu", label: "Cardápio" },
  { href: "/admin/tables", label: "Mesas" },
  { href: "/admin/orders", label: "Pedidos" },
  { href: "/admin/settings", label: "Config" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { loading, restaurant, signOut } = useAdminContext();

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl p-6">
        <p className="text-sm text-slate-600">Carregando painel...</p>
      </main>
    );
  }

  if (!restaurant) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl p-6">
        <p className="text-sm text-slate-600">Redirecionando para login...</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">MinhaComanda</p>
            <h1 className="text-lg font-semibold text-slate-900">{restaurant.name}</h1>
          </div>
          <button
            onClick={signOut}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            type="button"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row">
        <aside className="w-full rounded-xl border border-slate-200 bg-white p-3 md:w-64">
          <nav className="flex flex-row flex-wrap gap-2 md:flex-col">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
