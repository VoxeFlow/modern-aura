import { useState } from 'react';
import logoLight from '../assets/logo-light.png';
import './LoginScreen.css';

export default function LoginScreen({ onLogin }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Get password from environment variable
        const correctPassword = import.meta.env.VITE_AUTH_PASSWORD || 'VoxeFlow2024!';
        console.log('AURA Login Debug:', {
            envSet: !!import.meta.env.VITE_AUTH_PASSWORD,
            expectedLength: correctPassword.length,
            match: password === correctPassword
        });

        setTimeout(() => {
            if (password === correctPassword) {
                // Store authentication token
                const token = btoa(`authenticated:${Date.now()}`);
                localStorage.setItem('auth_token', token);
                onLogin();
            } else {
                setError('Senha incorreta. Tente novamente.');
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
                    <p className="subtitle">Business Copilot</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="password">Senha de Acesso</label>
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
                    <p>Protected by VoxeFlow Security</p>
                    <p style={{ fontSize: '10px', opacity: 0.5, marginTop: '5px' }}>v1.3.0 (Stable)</p>
                </div>
            </div>
        </div>
    );
}
