import React from 'react';
import { useStore } from '../store/useStore';
import { X, Save, Phone } from 'lucide-react';

const ConfigModal = ({ isOpen, onClose }) => {
    const {
        apiUrl, apiKey, instanceName, managerPhone, setConfig
    } = useStore();

    const [localConfig, setLocalConfig] = React.useState({
        apiUrl: '',
        apiKey: '',
        instanceName: '',
        managerPhone: ''
    });

    React.useEffect(() => {
        if (isOpen) {
            setLocalConfig({ apiUrl, apiKey, instanceName, managerPhone });
        }
    }, [isOpen, apiUrl, apiKey, instanceName, managerPhone]);

    if (!isOpen) return null;

    const handleSave = () => {
        setConfig(localConfig);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', width: '100%' }}>
                <div className="modal-header">
                    <h2>Configurações AURA</h2>
                    <button className="icon-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
                    <div className="input-group">
                        <label>Endpoint API (Evolution)</label>
                        <input
                            type="text"
                            value={localConfig.apiUrl}
                            onChange={e => setLocalConfig({ ...localConfig, apiUrl: e.target.value })}
                            placeholder="https://sua-api.com"
                        />
                    </div>

                    <div className="input-group">
                        <label>API Key</label>
                        <input
                            type="password"
                            value={localConfig.apiKey}
                            onChange={e => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
                            placeholder="Chave de acesso"
                        />
                    </div>

                    <div className="input-group">
                        <label>Nome da Instância</label>
                        <input
                            type="text"
                            value={localConfig.instanceName}
                            onChange={e => setLocalConfig({ ...localConfig, instanceName: e.target.value })}
                        />
                    </div>

                    <div className="divider" style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '5px 0' }}></div>

                    <div className="input-group">
                        <label style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Phone size={16} /> Telefone do Gestor (AURA Loop)
                        </label>
                        <small style={{ display: 'block', marginBottom: '8px', opacity: 0.7 }}>
                            AURA enviará perguntas para este número quando não souber algo.
                        </small>
                        <input
                            type="text"
                            value={localConfig.managerPhone}
                            onChange={e => setLocalConfig({ ...localConfig, managerPhone: e.target.value })}
                            placeholder="5511999999999"
                        />
                    </div>
                </div>

                <div className="modal-footer" style={{ marginTop: '20px' }}>
                    <button className="v3-btn secondary" onClick={onClose}>Cancelar</button>
                    <button className="v3-btn primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Save size={18} /> Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfigModal;
