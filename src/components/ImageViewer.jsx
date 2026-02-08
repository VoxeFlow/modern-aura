import React, { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import WhatsAppService from '../services/whatsapp';

const ImageViewer = ({ messageKey, caption }) => {
    const [imageUrl, setImageUrl] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadImage = async () => {
            try {
                const base64Data = await WhatsAppService.fetchMediaUrl(messageKey);
                if (base64Data) {
                    setImageUrl(base64Data);
                }
            } catch (e) {
                console.error("Image load error:", e);
            } finally {
                setLoading(false);
            }
        };

        if (messageKey) {
            loadImage();
        }
    }, [messageKey]);

    if (loading) {
        return (
            <div className="image-message loading">
                <ImageIcon size={16} color="#00ff88" />
                <span style={{ fontSize: '12px', marginLeft: '8px' }}>Carregando imagem...</span>
            </div>
        );
    }

    if (!imageUrl) {
        return <span>(Imagem 📸)</span>;
    }

    return (
        <div className="image-message">
            <img
                src={imageUrl}
                alt="Imagem do paciente"
                style={{
                    maxWidth: '300px',
                    maxHeight: '300px',
                    borderRadius: '8px',
                    display: 'block'
                }}
            />
            {caption && <p style={{ marginTop: '8px', fontSize: '14px' }}>{caption}</p>}
        </div>
    );
};

export default ImageViewer;
