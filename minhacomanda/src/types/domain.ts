export type OrderStatus =
  | "awaiting"
  | "confirmed"
  | "preparing"
  | "delivered"
  | "closed"
  | "canceled";

export type PaymentStatus = "unpaid" | "pending" | "paid";

export type WaiterCallType = "waiter" | "bill" | "other";

export type WaiterCallStatus = "open" | "acknowledged" | "closed";

export type Restaurant = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  telegram_chat_id: string | null;
  pix_provider: string;
  pix_key: string | null;
  created_at: string;
};

export type TableEntity = {
  id: string;
  restaurant_id: string;
  number: number;
  qr_token: string;
  active: boolean;
  created_at: string;
};

export type Category = {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  active: boolean;
  created_at: string;
};

export type Product = {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string;
  price_cents: number;
  active: boolean;
  image_url: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  restaurant_id: string;
  table_id: string;
  customer_name: string | null;
  status: OrderStatus;
  total_cents: number;
  payment_status: PaymentStatus;
  pix_charge_id: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  qty: number;
  note: string | null;
  price_cents: number;
  created_at: string;
  product?: Pick<Product, "name">;
};

export type WaiterCall = {
  id: string;
  restaurant_id: string;
  table_id: string;
  type: WaiterCallType;
  message: string | null;
  status: WaiterCallStatus;
  created_at: string;
  updated_at: string;
};

export type MenuPayload = {
  restaurant: Pick<Restaurant, "id" | "name" | "pix_provider" | "pix_key">;
  table: Pick<TableEntity, "id" | "number" | "qr_token">;
  categories: Category[];
  products: Product[];
};

export type CartItem = {
  productId: string;
  name: string;
  priceCents: number;
  qty: number;
  note?: string;
};
