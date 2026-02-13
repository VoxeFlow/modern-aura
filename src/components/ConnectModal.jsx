import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, RefreshCw, LogOut, QrCode, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { io } from 'socket.io-client';
import { useStore } from '../store/useStore';
import WhatsAppService from '../services/whatsapp';
import {
    deleteTenantChannel,
    loadTenantChannels,
    mapChannelsToStore,
    upsertTenantChannel,
} from '../services/tenantData';

const ConnectModal = ({ isOpen, onClose }) => {
    const {
        apiUrl,
        whatsappChannels,
        activeWhatsAppChannelId,
        switchWhatsAppChannel,
        addWhatsAppChannel,
        updateWhatsAppChannel,
        removeWhatsAppChannel,
        getMaxWhatsAppChannels,
        whatsappChannelStatus,
        setWhatsAppChannelStatus,
        setWhatsAppChannels,
        hasFeature,
        tenantId,
        tenantSlug,
        userId,
    } = useStore();

    const [qrCode, setQrCode] = useState(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('checking');
    const socketRef = useRef(null);
    const [instanceDraft, setInstanceDraft] = useState('');
    const [channelLabelDraft, setChannelLabelDraft] = useState('');
    const [newChannelDraft, setNewChannelDraft] = useState('');
    const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);

    const channels = useMemo(
        () => (Array.isArray(whatsappChannels) ? whatsappChannels : []),
        [whatsappChannels]
    );
    const hasMultiWhatsapp = hasFeature('multi_whatsapp');
    const maxChannels = getMaxWhatsAppChannels();

    const activeChannel = useMemo(
        () => channels.find((item) => item.id === activeWhatsAppChannelId) || channels[0] || null,
        [channels, activeWhatsAppChannelId]
    );

    const firstChannelId = channels[0]?.id;
    const firstChannelConnected = firstChannelId ? whatsappChannelStatus?.[firstChannelId] === 'open' : false;
    const activeState = activeChannel?.id ? (whatsappChannelStatus?.[activeChannel.id] || status) : status;
    const activeConnected = activeState === 'open';
    const canAddMoreChannels = hasMultiWhatsapp && channels.length < maxChannels && firstChannelConnected;

    const stepOneDone = Boolean(String(activeChannel?.instanceName || '').trim());

    const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\/$/, '');
    const tenantPrefix = String(tenantSlug || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
    const stripTenantScope = useCallback((value = '') => {
        const raw = String(value || '').trim();
        if (!raw || !tenantPrefix) return raw;
        const prefix = `${tenantPrefix}--`;
        return raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
    }, [tenantPrefix]);

    const readQrFromPayload = (payload) => {
        const raw = payload?.qrcode?.base64 || payload?.base64 || payload?.qrcode || null;
        if (!raw || typeof raw !== 'string') return null;
        const clean = raw.replace(/^data:image\/[a-z]+;base64,/, '');
        return `data:image/png;base64,${clean}`;
    };

    const checkStatus = useCallback(async () => {
        const instance = String(activeChannel?.instanceName || '').trim();
        if (!instance) {
            setStatus('disconnected');
            if (activeChannel?.id) setWhatsAppChannelStatus(activeChannel.id, 'disconnected');
            setQrCode(null);
            return;
        }
        if (tenantPrefix && !instance.startsWith(`${tenantPrefix}--`)) {
            setStatus('disconnected');
            if (activeChannel?.id) setWhatsAppChannelStatus(activeChannel.id, 'disconnected');
            setQrCode(null);
            return;
        }
        const currentState = await WhatsAppService.checkConnection(instance);
        setStatus(currentState);
        if (activeChannel?.id) {
            setWhatsAppChannelStatus(activeChannel.id, currentState);
        }
        if (currentState === 'open') setQrCode(null);
    }, [activeChannel?.id, activeChannel?.instanceName, setWhatsAppChannelStatus, tenantPrefix]);

    useEffect(() => {
        if (!isOpen) return;
        setInstanceDraft(stripTenantScope(activeChannel?.instanceName || ''));
        setChannelLabelDraft(activeChannel?.label || '');
        setNewChannelDraft('');
        setIsAddChannelOpen(false);
        setQrCode(null);
        checkStatus();
    }, [isOpen, activeChannel?.id, activeChannel?.instanceName, activeChannel?.label, checkStatus, stripTenantScope]);

    useEffect(() => {
        if (!isOpen || !activeChannel?.instanceName || activeConnected) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            return;
        }

        const wsUrl = normalizeBaseUrl(apiUrl).replace('https://', 'wss://').replace('http://', 'ws://');
        const expectedInstance = activeChannel.instanceName;

        const nextSocket = io(wsUrl, {
            transports: ['websocket'],
            path: '/socket.io',
            reconnection: true,
            reconnectionAttempts: 5,
        });

        nextSocket.on('qrcode.updated', (payload) => {
            const payloadInstance = payload?.instance || payload?.data?.instance;
            if (payloadInstance && payloadInstance !== expectedInstance) return;
            const nextQr = readQrFromPayload(payload?.data || payload);
            if (nextQr) setQrCode(nextQr);
        });

        nextSocket.on('connection.update', (payload) => {
            const payloadInstance = payload?.instance || payload?.data?.instance;
            if (payloadInstance && payloadInstance !== expectedInstance) return;
            const nextState = payload?.state || payload?.data?.state;
            if (nextState === 'open') {
                setStatus('open');
                if (activeChannel?.id) setWhatsAppChannelStatus(activeChannel.id, 'open');
                setQrCode(null);
            }
        });

        socketRef.current = nextSocket;

        return () => {
            nextSocket.disconnect();
            socketRef.current = null;
        };
    }, [isOpen, apiUrl, activeChannel?.id, activeChannel?.instanceName, activeConnected, setWhatsAppChannelStatus]);

    useEffect(() => {
        if (!isOpen || activeConnected || !activeChannel?.instanceName) return;
        if (qrCode) return;

        let cancelled = false;
        let intervalId;

        const pollQr = async () => {
            const data = await WhatsAppService.connectInstance(activeChannel?.instanceName);
            if (cancelled) return;
            const nextQr = readQrFromPayload(data);
            if (nextQr) setQrCode(nextQr);
        };

        const timeoutId = setTimeout(() => {
            pollQr();
            intervalId = setInterval(pollQr, 3500);
        }, 1200);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
            if (intervalId) clearInterval(intervalId);
        };
    }, [isOpen, activeConnected, activeChannel?.instanceName, qrCode]);

    const syncChannelRow = useCallback(async (channel, extra = {}) => {
        if (!tenantId || !channel) return null;
        try {
            const row = await upsertTenantChannel({
                tenantId,
                channel,
                userId,
                ...extra,
            });
            const allRows = await loadTenantChannels(tenantId);
            setWhatsAppChannels(mapChannelsToStore(allRows), row?.id || channel.id);
            return row;
        } catch (error) {
            console.error('AURA channel sync error:', error);
            return null;
        }
    }, [tenantId, userId, setWhatsAppChannels]);

    const handleSaveInstance = async () => {
        const result = updateWhatsAppChannel(activeChannel?.id, {
            instanceName: instanceDraft,
        });

        if (!result.ok) {
            if (result.reason === 'duplicate_instance') {
                alert('Já existe outro canal com este nome de instância.');
                return false;
            }
            alert('Nome de instância inválido. Use letras, números, _ ou -.');
            return false;
        }

        setInstanceDraft(stripTenantScope(result.channel.instanceName));
        await syncChannelRow(result.channel);
        setStatus('disconnected');
        setQrCode(null);
        return true;
    };

    const handleGenerateQr = async () => {
        if (!(await handleSaveInstance())) return;

        setLoading(true);
        if (activeChannel?.id) setWhatsAppChannelStatus(activeChannel.id, 'connecting');
        setStatus('connecting');

        try {
            const data = await WhatsAppService.connectInstance(activeChannel?.instanceName);
            const nextQr = readQrFromPayload(data);
            if (nextQr) {
                setQrCode(nextQr);
            }
        } catch (error) {
            console.error('AURA connect error:', error);
            alert('Erro ao gerar QR Code.');
        } finally {
            setLoading(false);
            checkStatus();
        }
    };

    const handleSaveChannelLabel = () => {
        const cleanLabel = String(channelLabelDraft || '').trim();
        if (!cleanLabel) {
            alert('Informe um nome válido.');
            return;
        }

        const result = updateWhatsAppChannel(activeChannel?.id, {
            label: cleanLabel,
        });

        if (!result.ok) {
            alert('Não foi possível salvar o nome.');
            return;
        }

        setChannelLabelDraft(result.channel.label);
        syncChannelRow(result.channel);
    };

    const handleDisconnect = async () => {
        if (!activeChannel?.instanceName) return;
        if (!window.confirm(`Deseja desconectar a instância ${activeChannel.instanceName}?`)) return;

        setLoading(true);
        try {
            await WhatsAppService.logoutInstance(activeChannel?.instanceName);
            if (activeChannel?.id) setWhatsAppChannelStatus(activeChannel.id, 'disconnected');
            if (activeChannel) {
                await syncChannelRow(activeChannel, { status: 'disconnected' });
            }
            setStatus('disconnected');
            setQrCode(null);
        } finally {
            setLoading(false);
        }
    };

    const handleAddChannel = async () => {
        const clean = String(newChannelDraft || '').trim();
        if (!clean) {
            alert('Informe o nome do canal.');
            return;
        }

        const result = addWhatsAppChannel({
            label: clean,
            instanceName: clean,
        });

        if (!result.ok) {
            if (result.reason === 'first_not_connected') {
                alert('Conecte o canal principal antes de adicionar outro canal.');
                return;
            }
            if (result.reason === 'limit') {
                alert(`Seu plano permite até ${maxChannels} canal(is).`);
                return;
            }
            if (result.reason === 'duplicate_instance') {
                alert('Já existe um canal com esse nome.');
                return;
            }
            alert('Nome de canal inválido.');
            return;
        }

        setNewChannelDraft('');
        setIsAddChannelOpen(false);
        await syncChannelRow(result.channel);
    };

    const handleRemoveCurrentChannel = async () => {
        const channelToRemove = activeChannel;
        const result = removeWhatsAppChannel(activeChannel?.id);
        if (!result.ok) {
            alert('É necessário manter pelo menos 1 canal ativo.');
            return;
        }
        if (tenantId && channelToRemove?.id) {
            try {
                await deleteTenantChannel({ tenantId, channelId: channelToRemove.id });
                const allRows = await loadTenantChannels(tenantId);
                setWhatsAppChannels(mapChannelsToStore(allRows));
            } catch (error) {
                console.error('AURA channel remove sync error:', error);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255,255,255,0.12)', zIndex: 1000 }}>
            <div
                className="modal-content glass-panel"
                style={{
                    width: '96%',
                    maxWidth: '1240px',
                    maxHeight: '90vh',
                    overflow: 'hidden',
                    background: '#FFFFFF',
                    border: '1px solid rgba(0,0,0,0.06)',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.12)',
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <div
                    className="modal-header"
                    style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                background: 'var(--accent-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <QrCode size={20} color="#fff" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 24, color: '#1d1d1f' }}>Conexão WhatsApp</h3>
                            <p style={{ margin: '2px 0 0', color: '#707276', fontSize: 13 }}>
                                Fluxo guiado: 1) Nome da instância 2) QR Code 3) Conectado
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            border: '1px solid #E5E5E7',
                            background: '#fff',
                            borderRadius: 10,
                            width: 36,
                            height: 36,
                            cursor: 'pointer',
                            display: 'grid',
                            placeItems: 'center',
                        }}
                        aria-label="Fechar"
                    >
                        <X size={20} color="#787A7F" />
                    </button>
                </div>

                <div style={{ padding: 20, overflowY: 'auto', minHeight: 0, display: 'grid', gap: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 14 }}>
                        <section style={{ border: '1px solid #E7E8EC', borderRadius: 14, background: '#FCFCFD', overflow: 'hidden' }}>
                            <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #ECEEF2' }}>
                                <strong style={{ fontSize: 16, color: '#202225' }}>Instâncias</strong>
                                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7B7D82' }}>
                                    {channels.length}/{maxChannels} canais
                                </p>
                            </div>
                            <div style={{ maxHeight: 360, overflowY: 'auto', padding: 10, display: 'grid', gap: 8 }}>
                                {channels.map((channel) => {
                                    const connected = whatsappChannelStatus?.[channel.id] === 'open';
                                    const active = channel.id === activeChannel?.id;
                                    return (
                                        <button
                                            key={channel.id}
                                            type="button"
                                            onClick={() => switchWhatsAppChannel(channel.id)}
                                            style={{
                                                textAlign: 'left',
                                                borderRadius: 10,
                                                border: active ? '1px solid #C5A059' : '1px solid #E1E3E8',
                                                background: active ? '#FFF9F0' : '#fff',
                                                padding: '10px 12px',
                                                cursor: 'pointer',
                                                display: 'grid',
                                                gap: 3,
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                                <strong style={{ fontSize: 14, color: '#202225' }}>{channel.label}</strong>
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        borderRadius: 999,
                                                        padding: '2px 8px',
                                                        background: connected ? '#EAF8EE' : '#F3F4F7',
                                                        color: connected ? '#1C7A3A' : '#767A82',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {connected ? 'Conectado' : 'Offline'}
                                                </span>
                                            </div>
                                    <span style={{ fontSize: 12, color: '#7B7D82' }}>{stripTenantScope(channel.instanceName) || 'Instância não definida'}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {hasMultiWhatsapp && (
                                <div style={{ padding: 10, borderTop: '1px solid #ECEEF2' }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddChannelOpen(true)}
                                        disabled={!canAddMoreChannels}
                                        style={{
                                            width: '100%',
                                            height: 42,
                                            borderRadius: 10,
                                            border: '1px solid #D8DAE0',
                                            background: canAddMoreChannels ? '#fff' : '#F1F2F5',
                                            color: canAddMoreChannels ? '#202225' : '#8A8D93',
                                            cursor: canAddMoreChannels ? 'pointer' : 'not-allowed',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                            fontSize: 14,
                                            fontWeight: 600,
                                        }}
                                    >
                                        <Plus size={15} /> Adicionar canal
                                    </button>
                                    {!firstChannelConnected && (
                                        <p style={{ margin: '8px 0 0', color: '#7D8087', fontSize: 11, textAlign: 'center' }}>
                                            Conecte o canal principal para liberar novo canal.
                                        </p>
                                    )}
                                </div>
                            )}
                        </section>

                        <section style={{ border: '1px solid #E7E8EC', borderRadius: 14, background: '#fff', padding: 14, display: 'grid', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                <strong style={{ fontSize: 16, color: '#202225' }}>Configuração do canal</strong>
                                <button
                                    type="button"
                                    onClick={checkStatus}
                                    style={{
                                        border: '1px solid #DFE2E8',
                                        background: '#fff',
                                        borderRadius: 10,
                                        height: 34,
                                        padding: '0 10px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        color: '#5F6368',
                                        fontSize: 12,
                                    }}
                                >
                                    <RefreshCw size={13} /> Atualizar
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={channelLabelDraft}
                                    onChange={(e) => setChannelLabelDraft(e.target.value)}
                                    placeholder="Nome exibido da instância"
                                    style={{
                                        height: 42,
                                        borderRadius: 10,
                                        border: '1px solid #D8DAE0',
                                        padding: '0 12px',
                                        fontSize: 14,
                                        background: '#fff',
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleSaveChannelLabel}
                                    style={{
                                        height: 42,
                                        borderRadius: 10,
                                        border: '1px solid #D8DAE0',
                                        background: '#fff',
                                        color: '#3d4148',
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        padding: '0 12px',
                                    }}
                                >
                                    Salvar nome
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={instanceDraft}
                                    onChange={(e) => setInstanceDraft(e.target.value)}
                                    placeholder="Nome da instância"
                                    style={{
                                        height: 46,
                                        borderRadius: 10,
                                        border: '1px solid #D8DAE0',
                                        padding: '0 12px',
                                        fontSize: 14,
                                        background: '#fff',
                                    }}
                                />
                                {!activeConnected ? (
                                    <button
                                        type="button"
                                        onClick={handleGenerateQr}
                                        disabled={loading || !String(instanceDraft || '').trim()}
                                        className="btn-primary"
                                        style={{ height: 46, borderRadius: 10, fontSize: 14, fontWeight: 700, padding: '0 14px' }}
                                    >
                                        {loading ? 'Gerando...' : 'Gerar QR'}
                                    </button>
                                ) : (
                                    <div
                                        style={{
                                            height: 46,
                                            borderRadius: 10,
                                            border: '1px solid #BCE7CA',
                                            background: '#F1FBF4',
                                            color: '#196A36',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 6,
                                            fontWeight: 700,
                                            fontSize: 13,
                                            padding: '0 12px',
                                        }}
                                    >
                                        <CheckCircle2 size={16} /> CONECTADO
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={handleDisconnect}
                                    disabled={loading || !activeConnected}
                                    style={{
                                        height: 46,
                                        borderRadius: 10,
                                        border: '1px solid #F0C6C6',
                                        background: '#FFF6F6',
                                        color: '#C33B3B',
                                        cursor: activeConnected ? 'pointer' : 'not-allowed',
                                        opacity: activeConnected ? 1 : 0.6,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                        fontWeight: 600,
                                        fontSize: 13,
                                        padding: '0 12px',
                                    }}
                                >
                                    <LogOut size={15} /> Desconectar
                                </button>
                            </div>

                            {!activeConnected && stepOneDone && qrCode && (
                                <div style={{ border: '1px solid #ECEEF2', borderRadius: 12, padding: 12, textAlign: 'center', maxWidth: 420 }}>
                                    <img src={qrCode} alt="QR Code" style={{ width: '100%', borderRadius: 8 }} />
                                    <p style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: '#30333A' }}>Escaneie para conectar</p>
                                </div>
                            )}

                            {activeConnected && (
                                <p style={{ margin: 0, fontSize: 12, color: '#72757c' }}>
                                    Você pode editar o nome exibido sem desconectar. Para alterar o nome técnico da instância, desconecte e reconecte.
                                </p>
                            )}

                            {channels.length > 1 && (
                                <button
                                    type="button"
                                    onClick={handleRemoveCurrentChannel}
                                    title="Remover canal atual"
                                    style={{
                                        width: 'fit-content',
                                        height: 38,
                                        borderRadius: 10,
                                        border: '1px solid #F0C6C6',
                                        background: '#FFF6F6',
                                        color: '#D83B3B',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                        padding: '0 12px',
                                        fontWeight: 600,
                                        fontSize: 13,
                                    }}
                                >
                                    <Trash2 size={14} /> Remover canal atual
                                </button>
                            )}
                        </section>
                    </div>
                </div>
            </div>

            {isAddChannelOpen && (
                <div
                    className="modal-overlay"
                    style={{
                        backdropFilter: 'blur(8px)',
                        backgroundColor: 'rgba(0,0,0,0.18)',
                        zIndex: 1001,
                    }}
                >
                    <div
                        className="modal-content glass-panel"
                        style={{
                            width: '92%',
                            maxWidth: '460px',
                            background: '#fff',
                            border: '1px solid #E7E8EC',
                            borderRadius: 16,
                            padding: 0,
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '16px 18px',
                                borderBottom: '1px solid #ECEEF2',
                            }}
                        >
                            <strong style={{ fontSize: 20, color: '#1d1d1f' }}>Novo canal</strong>
                            <button
                                type="button"
                                onClick={() => setIsAddChannelOpen(false)}
                                style={{
                                    border: '1px solid #E5E5E7',
                                    background: '#fff',
                                    borderRadius: 10,
                                    width: 34,
                                    height: 34,
                                    cursor: 'pointer',
                                    display: 'grid',
                                    placeItems: 'center',
                                }}
                                aria-label="Fechar novo canal"
                            >
                                <X size={18} color="#787A7F" />
                            </button>
                        </div>

                        <div style={{ padding: 18, display: 'grid', gap: 10 }}>
                            <p style={{ margin: 0, color: '#666A70', fontSize: 14 }}>
                                Digite o nome e clique em criar. Em seguida você escaneia o QR desse novo canal.
                            </p>
                            <input
                                type="text"
                                value={newChannelDraft}
                                onChange={(e) => setNewChannelDraft(e.target.value)}
                                placeholder="Ex: Comercial"
                                style={{
                                    height: 48,
                                    borderRadius: 12,
                                    border: '1px solid #D8DAE0',
                                    padding: '0 14px',
                                    fontSize: 16,
                                    background: '#fff',
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleAddChannel}
                                style={{
                                    height: 46,
                                    borderRadius: 12,
                                    border: 'none',
                                    background: 'var(--accent-primary)',
                                    color: '#fff',
                                    fontSize: 16,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                Criar canal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConnectModal;
