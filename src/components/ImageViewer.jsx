import React, { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import WhatsAppService from '../services/whatsapp';

const ImageViewer = ({ messageKey, caption, mimeType }) => {
    const [imageUrl, setImageUrl] = useState(null);
    const [loading, setLoading] = useState(true);

    const openImageInNewTab = () => {
        if (!imageUrl) return;

        const popup = window.open('', '_blank');
        if (!popup) {
            const a = document.createElement('a');
            a.href = imageUrl;
            a.target = '_blank';
            a.rel = 'noopener';
            a.click();
            return;
        }

        popup.document.write(`
            <!doctype html>
            <html>
              <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>Imagem - AURA</title>
                <style>
                  html, body { margin: 0; padding: 0; background: #111; height: 100%; }
                  body { display: flex; align-items: center; justify-content: center; }
                  img { max-width: 100vw; max-height: 100vh; object-fit: contain; }
                </style>
              </head>
              <body>
                <img src="${imageUrl}" alt="Imagem ampliada" />
              </body>
            </html>
        `);
        popup.document.close();
    };

    useEffect(() => {
        const loadImage = async () => {
            try {
                const base64Data = await WhatsAppService.fetchMediaUrl(messageKey, {
                    mediaType: 'image',
                    mimeType: mimeType || null,
                });
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
    }, [messageKey, mimeType]);

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
                alt="Imagem do cliente"
                onClick={openImageInNewTab}
                style={{
                    maxWidth: '300px',
                    maxHeight: '300px',
                    borderRadius: '8px',
                    display: 'block',
                    cursor: 'pointer'
                }}
            />
            {caption && <p style={{ marginTop: '8px', fontSize: '14px' }}>{caption}</p>}
        </div>
    );
};

export default ImageViewer;
