import { LayoutDashboard, History, Settings, LogOut, Link2, Brain, Kanban, X } from 'lucide-react';
import { useStore } from '../store/useStore';

const Sidebar = ({ onOpenConfig, onOpenConnect, onOpenBriefing, onLogout, isOpen, onClose }) => {
    const { activeChat, currentView, setCurrentView } = useStore();
    return (
        <>
            {/* Mobile Overlay */}
            <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />

            <aside className={`sidebar glass-panel ${isOpen ? 'mobile-open' : ''}`}>
                <button className="mobile-close-btn" onClick={onClose}>
                    <X size={24} />
                </button>
                <div className="logo-container">
                    <h1>Aura</h1>
                </div>

                <nav id="mainNav">
                    <ul>
                        <li className={currentView === 'dashboard' ? 'active' : ''} onClick={() => setCurrentView('dashboard')} title="Dashboard">
                            <LayoutDashboard size={24} />
                        </li>
                        <li className={currentView === 'crm' ? 'active' : ''} onClick={() => setCurrentView('crm')} title="CRM Pipeline">
                            <Kanban size={24} />
                        </li>
                        <li className={currentView === 'history' ? 'active' : ''} onClick={() => setCurrentView('history')} title="Histórico">
                            <History size={24} />
                        </li>
                    </ul>
                </nav>

                <div className="sidebar-footer">
                    <div style={{ padding: '10px 0', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                        <div
                            title="Configurações Aura"
                            onClick={onOpenConfig}
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

                        <div className="conn-status" style={{ fontSize: '8px', opacity: 0.3, marginTop: '5px', textAlign: 'center', wordBreak: 'break-all', padding: '0 5px' }}>
                            {activeChat?.id ? activeChat.id : ''}
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};
export default Sidebar;
