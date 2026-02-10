import logoLight from '../assets/logo-light.png';

const ChatEmptyState = () => {
    return (
        <div className="empty-dashboard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '20px' }}>
            <img src={logoLight} alt="AURA" style={{ width: '150px', opacity: 0.3, filter: 'grayscale(1)' }} />
            <p style={{ opacity: 0.5 }}>Selecione um cliente para iniciar a consultoria de vendas</p>
        </div>
    );
};

export default ChatEmptyState;
