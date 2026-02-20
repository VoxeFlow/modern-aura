import React, { useState } from 'react';
import { NeonButton } from './NeonButton';
import { useMonstroStore } from '../store/monstroStore';

export const Calculator = () => {
    const [leads, setLeads] = useState(100);
    const [ticket, setTicket] = useState(97);
    const [conversion, setConversion] = useState(1.5); // 1.5% standard
    const [result, setResult] = useState(null);

    const calculateROI = () => {
        // Standard Scenario
        const standardRevenue = leads * (conversion / 100) * ticket;

        // Monstro Scenario (+30% conversion boost conservative)
        const monstroConversion = conversion * 1.8;
        const monstroRevenue = leads * (monstroConversion / 100) * ticket;

        const extraRevenue = monstroRevenue - standardRevenue;

        setResult({
            standard: standardRevenue.toFixed(0),
            monstro: monstroRevenue.toFixed(0),
            extra: extraRevenue.toFixed(0),
            boost: '80%'
        });

        setTimeout(() => {
            // Scroll logic if needed
        }, 200);
    };

    return (
        <div className="bg-white p-8 rounded-3xl w-full border border-gray-100">
            <div className="text-left mb-8">
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                    <span className="text-monstro-primary">Simulador</span> de Lucro
                </h3>
                <p className="text-sm text-gray-500 font-medium mt-2">
                    Veja quanto você está deixando na mesa hoje.
                </p>
            </div>

            {!result ? (
                <>
                    <div className="space-y-6 mb-8">
                        {/* Leads Input */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <label className="text-xs uppercase font-bold tracking-widest text-gray-400">Leads / Dia</label>
                                <span className="text-xl font-black text-gray-900">{leads}</span>
                            </div>
                            <input
                                type="range" min="50" max="5000" step="50"
                                value={leads} onChange={(e) => setLeads(Number(e.target.value))}
                                className="w-full h-2 bg-gray-100 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-full"
                            />
                        </div>

                        {/* Ticket Input */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <label className="text-xs uppercase font-bold tracking-widest text-gray-400">Ticket Médio (R$)</label>
                                <span className="text-xl font-black text-gray-900">R$ {ticket}</span>
                            </div>
                            <input
                                type="range" min="19" max="497" step="10"
                                value={ticket} onChange={(e) => setTicket(Number(e.target.value))}
                                className="w-full h-2 bg-gray-100 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-full"
                            />
                        </div>
                    </div>

                    <NeonButton onClick={calculateROI} variant="primary" className="w-full py-4 text-base shadow-lg shadow-monstro-primary/20">
                        SIMULAR FATURAMENTO
                    </NeonButton>
                </>
            ) : (
                <div className="text-center animate-fade-in space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <div className="text-xs text-gray-500 mb-1">Hoje</div>
                            <div className="text-xl font-bold text-gray-400">R$ {result.standard}</div>
                        </div>
                        <div className="p-4 bg-monstro-primary/10 rounded-xl border border-monstro-primary/20">
                            <div className="text-xs text-monstro-primary-dim font-bold mb-1">Com Monstro</div>
                            <div className="text-2xl font-black text-monstro-primary-dim">R$ {result.monstro}</div>
                        </div>
                    </div>

                    <div className="p-4 bg-black text-white rounded-xl shadow-xl">
                        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Lucro Extra Mensal</p>
                        <p className="text-4xl font-black text-monstro-primary">
                            + R$ {(Number(result.extra) * 30).toLocaleString('pt-BR')}
                        </p>
                    </div>

                    <p className="text-xs text-gray-400 leading-relaxed px-4">
                        *Estimativa baseada no aumento médio de 80% na conversão de nossos parceiros.
                    </p>

                    <NeonButton onClick={() => setResult(null)} variant="secondary" className="w-full text-xs py-3 border-gray-200">
                        Nova Simulação
                    </NeonButton>
                </div>
            )}
        </div>
    );
};
