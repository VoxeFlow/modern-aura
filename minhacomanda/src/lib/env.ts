function readEnv(name: string) {
  return process.env[name]?.trim();
}

function required(name: string) {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getPublicSupabaseEnv() {
  return {
    url: readEnv("NEXT_PUBLIC_SUPABASE_URL") || "",
    anonKey: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") || "",
  };
}

export function getSupabaseServiceEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export function getTelegramEnv() {
  return {
    token: readEnv("TELEGRAM_BOT_TOKEN") || "",
    webhookSecret: readEnv("TELEGRAM_WEBHOOK_SECRET") || "",
  };
}

export function getPixEnv() {
  return {
    provider: (readEnv("PIX_PROVIDER") || "disabled").toLowerCase(),
    accessToken: readEnv("PIX_ACCESS_TOKEN") || "",
    webhookSecret: readEnv("MERCADOPAGO_WEBHOOK_SECRET") || "",
  };
}

export function getAppBaseUrl() {
  return readEnv("APP_BASE_URL") || "http://localhost:3000";
}
