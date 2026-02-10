import React from 'react';
import { formatJid } from '../utils/formatter';
import { getChatAvatar, getChatDisplayName, getChatJid, getChatPreview } from '../utils/chatList';

const rowStyles = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    alignItems: 'flex-start',
};

const titleStyles = {
    margin: 0,
    fontSize: '14px',
    fontWeight: 'bold',
    textAlign: 'left',
};

const jidStyles = {
    fontSize: '11px',
    opacity: 0.6,
    fontWeight: '400',
    textAlign: 'left',
};

const avatarStyles = {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
};

const ChatListItem = ({ chat, activeChatId, onSelect, includeAudioTranscription = false }) => {
    const jid = getChatJid(chat);
    const name = getChatDisplayName(chat);
    const photo = getChatAvatar(chat);
    const hasName = name && name !== String(jid).split('@')[0];
    const preview = getChatPreview(chat, { includeAudioTranscription });

    return (
        <div
            key={String(jid)}
            className={`chat-item ${activeChatId === jid ? 'active' : ''}`}
            onClick={() =>
                onSelect({
                    ...chat,
                    id: jid,
                    name: name || formatJid(jid),
                    jid: chat?.jid || jid,
                    remoteJid: chat?.remoteJid || jid,
                    remoteJidAlt: chat?.remoteJidAlt || chat?.lastMessage?.key?.remoteJidAlt || null,
                    linkedLid: chat?.linkedLid || null,
                    phoneNumber: chat?.phoneNumber || null,
                    sendTargetJid: chat?.sendTargetJid || null,
                })
            }
        >
            <div className="avatar">
                {photo ? (
                    <img src={photo} alt={name || 'Avatar'} style={avatarStyles} />
                ) : (
                    (name || '#')[0]?.toUpperCase()
                )}
            </div>
            <div className="info">
                <div className="chat-main-header" style={rowStyles}>
                    <h4 style={titleStyles}>{hasName ? name : formatJid(jid)}</h4>
                    {hasName && !jid.includes('@lid') && (
                        <span style={jidStyles}>{formatJid(jid)}</span>
                    )}
                </div>
                <p className="chat-preview">{preview}</p>
            </div>
        </div>
    );
};

export default ChatListItem;
