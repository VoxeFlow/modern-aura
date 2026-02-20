import React, { useState, useEffect } from 'react';
import { useMonstroStore } from '../../store/monstroStore';
import { NeonButton } from '../../components/NeonButton';
import { Plus, Edit2, Trash2, Save, X, BookOpen, MessageCircle } from 'lucide-react';

const ProductManager = ({ user }) => {
    const { products, fetchData, createProduct, updateProduct, setUserEmail } = useMonstroStore();
    const [editingProduct, setEditingProduct] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    // Sync user email for API calls
    useEffect(() => {
        if (user?.email) {
            setUserEmail(user.email);
            fetchData();
        }
    }, [user, setUserEmail, fetchData]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tamanho (limitando a 50MB para upload via browser)
        if (file.size > 50 * 1024 * 1024) {
            alert('Arquivo muito grande (Máx 50MB)');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Tenta enviar para R2
            const res = await fetch('/api/uploads', {
                method: 'POST',
                headers: { 'X-User-Email': user.email },
                body: formData
            });

            const data = await res.json();
            if (data.error) {
                // Fallback para Base64 se R2 falhar (para arquivos pequenos)
                if (file.size < 500 * 1024) {
                    console.warn('R2 falhou, tentando fallback local...', data.error);
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const newFile = {
                            name: file.name,
                            type: file.type,
                            content: reader.result,
                            storage: 'd1_fallback',
                            size: (file.size / 1024).toFixed(2) + ' KB'
                        };
                        setEditingProduct(prev => ({
                            ...prev,
                            rag_files: [...(prev.rag_files || []), newFile]
                        }));
                    };
                    reader.readAsDataURL(file);
                    return;
                }
                throw new Error(data.error);
            }

            // Sucesso R2
            const newFile = {
                name: file.name,
                type: file.type,
                content: data.key,
                storage: 'r2',
                size: (file.size / 1024).toFixed(2) + ' KB'
            };

            setEditingProduct(prev => ({
                ...prev,
                rag_files: [...(prev.rag_files || []), newFile]
            }));

        } catch (error) {
            console.error('Erro no upload', error);
            alert('Falha ao enviar arquivo: ' + error.message);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            price: parseFloat(formData.get('price')),
            link: formData.get('link'),
            description_detailed: formData.get('description_detailed'),
            benefits_list: formData.get('benefits_list')?.split('\n').filter(Boolean) || [],
            faq_list: formData.get('faq_list')?.split('\n').map(l => {
                const [q, a] = l.split('?');
                return { q: q + '?', a: a || '' };
            }).filter(i => i.q.length > 2) || [],
            image_url: formData.get('image_url'),
            rag_files: [
                ...(editingProduct?.rag_files || []),
                ...formData.getAll('new_rag_file').map(f => JSON.parse(f))
            ]
        };

        if (isCreating) {
            await createProduct(data);
            setIsCreating(false);
        } else if (editingProduct) {
            await updateProduct(editingProduct.id, data);
            setEditingProduct(null);
        }
    };

    if (isCreating || editingProduct) {
        const initialData = editingProduct || {};
        return (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm max-w-3xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {isCreating ? <Plus className="text-monstro-primary" /> : <Edit2 className="text-monstro-primary" />}
                        {isCreating ? 'Novo Produto' : 'Editar Produto'}
                    </h2>
                    <button onClick={() => { setIsCreating(false); setEditingProduct(null); }} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Produto</label>
                            <input name="name" defaultValue={initialData.name} required className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:border-monstro-primary outline-none" placeholder="Ex: Protocolo Monster" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Preço (R$)</label>
                            <input name="price" type="number" step="0.01" defaultValue={initialData.price} required className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:border-monstro-primary outline-none" placeholder="97.00" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Link de Checkout</label>
                        <input name="link" defaultValue={initialData.link} className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:border-monstro-primary outline-none" placeholder="https://pay.kiwify..." />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">URL da Imagem</label>
                        <input name="image_url" defaultValue={initialData.image_url} className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:border-monstro-primary outline-none" placeholder="https://..." />
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <h3 className="font-bold text-md mb-4 flex items-center gap-2 text-purple-600">
                            <BookOpen size={18} />
                            Treinamento da IA (RAG)
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição Detalhada</label>
                                <textarea name="description_detailed" defaultValue={initialData.description_detailed} rows={4} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-monstro-primary outline-none" placeholder="Descreva o produto com detalhes. A IA usará isso para explicar..." />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Lista de Benefícios (1 por linha)</label>
                                <textarea name="benefits_list" defaultValue={Array.isArray(initialData.benefits_list) ? initialData.benefits_list.join('\n') : initialData.benefits_list} rows={4} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-monstro-primary outline-none" placeholder="- Acesso Vitalício\n- Suporte 24h..." />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Perguntas Frequentes (Formato: Pergunta? Resposta)</label>
                                <textarea name="faq_list" defaultValue={Array.isArray(initialData.faq_list) ? initialData.faq_list.map(f => `${f.q} ${f.a}`).join('\n') : ''} rows={4} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-monstro-primary outline-none" placeholder="Tem garantia? Sim, 7 dias.\nComo acesso? Via email." />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Arquivos de Apoio (PDF/Imagem - Máx 500KB)</label>
                                <div className="flex flex-col gap-2">
                                    {initialData.rag_files && initialData.rag_files.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className="text-xs font-bold bg-gray-200 px-2 py-1 rounded text-gray-600">{file.type?.split('/')[1] || 'FILE'}</span>
                                                <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                                            </div>
                                            <button type="button" onClick={() => {
                                                // Simple remove logic requires state, for now let's just show it.
                                                // Ideally we would need a state for files.
                                                alert('Para remover, edite o JSON ou re-crie o produto (Melhoria futura)');
                                            }} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                                        </div>
                                    ))}

                                    <div className="mt-2">
                                        <input
                                            type="file"
                                            onChange={handleFileUpload}
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-monstro-primary/10 file:text-monstro-primary hover:file:bg-monstro-primary/20"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            Suporta arquivos grandes (armazenados via R2).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => { setIsCreating(false); setEditingProduct(null); }} className="px-6 py-2 rounded-xl text-gray-500 hover:bg-gray-100 font-bold">Cancelar</button>
                        <NeonButton type="submit" variant="primary">
                            <Save size={18} className="mr-2" />
                            Salvar Alterações
                        </NeonButton>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-gray-50 p-6 rounded-3xl">
                <div>
                    <h2 className="text-2xl font-black text-gray-900">Meus Produtos</h2>
                    <p className="text-sm text-gray-500 mt-1">Gerencie o conhecimento que a IA usará para vender.</p>
                </div>
                <NeonButton onClick={() => setIsCreating(true)} variant="primary">
                    <Plus size={20} className="mr-2" />
                    Adicionar Produto
                </NeonButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-gray-400">
                        <p>Nenhum produto cadastrado.</p>
                        <button onClick={() => setIsCreating(true)} className="text-monstro-primary font-bold mt-2 hover:underline">Criar o primeiro</button>
                    </div>
                ) : (
                    products.map(product => (
                        <div key={product.id} className="bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-lg transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="h-12 w-12 rounded-xl bg-gray-100 overflow-hidden">
                                    {product.image_url ? <img src={product.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={20} /></div>}
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingProduct(product)} className="p-2 hover:bg-gray-50 rounded-lg text-blue-500"><Edit2 size={16} /></button>
                                </div>
                            </div>
                            <h3 className="font-bold text-lg text-gray-900">{product.name}</h3>
                            <div className="text-monstro-primary font-black text-xl mt-1">R$ {product.price?.toFixed(2)}</div>

                            <div className="mt-4 pt-4 border-t border-gray-50 flex flex-col gap-2 text-xs text-gray-500">
                                <div className="flex items-center gap-2">
                                    <BookOpen size={14} />
                                    <span>{(product.description_detailed || '').length} car. de descrição</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MessageCircle size={14} />
                                    <span>{(product.faq_list || []).length} perguntas frequentes</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ProductManager;
