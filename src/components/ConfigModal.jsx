import React from 'react';
import { X, Save } from 'lucide-react';
import { useStore } from '../store/useStore';

const ConfigModal = ({ isOpen, onClose }) => {
    const { apiUrl, apiKey, instanceName, briefing, setConfig, ragSources } = useStore();
    if (!isOpen) return null;

    const handleSave = (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        setConfig({
            apiUrl: data.get('apiUrl'),
            apiKey: data.get('apiKey'),
            instanceName: data.get('instanceName'),
            briefing: data.get('briefing')
        });
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-panel" style={{ width: '600px' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h3>AURA Intelligence Config</h3><X size={24} onClick={onClose} style={{ cursor: 'pointer' }} /></div>
                <form onSubmit={handleSave}>
                    <div className="input-field-group">
                        <div className="input-group"><label>API URL</label><input name="apiUrl" defaultValue={apiUrl} required /></div>
                        <div className="input-group"><label>API Key</label><input name="apiKey" defaultValue={apiKey} required /></div>
                        <div className="input-group"><label>Instância</label><input name="instanceName" defaultValue={instanceName} required /></div>
                    </div>

                    <div className="input-group" style={{ marginTop: '15px' }}>
                        <label>Briefing do Negócio (Knowledge Base)</label>
                        <div style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '12px',
                            padding: '20px',
                            textAlign: 'center'
                        }}>
                            <Brain size={32} color="var(--accent-primary)" style={{ marginBottom: '10px', opacity: 0.8 }} />
                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '15px' }}>
                                O conhecimento da sua IA agora é gerido de forma estratégica e estruturada.
                            </p>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={() => {
                                    onClose(); // Close config
                                    // The Sidebar/App handles opening BriefingModal via store or state
                                    // For now, we manually trigger the store if needed or just tell the user
                                    window.dispatchEvent(new CustomEvent('open-briefing'));
                                }}
                                style={{ padding: '8px 20px', fontSize: '12px', borderRadius: '8px' }}
                            >
                                Gerir Inteligência do Cérebro
                            </button>
                        </div>
                    </div>

                    <div className="input-group" style={{ marginTop: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ margin: 0 }}>Fontes de Conhecimento (RAG)</label>
                            <button
                                type="button"
                                onClick={() => setConfig({
                                    ragSources: [
                                        { id: 1, name: 'Tabela de Preços - Invisalign', keywords: ['preço', 'valor', 'quanto', 'invisalign'], content: 'O Invisalign Lite começa em R$ 8.000. O Full em R$ 12.000. Parcelamos em 12x sem juros.' },
                                        { id: 2, name: 'Protocolo Ortodontia', keywords: ['aparelho', 'ferrinho', 'orto', 'manutenção'], content: 'Manutenção mensal de R$ 150. Documentação ortodôntica inclusa no fechamento.' },
                                        { id: 3, name: 'Implantes Dentários', keywords: ['implante', 'dente', 'parafuso', 'dentadura', 'straumann'], content: 'Trabalhamos com Implantes Straumann (Suíços). Avaliação inicial inclui escaneamento 3D.' }
                                    ]
                                })}
                                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid var(--glass-border)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
                            >
                                Restaurar Padrões v8
                            </button>
                        </div>
                        <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '11px' }}>
                            {(!ragSources || ragSources.length === 0) ? (
                                <span style={{ opacity: 0.5 }}>Nenhuma fonte adicional carregada.</span>
                            ) : (
                                ragSources.map((s, i) => <div key={i} style={{ marginBottom: '4px' }}>📁 {s.name}</div>)
                            )}
                        </div>
                    </div>

                    <button type="submit" className="btn-save" style={{ marginTop: '20px' }}><Save size={18} /> Salvar Configuração AURA v8</button>
                </form>
            </div>
        </div>
    );
};
export default ConfigModal;
