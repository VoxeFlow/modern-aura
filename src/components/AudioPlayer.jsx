import React, { useState, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import WhatsAppService from '../services/whatsapp';

const AudioPlayer = ({ messageKey }) => {
    const [audioUrl, setAudioUrl] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const audioRef = React.useRef(null);

    useEffect(() => {
        const loadAudio = async () => {
            try {
                const base64Data = await WhatsAppService.fetchMediaUrl(messageKey);
                if (base64Data) {
                    setAudioUrl(base64Data);
                } else {
                    setError(true);
                }
            } catch (e) {
                console.error("Audio load error:", e);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        if (messageKey) {
            loadAudio();
        }
    }, [messageKey]);

    const togglePlay = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleEnded = () => {
        setIsPlaying(false);
    };

    if (loading) {
        return (
            <div className="audio-player loading">
                <Volume2 size={16} color="#00e5ff" />
                <span style={{ fontSize: '12px', marginLeft: '8px' }}>Carregando áudio...</span>
            </div>
        );
    }

    if (error || !audioUrl) {
        return (
            <div className="audio-player error">
                <Volume2 size={16} color="#ff5555" />
                <span style={{ fontSize: '12px', marginLeft: '8px' }}>Erro ao carregar áudio</span>
            </div>
        );
    }

    return (
        <div className="audio-player">
            <button
                onClick={togglePlay}
                className="play-btn"
                style={{
                    background: 'rgba(0, 229, 255, 0.2)',
                    border: '1px solid #00e5ff',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
            >
                {isPlaying ? <Pause size={16} color="#00e5ff" /> : <Play size={16} color="#00e5ff" />}
            </button>
            <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={handleEnded}
                style={{ display: 'none' }}
            />
            <span style={{ fontSize: '12px', marginLeft: '8px', color: 'rgba(255,255,255,0.7)' }}>
                {isPlaying ? 'Reproduzindo...' : 'Áudio do paciente'}
            </span>
        </div>
    );
};

export default AudioPlayer;
