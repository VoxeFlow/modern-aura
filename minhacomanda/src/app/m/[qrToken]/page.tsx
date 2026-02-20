"use client";

import { useParams } from "next/navigation";

import { MenuPageClient } from "@/components/client/menu-page-client";

export default function TableMenuPage() {
  const params = useParams<{ qrToken: string }>();
  const qrToken = params?.qrToken;

  if (!qrToken) {
    return null;
  }

  return <MenuPageClient qrToken={qrToken} />;
}
