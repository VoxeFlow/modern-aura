import React, { useEffect, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import WhatsAppService from '../services/whatsapp';

const DocumentViewer = ({ messageKey, fileName, mimeType }) => {
    const [docUrl, setDocUrl] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDocument = async () => {
            try {
                const base64Data = await WhatsAppService.fetchMediaUrl(messageKey, {
                    mediaType: 'document',
                    mimeType: mimeType || null,
                });
                if (base64Data) setDocUrl(base64Data);
            } catch (error) {
                console.error('Document load error:', error);
            } finally {
                setLoading(false);
            }
        };

        if (messageKey) loadDocument();
    }, [messageKey, mimeType]);

    if (loading) {
        return <span>(Carregando anexo...)</span>;
    }

    if (!docUrl) {
        return <span>(Não foi possível abrir o anexo)</span>;
    }

    const safeName = fileName || 'anexo';

    return (
        <a
            href={docUrl}
            download={safeName}
            target="_blank"
            rel="noreferrer"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid rgba(0,0,0,0.1)',
                color: '#1d1d1f',
                textDecoration: 'none',
                background: '#fff',
            }}
        >
            <FileText size={16} />
            <span style={{ maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{safeName}</span>
            <Download size={14} />
        </a>
    );
};

export default DocumentViewer;
