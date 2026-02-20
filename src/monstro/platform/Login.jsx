import React, { useState } from 'react';
import { NeonButton } from '../components/NeonButton';

const Login = ({ onLogin, onNavigateSignup }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Falha no login');
            }

            if (data.token) {
                localStorage.setItem('monstro_auth_token', data.token);
            }

            // Sync with global store for API calls
            import('../../store/useStore').then(({ useStore }) => {
                useStore.getState().setAuthIdentity({
                    userEmail: data.user.email,
                    userId: data.user.id,
                    userRole: data.user.role,
                    userName: data.user.name
                });
            });

            onLogin(data.user);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-100 shadow-2xl rounded-3xl p-8 md:p-12 w-full max-w-md animate-fade-in relative overflow-hidden">

                {/* Decorator */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-monstro-primary to-green-600"></div>

                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <span className="w-3 h-3 bg-monstro-primary rounded-full"></span>
                        <span className="font-black text-gray-900 tracking-tighter text-xl">O MONSTRO <span className="opacity-30">SYSTEM</span></span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">Acesso Restrito</h1>
                    <p className="text-sm text-gray-400 mt-2">
                        Entre com suas credenciais de afiliado.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-red-50 text-red-500 text-sm font-bold text-center rounded-xl border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-monstro-primary focus:bg-white transition-all font-medium text-gray-800"
                            placeholder="Seu email de acesso"
                        />
                        <p className="text-[10px] text-gray-400 text-right">
                            *Use "admin" no email para acesso total.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Senha</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-monstro-primary focus:bg-white transition-all font-medium text-gray-800"
                            placeholder="••••••••"
                        />
                    </div>

                    <NeonButton
                        variant="primary"
                        className="w-full justify-center py-4 shadow-lg shadow-monstro-primary/10"
                        disabled={loading}
                    >
                        {loading ? 'ACESSANDO...' : 'ENTRAR NA PLATAFORMA'}
                    </NeonButton>
                </form>

                <div className="mt-8 text-center flex flex-col gap-2">
                    <button onClick={onNavigateSignup} className="text-sm font-bold text-gray-900 hover:text-green-600 transition-colors">
                        Não tem conta? Criar acesso
                    </button>
                    <a href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                        Esqueceu a senha?
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Login;
