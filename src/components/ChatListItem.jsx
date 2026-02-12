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

const channelTagStyles = {
    fontSize: '10px',
    fontWeight: 600,
    color: '#8a6d3a',
    background: '#f6efdf',
    border: '1px solid #ead9b4',
    borderRadius: '999px',
    padding: '2px 8px',
};

const avatarStyles = {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
};

const ChatListItem = ({ chat, activeChatId, onSelect, includeAudioTranscription = false }) => {
    const jid = getChatJid(chat);
    const contactJid = chat?.sendTargetJid || chat?.remoteJid || chat?.jid || jid;
    const name = getChatDisplayName(chat);
    const photo = getChatAvatar(chat);
    const hasName = name && name !== String(contactJid).split('@')[0];
    const preview = getChatPreview(chat, { includeAudioTranscription });
    const channelLabel = chat?.channelLabel || chat?.sourceInstanceName;
    const chatKey = chat?.chatKey || jid;

    return (
        <div
            key={String(chatKey)}
            className={`chat-item ${activeChatId === chatKey ? 'active' : ''}`}
            onClick={() =>
                onSelect({
                    ...chat,
                    id: chatKey,
                    chatKey,
                    chatJid: contactJid,
                    name: name || formatJid(contactJid),
                    jid: chat?.jid || contactJid,
                    remoteJid: chat?.remoteJid || contactJid,
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
                    <h4 style={titleStyles}>{hasName ? name : formatJid(contactJid)}</h4>
                    {channelLabel && <span style={channelTagStyles}>{channelLabel}</span>}
                    {hasName && !contactJid.includes('@lid') && (
                        <span style={jidStyles}>{formatJid(contactJid)}</span>
                    )}
                </div>
                <p className="chat-preview">{preview}</p>
            </div>
        </div>
    );
};

export default ChatListItem;
