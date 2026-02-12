import React from 'react';
import { useStore } from '../store/useStore';
import { X, Save, UserPlus, Trash2 } from 'lucide-react';

const ConfigModal = ({ isOpen, onClose }) => {
    const {
        apiUrl,
        apiKey,
        managerPhone,
        setConfig,
        teamUsers,
        addTeamUser,
        removeTeamUser,
        canAddTeamUser,
        getMaxTeamUsers,
        hasFeature,
    } = useStore();

    const [localConfig, setLocalConfig] = React.useState({
        apiUrl: '',
        apiKey: '',
        managerPhone: ''
    });
    const [newUser, setNewUser] = React.useState({ name: '', email: '', role: 'agent' });
    const hasMultiUser = hasFeature('multi_user');

    React.useEffect(() => {
        if (isOpen) {
            setLocalConfig({ apiUrl, apiKey, managerPhone });
        }
    }, [isOpen, apiUrl, apiKey, managerPhone]);

    if (!isOpen) return null;

    const handleSave = () => {
        setConfig(localConfig);
        onClose();
    };

    const handleAddUser = () => {
        const result = addTeamUser(newUser);
        if (!result.ok) {
            if (result.reason === 'limit') {
                alert(`Seu plano permite até ${getMaxTeamUsers()} usuário(s).`);
                return;
            }
            if (result.reason === 'duplicate_email') {
                alert('Este email já está cadastrado.');
                return;
            }
            alert('Preencha um nome válido para o usuário.');
            return;
        }
        setNewUser({ name: '', email: '', role: 'agent' });
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
            <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px', width: '100%', maxHeight: '90vh', overflow: 'hidden' }}>
                <div className="modal-header">
                    <h2>Configurações AURA</h2>
                    <button className="icon-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0', overflowY: 'auto', maxHeight: 'calc(90vh - 170px)' }}>
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
                        <label>Telefone do Gestor (Loop de Aprendizado)</label>
                        <input
                            type="text"
                            value={localConfig.managerPhone}
                            onChange={e => setLocalConfig({ ...localConfig, managerPhone: e.target.value })}
                            placeholder="5511999999999"
                        />
                    </div>

                    <div className="divider" style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '5px 0' }}></div>

                    <div className="input-group" style={{ gap: '10px', display: 'flex', flexDirection: 'column' }}>
                        <label>Usuários da Equipe ({(teamUsers || []).length}/{getMaxTeamUsers()})</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {(teamUsers || []).map((user) => (
                                <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid #E5E5E7', borderRadius: '10px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <strong style={{ fontSize: '13px' }}>{user.name}</strong>
                                        <span style={{ fontSize: '11px', color: '#86868b' }}>{user.email || 'sem email'} · {user.role}</span>
                                    </div>
                                    {user.role !== 'owner' && (
                                        <button
                                            type="button"
                                            onClick={() => removeTeamUser(user.id)}
                                            style={{ border: '1px solid #FED7D7', background: '#FFF5F5', color: '#E53E3E', borderRadius: '8px', width: '34px', height: '34px', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {hasMultiUser ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', padding: '10px', border: '1px solid #ECEEF2', borderRadius: '12px', background: '#FAFBFC' }}>
                                <input
                                    type="text"
                                    placeholder="Nome"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
                                />
                                <input
                                    type="email"
                                    placeholder="email@empresa.com"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                                />
                                <select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value }))}
                                >
                                    <option value="agent">Atendente</option>
                                    <option value="manager">Gestor</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={handleAddUser}
                                    disabled={!canAddTeamUser()}
                                    style={{ border: '1px solid #E5E5E7', background: '#fff', borderRadius: '10px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                    title={!canAddTeamUser() ? 'Limite do plano atingido' : 'Adicionar usuário'}
                                >
                                    <UserPlus size={15} /> Adicionar usuário
                                </button>
                            </div>
                        ) : (
                            <p style={{ margin: 0, fontSize: '12px', color: '#86868b' }}>
                                Seu plano atual permite apenas 1 usuário. Faça upgrade para liberar equipe.
                            </p>
                        )}
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
