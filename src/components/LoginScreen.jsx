import { useState } from 'react';
import logoDark from '../assets/logo-dark.png';
import './LoginScreen.css';
import { isSupabaseEnabled, supabase } from '../services/supabase';

const AUTH_TTL_MS = 12 * 60 * 60 * 1000;

export default function LoginScreen({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isMasterMode, setIsMasterMode] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState('pro');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');
        setIsLoading(true);

        const userPassword = import.meta.env.VITE_AUTH_PASSWORD;
        const masterPassword = import.meta.env.VITE_MASTER_PASSWORD;
        const masterEmail = String(import.meta.env.VITE_MASTER_EMAIL || 'drjeffersonreis@gmail.com').toLowerCase();
        const cleanEmail = String(email || '').trim().toLowerCase();

        try {
            if (isMasterMode) {
                const emailOk = cleanEmail === masterEmail;
                const passOk = masterPassword && password === masterPassword;
                if (!emailOk || !passOk) {
                    setError('Credenciais master inválidas.');
                    setPassword('');
                    return;
                }

                const tokenPayload = {
                    type: 'authenticated',
                    issuedAt: Date.now(),
                    expiresAt: Date.now() + AUTH_TTL_MS,
                    role: 'master',
                    email: cleanEmail,
                };
                const token = btoa(JSON.stringify(tokenPayload));
                localStorage.setItem('auth_token', token);
                localStorage.setItem('aura_master_mode', '1');
                localStorage.setItem('aura_subscription_plan', selectedPlan);
                onLogin();
                return;
            }

            if (isSupabaseEnabled) {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: cleanEmail,
                    password,
                });
                if (signInError) {
                    setError(signInError.message || 'Falha no login por email.');
                    setPassword('');
                    return;
                }
                localStorage.removeItem('aura_master_mode');
                onLogin();
                return;
            }

            const isValid = userPassword && password === userPassword;
            if (!isValid) {
                if (!userPassword) {
                    setError('Senha padrão não configurada. Defina VITE_AUTH_PASSWORD.');
                } else {
                    setError('Senha incorreta. Tente novamente.');
                }
                setPassword('');
                return;
            }

            const tokenPayload = {
                type: 'authenticated',
                issuedAt: Date.now(),
                expiresAt: Date.now() + AUTH_TTL_MS,
                role: 'user',
                email: cleanEmail || 'legacy@local',
            };
            const token = btoa(JSON.stringify(tokenPayload));
            localStorage.setItem('auth_token', token);
            localStorage.removeItem('aura_master_mode');
            onLogin();
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignUp = async () => {
        setError('');
        setInfo('');
        const cleanEmail = String(email || '').trim().toLowerCase();
        if (!cleanEmail || !password) {
            setError('Preencha email e senha para criar conta.');
            return;
        }
        if (!isSupabaseEnabled) {
            setError('Cadastro por email exige Supabase configurado.');
            return;
        }
        setIsLoading(true);
        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email: cleanEmail,
                password,
            });
            if (signUpError) {
                setError(signUpError.message || 'Falha ao criar conta.');
                return;
            }
            setInfo('Conta criada. Verifique seu email para confirmar acesso (se confirmação estiver ativa).');
        } finally {
            setIsLoading(false);
        }
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
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={isMasterMode ? 'drjeffersonreis@gmail.com' : 'seu@email.com'}
                            disabled={isLoading}
                            autoFocus
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">{isMasterMode ? 'Senha Master' : 'Senha de Acesso'}</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Digite sua senha"
                            disabled={isLoading}
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
                    {info && (
                        <div className="info-message">
                            {info}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="login-button"
                        disabled={isLoading || !password || !email}
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

                    {!isMasterMode && (
                        <button
                            type="button"
                            className="login-button-secondary"
                            onClick={handleSignUp}
                            disabled={isLoading || !password || !email}
                        >
                            Criar conta
                        </button>
                    )}
                    {!isSupabaseEnabled && !isMasterMode && (
                        <p className="login-hint">Modo email/senha ficará ativo quando VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY forem configurados.</p>
                    )}
                </form>

                <div className="login-footer">
                    <p>Protected by AURA Security</p>
                    <p style={{ fontSize: '10px', opacity: 0.5, marginTop: '5px' }}>v1.3.0 (Stable)</p>
                </div>
            </div>
        </div>
    );
}
