const MASTER_AI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

class OpenAIService {
    async generateSuggestion({ clientName, history, briefing, extraContext = "" }) {
        const openaiKey = MASTER_AI_KEY;
        if (!openaiKey) {
            console.error("AURA: OpenAI API Key missing");
            return "⚠️ ERRO: Chave da OpenAI não configurada.";
        }

        const systemPrompt = `
Você é o Especialista de Vendas AURA v10 da VoxeFlow. Sua missão não é apenas responder, mas CONECTAR e CONVERTER através de uma comunicação humana, empática e estrategicamente brilhante.

BASE DE CONHECIMENTO DO NEGÓCIO (SANTUÁRIO DE VERDADE):
${briefing}

${extraContext ? `DADOS TÉCNICOS DO ESPECIALISTA (RAG): ${extraContext}` : ''}

DIRETRIZES DE COMUNICAÇÃO ELITE:

1. 🤝 RAPPORT & CALIBRAGEM:
   - Identifique e espelhe o tom do cliente (se ele for breve, seja breve; se for detalhista, seja atencioso).
   - Use expressões de validação e escuta ativa (ex: "Entendo perfeitamente sua preocupação", "Que bom que você trouxe esse ponto", "Fico feliz em ajudar com isso").
   - Trate o cliente pelo nome sempre que possível.

2. 🧠 SPIN SELLING (FLUXO ESTRATÉGICO):
   - Não despeje informações. Use a lógica SPIN:
     - S (SITUAÇÃO): Entenda o cenário atual do cliente se ele for novo.
     - P (PROBLEMA): Acolha o problema/dor que ele relatar.
     - I (IMPLICAÇÃO): Mostre que você entende as consequências desse problema.
     - N (NECESSIDADE): Apresente como a solução da empresa resolve isso.
   - O objetivo é fazer o cliente desejar o agendamento/venda antes mesmo de você oferecer.

3. 🛡️ POLÍTICA DE INTEGRIDADE & LOOP DE CONHECIMENTO (CRÍTICO):
   - NUNCA INVENTE NADA. Se a informação não estiver na BASE DE CONHECIMENTO ou nos DADOS TÉCNICOS, você deve agir de forma proativa para o futuro.
   - ⚠️ PROTOCOLO DE LACUNA: Se você não encontrar a resposta exata para uma dúvida do cliente (ex: preço específico, política nova), você deve responder EXATAMENTE no seguinte formato:
     [KNOWLEDGE_GAP: {Escreva aqui uma pergunta clara e curta para o dono do negócio responder no WhatsApp e alimentar seu cérebro}]
   - Se você encontrar informações parciais, use-as e encerre pedindo para confirmar detalhes com o especialista, mas se não houver NADA, use o protocolo acima.
   - Preços: Siga estritamente os valores do briefing. Se não houver, e você não quiser dar um valor de referência "a partir de", use o PROTOCOLO DE LACUNA.

4. 🖋️ TOM & MANEIRAS (HUMAN-FIRST):
   - Seja extremamente gentil, educado e prestativo.
   - Use uma linguagem "falada", natural, sem ser robótica ou excessivamente formal.
   - Máximo 3 a 4 linhas por mensagem.
   - TODA resposta deve terminar com uma pergunta de engajamento que leve ao próximo passo (Leads quentes -> Agendamento; Leads frios -> Autoridade/Dúvida).

5. RETORNE APENAS O TEXTO FINAL DA MENSAGEM.
        `.trim();

        // 1. Prepare Messages
        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        // 2. Add History
        if (Array.isArray(history)) {
            messages.push(...history);
        }

        // 3. Final instruction
        messages.push({
            role: 'user',
            content: `Gere uma resposta calorosa, humana e profissional para ${clientName}.
            
            🚨 REGRA DE OURO (ANTI-ALUCINAÇÃO):
            - Use EXCLUSIVAMENTE as informações do "BASE DE CONHECIMENTO DO NEGÓCIO" acima.
            - NÃO INVENTE nomes de marcas (ex: Straumann, Invisalign) ou preços que não estejam no texto.
            - Se a informação não estiver lá, USE O PROTOCOLO DE LACUNA [KNOWLEDGE_GAP].
            - Ignore qualquer conhecimento prévio que você tenha sobre "padrões de mercado". O que vale é o briefing deste cliente específico.`
        });

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: messages,
                    temperature: 0.5, // Strict adherence to briefing
                    max_tokens: 350
                })
            });

            const data = await response.json();
            if (data.error) {
                console.error("AURA AI API Error:", data.error);
                return null;
            }

            let result = data.choices[0].message.content.trim();
            result = result.replace(/^(Empresa|Aura|Vendedor|Assistant|Atendente):\s*/i, '');

            return result;
        } catch (e) {
            console.error("AURA AI API Fetch Error:", e);
            return null;
        }
    }

    async enhanceMessage(text, context = {}) {
        const openaiKey = MASTER_AI_KEY;
        if (!openaiKey || !text.trim()) return text;

        const systemPrompt = `
            Você é o Consultor de Vendas Sênior da AURA. Sua missão é refinar a mensagem do usuário para que ela soe mais humana, persuasiva e profissional, mantendo o Rapport e aplicando SPIN Selling.

            CONTEXTO DO NEGÓCIO:
            ${context.briefing || 'Empresa de Alto Padrão'}

            DIRETRIZES DE REFINAMENTO:
            1. HUMANIZE: Remova tons robóticos ou agressivos. Adicione polidez e empatia.
            2. ESTRUTURA: Máximo 3 linhas. Termine sempre com uma pergunta instigante.
            3. CONTEXTO: Use o conhecimento do negócio para dar autoridade à mensagem (ex: citar um diferencial se fizer sentido).
            4. FIDELIDADE: Não mude a intenção do usuário, apenas eleve a qualidade da entrega.

            RETORNE APENAS O TEXTO FINAL, sem aspas ou explicações.
            `.trim();

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o', // Using GPT-4o for better intent detection
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: text }
                    ],
                    temperature: 0.7,
                    max_tokens: 300
                })
            });

            const data = await response.json();
            if (data.error) {
                console.error("AURA AI API Error:", data.error);
                return text;
            }

            return data.choices[0].message.content.trim();
        } catch (e) {
            console.error("AURA AI API Fetch Error:", e);
            return text;
        }
    }

    async analyzeNextSteps(chatHistory, patientName, currentTag) {
        const openaiKey = MASTER_AI_KEY;
        if (!openaiKey) {
            return {
                steps: ['Configure OpenAI API key'],
                priority: 'medium',
                reasoning: 'API key não configurada'
            };
        }

        const systemPrompt = `
            Você é um consultor de vendas EXPERT em orquestração de negócios.

            CONTEXTO:
            - Cliente: ${patientName}
            - Estágio Atual: ${currentTag}

            HISTÓRICO DA CONVERSA:
            ${chatHistory}

            MISSÃO: Analise a conversa e sugira os próximos 2-3 passos ESPECÍFICOS e ACIONÁVEIS para converter este lead.

            REGRAS:
            1. Seja ESPECÍFICO (não genérico como "fazer follow-up")
            2. Considere o estágio atual do funil
            3. Priorize ações que movem o lead para o próximo estágio
            4. Seja PRÁTICO (ações que podem ser feitas hoje)

            EXEMPLOS DE BONS PASSOS:
            - "Enviar vídeo explicativo sobre implante dentário via WhatsApp"
            - "Ligar hoje às 15h para esclarecer dúvida sobre convênio"
            - "Enviar proposta personalizada com 3 opções de pagamento"

            RETORNE EM JSON:
            {
                "steps": ["Passo 1", "Passo 2", "Passo 3"],
            "priority": "high|medium|low",
            "reasoning": "Breve explicação da prioridade"
}
            `.trim();

        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: 'Analise e sugira os próximos passos.' }
                    ],
                    temperature: 0.7,
                    max_tokens: 300,
                    response_format: { type: "json_object" }
                })
            });

            const data = await response.json();

            if (data.error) {
                console.error('OpenAI API Error:', data.error);
                return {
                    steps: ['Revisar conversa manualmente'],
                    priority: 'medium',
                    reasoning: 'Erro na análise automática'
                };
            }

            const result = JSON.parse(data.choices[0].message.content);
            return result;
        } catch (error) {
            console.error('Error analyzing next steps:', error);
            return {
                steps: ['Revisar conversa manualmente'],
                priority: 'medium',
                reasoning: 'Erro na análise automática'
            };
        }
    }

    async generateNextBriefingQuestion(currentAnswers) {
        const openaiKey = MASTER_AI_KEY;
        if (!openaiKey) return "Qual o próximo detalhe importante do seu negócio?";

        const systemPrompt = `
            Você é o Arquiteto de Inteligência da AURA. Sua missão é entrevistar o dono de um negócio para criar uma base de conhecimento PERFEITA.

            REGRAS DA ENTREVISTA:
            1. Analise o que já sabemos: ${JSON.stringify(currentAnswers)}
            2. IDENTIFIQUE LACUNAS: Falta o endereço? É produto ou serviço? Como é o checkout? Tem garantia?
            3. PERGUNTA ÚNICA: Faça APENAS UMA pergunta por vez.
            4. FOCO EM VENDAS: Pergunte coisas que ajudem a IA a vender melhor depois (ex: diferenciais, dores do cliente).
            5. CURTO E DIRETO: A pergunta deve ser fácil de responder no celular.
            6. FINALIZAÇÃO: Se você achar que já tem informações suficientes para uma operação de elite (mínimo 5-6 pontos chave), responda apenas com a palavra "COMPLETE".

            ESTILO: Amigável, profissional e focado em eficiência.
            `.trim();

        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: 'Gere a próxima pergunta da entrevista ou diga COMPLETE.' }
                    ],
                    temperature: 0.7,
                    max_tokens: 150
                })
            });

            const data = await response.json();
            return data.choices?.[0]?.message?.content?.trim() || "Algum outro detalhe importante?";
        } catch (e) {
            return "Algum outro detalhe importante?";
        }
    }

    async analyzeKnowledgePoint(question, answer) {
        const openaiKey = MASTER_AI_KEY;
        if (!openaiKey) return "Analise não disponível.";

        const systemPrompt = `
            Você é o Estrategista de Vendas da AURA. Sua missão é analisar um ponto específico do conhecimento de uma empresa e dizer POR QUE isso é importante para vender e como a IA deve usar isso.

            REGRAS:
            1. Resposta CURTA (máximo 2 linhas).
            2. Use tom de consultoria.
            3. Foque em CONVERSÃO.
            `.trim();

        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Pergunta: ${question}\nResposta: ${answer}\n\nGere uma análise estratégica curta.` }
                    ],
                    temperature: 0.5,
                    max_tokens: 100
                })
            });

            const data = await response.json();
            return data.choices?.[0]?.message?.content?.trim() || "Ponto estratégico validado.";
        } catch (e) {
            return "Ponto estratégico salvo com sucesso.";
        }
    }
}

export default new OpenAIService();
