import { useEffect, useMemo, useState } from 'react';
import { fetchAdminTenants, updateAdminTenantPlan } from '../services/adminApi';

const PLAN_OPTIONS = ['lite', 'pro', 'scale'];

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('pt-BR');
}

export default function OwnerView() {
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState('');
    const [items, setItems] = useState([]);
    const [draftPlans, setDraftPlans] = useState({});
    const [error, setError] = useState('');

    const totalTenants = items.length;
    const byPlan = useMemo(() => {
        return items.reduce((acc, row) => {
            const key = String(row?.plan || 'pro').toLowerCase();
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    }, [items]);
    const totals = useMemo(() => {
        return items.reduce((acc, row) => {
            const metrics = row?.metrics || {};
            acc.totalMessages += Number(metrics.total_messages || 0);
            acc.messages30d += Number(metrics.messages_30d || 0);
            acc.totalAi += Number(metrics.total_ai_events || 0);
            acc.ai30d += Number(metrics.ai_events_30d || 0);
            acc.openConversations += Number(metrics.open_conversations || 0);
            acc.openLeads += Number(metrics.open_leads || 0);
            return acc;
        }, {
            totalMessages: 0,
            messages30d: 0,
            totalAi: 0,
            ai30d: 0,
            openConversations: 0,
            openLeads: 0,
        });
    }, [items]);

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const rows = await fetchAdminTenants();
            setItems(rows);
            setDraftPlans(
                rows.reduce((acc, row) => {
                    acc[row.id] = String(row.plan || 'pro').toLowerCase();
                    return acc;
                }, {})
            );
        } catch (err) {
            setError(err?.message || 'Falha ao carregar central da plataforma.');
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

    return (
        <div className="history-view glass-panel" style={{ margin: 20, padding: 20, overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div>
                    <h2 style={{ margin: 0 }}>Central da Plataforma</h2>
                    <p style={{ margin: '6px 0 0', color: '#6b7280' }}>Visão executiva de clientes, planos e performance operacional.</p>
                </div>
                <button className="v3-btn secondary" onClick={load} disabled={loading}>
                    {loading ? 'Atualizando...' : 'Atualizar'}
                </button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div className="glass-panel" style={{ padding: 12, minWidth: 140 }}>Clientes: <strong>{totalTenants}</strong></div>
                <div className="glass-panel" style={{ padding: 12, minWidth: 140 }}>Scale: <strong>{byPlan.scale || 0}</strong></div>
                <div className="glass-panel" style={{ padding: 12, minWidth: 140 }}>Pro: <strong>{byPlan.pro || 0}</strong></div>
                <div className="glass-panel" style={{ padding: 12, minWidth: 140 }}>Lite: <strong>{byPlan.lite || 0}</strong></div>
                <div className="glass-panel" style={{ padding: 12, minWidth: 190 }}>Mensagens (30d): <strong>{totals.messages30d}</strong></div>
                <div className="glass-panel" style={{ padding: 12, minWidth: 190 }}>Uso IA (30d): <strong>{totals.ai30d}</strong></div>
                <div className="glass-panel" style={{ padding: 12, minWidth: 190 }}>Conversas abertas: <strong>{totals.openConversations}</strong></div>
                <div className="glass-panel" style={{ padding: 12, minWidth: 190 }}>Leads abertos: <strong>{totals.openLeads}</strong></div>
            </div>

            {error && (
                <div style={{ marginBottom: 12, color: '#b91c1c', fontWeight: 600 }}>{error}</div>
            )}

            {loading ? (
                <div>Carregando clientes...</div>
            ) : (
                <div style={{ overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ padding: '10px 8px' }}>Empresa</th>
                                <th style={{ padding: '10px 8px' }}>Slug</th>
                                <th style={{ padding: '10px 8px' }}>Owner</th>
                                <th style={{ padding: '10px 8px' }}>Plano</th>
                                <th style={{ padding: '10px 8px' }}>Canais</th>
                                <th style={{ padding: '10px 8px' }}>Usuários</th>
                                <th style={{ padding: '10px 8px' }}>Msgs (30d)</th>
                                <th style={{ padding: '10px 8px' }}>IA (30d)</th>
                                <th style={{ padding: '10px 8px' }}>Conversas abertas</th>
                                <th style={{ padding: '10px 8px' }}>Leads abertos</th>
                                <th style={{ padding: '10px 8px' }}>Última msg</th>
                                <th style={{ padding: '10px 8px' }}>Atualizado</th>
                                <th style={{ padding: '10px 8px' }}>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((row) => {
                                const metrics = row?.metrics || {};
                                return (
                                <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '10px 8px' }}>{row.name || '-'}</td>
                                    <td style={{ padding: '10px 8px', color: '#6b7280' }}>{row.slug || '-'}</td>
                                    <td style={{ padding: '10px 8px' }}>{row.owner_email || '-'}</td>
                                    <td style={{ padding: '10px 8px' }}>
                                        <select
                                            value={draftPlans[row.id] || 'pro'}
                                            onChange={(e) => setDraftPlans((prev) => ({ ...prev, [row.id]: e.target.value }))}
                                        >
                                            <option value="lite">Lite</option>
                                            <option value="pro">Pro</option>
                                            <option value="scale">Scale</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: '10px 8px' }}>{Number(row.channel_count || 0)}</td>
                                    <td style={{ padding: '10px 8px' }}>{Number(row.team_count || 0)}</td>
                                    <td style={{ padding: '10px 8px' }}>
                                        <strong>{Number(metrics.messages_30d || 0)}</strong>
                                        <span style={{ color: '#6b7280' }}> / {Number(metrics.total_messages || 0)}</span>
                                    </td>
                                    <td style={{ padding: '10px 8px' }}>
                                        <strong>{Number(metrics.ai_events_30d || 0)}</strong>
                                        <span style={{ color: '#6b7280' }}> / {Number(metrics.total_ai_events || 0)}</span>
                                    </td>
                                    <td style={{ padding: '10px 8px' }}>{Number(metrics.open_conversations || 0)}</td>
                                    <td style={{ padding: '10px 8px' }}>{Number(metrics.open_leads || 0)}</td>
                                    <td style={{ padding: '10px 8px', color: '#6b7280' }}>{formatDate(metrics.last_message_at)}</td>
                                    <td style={{ padding: '10px 8px', color: '#6b7280' }}>{formatDate(row.updated_at)}</td>
                                    <td style={{ padding: '10px 8px' }}>
                                        <button
                                            className="v3-btn primary"
                                            style={{ minWidth: 110 }}
                                            disabled={savingId === row.id}
                                            onClick={() => savePlan(row.id)}
                                        >
                                            {savingId === row.id ? 'Salvando...' : 'Salvar plano'}
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
