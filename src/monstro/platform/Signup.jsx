import React, { useState } from 'react';
import { NeonButton } from '../components/NeonButton';
import { Bot, User, Lock, Mail, ArrowRight } from 'lucide-react';

const Signup = ({ onNavigateLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Senhas não conferem.');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Falha no cadastro');

            setSuccess(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl max-w-md w-full mx-auto text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(34,197,94,0.5)]">
                    <Bot size={32} className="text-black" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Cadastro Realizado!</h2>
                <p className="text-gray-400 mb-6">Sua conta foi criada e está aguardando liberação do administrador. Você será notificado por email.</p>
                <NeonButton onClick={onNavigateLogin} variant="primary" className="w-full">
                    Voltar para Login
                </NeonButton>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-monstro-primary rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,255,136,0.3)] animate-pulse">
                    <Bot size={40} className="text-black" />
                </div>
                <h1 className="text-4xl font-black tracking-tighter text-white">O MONSTRO</h1>
                <p className="text-monstro-primary font-bold tracking-widest text-xs uppercase mt-1">SISTEMA DE AFILIADOS B2B</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <User className="text-monstro-primary" size={20} />
                    Criar Conta
                </h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-bold">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email Profissional</label>
                        <div className="relative mt-1">
                            <Mail className="absolute left-4 top-3 text-gray-500" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-12 py-3 text-white placeholder-gray-600 focus:border-monstro-primary focus:outline-none transition-colors"
                                placeholder="seu@email.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Senha</label>
                        <div className="relative mt-1">
                            <Lock className="absolute left-4 top-3 text-gray-500" size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-12 py-3 text-white placeholder-gray-600 focus:border-monstro-primary focus:outline-none transition-colors"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Confirmar Senha</label>
                        <div className="relative mt-1">
                            <Lock className="absolute left-4 top-3 text-gray-500" size={18} />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-12 py-3 text-white placeholder-gray-600 focus:border-monstro-primary focus:outline-none transition-colors"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <NeonButton type="submit" variant="primary" className="w-full justify-center mt-4" disabled={loading}>
                        {loading ? 'Criando...' : 'Cadastrar'}
                        {!loading && <ArrowRight size={18} className="ml-2" />}
                    </NeonButton>
                </form>

                <div className="mt-6 text-center">
                    <button onClick={onNavigateLogin} className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
                        Já tem conta? <span className="text-monstro-primary">Voltar para Login</span>
                    </button>
                </div>
            </div>
            <p className="mt-8 text-white/20 text-xs font-mono">D1-NATIVE // SECURE ACCESS // V3.1</p>
        </div>
    );
};

export default Signup;
