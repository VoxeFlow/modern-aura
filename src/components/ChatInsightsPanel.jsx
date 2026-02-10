import React from 'react';
import { BarChart3, Target, Check } from 'lucide-react';

const ChatInsightsPanel = ({ analysisData, suggestion, handleAnalyze, useSuggestion }) => {
    return (
        <div className="analysis-column">
            <div className="card glass-panel v3-analysis">
                <div className="card-header-v3">
                    <BarChart3 size={18} />
                    <h4>Análise de Vendas</h4>
                </div>

                <div className="v3-data-grid">
                    <div className="data-item">
                        <label>Consciência</label>
                        <span>{analysisData.level || '—'}</span>
                    </div>
                    <div className="data-item">
                        <label>Intenção Principal</label>
                        <span>{analysisData.intent || '—'}</span>
                    </div>
                    <div className="data-item">
                        <label>Estratégia</label>
                        <span>{analysisData.strategy || '—'}</span>
                    </div>
                </div>

                <button className="btn-primary v3-btn" onClick={handleAnalyze}>
                    Analisar Histórico
                </button>
            </div>

            <div className="card glass-panel suggestion v3-suggestion">
                <div className="card-header-v3">
                    <Target size={18} />
                    <h4>Resposta Sugerida</h4>
                </div>
                <div className="result-box v3-box">
                    {suggestion || 'Aguardando análise estratégica...'}
                </div>
                {suggestion && !suggestion.includes('...') && (
                    <button className="btn-secondary v3-btn-sub" onClick={useSuggestion}>
                        <Check size={16} /> Usar esta sugestão
                    </button>
                )}
            </div>
        </div>
    );
};

export default ChatInsightsPanel;
