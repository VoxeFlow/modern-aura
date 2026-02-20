"use client";

import { usePathname, useRouter } from "next/navigation";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Restaurant } from "@/types/domain";

type AdminUser = {
  id: string;
  restaurant_id: string;
  auth_user_id: string;
  role: "owner" | "manager";
};

type AdminContextValue = {
  loading: boolean;
  restaurant: Restaurant | null;
  adminUser: AdminUser | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = getSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setRestaurant(null);
      setAdminUser(null);
      setLoading(false);

      if (pathname !== "/admin/login") {
        router.replace("/admin/login");
      }
      return;
    }

    const { data: adminRow, error: adminError } = await supabase
      .from("admin_users")
      .select("id, restaurant_id, auth_user_id, role")
      .eq("auth_user_id", session.user.id)
      .single();

    if (adminError || !adminRow) {
      console.error("[admin] admin_users", adminError);
      setRestaurant(null);
      setAdminUser(null);
      setLoading(false);
      await supabase.auth.signOut();
      router.replace("/admin/login?error=unauthorized");
      return;
    }

    const { data: restaurantRow, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name, slug, plan, status, telegram_chat_id, pix_provider, pix_key, created_at")
      .eq("id", adminRow.restaurant_id)
      .single();

    if (restaurantError || !restaurantRow) {
      console.error("[admin] restaurants", restaurantError);
      setRestaurant(null);
      setAdminUser(null);
      setLoading(false);
      router.replace("/admin/login?error=restaurant_not_found");
      return;
    }

    setAdminUser(adminRow as AdminUser);
    setRestaurant(restaurantRow as Restaurant);
    setLoading(false);
  }, [pathname, router, supabase]);

  useEffect(() => {
    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!session) {
        setRestaurant(null);
        setAdminUser(null);
        if (pathname !== "/admin/login") {
          router.replace("/admin/login");
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [load, pathname, router, supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }, [router, supabase]);

  const value = useMemo<AdminContextValue>(
    () => ({
      loading,
      restaurant,
      adminUser,
      refresh: load,
      signOut,
    }),
    [adminUser, load, loading, restaurant, signOut],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminContext() {
  const context = useContext(AdminContext);

  if (!context) {
    throw new Error("useAdminContext must be used within AdminProvider");
  }

  return context;
}
