"use client";

import { useParams } from "next/navigation";

import { CartPageClient } from "@/components/client/cart-page-client";

export default function TableCartPage() {
  const params = useParams<{ qrToken: string }>();
  const qrToken = params?.qrToken;

  if (!qrToken) {
    return null;
  }

  return <CartPageClient qrToken={qrToken} />;
}
