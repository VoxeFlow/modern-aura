const MASTER_AI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

class OpenAIService {
    async generateSuggestion({ clientName, history, briefing, extraContext = "" }) {
        const openaiKey = MASTER_AI_KEY;
        const systemPrompt = `
Você é o Especialista de Vendas AURA v10 da VoxeFlow.
Sua missão: CONECTAR e CONVERTER.

DIRETRIZES DE OURO (Siga ou falhe):
1. 🤫 BREVIDADE EXTREMA: Máximo de 3 frases. Seja direto.
2. 🪝 GANCHO OBRIGATÓRIO: TODA mensagem deve terminar com uma PERGUNTA.
3. 🤝 HUMANIDADE: Use tom natural de WhatsApp, emojis moderados. Nada de "textão" corporativo.
4. 🧠 CÉREBRO TRAVADO: Use APENAS a Base de Conhecimento abaixo.

BASE DE CONHECIMENTO (Sua Única Verdade):
${briefing}

${extraContext ? `DADOS TÉCNICOS (RAG): ${extraContext}` : ''}
`.trim();

        // 1. Prepare Messages
        const messages = [{ role: 'system', content: systemPrompt }];
        if (Array.isArray(history)) messages.push(...history);
        messages.push({
            role: 'user',
            content: `Responda ${clientName}.
            
            🚨 REGRAS CRÍTICAS:
            1. Curto (Max 3 linhas).
            2. Termine com Pergunta.
            3. Se não souber: [KNOWLEDGE_GAP: Pergunta curta para o dono]`
        });

        const payload = {
            model: 'gpt-4o',
            messages: messages,
            temperature: 0.5,
            max_tokens: 350
        };

        // HYBRID STRATEGY: Try Proxy first, then Direct Fallback
        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                if (!data.error) {
                    let result = data.choices[0].message.content.trim();
                    return result.replace(/^(Empresa|Aura|Vendedor|Assistant|Atendente):\s*/i, '');
                }
            }
            throw new Error(`Proxy failed: ${response.status}`);
        } catch (proxyError) {
            console.warn("AURA: Proxy failed, attempting direct client-side fallback...", proxyError);
            if (openaiKey) {
                try {
                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${openaiKey}`
                        },
                        body: JSON.stringify(payload)
                    });
                    const data = await response.json();
                    if (!data.error) {
                        return data.choices[0].message.content.trim();
                    }
                } catch (directError) {
                    console.error("AURA: Direct fallback also failed.", directError);
                }
            }
            return null;
        }
    }

    async enhanceMessage(text, context = {}) {
        const openaiKey = MASTER_AI_KEY;
        const systemPrompt = `
            Você é o Consultor de Vendas Sênior da AURA. Refine a mensagem para ser mais humana, persuasiva e aplicar SPIN Selling.
            CONTEXTO: ${context.briefing || 'Empresa de Alto Padrão'}
            RETORNE APENAS O TEXTO FINAL.
            `.trim();

        const payload = {
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text }
            ],
            temperature: 0.7,
            max_tokens: 300
        };

        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                const data = await response.json();
                return data.choices[0].message.content.trim();
            }
            throw new Error(`Proxy failed: ${response.status}`);
        } catch (e) {
            if (openaiKey) {
                try {
                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${openaiKey}`
                        },
                        body: JSON.stringify(payload)
                    });
                    const data = await response.json();
                    return data.choices[0].message.content.trim();
                } catch (dE) { return text; }
            }
            return text;
        }
    }

    async analyzeNextSteps(chatHistory, patientName, currentTag) {
        const openaiKey = MASTER_AI_KEY;
        // Skip check here to try proxy first

        const systemPrompt = `
            Você é consultor de vendas EXPERT. Analise a conversa e gere um relatório CRM.
            HISTÓRICO: ${chatHistory}
            RETORNE JSON: { 
                "temperature": "quente|morno|frio", 
                "summary": "Resumo de 1 frase", 
                "steps": ["Passo 1", "Passo 2"], 
                "priority": "high|medium|low" 
            }
            `.trim();

        const payload = {
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: 'Analise e sugira os próximos passos.' }
            ],
            temperature: 0.7,
            max_tokens: 300,
            response_format: { type: "json_object" }
        };

        const fallbackError = {
            steps: ['Revisar conversa manualmente'],
            priority: 'medium',
            reasoning: 'Erro na análise automática'
        };

        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                const data = await response.json();
                return JSON.parse(data.choices[0].message.content);
            }
            throw new Error("Proxy error");
        } catch (e) {
            if (openaiKey) {
                try {
                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${openaiKey}`
                        },
                        body: JSON.stringify(payload)
                    });
                    const data = await response.json();
                    return JSON.parse(data.choices[0].message.content);
                } catch (dE) { return fallbackError; }
            }
            return fallbackError;
        }
    }

    async generateNextBriefingQuestion(currentAnswers) {
        const openaiKey = MASTER_AI_KEY; // Fallback key
        const systemPrompt = `Você é o Arquiteto de Inteligência da AURA. Entreviste o dono do negócio. Conhecido: ${JSON.stringify(currentAnswers)}. Faça UMA pergunta por vez. Se acabar, diga COMPLETE.`;

        const payload = {
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: 'Gere a próxima pergunta ou COMPLETE.' }
            ],
            temperature: 0.7,
            max_tokens: 150
        };

        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                const data = await response.json();
                return data.choices?.[0]?.message?.content?.trim();
            }
            throw new Error('Proxy fail');
        } catch (e) {
            if (openaiKey) {
                try {
                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${openaiKey}`
                        },
                        body: JSON.stringify(payload)
                    });
                    const data = await response.json();
                    return data.choices?.[0]?.message?.content?.trim();
                } catch (dE) { return "Algum outro detalhe importante?"; }
            }
            return "Algum outro detalhe importante?";
        }
    }

    async analyzeKnowledgePoint(question, answer) {
        const openaiKey = MASTER_AI_KEY;
        const systemPrompt = `Analise este ponto de conhecimento para vendas. Resposta curta (2 linhas).`;
        const payload = {
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Pergunta: ${question}\nResposta: ${answer}` }
            ],
            temperature: 0.5,
            max_tokens: 100
        };

        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                const data = await response.json();
                return data.choices?.[0]?.message?.content?.trim();
            }
            throw new Error("Proxy fail");
        } catch (e) {
            if (openaiKey) {
                try {
                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${openaiKey}`
                        },
                        body: JSON.stringify(payload)
                    });
                    const data = await response.json();
                    return data.choices?.[0]?.message?.content?.trim();
                } catch (dE) { return "Ponto estratégico validado."; }
            }
            return "Ponto estratégico validado.";
        }
    }
}

export default new OpenAIService();
