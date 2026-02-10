const TagSelectorDialogContent = ({ tags }) => {
    return (
        <div style={{ marginTop: '15px' }}>
            <label
                style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '500',
                }}
            >
                Selecione o estágio do lead:
            </label>
            <select
                id="tagSelect"
                style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #475569',
                    background: '#1e293b',
                    color: '#ffffff',
                    fontSize: '14px',
                    cursor: 'pointer',
                    outline: 'none',
                }}
            >
                <option value="" style={{ color: '#94a3b8' }}>
                    Selecione uma tag...
                </option>
                {tags.map((tag) => (
                    <option key={tag.id} value={tag.id} style={{ color: '#ffffff' }}>
                        {tag.icon} {tag.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default TagSelectorDialogContent;
