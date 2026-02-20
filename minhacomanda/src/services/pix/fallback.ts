import type { PixCreateChargeInput, PixCreateChargeResult, PixProvider, PixWebhookResult } from "@/services/pix/types";

export class FallbackPixProvider implements PixProvider {
  constructor(private readonly pixKey?: string | null) {}

  async createCharge(input: PixCreateChargeInput): Promise<PixCreateChargeResult> {
    const key = this.pixKey?.trim();
    if (!key) {
      throw new Error("Chave Pix do restaurante não configurada");
    }

    return {
      mode: "fallback",
      provider: "fallback",
      copiaECola: key,
      instructions: `Use a chave Pix ${key} e informe a equipe após o pagamento do pedido ${input.orderId.slice(0, 8)}.`,
    };
  }

  async resolveWebhook(): Promise<PixWebhookResult | null> {
    return null;
  }
}
