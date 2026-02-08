import React, { useState, useEffect } from 'react';
import { X, RefreshCw, LogOut, QrCode } from 'lucide-react';
import { useStore } from '../store/useStore';
import WhatsAppService from '../services/whatsapp';
import { io } from 'socket.io-client';

const ConnectModal = ({ isOpen, onClose }) => {
    const { instanceName, isConnected, setIsConnected, apiUrl, apiKey } = useStore();
    const [qrCode, setQrCode] = useState(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('checking');
    const [socket, setSocket] = useState(null);
    // FIX: Counter to force WebSocket recreation when clicking "Conectar" after logout
    const [connecting, setConnecting] = useState(0);

    const checkStatus = async () => {
        const s = await WhatsAppService.checkConnection();
        setStatus(s);
        setIsConnected(s === 'open');
        if (s === 'open') setQrCode(null);
    };

    useEffect(() => {
        if (isOpen) checkStatus();
    }, [isOpen]);

    // WebSocket connection for real-time QR code updates
    useEffect(() => {
        if (!isOpen || !instanceName || isConnected) {
            // Cleanup socket if modal closes or instance is connected
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            return;
        }


        // Convert HTTPS/HTTP URL to WSS/WS
        const wsUrl = apiUrl.replace('https://', 'wss://').replace('http://', 'ws://');
        // Use global WebSocket endpoint (Evolution API v2.1.1 doesn't support instance namespaces)
        console.log('Connecting to WebSocket (global mode):', wsUrl);

        const newSocket = io(wsUrl, {
            transports: ['websocket'],
            path: '/socket.io',
            reconnection: true,
            reconnectionAttempts: 5
        });

        newSocket.on('connect', () => {
            console.log('✅ WebSocket connected');
        });

        newSocket.on('qrcode.updated', (payload) => {
            // Filter events by instance name
            if (payload.instance !== instanceName) {
                console.log('⏭️  QR Code for different instance, skipping:', payload.instance);
                return;
            }
            console.log('📱 QR Code received for', instanceName, ':', payload);

            // Evolution API sends: { event, instance, data: { qrcode: { base64: "..." } } }
            // Extract the nested data object
            const data = payload.data || payload; // payload.data has the actual QR info
            let qrCodeData = null;

            if (data.qrcode) {
                if (typeof data.qrcode === 'string') {
                    // Format 1: data.qrcode is the base64 string directly
                    qrCodeData = data.qrcode;
                } else if (data.qrcode.base64) {
                    // Format 2: data.qrcode.base64 (MOST COMMON)
                    qrCodeData = data.qrcode.base64;
                } else if (data.qrcode.pairingCode) {
                    // Format 3: Alternative pairing code format
                    console.log('Pairing code available:', data.qrcode.pairingCode);
                }
            } else if (data.base64) {
                // Format 4: data.base64 directly
                qrCodeData = data.base64;
            }

            if (qrCodeData) {
                // Remove data URI prefix if present, then add it back to ensure consistency
                const base64Clean = qrCodeData.replace(/^data:image\/[a-z]+;base64,/, '');
                setQrCode(`data:image/png;base64,${base64Clean}`);
                console.log('✅ QR Code set! Length:', base64Clean.length);
            } else {
                console.warn('⚠️ QR Code data received but format not recognized. Payload:', payload, 'Data:', data);
            }
        });

        newSocket.on('connection.update', (data) => {
            // Filter events by instance name
            if (data.instance !== instanceName) {
                return;
            }
            console.log('🔄 Connection update:', data);
            if (data.state === 'open') {
                setQrCode(null);
                setIsConnected(true);
                checkStatus();
            }
        });

        newSocket.on('connect_error', (error) => {
            console.error('❌ WebSocket connection error:', error);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('🔌 WebSocket disconnected:', reason);
        });

        setSocket(newSocket);

        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, [isOpen, instanceName, isConnected, apiUrl, loading, connecting]); // FIX: Added loading and connecting to dependencies

    // Debug state
    const [debugInfo, setDebugInfo] = useState({ error: null, lastResponse: null });

    // START POLLING for QR Code if WebSocket fails
    useEffect(() => {
        if (!isOpen || isConnected || !instanceName) return;

        let pollInterval;
        const pollQrCode = async () => {
            if (qrCode) return; // Don't poll if we already have one
            try {
                console.log('🔄 Polling: Checking for QR Code...');
                // Fetch the connection status/QR code directly
                const data = await WhatsAppService.connectInstance();
                setDebugInfo(prev => ({ ...prev, lastResponse: JSON.stringify(data).slice(0, 100) + '...' }));

                if (data && (data.qrcode || data.base64)) {
                    console.log('✅ Polling: QR Code received via HTTP');
                    const raw = data.qrcode?.base64 || data.base64 || data.qrcode;
                    if (raw && typeof raw === 'string') {
                        const base64Clean = raw.replace(/^data:image\/[a-z]+;base64,/, '');
                        setQrCode(`data:image/png;base64,${base64Clean}`);
                        setStatus('open'); // Assume open if we got data (or at least responding)
                    }
                }
            } catch (e) {
                console.warn('Polling error:', e);
                setDebugInfo(prev => ({ ...prev, error: e.message }));
            }
        };

        // Start polling after 2 seconds to give WebSocket a chance first
        const timer = setTimeout(() => {
            console.log('⚠️ WebSocket slow/failed, starting HTTP polling for QR Code...');
            pollQrCode(); // Initial poll
            pollInterval = setInterval(pollQrCode, 3000);
        }, 2000);

        return () => {
            clearTimeout(timer);
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [isOpen, isConnected, instanceName, qrCode]);

    const handleConnect = async () => {
        setLoading(true);
        setQrCode(null);
        setDebugInfo({ error: null, lastResponse: 'Restarting...' });

        // FIX: Force WebSocket useEffect to re-run by incrementing counter
        setConnecting(prev => prev + 1);
        try {
            // Restart instance to trigger new QR code generation
            // The QR code will be received via WebSocket qrcode.updated event OR Polling
            const response = await fetch(`${apiUrl}/instance/restart/${instanceName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': apiKey
                }
            });
            console.log('Instance restart triggered, waiting for QR code...');
        } catch (e) {
            console.error("Connect Error:", e);
            setDebugInfo(prev => ({ ...prev, error: e.message || 'Connect Failed' }));
        }
        setLoading(false);
    };

    const handleLogout = async () => {
        if (!window.confirm("Deseja realmente desconectar o WhatsApp? Isso apagará todos os dados locais.")) return;
        setLoading(true);
        try {
            // 1. Try to delete the instance on backend
            await WhatsAppService.logoutInstance();
        } catch (e) {
            console.error("Logout backend failed:", e);
        }

        // 2. Kill local session data immediately
        useStore.getState().logout();

        // 3. NUCLEAR OPTION: Clear all storage and FORCE RELOAD
        // This guarantees no React state or Zustand persistence survives
        localStorage.clear();
        sessionStorage.clear();

        setTimeout(() => {
            window.location.reload();
        }, 500);
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

                    {/* DEBUG SECTION */}
                    <details style={{ marginTop: '20px', textAlign: 'left', fontSize: '10px', opacity: 0.7, borderTop: '1px solid #ccc', paddingTop: '10px' }}>
                        <summary>Debug Info (Clique para expandir)</summary>
                        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {`API URL: ${apiUrl}
Instance: ${instanceName}
Status: ${status}
Polling Error: ${debugInfo.error || 'None'}
Last Response: ${debugInfo.lastResponse || 'None'}
Socket: ${socket ? (socket.connected ? 'Connected' : 'Disconnected') : 'Null'}`}
                        </pre>
                    </details>
                </div>
            </div>
        </div>
    );
};

export default ConnectModal;
