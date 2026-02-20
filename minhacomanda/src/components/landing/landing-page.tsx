"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { formatCurrency } from "@/lib/format";

import styles from "./landing-page.module.css";

type CatalogItem = {
  id: string;
  name: string;
  priceCents: number;
};

type TicketItem = CatalogItem & {
  qty: number;
};

const catalog: CatalogItem[] = [
  { id: "coca", name: "Refrigerante", priceCents: 900 },
  { id: "burger", name: "X-Burger", priceCents: 2490 },
  { id: "fritas", name: "Batata frita", priceCents: 1890 },
  { id: "suco", name: "Suco natural", priceCents: 1390 },
];

const statusFlow = ["Aguardando", "Confirmado", "Em preparo", "Entregue"];

const pixCode =
  "00020126410014BR.GOV.BCB.PIX0119pix@minhacomanda.pro520400005303986540525.109802BR5912MINHACOMANDA6009SAOPAULO62070503***6304A1B2";

export function LandingPage() {
  const [pointer, setPointer] = useState({ x: 52, y: 26 });
  const [activeStatus, setActiveStatus] = useState(0);
  const [ticketItems, setTicketItems] = useState<TicketItem[]>([
    { id: "burger", name: "X-Burger", priceCents: 2490, qty: 1 },
    { id: "coca", name: "Refrigerante", priceCents: 900, qty: 2 },
  ]);
  const [nickname, setNickname] = useState("Mesa 08");
  const [showPix, setShowPix] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [callFeedback, setCallFeedback] = useState<string | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveStatus((current) => (current + 1) % statusFlow.length);
    }, 2400);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const total = useMemo(() => {
    return ticketItems.reduce((acc, item) => {
      return acc + item.priceCents * item.qty;
    }, 0);
  }, [ticketItems]);

  function handlePointerMove(event: React.MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setPointer({ x, y });
  }

  function addItem(item: CatalogItem) {
    setTicketItems((current) => {
      const index = current.findIndex((entry) => entry.id === item.id);
      if (index === -1) {
        return [...current, { ...item, qty: 1 }];
      }

      const next = [...current];
      next[index] = {
        ...next[index],
        qty: next[index].qty + 1,
      };

      return next;
    });
  }

  function removeItem(itemId: string) {
    setTicketItems((current) => {
      return current
        .map((item) => {
          if (item.id !== itemId) {
            return item;
          }

          return {
            ...item,
            qty: item.qty - 1,
          };
        })
        .filter((item) => item.qty > 0);
    });
  }

  async function copyPixCode() {
    await navigator.clipboard.writeText(pixCode);
    setCopyFeedback("Pix copia e cola copiado");

    window.setTimeout(() => {
      setCopyFeedback(null);
    }, 1800);
  }

  function simulateCall() {
    setCallFeedback("Equipe avisada: atendimento em andamento");

    window.setTimeout(() => {
      setCallFeedback(null);
    }, 1800);
  }

  return (
    <main className={styles.shell} onMouseMove={handlePointerMove}>
      <div
        className={styles.backdropGlow}
        style={{
          ["--mx" as string]: `${pointer.x}%`,
          ["--my" as string]: `${pointer.y}%`,
        }}
      />

      <header className={styles.topbar}>
        <div>
          <p className={styles.overline}>minhacomanda.pro</p>
          <h1 className={styles.title}>MinhaComanda</h1>
        </div>

        <Link className={styles.loginCta} href="/admin/login">
          Acessar painel
        </Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.copyColumn}>
          <p className={styles.badge}>MVP SaaS para bares e restaurantes</p>
          <h2 className={styles.headline}>
            A comanda da mesa vira uma experiência viva, rápida e sem fila.
          </h2>
          <p className={styles.description}>
            Cliente escaneia QR, faz pedido no próprio celular, chama a equipe, pede conta e paga por Pix.
            Tudo sincronizado com painel web e Telegram.
          </p>

          <div className={styles.ctaRow}>
            <Link className={styles.primaryCta} href="/m/demo-table-1">
              Testar mesa demo
            </Link>
            <a className={styles.secondaryCta} href="#fluxo">
              Ver fluxo animado
            </a>
          </div>

          <div className={styles.metricGrid}>
            <article className={styles.metricCard}>
              <span>Pedido</span>
              <strong>menos toques</strong>
            </article>
            <article className={styles.metricCard}>
              <span>Atendimento</span>
              <strong>mais ágil</strong>
            </article>
            <article className={styles.metricCard}>
              <span>Operação</span>
              <strong>tempo real</strong>
            </article>
          </div>
        </div>

        <div className={styles.comandaColumn} id="fluxo">
          <article className={styles.comandaCard}>
            <div className={styles.comandaHeader}>
              <div>
                <p className={styles.comandaLabel}>Comanda digital</p>
                <input
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  className={styles.nickInput}
                  aria-label="Nome da mesa"
                />
              </div>
              <span className={styles.livePill}>online</span>
            </div>

            <div className={styles.statusRail}>
              {statusFlow.map((status, index) => (
                <span
                  key={status}
                  className={`${styles.statusStep} ${index === activeStatus ? styles.statusStepActive : ""}`}
                >
                  {status}
                </span>
              ))}
            </div>

            <div className={styles.itemList}>
              {ticketItems.length === 0 && <p className={styles.empty}>Sem itens. Toque em um atalho abaixo.</p>}

              {ticketItems.map((item) => (
                <div key={item.id} className={styles.itemRow}>
                  <div>
                    <p>{item.name}</p>
                    <small>{formatCurrency(item.priceCents)}</small>
                  </div>
                  <div className={styles.qtyControl}>
                    <button type="button" onClick={() => removeItem(item.id)}>
                      -
                    </button>
                    <span>{item.qty}</span>
                    <button type="button" onClick={() => addItem(item)}>
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.quickAdd}>
              {catalog.map((item) => (
                <button key={item.id} type="button" onClick={() => addItem(item)}>
                  + {item.name}
                </button>
              ))}
            </div>

            <div className={styles.totalRow}>
              <span>Total da mesa</span>
              <strong>{formatCurrency(total)}</strong>
            </div>

            <div className={styles.actionRow}>
              <button type="button" className={styles.callBtn} onClick={simulateCall}>
                Chamar equipe
              </button>
              <button
                type="button"
                className={styles.pixBtn}
                onClick={() => setShowPix((current) => !current)}
              >
                {showPix ? "Ocultar Pix" : "Pagar com Pix"}
              </button>
            </div>

            {callFeedback && <p className={styles.feedback}>{callFeedback}</p>}

            {showPix && (
              <div className={styles.pixPanel}>
                <div className={styles.qrMock}>
                  <div />
                </div>
                <textarea readOnly value={pixCode} className={styles.pixCode} />
                <button type="button" className={styles.copyBtn} onClick={copyPixCode}>
                  Copiar Pix
                </button>
                {copyFeedback && <p className={styles.feedback}>{copyFeedback}</p>}
              </div>
            )}

            <p className={styles.foot}>Fluxo demonstrativo da jornada cliente na mesa.</p>
          </article>

          <aside className={styles.qrCard}>
            <div className={styles.scanFrame}>
              <div className={styles.scanLine} />
            </div>
            <p>Escaneie o QR da mesa e peça sem instalar app.</p>
          </aside>
        </div>
      </section>
    </main>
  );
}
