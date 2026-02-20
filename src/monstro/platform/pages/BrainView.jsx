import React, { useState, useEffect } from 'react';
import { NeonButton } from '../../components/NeonButton';
import { Brain, Sparkles, Save, MessageSquare, BookOpen, Trash2, Plus } from 'lucide-react';

const BrainView = ({ user }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [brain, setBrain] = useState({
        persona: '',
        business_name: '',
        business_description: '',
        tone: 'neutro',
        rag_files: []
    });

    useEffect(() => {
        const fetchBrain = async () => {
            if (!user?.email) return;
            try {
                const res = await fetch('/api/brain', {
                    headers: { 'X-User-Email': user.email }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.owner_id) {
                        // Parse rag_files if string
                        const parsed = { ...data };
                        if (typeof parsed.rag_files === 'string') {
                            try { parsed.rag_files = JSON.parse(parsed.rag_files); } catch (e) { parsed.rag_files = []; }
                        }
                        setBrain(parsed);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch brain", e);
            } finally {
                setLoading(false);
            }
        };
        fetchBrain();
    }, [user]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 50 * 1024 * 1024) {
            alert('Arquivo muito grande (Máx 50MB)');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Tenta enviar para R2 (usando endpoint existente)
            const res = await fetch('/api/uploads', {
                method: 'POST',
                headers: { 'X-User-Email': user.email },
                body: formData
            });

            const data = await res.json();

            let newFile = {};

            if (data.error) {
                // Fallback para Base64 (arquivos pequenos)
                if (file.size < 500 * 1024) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        newFile = {
                            name: file.name,
                            type: file.type,
                            content: reader.result,
                            storage: 'd1_fallback',
                            size: (file.size / 1024).toFixed(2) + ' KB'
                        };
                        setBrain(prev => ({
                            ...prev,
                            rag_files: [...(prev.rag_files || []), newFile]
                        }));
                    };
                    reader.readAsDataURL(file);
                    return;
                }
                throw new Error(data.error);
            } else {
                // R2 Success
                newFile = {
                    name: file.name,
                    type: file.type,
                    content: data.key,
                    storage: 'r2',
                    size: (file.size / 1024).toFixed(2) + ' KB'
                };
                setBrain(prev => ({
                    ...prev,
                    rag_files: [...(prev.rag_files || []), newFile]
                }));
            }
        } catch (error) {
            console.error('Erro no upload', error);
            alert('Falha ao enviar arquivo. Tente um arquivo menor ou verifique a conexão.');
        }
    };

    const handleChange = (e) => {
        setBrain(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/brain', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Email': user.email
                },
                body: JSON.stringify(brain)
            });
            if (res.ok) {
                alert('Cérebro atualizado com sucesso! 🧠');
            } else {
                alert('Erro ao salvar.');
            }
        } catch (e) {
            console.error("Save error", e);
            alert('Erro de conexão.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center text-gray-400">Carregando neurônios...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-8 mb-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10">
                    <Brain size={200} />
                </div>
                <h1 className="text-3xl font-black flex items-center gap-3 mb-2 relative z-10">
                    <Brain className="text-monstro-primary" />
                    Cérebro do Negócio
                </h1>
                <p className="text-gray-400 max-w-lg relative z-10">
                    Configure a personalidade e o conhecimento da sua IA.
                    Quanto mais detalhes você der aqui, mais inteligente e persuasivo será o atendimento.
                </p>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Config */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                                <Sparkles size={18} />
                            </span>
                            <h2 className="text-xl font-bold text-gray-900">Identidade</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Negócio</label>
                                <input
                                    name="business_name"
                                    value={brain.business_name || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-monstro-primary outline-none transition-all"
                                    placeholder="Ex: Método Monster Fit"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Persona da IA (Quem é você?)</label>
                                <textarea
                                    name="persona"
                                    value={brain.persona || ''}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-monstro-primary outline-none transition-all"
                                    placeholder="Ex: Você é o Coach Monster, um especialista em emagrecimento motivacional e direto. Você não aceita desculpas."
                                />
                                <p className="text-xs text-gray-400 mt-1">Defina o papel: Vendedor, Suporte, Especialista, Amigo...</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                                <MessageSquare size={18} />
                            </span>
                            <h2 className="text-xl font-bold text-gray-900">Contexto Geral</h2>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Descrição do Negócio (O que você vende?)</label>
                            <textarea
                                name="business_description"
                                value={brain.business_description || ''}
                                onChange={handleChange}
                                rows={6}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-monstro-primary outline-none transition-all"
                                placeholder="Descreva seu negócio, público-alvo e principais ofertas. Ex: Vendemos encapsulados para emagrecimento focado em mulheres acima de 40 anos. Nosso diferencial é..."
                            />
                        </div>
                    </div>
                </div>

                {/* Knowledge Base (Files) */}
                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                            <BookOpen size={18} />
                        </span>
                        <h2 className="text-xl font-bold text-gray-900">Base de Conhecimento (Arquivos)</h2>
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Envie PDFs, Imagens oud Documentos de texto com informações extras (Tabela de preços, contraindicações, estudos científicos, etc). A IA consultará isso antes de responder.
                        </p>

                        <div className="flex flex-col gap-2">
                            {brain.rag_files && brain.rag_files.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="text-xs font-bold bg-gray-200 px-2 py-1 rounded text-gray-600">{file.type?.split('/')[1] || 'FILE'}</span>
                                        <span className="text-sm truncate max-w-[300px]">{file.name}</span>
                                        <span className="text-xs text-gray-400">({file.size})</span>
                                    </div>
                                    <button type="button" onClick={() => {
                                        setBrain(prev => ({
                                            ...prev,
                                            rag_files: prev.rag_files.filter((_, i) => i !== idx)
                                        }));
                                    }} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={16} /></button>
                                </div>
                            ))}

                            <div className="mt-4 border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors">
                                <input
                                    type="file"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="brain-file-upload"
                                />
                                <label htmlFor="brain-file-upload" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                                    <div className="w-10 h-10 bg-monstro-primary/10 text-monstro-primary rounded-full flex items-center justify-center">
                                        <Plus size={20} />
                                    </div>
                                    <span className="font-bold text-gray-700">Clique para enviar arquivo</span>
                                    <span className="text-xs text-gray-400">PDF, TXT, CSV, IMG (Max 50MB)</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Config */}
                <div className="space-y-6">
                    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4">Tom de Voz</h3>
                        <div className="space-y-3">
                            {['Profissional', 'Amigável', 'Empolgado', 'Autoritário/Duro', 'Engraçado'].map(t => (
                                <label key={t} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50">
                                    <input
                                        type="radio"
                                        name="tone"
                                        value={t.toLowerCase()}
                                        checked={brain.tone === t.toLowerCase()}
                                        onChange={handleChange}
                                        className="text-monstro-primary focus:ring-monstro-primary"
                                    />
                                    <span className="text-sm font-medium text-gray-700">{t}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <NeonButton type="submit" variant="primary" className="w-full justify-center py-4" disabled={saving}>
                        {saving ? 'Salvando...' : (
                            <>
                                <Save size={20} className="mr-2" />
                                Salvar Cérebro
                            </>
                        )}
                    </NeonButton>
                </div>
            </form>
        </div>
    );
};

export default BrainView;
