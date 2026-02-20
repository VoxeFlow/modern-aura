import { createHmac, timingSafeEqual } from "node:crypto";

import type { PixCreateChargeInput, PixCreateChargeResult, PixProvider, PixWebhookResult } from "@/services/pix/types";

type MercadoPagoCreatePaymentResponse = {
  id: number;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
    };
  };
};

type MercadoPagoPaymentDetail = {
  id: number;
  status: string;
};

export class MercadoPagoPixProvider implements PixProvider {
  private readonly baseUrl = "https://api.mercadopago.com";

  constructor(
    private readonly accessToken: string,
    private readonly webhookSecret?: string,
  ) {}

  private async request<T>(path: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Mercado Pago API falhou (${response.status}): ${text}`);
    }

    return (await response.json()) as T;
  }

  async createCharge(input: PixCreateChargeInput): Promise<PixCreateChargeResult> {
    const idempotencyKey = `order-${input.orderId}-${Date.now()}`;

    const payment = await this.request<MercadoPagoCreatePaymentResponse>("/v1/payments", {
      method: "POST",
      headers: {
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: input.amountCents / 100,
        description: input.description,
        payment_method_id: "pix",
        external_reference: input.orderId,
        notification_url: input.notificationUrl,
        payer: {
          email: `mesa-${input.orderId.slice(0, 8)}@minhacomanda.pro`,
          first_name: input.customerName || "Cliente",
        },
      }),
    });

    const data = payment.point_of_interaction?.transaction_data;

    if (!data?.qr_code) {
      throw new Error("Mercado Pago não retornou código Pix copia e cola");
    }

    return {
      mode: "provider",
      provider: "mercadopago",
      chargeId: String(payment.id),
      qrCodeBase64: data.qr_code_base64,
      copiaECola: data.qr_code,
      instructions: "Use o QR Code ou código copia e cola para concluir o pagamento.",
    };
  }

  private parseSignature(signatureHeader: string) {
    const parts = signatureHeader.split(",").map((part) => part.trim());
    const map: Record<string, string> = {};

    for (const part of parts) {
      const [key, value] = part.split("=");
      if (key && value) {
        map[key] = value;
      }
    }

    return {
      ts: map.ts,
      v1: map.v1,
    };
  }

  private verifyWebhookSignature(rawBody: string, headers: Headers) {
    if (!this.webhookSecret) {
      return true;
    }

    const signatureHeader = headers.get("x-signature");
    if (!signatureHeader) {
      return false;
    }

    const requestId = headers.get("x-request-id") || "";
    const { ts, v1 } = this.parseSignature(signatureHeader);

    if (!ts || !v1) {
      return false;
    }

    const payload = JSON.parse(rawBody) as {
      data?: { id?: string | number };
      id?: string | number;
    };

    const dataId = String(payload.data?.id || payload.id || "");
    if (!dataId) {
      return false;
    }

    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;

    const digest = createHmac("sha256", this.webhookSecret).update(manifest).digest("hex");

    if (digest.length !== v1.length) {
      return false;
    }

    return timingSafeEqual(Buffer.from(digest), Buffer.from(v1));
  }

  private extractPaymentId(rawBody: string) {
    const payload = JSON.parse(rawBody) as {
      type?: string;
      action?: string;
      data?: { id?: string | number };
      id?: string | number;
    };

    const action = payload.action || "";
    const type = payload.type || "";

    if (type && type !== "payment") {
      return null;
    }

    if (action && !action.includes("payment")) {
      return null;
    }

    const paymentId = payload.data?.id ?? payload.id;
    if (!paymentId) {
      return null;
    }

    return String(paymentId);
  }

  async resolveWebhook(rawBody: string, headers: Headers): Promise<PixWebhookResult | null> {
    const validSignature = this.verifyWebhookSignature(rawBody, headers);
    if (!validSignature) {
      throw new Error("Assinatura inválida no webhook do Mercado Pago");
    }

    const paymentId = this.extractPaymentId(rawBody);
    if (!paymentId) {
      return null;
    }

    const payment = await this.request<MercadoPagoPaymentDetail>(`/v1/payments/${paymentId}`);

    return {
      chargeId: String(payment.id),
      approved: payment.status === "approved",
    };
  }
}
