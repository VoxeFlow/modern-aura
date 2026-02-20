export type PixCreateChargeInput = {
  orderId: string;
  amountCents: number;
  description: string;
  customerName?: string | null;
  notificationUrl?: string;
};

export type PixCreateChargeResult = {
  mode: "provider" | "fallback";
  provider: "mercadopago" | "fallback";
  chargeId?: string;
  qrCodeBase64?: string;
  copiaECola: string;
  instructions: string;
};

export type PixWebhookResult = {
  chargeId: string;
  approved: boolean;
};

export interface PixProvider {
  createCharge(input: PixCreateChargeInput): Promise<PixCreateChargeResult>;
  resolveWebhook(rawBody: string, headers: Headers): Promise<PixWebhookResult | null>;
}
