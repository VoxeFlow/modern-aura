import { LayoutDashboard, History, Settings, LogOut, Link2, Brain, Kanban } from 'lucide-react';
import { useStore } from '../store/useStore';

const Sidebar = ({ onOpenConfig, onOpenConnect, onOpenBriefing }) => {
    const { activeChat, currentView, setCurrentView } = useStore();
    return (
        <aside className="sidebar glass-panel">
            <div className="logo-container">
                <h1>Aura</h1>
            </div>

            <nav id="mainNav">
                <ul>
                    <li className={currentView === 'dashboard' ? 'active' : ''} onClick={() => setCurrentView('dashboard')}>
                        <LayoutDashboard size={24} />
                    </li>
                    <li className={currentView === 'crm' ? 'active' : ''} onClick={() => setCurrentView('crm')} title="CRM Pipeline">
                        <Kanban size={24} />
                    </li>
                    <li className={currentView === 'history' ? 'active' : ''} onClick={() => setCurrentView('history')}>
                        <History size={24} />
                    </li>
                    <li title="Configuração Estratégica AI" onClick={onOpenBriefing} style={{ color: 'var(--accent-primary)' }}>
                        <Brain size={24} />
                    </li>
                    <li title="Conectar WhatsApp" onClick={onOpenConnect}><Link2 size={24} /></li>
                    <li title="Configurações API" onClick={onOpenConfig}><Settings size={24} /></li>
                </ul>
            </nav>

            <div className="sidebar-footer">
                <div className="conn-status" style={{ fontSize: '10px', opacity: 0.5, marginBottom: '10px', textAlign: 'center', wordBreak: 'break-all', padding: '0 10px' }}>
                    {activeChat?.id ? 'ID: ' + activeChat.id : ''}
                </div>
                <LogOut size={20} className="logout-icon" />
            </div>
        </aside>
    );
};
export default Sidebar;
