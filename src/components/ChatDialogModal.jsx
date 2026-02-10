const ChatDialogModal = ({
    dialog,
    dialogInput,
    setDialogInput,
    handleDialogClose,
    handleDialogConfirm,
}) => {
    if (!dialog?.isOpen) return null;

    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.7)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <div
                className="glass-panel"
                style={{
                    padding: '20px',
                    width: '300px',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)',
                    background: '#0f172a',
                }}
            >
                <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>{dialog.title}</h4>
                {dialog.message && <p style={{ color: '#ccc', marginBottom: '15px' }}>{dialog.message}</p>}

                {dialog.type === 'prompt' && (
                    <input
                        type="text"
                        value={dialogInput}
                        onChange={(e) => setDialogInput(e.target.value)}
                        placeholder={dialog.inputPlaceholder}
                        style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '6px',
                            border: '1px solid #334155',
                            background: '#1e293b',
                            color: '#fff',
                            marginBottom: '15px',
                        }}
                        autoFocus
                    />
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                        onClick={handleDialogClose}
                        style={{
                            padding: '8px 16px',
                            background: 'transparent',
                            border: '1px solid #475569',
                            color: '#cbd5e1',
                            borderRadius: '6px',
                            cursor: 'pointer',
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleDialogConfirm}
                        style={{
                            padding: '8px 16px',
                            background: 'var(--accent-primary)',
                            border: 'none',
                            color: '#000',
                            fontWeight: 'bold',
                            borderRadius: '6px',
                            cursor: 'pointer',
                        }}
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatDialogModal;
