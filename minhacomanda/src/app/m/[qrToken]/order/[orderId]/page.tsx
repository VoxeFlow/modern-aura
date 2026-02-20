"use client";

import { useParams } from "next/navigation";

import { OrderStatusClient } from "@/components/client/order-status-client";

export default function TableOrderStatusPage() {
  const params = useParams<{ qrToken: string; orderId: string }>();
  const qrToken = params?.qrToken;
  const orderId = params?.orderId;

  if (!qrToken || !orderId) {
    return null;
  }

  return <OrderStatusClient qrToken={qrToken} orderId={orderId} />;
}
