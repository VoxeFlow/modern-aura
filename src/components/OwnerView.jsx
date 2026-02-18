import { useEffect, useMemo, useState } from 'react';
import { fetchAdminTenants, updateAdminTenantPlan } from '../services/adminApi';

const PLAN_OPTIONS = ['lite', 'pro', 'scale'];

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('pt-BR');
}

function planPillStyle(plan) {
    const key = String(plan || 'pro').toLowerCase();
    if (key === 'scale') return { color: '#6f5521', background: '#f9f1dd', border: '1px solid #e8d4a1' };
    if (key === 'lite') return { color: '#4f5561', background: '#f1f3f6', border: '1px solid #dde1e8' };
    return { color: '#243447', background: '#ecf2fa', border: '1px solid #cfdceb' };
}

export default function OwnerView() {
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState('');
    const [items, setItems] = useState([]);
    const [draftPlans, setDraftPlans] = useState({});
    const [error, setError] = useState('');

    const totalTenants = items.length;
    const byPlan = useMemo(() => items.reduce((acc, row) => {
        const key = String(row?.plan || 'pro').toLowerCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {}), [items]);

    const totals = useMemo(() => items.reduce((acc, row) => {
        const metrics = row?.metrics || {};
        acc.messages30d += Number(metrics.messages_30d || 0);
        acc.ai30d += Number(metrics.ai_events_30d || 0);
        acc.openConversations += Number(metrics.open_conversations || 0);
        acc.openLeads += Number(metrics.open_leads || 0);
        return acc;
    }, {
        messages30d: 0,
        ai30d: 0,
        openConversations: 0,
        openLeads: 0,
    }), [items]);

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const rows = await fetchAdminTenants();
            setItems(rows);
            setDraftPlans(rows.reduce((acc, row) => {
                acc[row.id] = String(row.plan || 'pro').toLowerCase();
                return acc;
            }, {}));
        } catch (err) {
            setError(err?.message || 'Falha ao carregar central.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const savePlan = async (tenantId) => {
        const nextPlan = String(draftPlans[tenantId] || '').toLowerCase();
        if (!PLAN_OPTIONS.includes(nextPlan)) return;
        setSavingId(tenantId);
        setError('');
        try {
            const updated = await updateAdminTenantPlan({ tenantId, plan: nextPlan });
            if (updated?.id) {
                setItems((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
            }
        } catch (err) {
            setError(err?.message || 'Não foi possível salvar o plano.');
        } finally {
            setSavingId('');
        }
    };

    const cards = [
        { label: 'Clientes Ativos', value: totalTenants },
        { label: 'Scale', value: byPlan.scale || 0 },
        { label: 'Pro', value: byPlan.pro || 0 },
        { label: 'Lite', value: byPlan.lite || 0 },
        { label: 'Mensagens (30d)', value: totals.messages30d },
        { label: 'Uso IA (30d)', value: totals.ai30d },
        { label: 'Conversas Abertas', value: totals.openConversations },
        { label: 'Leads Abertos', value: totals.openLeads },
    ];

    return (
        <div className="history-view glass-panel" style={{ margin: 20, padding: 28, overflow: 'auto', background: 'linear-gradient(180deg,#ffffff 0%,#f7f8fa 100%)', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 32, letterSpacing: '-0.02em' }}>Central Operacional</h2>
                    <p style={{ margin: '8px 0 0', color: '#667085', fontSize: 16 }}>Gestão de clientes, planos e desempenho da plataforma.</p>
                </div>
                <button className="v3-btn secondary" style={{ minWidth: 160, borderRadius: 12, fontWeight: 700 }} onClick={load} disabled={loading}>
                    {loading ? 'Atualizando...' : 'Atualizar dados'}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 18 }}>
                {cards.map((card) => (
                    <div key={card.label} style={{ border: '1px solid #e6e8ed', borderRadius: 14, background: '#fff', padding: '12px 14px' }}>
                        <div style={{ color: '#6b7280', fontSize: 13, fontWeight: 600 }}>{card.label}</div>
                        <div style={{ marginTop: 4, color: '#111827', fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>{card.value}</div>
                    </div>
                ))}
            </div>

            {error && <div style={{ marginBottom: 12, color: '#b91c1c', fontWeight: 600 }}>{error}</div>}

            {loading ? (
                <div style={{ color: '#6b7280' }}>Carregando clientes...</div>
            ) : (
                <div style={{ overflow: 'auto', borderRadius: 16, border: '1px solid #e5e7eb', background: '#fff' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                                {['Empresa', 'Slug', 'Owner', 'Plano', 'Canais', 'Usuários', 'Msgs (30d)', 'IA (30d)', 'Conversas', 'Leads', 'Última msg', 'Atualizado', 'Ação'].map((col) => (
                                    <th key={col} style={{ padding: '12px 10px', borderBottom: '1px solid #e5e7eb', color: '#475467', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.03em' }}>{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((row) => {
                                const metrics = row?.metrics || {};
                                const plan = String(row.plan || 'pro').toLowerCase();
                                return (
                                    <tr key={row.id} style={{ borderBottom: '1px solid #f0f2f5' }}>
                                        <td style={{ padding: '12px 10px', fontWeight: 700, color: '#1f2937' }}>{row.name || '-'}</td>
                                        <td style={{ padding: '12px 10px', color: '#667085', fontFamily: 'monospace' }}>{row.slug || '-'}</td>
                                        <td style={{ padding: '12px 10px' }}>{row.owner_email || '-'}</td>
                                        <td style={{ padding: '12px 10px' }}>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <span style={{ borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700, ...planPillStyle(plan) }}>
                                                    {plan.toUpperCase()}
                                                </span>
                                                <select
                                                    value={draftPlans[row.id] || 'pro'}
                                                    onChange={(e) => setDraftPlans((prev) => ({ ...prev, [row.id]: e.target.value }))}
                                                    style={{ borderRadius: 10, border: '1px solid #d4d8df', background: '#fff', padding: '6px 8px' }}
                                                >
                                                    <option value="lite">Lite</option>
                                                    <option value="pro">Pro</option>
                                                    <option value="scale">Scale</option>
                                                </select>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 10px' }}>{Number(row.channel_count || 0)}</td>
                                        <td style={{ padding: '12px 10px' }}>{Number(row.team_count || 0)}</td>
                                        <td style={{ padding: '12px 10px' }}>
                                            <strong>{Number(metrics.messages_30d || 0)}</strong>
                                            <span style={{ color: '#98a2b3' }}> / {Number(metrics.total_messages || 0)}</span>
                                        </td>
                                        <td style={{ padding: '12px 10px' }}>
                                            <strong>{Number(metrics.ai_events_30d || 0)}</strong>
                                            <span style={{ color: '#98a2b3' }}> / {Number(metrics.total_ai_events || 0)}</span>
                                        </td>
                                        <td style={{ padding: '12px 10px' }}>{Number(metrics.open_conversations || 0)}</td>
                                        <td style={{ padding: '12px 10px' }}>{Number(metrics.open_leads || 0)}</td>
                                        <td style={{ padding: '12px 10px', color: '#667085' }}>{formatDate(metrics.last_message_at)}</td>
                                        <td style={{ padding: '12px 10px', color: '#667085' }}>{formatDate(row.updated_at)}</td>
                                        <td style={{ padding: '12px 10px' }}>
                                            <button
                                                className="v3-btn primary"
                                                style={{ minWidth: 108, borderRadius: 999, fontWeight: 700 }}
                                                disabled={savingId === row.id}
                                                onClick={() => savePlan(row.id)}
                                            >
                                                {savingId === row.id ? 'Salvando...' : 'Salvar'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
