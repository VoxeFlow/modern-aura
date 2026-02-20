import React, { useState } from 'react';
import { NeonButton } from '../components/NeonButton';
import SettingsView from './pages/SettingsView';
import AutomationView from './pages/AutomationView';
import ProductManager from './pages/ProductManager';
import AdminUsers from './pages/AdminUsers';
import CRMView from './pages/CRMView';
import BrainView from './pages/BrainView';
import {
    BarChart3,
    Users,
    Settings,
    Package,
    LogOut,
    Bot,
    Zap,
    Menu,
    X,
    TrendingUp,
    Calendar,
    Contact,
    Brain
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${active
            ? 'bg-monstro-primary text-black font-bold shadow-lg shadow-monstro-primary/20'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
    >
        <Icon size={20} strokeWidth={active ? 2.5 : 2} />
        {!collapsed && <span>{label}</span>}
    </button>
);

const Dashboard = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const isAdmin = user?.role === 'admin';

    // Fetch Analytics
    React.useEffect(() => {
        if (activeTab === 'dashboard') {
            const fetchStats = async () => {
                try {
                    const res = await fetch('/api/stats', {
                        headers: { 'X-User-Email': user.email }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setStats(data);
                    }
                } catch (e) {
                    console.error("Failed to fetch stats", e);
                } finally {
                    setLoadingStats(false);
                }
            };
            fetchStats();
        }
    }, [activeTab, user.email]);

    // Render Content Logic
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <div className="space-y-8">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="text-sm font-bold text-gray-400 uppercase flex items-center gap-2">
                                    <Users size={16} /> Leads (Hoje)
                                </div>
                                <div className="text-4xl font-black text-gray-900 mt-2">
                                    {loadingStats ? '-' : stats?.leads?.today || 0}
                                </div>
                                <div className="text-xs font-bold text-green-500 mt-2 flex items-center gap-1">
                                    <TrendingUp size={12} />
                                    +{loadingStats ? '0' : stats?.leads?.growth}% essa semana
                                </div>
                            </div>

                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="text-sm font-bold text-gray-400 uppercase flex items-center gap-2">
                                    <BarChart3 size={16} /> {isAdmin ? 'Faturamento Global' : 'Minhas Vendas'}
                                </div>
                                <div className="text-4xl font-black text-gray-900 mt-2">
                                    {loadingStats ? '-' : `R$ ${stats?.sales?.total?.toLocaleString('pt-BR') || '0,00'}`}
                                </div>
                                <div className="text-xs font-bold text-green-500 mt-2">
                                    {isAdmin
                                        ? `${stats?.sales?.active_clients || 0} Clientes Ativos`
                                        : 'R$ 0,00 Disponível para saque'}
                                </div>
                            </div>

                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="text-sm font-bold text-gray-400 uppercase flex items-center gap-2">
                                    <Zap size={16} /> Conversão
                                </div>
                                <div className="text-4xl font-black text-gray-900 mt-2">
                                    {loadingStats ? '-' : `${stats?.conversion?.rate || 0}%`}
                                </div>
                                <div className="text-xs font-bold text-monstro-primary-dim mt-2">
                                    {stats?.conversion?.status || 'Calculando...'}
                                </div>
                            </div>
                        </div>

                        {/* Charts Section */}
                        <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Calendar size={18} className="text-gray-400" /> Performance Semanal
                                </h3>
                                <select className="bg-white border border-gray-200 text-xs font-bold rounded-lg px-3 py-1 outline-none">
                                    <option>Últimos 7 dias</option>
                                    <option>Últimos 30 dias</option>
                                </select>
                            </div>

                            <div className="h-[300px] w-full">
                                {loadingStats ? (
                                    <div className="h-full flex items-center justify-center text-gray-400 text-sm font-bold animate-pulse">
                                        Carregando gráfico...
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats?.history || []}>
                                            <defs>
                                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 12, fill: '#9CA3AF', fontWeight: 'bold' }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 12, fill: '#9CA3AF', fontWeight: 'bold' }}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)' }}
                                                cursor={{ stroke: '#00ff88', strokeWidth: 2 }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="sales"
                                                stroke="#00ff88"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorSales)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'crm':
                return <CRMView />;
            case 'brain':
                return <BrainView user={user} />;
            case 'products':
                return <ProductManager />;
            case 'automation':
                return <AutomationView user={user} />;
            case 'users':
                return <AdminUsers user={user} />;
            case 'settings':
                return <SettingsView user={user} />;
            default:
                return (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                            <Settings size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Módulo em Desenvolvimento</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-xs">
                            Estamos configurando o painel de {activeTab} para sua conta.
                        </p>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-white flex text-gray-900 font-sans">
            {/* Sidebar */}
            <aside className={`
        fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 w-64 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
                <div className="h-full flex flex-col p-6">
                    <div className="flex items-center gap-2 mb-10 px-2 pt-2">
                        <span className="w-4 h-4 bg-monstro-primary rounded-md"></span>
                        <div className="flex flex-col">
                            <span className="font-black tracking-tighter text-xl leading-none">MONSTRO</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                {isAdmin ? 'ADMIN' : 'CLIENTE'}
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 space-y-2">
                        <SidebarItem
                            icon={BarChart3}
                            label="Visão Geral"
                            active={activeTab === 'dashboard'}
                            onClick={() => setActiveTab('dashboard')}
                        />

                        <SidebarItem
                            icon={Contact}
                            label="CRM & Leads"
                            active={activeTab === 'crm'}
                            onClick={() => setActiveTab('crm')}
                        />

                        {!isAdmin && (
                            <SidebarItem
                                icon={Package}
                                label="Meus Produtos"
                                active={activeTab === 'products'}
                                onClick={() => setActiveTab('products')}
                            />
                        )}

                        {!isAdmin && (
                            <SidebarItem
                                icon={Zap}
                                label="Funis de Venda"
                                active={activeTab === 'funnels'}
                                onClick={() => setActiveTab('funnels')}
                            />
                        )}

                        <SidebarItem
                            icon={Bot}
                            label="Automação IA"
                            active={activeTab === 'automation'}
                            onClick={() => setActiveTab('automation')}
                        />

                        <SidebarItem
                            icon={Brain}
                            label="Cérebro do Negócio"
                            active={activeTab === 'brain'}
                            onClick={() => setActiveTab('brain')}
                        />

                        {isAdmin && (
                            <SidebarItem
                                icon={Users}
                                label="Usuários"
                                active={activeTab === 'users'}
                                onClick={() => setActiveTab('users')}
                            />
                        )}

                        {/* Permission Gate for Settings */}
                        {isAdmin && (
                            <SidebarItem
                                icon={Settings}
                                label="Configurações (Admin)"
                                active={activeTab === 'settings'}
                                onClick={() => setActiveTab('settings')}
                            />
                        )}
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                        <SidebarItem
                            icon={LogOut}
                            label="Sair"
                            onClick={onLogout}
                        />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 h-screen overflow-y-auto flex flex-col relative bg-gray-50/50">
                {/* Mobile Header */}
                <header className="lg:hidden bg-white border-b border-gray-100 p-4 flex items-center justify-between sticky top-0 z-40">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-monstro-primary rounded-full"></span>
                        <span className="font-bold">Dashboard</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600">
                        {isMobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </header>

                <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
                    {/* Header */}
                    <div className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                                {activeTab === 'dashboard' && 'Visão Geral'}
                                {activeTab === 'crm' && 'CRM & Leads'}
                                {activeTab === 'products' && 'Gerenciar Produtos'}
                                {activeTab === 'funnels' && 'Meus Funis'}
                                {activeTab === 'automation' && 'Automação IA'}
                                {activeTab === 'users' && 'Gerenciar Usuários'}
                                {activeTab === 'settings' && 'Configurações'}
                                {activeTab === 'brain' && 'Cérebro do Negócio'}
                            </h1>
                            <p className="text-gray-500 mt-1 font-medium">
                                Olá, <span className="text-gray-900 font-bold">{user?.name || 'Afiliado'}</span>.
                                {isAdmin && ' Você tem controle total.'}
                            </p>
                        </div>

                        {activeTab === 'dashboard' && !isAdmin && (
                            <NeonButton variant="primary" className="text-xs px-4 py-2 shadow-none">
                                + NOVA CAMPANHA
                            </NeonButton>
                        )}
                    </div>

                    {/* View Content */}
                    <div className={`bg-white border border-gray-100 rounded-3xl p-8 min-h-[400px] shadow-sm ${activeTab === 'automation' ? 'p-0 overflow-hidden border-0 bg-transparent' : ''}`}>
                        {renderContent()}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
