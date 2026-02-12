import { useState } from 'react';
import logoDark from '../assets/logo-dark.png';
import './LoginScreen.css';

const AUTH_TTL_MS = 12 * 60 * 60 * 1000;

export default function LoginScreen({ onLogin }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isMasterMode, setIsMasterMode] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState('pro');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const userPassword = import.meta.env.VITE_AUTH_PASSWORD;
        const masterPassword = import.meta.env.VITE_MASTER_PASSWORD;

        setTimeout(() => {
            const isValid = isMasterMode ? (masterPassword && password === masterPassword) : (userPassword && password === userPassword);
            if (isValid) {
                const tokenPayload = {
                    type: 'authenticated',
                    issuedAt: Date.now(),
                    expiresAt: Date.now() + AUTH_TTL_MS,
                    role: isMasterMode ? 'master' : 'user',
                };
                const token = btoa(JSON.stringify(tokenPayload));
                localStorage.setItem('auth_token', token);
                if (isMasterMode) {
                    localStorage.setItem('aura_master_mode', '1');
                    localStorage.setItem('aura_subscription_plan', selectedPlan);
                } else {
                    localStorage.removeItem('aura_master_mode');
                }
                onLogin();
            } else {
                if (isMasterMode && !masterPassword) {
                    setError('Senha master não configurada. Defina VITE_MASTER_PASSWORD.');
                } else if (!isMasterMode && !userPassword) {
                    setError('Senha padrão não configurada. Defina VITE_AUTH_PASSWORD.');
                } else {
                    setError('Senha incorreta. Tente novamente.');
                }
                setPassword('');
            }
            setIsLoading(false);
        }, 500);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="logo" style={{ marginBottom: '20px' }}>
                        <img src={logoDark} alt="AURA Logo" style={{ width: '120px', height: 'auto' }} />
                    </div>

                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className={`master-toggle ${isMasterMode ? 'active' : ''}`}>
                        <div>
                            <h3>Modo master</h3>
                            <p>Ativa troca de plano para testes</p>
                        </div>
                        <label className="switch">
                            <input
                                id="masterMode"
                                type="checkbox"
                                checked={isMasterMode}
                                onChange={(e) => setIsMasterMode(e.target.checked)}
                                disabled={isLoading}
                            />
                            <span className="slider" />
                        </label>
                    </div>

                    {isMasterMode && (
                        <div className="form-group master-plan-group">
                            <label htmlFor="plan">Plano para testes</label>
                            <select
                                id="plan"
                                value={selectedPlan}
                                onChange={(e) => setSelectedPlan(e.target.value)}
                                disabled={isLoading}
                            >
                                <option value="lite">Lite</option>
                                <option value="pro">Pro</option>
                                <option value="scale">Scale</option>
                            </select>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="password">{isMasterMode ? 'Senha Master' : 'Senha de Acesso'}</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Digite sua senha"
                            disabled={isLoading}
                            autoFocus
                            required
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <circle cx="12" cy="16" r="1" fill="currentColor" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="login-button"
                        disabled={isLoading || !password}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner"></span>
                                Validando...
                            </>
                        ) : (
                            'Entrar'
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Protected by AURA Security</p>
                    <p style={{ fontSize: '10px', opacity: 0.5, marginTop: '5px' }}>v1.3.0 (Stable)</p>
                </div>
            </div>
        </div>
    );
}
