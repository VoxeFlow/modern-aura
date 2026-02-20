import React, { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { NeonButton } from '../../components/NeonButton';
import { Save, Key, Wifi, CreditCard, CheckCircle, AlertTriangle } from 'lucide-react';

const SettingsView = ({ user }) => {
    const {
        apiUrl, apiKey, instanceName,
        setConfig
    } = useStore();

    const [localConfig, setLocalConfig] = useState({
        apiUrl: '',
        apiKey: '',
        instanceName: '',
        openaiKey: ''
    });

    useEffect(() => {
        setLocalConfig({
            apiUrl: apiUrl || '',
            apiKey: apiKey || '',
            instanceName: instanceName || '',
            openaiKey: localStorage.getItem('monstro_openai_key') || ''
        });
    }, [apiUrl, apiKey, instanceName]);

    const handleSave = async () => {
        // 1. Update Local Store
        setConfig({
            apiUrl: localConfig.apiUrl,
            apiKey: localConfig.apiKey,
            instanceName: localConfig.instanceName
        });
        localStorage.setItem('monstro_openai_key', localConfig.openaiKey);

        // 2. Persist to Backend (D1)
        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Email': user?.email
                },
                body: JSON.stringify({
                    evolution_api_url: localConfig.apiUrl,
                    evolution_api_key: localConfig.apiKey,
                    openai_key: localConfig.openaiKey
                })
            });
            alert('Configurações salvas no servidor! A IA deve funcionar agora.');
        } catch (e) {
            console.error("Save failed", e);
            alert('Erro ao salvar no servidor. Verifique o console.');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-monstro-primary">
                        <Wifi size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Conexão WhatsApp (Evolution API)</h2>
                        <p className="text-sm text-gray-400">Configure a instância que processará as mensagens.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">API URL</label>
                        <input
                            type="text"
                            value={localConfig.apiUrl}
                            onChange={(e) => setLocalConfig({ ...localConfig, apiUrl: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-monstro-primary transition-all font-mono text-sm"
                            placeholder="https://api.seu-evolution.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">API Key (Global)</label>
                        <input
                            type="password"
                            value={localConfig.apiKey}
                            onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-monstro-primary transition-all font-mono text-sm"
                            placeholder="Definida no env do Evolution"
                        />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nome da Instância</label>
                        <input
                            type="text"
                            value={localConfig.instanceName}
                            onChange={(e) => setLocalConfig({ ...localConfig, instanceName: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-monstro-primary transition-all font-bold text-gray-800"
                            placeholder="Ex: MonstroBot01"
                        />
                        <p className="text-xs text-gray-400">
                            Se a instância não existir, o sistema tentará criá-la automaticamente ao conectar.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                        <Key size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Inteligência Artificial (OpenAI)</h2>
                        <p className="text-sm text-gray-400">Chave para gerar respostas inteligentes.</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">OpenAI API Key</label>
                    <input
                        type="password"
                        value={localConfig.openaiKey}
                        onChange={(e) => setLocalConfig({ ...localConfig, openaiKey: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all font-mono text-sm"
                        placeholder="sk-..."
                    />
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
                <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="w-12 h-12 bg-yellow-50 rounded-2xl flex items-center justify-center text-yellow-600">
                        <CreditCard size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Assinatura & Planos</h2>
                        <p className="text-sm text-gray-400">Gerencie seu acesso à plataforma.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-6 rounded-2xl border border-gray-200 bg-gray-50 flex flex-col justify-between">
                        <div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Seu Plano Atual</div>
                            <div className="text-3xl font-black text-gray-900 mb-1">
                                {user?.subscription_status === 'active' ? 'MONSTRO PRO' : 'GRATUITO'}
                            </div>
                            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${user?.subscription_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                                }`}>
                                {user?.subscription_status === 'active' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                                {user?.subscription_status === 'active' ? 'ATIVO' : 'LIMITADO'}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Upgrade</div>
                        <button
                            onClick={async () => {
                                const res = await fetch('/api/billing/checkout', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'X-User-Email': user.email },
                                    body: JSON.stringify({ plan: 'pro_monthly' })
                                });
                                const data = await res.json();
                                if (data.url) window.open(data.url, '_blank');
                            }}
                            className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-monstro-primary bg-monstro-primary/5 hover:bg-monstro-primary/10 transition-colors group cursor-pointer"
                        >
                            <div className="text-left">
                                <div className="font-bold text-gray-900">Plano PRO Mensal</div>
                                <div className="text-xs text-gray-500">R$ 197/mês</div>
                            </div>
                            <span className="text-monstro-primary font-bold text-sm group-hover:underline">Assinar &rarr;</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <NeonButton variant="primary" onClick={handleSave} className="px-8 shadow-xl shadow-monstro-primary/20">
                    <Save size={18} className="mr-2" />
                    SALVAR CONFIGURAÇÕES
                </NeonButton>
            </div>
        </div>
    );
};

export default SettingsView;
