import { useEffect, useMemo, useState } from 'react';
import logoDark from '../assets/logo-dark.png';
import './LoginScreen.css';
import { isSupabaseEnabled, supabase } from '../services/supabase';
import { claimUserSession } from '../services/sessionLock';

const AUTH_TTL_MS = 12 * 60 * 60 * 1000;

export default function LoginScreen({ onLogin }) {
    const [mode, setMode] = useState('login'); // login | forgot | reset
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const canUseSupabaseAuth = isSupabaseEnabled;

    const cleanEmail = useMemo(() => String(email || '').trim().toLowerCase(), [email]);

    useEffect(() => {
        let cancelled = false;

        const setupRecoveryFlow = async () => {
            if (!canUseSupabaseAuth) return;
            setError('');

            const url = new URL(window.location.href);
            const search = url.searchParams;
            const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));

            const code = search.get('code');
            const tokenHash = search.get('token_hash');
            const searchType = search.get('type');
            const hashType = hashParams.get('type');
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            const isRecoveryIntent = searchType === 'recovery' || hashType === 'recovery';

            try {
                if (accessToken && refreshToken && isRecoveryIntent) {
                    const { error: setSessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                    if (setSessionError) throw setSessionError;
                    if (!cancelled) setMode('reset');
                    window.history.replaceState({}, document.title, window.location.pathname);
                    return;
                }

                if (tokenHash && searchType === 'recovery') {
                    const { error: verifyError } = await supabase.auth.verifyOtp({
                        type: 'recovery',
                        token_hash: tokenHash,
                    });
                    if (verifyError) throw verifyError;
                    if (!cancelled) setMode('reset');
                    window.history.replaceState({}, document.title, window.location.pathname);
                    return;
                }

                if (code) {
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeError) throw exchangeError;
                    if (!cancelled && isRecoveryIntent) {
                        setMode('reset');
                    }
                    window.history.replaceState({}, document.title, window.location.pathname);
                    return;
                }

                if (isRecoveryIntent) {
                    if (!cancelled) setMode('reset');
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            } catch (recoveryError) {
                if (!cancelled) {
                    setMode('forgot');
                    setError(recoveryError?.message || 'Link de recuperação inválido ou expirado. Solicite um novo.');
                }
            }
        };

        setupRecoveryFlow();
        return () => {
            cancelled = true;
        };
    }, [canUseSupabaseAuth]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');
        setIsLoading(true);

        const userPassword = import.meta.env.VITE_AUTH_PASSWORD;
        const masterPassword = import.meta.env.VITE_MASTER_PASSWORD;
        const masterEmail = String(import.meta.env.VITE_MASTER_EMAIL || 'drjeffersonreis@gmail.com').toLowerCase();
        const isLocalhost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);

        try {
            if (isSupabaseEnabled) {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: cleanEmail,
                    password,
                });
                if (!signInError) {
                    const lockResult = await claimUserSession();
                    if (!lockResult?.ok) {
                        await supabase.auth.signOut();
                        setError('Esta conta já está ativa em outro dispositivo. Encerre a sessão anterior e tente novamente.');
                        setPassword('');
                        return;
                    }
                    // Invisible master mode: enabled by credentials, but only after a real Supabase login.
                    const emailOk = cleanEmail === masterEmail;
                    const passOk = masterPassword && password === masterPassword;
                    if (emailOk && passOk) {
                        localStorage.setItem('aura_master_mode', '1');
                        if (!localStorage.getItem('aura_subscription_plan')) {
                            localStorage.setItem('aura_subscription_plan', 'scale');
                        }
                    } else {
                        localStorage.removeItem('aura_master_mode');
                    }
                    onLogin();
                    return;
                }
                setError(signInError?.message || 'Falha no login por email.');
                setPassword('');
                return;
            }

            if (!isLocalhost) {
                setError('Supabase não configurado no ambiente online. Contate o suporte.');
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

            if (userPassword && password === userPassword) {
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
                return;
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        setError('');
        setInfo('');

        if (!cleanEmail) {
            setError('Informe seu email para recuperar a senha.');
            return;
        }
        if (!canUseSupabaseAuth) {
            setError('Recuperação de senha exige Supabase configurado.');
            return;
        }

        setIsLoading(true);
        try {
            const redirectTo = `${window.location.origin}/app?type=recovery`;
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
                redirectTo,
            });
            if (resetError) {
                setError(resetError?.message || 'Não foi possível enviar o email de recuperação.');
                return;
            }
            setInfo('Enviamos um link para seu email. Abra o link para redefinir a senha.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');

        if (!canUseSupabaseAuth) {
            setError('Redefinição de senha exige Supabase configurado.');
            return;
        }
        if (!newPassword || !confirmNewPassword) {
            setError('Preencha e confirme a nova senha.');
            return;
        }
        if (newPassword.length < 8) {
            setError('A nova senha precisa ter pelo menos 8 caracteres.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setError('As senhas não conferem.');
            return;
        }

        setIsLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
            if (updateError) {
                setError(updateError?.message || 'Falha ao atualizar a senha.');
                return;
            }

            await supabase.auth.signOut();
            setNewPassword('');
            setConfirmNewPassword('');
            setPassword('');
            setMode('login');
            setInfo('Senha atualizada com sucesso. Faça login com a nova senha.');
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

                <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
                    {mode === 'forgot' && (
                        <>
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    name="aura_recovery_email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="coloque aqui o seu email"
                                    disabled={isLoading}
                                    autoFocus
                                    autoComplete="off"
                                    spellCheck={false}
                                    required
                                />
                            </div>
                        </>
                    )}

                    {mode === 'reset' && (
                        <>
                            <div className="form-group">
                                <label htmlFor="new-password">Nova senha</label>
                                <input
                                    id="new-password"
                                    type="password"
                                    name="aura_new_password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="digite sua nova senha"
                                    disabled={isLoading}
                                    autoComplete="new-password"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirm-new-password">Confirmar nova senha</label>
                                <input
                                    id="confirm-new-password"
                                    type="password"
                                    name="aura_confirm_new_password"
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    placeholder="confirme sua nova senha"
                                    disabled={isLoading}
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                        </>
                    )}

                    {mode === 'login' && (
                        <>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            name="aura_login_email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="coloque aqui o seu email"
                            disabled={isLoading}
                            autoFocus
                            autoComplete="off"
                            spellCheck={false}
                            required
                        />
                    </div>
                        </>
                    )}

                    <div className="form-group">
                        <label htmlFor="password">Senha de Acesso</label>
                        <input
                            id="password"
                            type="password"
                            name="aura_login_password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="coloque aqui a sua senha"
                            disabled={isLoading}
                            autoComplete="new-password"
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

                    {mode === 'login' && (
                        <>
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

                            <button
                                type="button"
                                className="login-button-secondary"
                                onClick={handleSignUp}
                                disabled={isLoading || !password || !email}
                            >
                                Criar conta
                            </button>

                            <button
                                type="button"
                                className="login-link-button"
                                onClick={() => {
                                    setMode('forgot');
                                    setError('');
                                    setInfo('');
                                }}
                                disabled={isLoading}
                            >
                                Esqueci minha senha
                            </button>
                        </>
                    )}

                    {mode === 'forgot' && (
                        <>
                            <button
                                type="button"
                                className="login-button"
                                onClick={handleForgotPassword}
                                disabled={isLoading || !email}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="spinner"></span>
                                        Enviando...
                                    </>
                                ) : (
                                    'Enviar link de recuperação'
                                )}
                            </button>
                            <button
                                type="button"
                                className="login-button-secondary"
                                onClick={() => {
                                    setMode('login');
                                    setError('');
                                    setInfo('');
                                }}
                                disabled={isLoading}
                            >
                                Voltar para login
                            </button>
                        </>
                    )}

                    {mode === 'reset' && (
                        <>
                            <button
                                type="button"
                                className="login-button"
                                onClick={handleResetPassword}
                                disabled={isLoading || !newPassword || !confirmNewPassword}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="spinner"></span>
                                        Salvando...
                                    </>
                                ) : (
                                    'Salvar nova senha'
                                )}
                            </button>
                            <button
                                type="button"
                                className="login-button-secondary"
                                onClick={() => {
                                    setMode('login');
                                    setError('');
                                    setInfo('');
                                }}
                                disabled={isLoading}
                            >
                                Voltar para login
                            </button>
                        </>
                    )}

                    {!isSupabaseEnabled && (
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
