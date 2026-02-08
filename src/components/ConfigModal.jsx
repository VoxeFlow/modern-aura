import React, { useState, useEffect } from 'react';
import { X, Save, Brain, AlertTriangle, Settings, Link2, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { useStore } from '../store/useStore';

const ConfigModal = ({ isOpen, onClose }) => {
    const store = useStore();
    const { setConfig } = store;
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [formData, setFormData] = useState({
        apiUrl: '',
        apiKey: '',
        instanceName: '',
        briefing: ''
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                apiUrl: store.apiUrl || '',
                apiKey: store.apiKey || '',
                instanceName: store.instanceName || '',
                briefing: store.briefing || ''
            });
        }
    }, [isOpen, store.apiUrl, store.apiKey, store.instanceName, store.briefing]);

    if (!isOpen) return null;

    const handleSave = (e) => {
        e.preventDefault();
        if (store.apiKey && !formData.apiKey) {
            alert("Atenção: A chave da API não pode ficar vazia.");
            return;
        }
        setConfig(formData);
        onClose();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(0,0,0,0.1)' }}>
            <div className="modal-content glass-panel" style={{ width: '500px', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.05)', padding: '0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)' }} onClick={e => e.stopPropagation()}>

                <div className="modal-header" style={{ padding: '25px 30px', borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'linear-gradient(to right, rgba(197, 160, 89, 0.05), transparent)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ background: 'var(--accent-primary)', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Settings size={20} color="white" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, color: '#1d1d1f', fontSize: '18px', fontWeight: 'bold' }}>Painel de Controle AURA</h3>
                            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(0,0,0,0.4)' }}>Configurações de Sistema e Inteligência</p>
                        </div>
                    </div>
                    <X size={24} onClick={onClose} style={{ cursor: 'pointer', opacity: 0.3, transition: 'opacity 0.2s' }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.3} />
                </div>

                <form onSubmit={handleSave} style={{ padding: '30px' }}>

                    {/* HUB ACTIONS - CLEAN LIGHT DESIGN */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                        <button
                            type="button"
                            onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('open-connect')); }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                padding: '20px',
                                background: '#F9F9FA',
                                border: '1px solid rgba(0,0,0,0.03)',
                                borderRadius: '18px',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(197, 160, 89, 0.05)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#F9F9FA'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.03)'; }}
                        >
                            <div style={{ background: 'white', padding: '10px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                                <Link2 color="var(--accent-primary)" size={22} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <span style={{ color: '#1d1d1f', fontSize: '13px', fontWeight: 'bold', display: 'block' }}>WhatsApp</span>
                                <span style={{ color: '#86868b', fontSize: '10px' }}>Conexão</span>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('open-briefing')); }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                padding: '20px',
                                background: '#F9F9FA',
                                border: '1px solid rgba(0,0,0,0.03)',
                                borderRadius: '18px',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(197, 160, 89, 0.05)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#F9F9FA'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.03)'; }}
                        >
                            <div style={{ background: 'white', padding: '10px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                                <Brain color="var(--accent-primary)" size={22} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <span style={{ color: '#1d1d1f', fontSize: '13px', fontWeight: 'bold', display: 'block' }}>Cérebro IA</span>
                                <span style={{ color: '#86868b', fontSize: '10px' }}>Conhecimento</span>
                            </div>
                        </button>
                    </div>

                    {/* ADVANCED SECTION TOGGLE */}
                    <div
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 0', borderTop: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Lock size={14} color="#86868b" />
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#86868b' }}>Configurações Avançadas</span>
                        </div>
                        {showAdvanced ? <ChevronUp size={16} color="#86868b" /> : <ChevronDown size={16} color="#86868b" />}
                    </div>

                    {showAdvanced && (
                        <div style={{ paddingTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="input-group">
                                <label style={{ fontSize: '10px', color: '#86868b', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>API URL</label>
                                <input name="apiUrl" value={formData.apiUrl} onChange={handleChange} required style={{ height: '40px', background: '#FFFFFF', border: '1px solid #D1D1D1', borderRadius: '10px', color: '#1d1d1f', padding: '0 12px', fontSize: '12px', width: '100%' }} />
                            </div>
                            <div className="input-group">
                                <label style={{ fontSize: '10px', color: '#86868b', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>INSTÂNCIA</label>
                                <input name="instanceName" value={formData.instanceName} onChange={handleChange} required style={{ height: '40px', background: '#FFFFFF', border: '1px solid #D1D1D1', borderRadius: '10px', color: '#1d1d1f', padding: '0 12px', fontSize: '12px', width: '100%' }} />
                            </div>
                            <div className="input-group" style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontSize: '10px', color: '#86868b', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>API KEY</label>
                                <input type="password" name="apiKey" value={formData.apiKey} onChange={handleChange} required style={{ height: '40px', background: '#FFFFFF', border: '1px solid #D1D1D1', borderRadius: '10px', color: '#1d1d1f', padding: '0 12px', fontSize: '12px', width: '100%' }} />
                            </div>

                        </div>
                    )}

                    <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center' }}>
                        <button type="submit" className="btn-primary" style={{ padding: '16px 80px', borderRadius: '50px', fontSize: '14px', fontWeight: 'bold' }}>
                            <Save size={18} /> Salvar Configurações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
export default ConfigModal;
