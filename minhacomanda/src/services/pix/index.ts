import { getPixEnv } from "@/lib/env";
import { FallbackPixProvider } from "@/services/pix/fallback";
import { MercadoPagoPixProvider } from "@/services/pix/mercadopago";
import type { PixProvider } from "@/services/pix/types";

export function buildPixProvider(pixKey?: string | null): PixProvider {
  const env = getPixEnv();

  if (env.provider === "mercadopago" && env.accessToken) {
    return new MercadoPagoPixProvider(env.accessToken, env.webhookSecret);
  }

  return new FallbackPixProvider(pixKey);
}

export function buildWebhookPixProvider(): PixProvider | null {
  const env = getPixEnv();

  if (env.provider === "mercadopago" && env.accessToken) {
    return new MercadoPagoPixProvider(env.accessToken, env.webhookSecret);
  }

  return null;
}
