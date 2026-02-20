"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { useAdminContext } from "@/components/admin/admin-provider";
import { formatCurrency } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type CategoryRow = {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
};

type ProductRow = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price_cents: number;
  active: boolean;
  image_url: string | null;
};

export function AdminMenuManager() {
  const supabase = getSupabaseBrowserClient();
  const { restaurant, loading } = useAdminContext();

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySort, setNewCategorySort] = useState(0);

  const [newProductName, setNewProductName] = useState("");
  const [newProductDescription, setNewProductDescription] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [newProductImageUrl, setNewProductImageUrl] = useState("");

  const loadData = useCallback(async () => {
    if (!restaurant) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const [categoriesResult, productsResult] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name, sort_order, active")
        .eq("restaurant_id", restaurant.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("products")
        .select("id, category_id, name, description, price_cents, active, image_url")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: true }),
    ]);

    if (categoriesResult.error || productsResult.error) {
      console.error("[admin/menu] load", categoriesResult.error, productsResult.error);
      setError("Falha ao carregar cardápio.");
      setIsLoading(false);
      return;
    }

    setCategories(categoriesResult.data || []);
    setProducts(productsResult.data || []);

    if (!newProductCategory && categoriesResult.data?.[0]) {
      setNewProductCategory(categoriesResult.data[0].id);
    }

    setIsLoading(false);
  }, [newProductCategory, restaurant, supabase]);

  useEffect(() => {
    if (loading || !restaurant) {
      return;
    }

    loadData();
  }, [loadData, loading, restaurant]);

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!restaurant) return;

    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from("categories").insert({
      restaurant_id: restaurant.id,
      name: newCategoryName,
      sort_order: Number.isNaN(newCategorySort) ? 0 : newCategorySort,
      active: true,
    });

    setSaving(false);

    if (insertError) {
      console.error("[admin/menu] create category", insertError);
      setError("Não foi possível criar categoria.");
      return;
    }

    setNewCategoryName("");
    setNewCategorySort(0);
    await loadData();
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!restaurant) return;

    const priceFloat = Number(newProductPrice.replace(",", "."));
    const priceCents = Math.round(priceFloat * 100);

    if (!newProductCategory) {
      setError("Selecione uma categoria para o produto.");
      return;
    }

    if (Number.isNaN(priceCents) || priceCents < 0) {
      setError("Preço inválido.");
      return;
    }

    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from("products").insert({
      restaurant_id: restaurant.id,
      category_id: newProductCategory,
      name: newProductName,
      description: newProductDescription,
      price_cents: priceCents,
      active: true,
      image_url: newProductImageUrl || null,
    });

    setSaving(false);

    if (insertError) {
      console.error("[admin/menu] create product", insertError);
      setError("Não foi possível criar produto.");
      return;
    }

    setNewProductName("");
    setNewProductDescription("");
    setNewProductPrice("");
    setNewProductImageUrl("");
    await loadData();
  }

  async function toggleCategoryActive(category: CategoryRow) {
    const { error: updateError } = await supabase
      .from("categories")
      .update({ active: !category.active })
      .eq("id", category.id);

    if (updateError) {
      setError("Falha ao atualizar categoria.");
      return;
    }

    await loadData();
  }

  async function editCategory(category: CategoryRow) {
    const name = window.prompt("Nome da categoria", category.name) ?? category.name;
    const sortInput = window.prompt("Ordem", String(category.sort_order));
    const sortOrder = sortInput ? Number(sortInput) : category.sort_order;

    if (!name.trim() || Number.isNaN(sortOrder)) {
      return;
    }

    const { error: updateError } = await supabase
      .from("categories")
      .update({ name: name.trim(), sort_order: sortOrder })
      .eq("id", category.id);

    if (updateError) {
      setError("Falha ao editar categoria.");
      return;
    }

    await loadData();
  }

  async function deleteCategory(category: CategoryRow) {
    if (!window.confirm(`Excluir categoria \"${category.name}\"?`)) {
      return;
    }

    const { error: deleteError } = await supabase.from("categories").delete().eq("id", category.id);

    if (deleteError) {
      setError("Falha ao excluir categoria.");
      return;
    }

    await loadData();
  }

  async function toggleProductActive(product: ProductRow) {
    const { error: updateError } = await supabase
      .from("products")
      .update({ active: !product.active })
      .eq("id", product.id);

    if (updateError) {
      setError("Falha ao atualizar produto.");
      return;
    }

    await loadData();
  }

  async function editProduct(product: ProductRow) {
    const name = window.prompt("Nome do produto", product.name) ?? product.name;
    const description = window.prompt("Descrição", product.description) ?? product.description;
    const priceInput = window.prompt("Preço (R$)", (product.price_cents / 100).toFixed(2)) ?? "";
    const priceCents = Math.round(Number(priceInput.replace(",", ".")) * 100);

    if (!name.trim() || Number.isNaN(priceCents) || priceCents < 0) {
      return;
    }

    const { error: updateError } = await supabase
      .from("products")
      .update({
        name: name.trim(),
        description: description.trim(),
        price_cents: priceCents,
      })
      .eq("id", product.id);

    if (updateError) {
      setError("Falha ao editar produto.");
      return;
    }

    await loadData();
  }

  async function deleteProduct(product: ProductRow) {
    if (!window.confirm(`Excluir produto \"${product.name}\"?`)) {
      return;
    }

    const { error: deleteError } = await supabase.from("products").delete().eq("id", product.id);

    if (deleteError) {
      setError("Falha ao excluir produto.");
      return;
    }

    await loadData();
  }

  if (loading || !restaurant) {
    return null;
  }

  if (isLoading) {
    return <p className="text-sm text-slate-600">Carregando cardápio...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Categorias</h2>
        <form className="mt-3 grid gap-3 sm:grid-cols-3" onSubmit={createCategory}>
          <input
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Nome da categoria"
            required
          />
          <input
            value={newCategorySort}
            onChange={(event) => setNewCategorySort(Number(event.target.value || 0))}
            className="rounded-lg border border-slate-300 px-3 py-2"
            type="number"
            placeholder="Ordem"
            required
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={saving}
          >
            Adicionar categoria
          </button>
        </form>

        <div className="mt-4 space-y-2">
          {categories.length === 0 && <p className="text-sm text-slate-500">Nenhuma categoria cadastrada.</p>}
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-3"
            >
              <div>
                <p className="font-medium text-slate-800">{category.name}</p>
                <p className="text-xs text-slate-500">Ordem: {category.sort_order}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleCategoryActive(category)}
                  className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
                >
                  {category.active ? "Desativar" : "Ativar"}
                </button>
                <button
                  type="button"
                  onClick={() => editCategory(category)}
                  className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => deleteCategory(category)}
                  className="rounded-lg border border-rose-200 px-3 py-1 text-sm text-rose-700"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Produtos</h2>

        <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={createProduct}>
          <input
            value={newProductName}
            onChange={(event) => setNewProductName(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Nome do produto"
            required
          />

          <select
            value={newProductCategory}
            onChange={(event) => setNewProductCategory(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
            required
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <input
            value={newProductPrice}
            onChange={(event) => setNewProductPrice(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Preço (ex: 12.90)"
            required
          />

          <input
            value={newProductImageUrl}
            onChange={(event) => setNewProductImageUrl(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
            placeholder="URL da imagem (opcional)"
          />

          <textarea
            value={newProductDescription}
            onChange={(event) => setNewProductDescription(event.target.value)}
            className="sm:col-span-2 rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Descrição"
            rows={2}
            required
          />

          <button
            type="submit"
            className="sm:col-span-2 rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={saving}
          >
            Adicionar produto
          </button>
        </form>

        <div className="mt-4 space-y-2">
          {products.length === 0 && <p className="text-sm text-slate-500">Nenhum produto cadastrado.</p>}
          {products.map((product) => (
            <div key={product.id} className="rounded-lg border border-slate-100 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800">{product.name}</p>
                  <p className="text-sm text-slate-600">{product.description}</p>
                  <p className="mt-1 text-sm text-slate-700">{formatCurrency(product.price_cents)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleProductActive(product)}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
                  >
                    {product.active ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => editProduct(product)}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteProduct(product)}
                    className="rounded-lg border border-rose-200 px-3 py-1 text-sm text-rose-700"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
