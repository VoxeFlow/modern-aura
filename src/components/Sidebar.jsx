import { X, LayoutDashboard, Kanban, History, Settings, LogOut, Brain, Zap, Crown } from 'lucide-react';
import { useStore } from '../store/useStore';
import logoLight from '../assets/logo-light.png';

const Sidebar = ({ onOpenConfig, onOpenConnect, onOpenBriefing, onLogout, isOpen, onClose }) => {
    const { activeChat, currentView, switchView, hasFeature, tenantPlan, getPlanConfig, tenantName, userEmail } = useStore();
    const hasCrm = hasFeature('crm_basic');
    const planLabel = getPlanConfig()?.label || String(tenantPlan || '').toUpperCase();
    const masterEmail = String(import.meta.env.VITE_MASTER_EMAIL || '').trim().toLowerCase();
    const isPlatformOwner = Boolean(masterEmail) && String(userEmail || '').trim().toLowerCase() === masterEmail;
    return (
        <>
            {/* Mobile Overlay */}
            <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />

            <aside className={`sidebar glass-panel ${isOpen ? 'mobile-open' : ''}`}>
                <button className="mobile-close-btn" onClick={onClose}>
                    <X size={24} />
                </button>
                <div className="logo-container" style={{ padding: '20px 0', textAlign: 'center' }}>
                    <img src={logoLight} alt="AURA" style={{ width: '80%', maxWidth: '120px', height: 'auto' }} />
                </div>

                <nav id="mainNav">
                    <ul>
                        <li className={currentView === 'dashboard' ? 'active' : ''} onClick={() => switchView('dashboard')} title="Dashboard">
                            <LayoutDashboard size={24} />
                        </li>
                        {hasCrm && (
                            <li className={currentView === 'crm' ? 'active' : ''} onClick={() => switchView('crm')} title="CRM Pipeline">
                                <Kanban size={24} />
                            </li>
                        )}
                        <li className={currentView === 'history' ? 'active' : ''} onClick={() => switchView('history')} title="Histórico">
                            <History size={24} />
                        </li>
                        {isPlatformOwner && (
                            <li className={currentView === 'owner' ? 'active' : ''} onClick={() => switchView('owner')} title="Central da Plataforma">
                                <Crown size={24} />
                            </li>
                        )}
                        <li className={currentView === 'monstro_admin' ? 'active' : ''} onClick={() => switchView('monstro_admin')} title="O MONSTRO Admin">
                            <Zap size={24} className="text-monstro-primary" />
                        </li>
                    </ul>
                </nav>

                <div className="sidebar-footer">
                    <div style={{ padding: '10px 0', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                        <div
                            title="AURA Brain"
                            onClick={onOpenBriefing}
                            className="sidebar-action-btn"
                            style={{
                                cursor: 'pointer',
                                padding: '10px',
                                borderRadius: '12px',
                                color: 'var(--accent-primary)',
                                transition: 'all 0.3s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(197, 160, 89, 0.1)'
                            }}
                        >
                            <Brain size={22} />
                        </div>

                        <div
                            title="Conexão WhatsApp"
                            onClick={onOpenConnect}
                            className="sidebar-action-btn"
                            style={{
                                cursor: 'pointer',
                                padding: '10px',
                                borderRadius: '12px',
                                color: 'var(--text-muted)',
                                transition: 'all 0.3s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-primary)'; e.currentTarget.style.background = 'rgba(197, 160, 89, 0.1)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                        >
                            <Zap size={22} />
                        </div>

                        <div
                            title="Configurações Aura"
                            onClick={onOpenConfig}
                            className="sidebar-action-btn"
                            style={{
                                cursor: 'pointer',
                                padding: '10px',
                                borderRadius: '12px',
                                color: 'var(--text-muted)',
                                transition: 'all 0.3s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-primary)'; e.currentTarget.style.background = 'rgba(197, 160, 89, 0.1)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                        >
                            <Settings size={22} />
                        </div>

                        <button
                            onClick={onLogout}
                            className="logout-button"
                            title="Sair"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', width: '100%', color: 'var(--text-muted)', transition: 'color 0.2s' }}
                            onMouseEnter={(e) => e.target.style.color = '#ff4d4d'}
                            onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                        >
                            <LogOut size={20} />
                        </button>

                        <div style={{ fontSize: '10px', opacity: 0.3, marginTop: '10px', color: 'var(--text-muted)' }}>
                            v11.3.3.fixed
                        </div>
                        <div style={{ fontSize: '10px', opacity: 0.5, color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                            Plano: {planLabel}
                        </div>
                        {tenantName && (
                            <div style={{ fontSize: '10px', opacity: 0.55, color: '#7a7f88', marginTop: '2px' }}>
                                Tenant: {tenantName}
                            </div>
                        )}

                        <div className="conn-status" style={{ fontSize: '8px', opacity: 0.3, marginTop: '2px', textAlign: 'center', wordBreak: 'break-all', padding: '0 5px' }}>
                            {activeChat?.id ? activeChat.id : ''}
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
