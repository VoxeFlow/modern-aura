"use client";

import { useState } from "react";

import { WAITER_CALL_TYPE_LABELS } from "@/lib/constants";
import type { WaiterCallType } from "@/types/domain";

export function WaiterCallModal({ qrToken }: { qrToken: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<WaiterCallType>("waiter");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function submitCall() {
    setLoading(true);
    setFeedback(null);

    const response = await fetch("/api/public/waiter/call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        qrToken,
        type,
        message: message.trim() || undefined,
      }),
    });

    const payload = (await response.json()) as {
      success: boolean;
      error?: string;
    };

    setLoading(false);

    if (!response.ok || !payload.success) {
      setFeedback(payload.error || "Não foi possível enviar chamado agora.");
      return;
    }

    setFeedback("Chamado enviado. A equipe já foi avisada.");
    setMessage("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setFeedback(null);
        }}
        className="rounded-full bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg"
      >
        Chamar garçom
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-4 sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Ajuda da equipe</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-500">
                Fechar
              </button>
            </div>

            <div className="space-y-2">
              {(["waiter", "bill", "other"] as WaiterCallType[]).map((item) => (
                <label
                  key={item}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${
                    type === item ? "border-slate-900 bg-slate-50" : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="waiter-type"
                    value={item}
                    checked={type === item}
                    onChange={() => setType(item)}
                  />
                  <span className="text-sm text-slate-800">{WAITER_CALL_TYPE_LABELS[item]}</span>
                </label>
              ))}
            </div>

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Mensagem opcional"
              rows={2}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            {feedback && <p className="mt-2 text-sm text-slate-700">{feedback}</p>}

            <button
              type="button"
              onClick={submitCall}
              disabled={loading}
              className="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Enviar chamado"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
