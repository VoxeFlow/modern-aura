import React, { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import WhatsAppService from '../../../services/whatsapp';
import { NeonButton } from '../../components/NeonButton';
import { QrCode, RefreshCw, CheckCircle, Smartphone } from 'lucide-react';

export const QRCodeConnect = ({ user }) => {
    const { instanceName, isConnected, setIsConnected, setConfig, userEmail: storeEmail } = useStore();
    const [qrCode, setQrCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const effectiveEmail = user?.email || storeEmail;

    // Auto-generate instance name based on user email if not set
    // Works for both Admin and Client now
    useEffect(() => {
        if (!instanceName && effectiveEmail) {
            const autoInstance = `monstro-${effectiveEmail.split('@')[0].replace(/[^a-z0-9]/gi, '')}`;
            setConfig({ instanceName: autoInstance });
        }
    }, [instanceName, effectiveEmail, setConfig]);

    const handleConnect = async () => {
        if (!instanceName) return;
        setLoading(true);
        setError('');
        setQrCode('');

        try {
            // 0. Force Reset (Delete previous instance to avoid zombie states)
            await WhatsAppService.logoutInstance(instanceName);

            // 1. Create Instance (force qrcode=true)
            await WhatsAppService.createInstance(instanceName);

            // 2. Connect/Get QR
            const res = await WhatsAppService.connectInstance(instanceName);

            if (res?.base64) {
                setQrCode(res.base64);
            } else if (res?.qrcode?.base64) {
                setQrCode(res.qrcode.base64);
            } else if (res?.instance?.state === 'open') {
                setIsConnected(true);
            } else {
                // If it's already connecting, maybe fetch again
                setTimeout(handleConnect, 2000);
            }

        } catch (e) {
            console.error(e);
            setError('Falha ao gerar QR Code. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    // Poll for connection status when QR code is active
    useEffect(() => {
        if (!qrCode || isConnected || !instanceName) return;

        const interval = setInterval(async () => {
            try {
                const status = await WhatsAppService.checkConnection(instanceName);
                if (status === 'open' || status === 'connected') {
                    setIsConnected(true);
                    setQrCode('');
                }
            } catch (e) {
                console.error('Polling error:', e);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [qrCode, isConnected, instanceName, setIsConnected]);

    if (isConnected) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full animate-fade-in">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600">
                    <CheckCircle size={40} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">WhatsApp Conectado!</h3>
                <p className="text-gray-500 mt-2 max-w-sm">
                    Sua máquina de vendas está ativa e pronta para responder mensagens automaticamente.
                </p>
                <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-100 w-full max-w-xs">
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Instância Ativa</p>
                    <p className="font-mono font-bold text-gray-700">{instanceName}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full p-4 animate-fade-in">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl max-w-md w-full text-center">
                <div className="w-16 h-16 bg-monstro-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-monstro-primary-dim">
                    <QrCode size={32} />
                </div>

                <h2 className="text-2xl font-black text-gray-900 mb-2">Conectar WhatsApp</h2>
                <p className="text-gray-500 text-sm mb-8">
                    Escaneie o QR Code com seu celular para ativar o sistema O MONSTRO no seu número.
                </p>

                {qrCode ? (
                    <div className="space-y-6">
                        <div className="bg-white p-2 rounded-xl border-2 border-monstro-primary inline-block shadow-lg">
                            <img src={qrCode} alt="Scan Me" className="w-64 h-64 object-contain" />
                        </div>
                        <p className="text-xs text-gray-400 animate-pulse">
                            Aguardando leitura do código...
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 items-center justify-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <Smartphone size={32} className="text-gray-300" />
                            <p className="text-xs font-bold text-gray-400">NENHUMA SESSÃO ATIVA</p>
                        </div>

                        {error && (
                            <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg font-bold">
                                {error}
                            </p>
                        )}

                        <NeonButton
                            variant="primary"
                            onClick={handleConnect}
                            disabled={loading}
                            className="w-full justify-center py-4"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <RefreshCw className="animate-spin" />
                                    <span>Processando...</span>
                                </div>
                            ) : 'GERAR QR CODE'}
                        </NeonButton>
                    </div>
                )}
            </div>
        </div>
    );
};
