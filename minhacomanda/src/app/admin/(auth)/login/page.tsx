import { AdminLoginForm } from "@/components/admin/login-form";

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <header className="mb-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">Painel MinhaComanda</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Entrar</h1>
        <p className="mt-2 text-sm text-slate-600">Acesso para gestão do restaurante.</p>
      </header>

      <AdminLoginForm />
    </main>
  );
}
