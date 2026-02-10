import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useStore } from '../store/useStore';
import WhatsAppService from '../services/whatsapp';
import { extractQrCodeBase64, toWsUrl } from '../utils/connectModal';

export function useWhatsAppConnection({
    isOpen,
    instanceName,
    isConnected,
    setIsConnected,
    apiUrl,
    apiKey,
}) {
    const [qrCode, setQrCode] = useState(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('checking');
    const [debugInfo, setDebugInfo] = useState({ error: null, lastResponse: null });
    const [socketConnected, setSocketConnected] = useState(false);
    const [connecting, setConnecting] = useState(0);
    const socketRef = useRef(null);

    const checkStatus = useCallback(async () => {
        const nextStatus = await WhatsAppService.checkConnection();
        setStatus(nextStatus);
        setIsConnected(nextStatus === 'open');
        if (nextStatus === 'open') setQrCode(null);
    }, [setIsConnected]);

    useEffect(() => {
        if (isOpen) checkStatus();
    }, [isOpen, checkStatus]);

    useEffect(() => {
        if (!isOpen || !instanceName || isConnected || !apiUrl) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setSocketConnected(false);
            return;
        }

        const wsUrl = toWsUrl(apiUrl);
        const socket = io(wsUrl, {
            transports: ['websocket'],
            path: '/socket.io',
            reconnection: true,
            reconnectionAttempts: 5,
        });

        socket.on('connect', () => {
            setSocketConnected(true);
            console.log('✅ WebSocket connected');
        });

        socket.on('qrcode.updated', (payload) => {
            if (payload.instance !== instanceName) return;
            const base64Clean = extractQrCodeBase64(payload);
            if (base64Clean) {
                setQrCode(`data:image/png;base64,${base64Clean}`);
            }
        });

        socket.on('connection.update', (data) => {
            if (data.instance !== instanceName) return;
            if (data.state === 'open') {
                setQrCode(null);
                setIsConnected(true);
                checkStatus();
            }
        });

        socket.on('connect_error', (error) => {
            console.error('❌ WebSocket connection error:', error);
        });

        socket.on('disconnect', () => {
            setSocketConnected(false);
        });

        socketRef.current = socket;

        return () => {
            socket.disconnect();
            setSocketConnected(false);
        };
    }, [isOpen, instanceName, isConnected, apiUrl, connecting, checkStatus, setIsConnected]);

    useEffect(() => {
        if (!isOpen || isConnected || !instanceName) return;

        let pollInterval;
        const pollQrCode = async () => {
            if (qrCode) return;
            try {
                const data = await WhatsAppService.connectInstance();
                setDebugInfo((prev) => ({ ...prev, lastResponse: JSON.stringify(data).slice(0, 100) + '...' }));

                if (data && (data.qrcode || data.base64)) {
                    const raw = data.qrcode?.base64 || data.base64 || data.qrcode;
                    if (raw && typeof raw === 'string') {
                        const base64Clean = raw.replace(/^data:image\/[a-z]+;base64,/, '');
                        setQrCode(`data:image/png;base64,${base64Clean}`);
                        setStatus('open');
                    }
                }
            } catch (error) {
                console.warn('Polling error:', error);
                setDebugInfo((prev) => ({ ...prev, error: error.message }));
            }
        };

        const timer = setTimeout(() => {
            pollQrCode();
            pollInterval = setInterval(pollQrCode, 3000);
        }, 2000);

        return () => {
            clearTimeout(timer);
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [isOpen, isConnected, instanceName, qrCode]);

    const handleConnect = useCallback(async () => {
        setLoading(true);
        setQrCode(null);
        setDebugInfo({ error: null, lastResponse: 'Restarting...' });
        setConnecting((prev) => prev + 1);

        try {
            await fetch(`${apiUrl}/instance/restart/${instanceName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: apiKey,
                },
            });
        } catch (error) {
            console.error('Connect Error:', error);
            setDebugInfo((prev) => ({ ...prev, error: error.message || 'Connect Failed' }));
        }
        setLoading(false);
    }, [apiKey, apiUrl, instanceName]);

    const handleLogout = useCallback(async () => {
        if (!window.confirm('Deseja realmente desconectar o WhatsApp? Isso apagará todos os dados locais.')) return;
        setLoading(true);
        try {
            await WhatsAppService.logoutInstance();
        } catch (error) {
            console.error('Logout backend failed:', error);
        }

        useStore.getState().logout();
        localStorage.clear();
        sessionStorage.clear();
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }, []);

    return {
        qrCode,
        loading,
        status,
        debugInfo,
        socketConnected,
        checkStatus,
        handleConnect,
        handleLogout,
    };
}
