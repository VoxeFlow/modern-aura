import React, { useState, useEffect } from 'react';
import { X, RefreshCw, LogOut, QrCode } from 'lucide-react';
import { useStore } from '../store/useStore';
import WhatsAppService from '../services/whatsapp';

const ConnectModal = ({ isOpen, onClose }) => {
    const { instanceName, isConnected, setIsConnected } = useStore();
    const [qrCode, setQrCode] = useState(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('checking');

    const checkStatus = async () => {
        const s = await WhatsAppService.checkConnection();
        setStatus(s);
        setIsConnected(s === 'open');
        if (s === 'open') setQrCode(null);
    };

    useEffect(() => {
        if (isOpen) checkStatus();
    }, [isOpen]);

    const handleConnect = async () => {
        setLoading(true);
        try {
            const res = await WhatsAppService.connectInstance();
            if (res?.base64) {
                setQrCode(res.base64);
            }
        } catch (e) {
            console.error("Connect Error:", e);
        }
        setLoading(false);
    };

    const handleLogout = async () => {
        if (!window.confirm("Deseja realmente desconectar o WhatsApp?")) return;
        setLoading(true);
        await WhatsAppService.logoutInstance();
        await checkStatus();
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <QrCode size={24} color="var(--accent-primary)" />
                        <h3>Conexão WhatsApp</h3>
                    </div>
                    <X size={24} onClick={onClose} style={{ cursor: 'pointer' }} />
                </div>

                <div className="connection-body" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
                        <span className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
                            {isConnected ? 'Conectado' : 'Desconectado'}
                        </span>
                        <RefreshCw size={16} onClick={checkStatus} style={{ cursor: 'pointer', opacity: 0.5 }} className={loading ? 'spin' : ''} />
                    </div>

                    {isConnected ? (
                        <div style={{ padding: '20px' }}>
                            <p style={{ marginBottom: '20px', fontSize: '14px', opacity: 0.8 }}>
                                Sua instância <strong>{instanceName}</strong> está ativa e pronta para uso.
                            </p>
                            <button className="btn-danger" onClick={handleLogout} disabled={loading}>
                                <LogOut size={18} /> Desconectar WhatsApp
                            </button>
                        </div>
                    ) : (
                        <div style={{ padding: '10px' }}>
                            {qrCode ? (
                                <div className="qr-container">
                                    <img src={qrCode} alt="WhatsApp QR Code" className="qr-code" />
                                    <p style={{ color: '#333', fontSize: '12px', fontWeight: 600 }}>Aponte seu WhatsApp para este código</p>
                                </div>
                            ) : (
                                <div style={{ padding: '30px' }}>
                                    <p style={{ marginBottom: '20px', fontSize: '14px', opacity: 0.8 }}>
                                        Clique no botão abaixo para gerar um novo QR Code de conexão.
                                    </p>
                                    <button className="btn-primary" style={{ width: '100%' }} onClick={handleConnect} disabled={loading}>
                                        {loading ? 'Gerando...' : 'Conectar Novo WhatsApp'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConnectModal;
