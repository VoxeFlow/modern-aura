import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useMonstroStore = create(
    persist(
        (set, get) => ({
            // Configurações Gerais
            config: {
                whatsappNumber: '5511999999999',
                botName: 'O MONSTRO',
                primaryColor: '#00ff88',
            },

            // Produtos (Inicia vazio e carrega da API do D1)
            products: [],

            // Diagnóstico (Dados do Usuário - Local apenas)
            userProfile: null,

            // Dados do Usuário (Para Headers)
            userEmail: null,
            setUserEmail: (email) => set({ userEmail: email }),

            // Async Actions
            fetchData: async () => {
                const email = get().userEmail;
                try {
                    const headers = email ? { 'X-User-Email': email } : {};
                    const [prodRes, confRes] = await Promise.all([
                        fetch('/api/products', { headers }),
                        fetch('/api/config')
                    ]);

                    if (prodRes.ok) {
                        const products = await prodRes.json();
                        set({ products });
                    }
                    if (confRes.ok) {
                        const remoteConfig = await confRes.json();
                        set(state => ({ config: { ...state.config, ...remoteConfig } }));
                    }
                } catch (e) {
                    console.error("Monstro API Error:", e);
                }
            },

            // Actions - Products
            createProduct: async (productData) => {
                const id = crypto.randomUUID();
                const newProduct = { ...productData, id }; // Optimistic ID

                // Optimistic Update
                const currentProducts = get().products || [];
                set({ products: [...currentProducts, newProduct] });

                const email = get().userEmail;
                try {
                    await fetch('/api/products', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(email ? { 'X-User-Email': email } : {})
                        },
                        body: JSON.stringify(newProduct)
                    });
                } catch (e) {
                    console.error("Failed to create product", e);
                    // Rollback? For now, keep optimistic
                }
            },

            updateProduct: async (id, updates) => {
                // Optimistic Update
                set((state) => ({
                    products: state.products.map(p => p.id === id ? { ...p, ...updates } : p)
                }));

                // Sync with D1
                const email = get().userEmail;
                try {
                    await fetch('/api/products', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(email ? { 'X-User-Email': email } : {})
                        },
                        body: JSON.stringify({ id, ...updates })
                    });
                } catch (e) {
                    console.error("Failed to sync product update", e);
                }
            },

            updateConfig: (updates) => set((state) => ({
                config: { ...state.config, ...updates }
            })),

            setUserProfile: (profile) => set({ userProfile: profile }),
        }),
        {
            name: 'monstro-storage', // unique name
        }
    )
);
