const MASTER_AI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

class OpenAIService {
    async generateSuggestion({ clientName, history, briefing, extraContext = "" }) {
        const openaiKey = MASTER_AI_KEY;
        if (!openaiKey) {
            console.error("AURA: OpenAI API Key missing");
            return "⚠️ ERRO: Chave da OpenAI não configurada.";
        }

        const systemPrompt = `
Você é o Orquestrador da AURA v1.2.1, o cérebro comercial da VoxeFlow. Sua missão é transformar o conhecimento técnico da empresa em vendas exponenciais.

BASE DE CONHECIMENTO (ESTRUTURADA):
${briefing}

DIRETRIZES DE ALTA PERFORMANCE:
1. ADAPTAÇÃO TOTAL: Identifique o [SEGMENTO] acima. Use o vocabulário, as dores e o tom específico desse mercado.
2. LEI DO LOOP (OBRIGATÓRIO): TODA, absolutamente TODA resposta deve encerrar com uma PERGUNTA curta. Isso controla a conversa subliminarmente. Jamais termine com afirmação.
3. PODER DO VALOR (WOW): Use os [DIFERENCIAIS] para criar autoridade antes de tocar em [FINANCEIRO] ou [DIRETRIZES]. 
4. ARGUMENTO DINÂMICO: Se o cliente insistir numa dúvida já respondida, mude de lógica para emoção (e vice-versa), nunca repita o mesmo script.
5. ZERO RÓTULOS: Retorne APENAS o texto puro. Sem nomes ou explicações.
6. ⚠️ INTELIGÊNCIA CONTEXTUAL: Antes de responder, ANALISE se a pergunta está na BASE DE CONHECIMENTO. Se estiver (ex: convênio, preços, tratamentos), use APENAS essas informações. NUNCA sugira algo aleatório que não seja a resposta direta à pergunta.

ESTILO WHATSAPP:
- Respostas rápidas (máx 3 linhas).
- Linguagem humana, decidida e sem formalismos exagerados.
- POLÍTICA DE PREÇOS: Se o briefing contiver valores, VOCÊ PODE informar faixas de preço.
⚠️ REGRA DE OURO: JAMAIS INVENTE VALORES. Se o briefing não tiver o preço específico solicitado, diga que "varia conforme o caso" e venda a avaliação.

${extraContext ? `DADOS TÉCNICOS ADICIONAIS: ${extraContext}` : ''}
        `.trim();

        // 1. Prepare Messages
        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        // 2. Add History
        if (Array.isArray(history)) {
            messages.push(...history);
        }

        // 3. Force final command
        messages.push({
            role: 'user',
            content: 'Gere a melhor resposta para a última mensagem acima. Seja direto, sem saudações e sem repetir o que já foi dito nas mensagens anteriores da Empresa.'
        });

        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: messages,
                    temperature: 0.9,
                    max_tokens: 300
                })
            });

            const data = await response.json();
            if (data.error) {
                console.error("AURA AI Proxy Error:", data.error);
                return null;
            }

            let result = data.choices[0].message.content.trim();
            // Final sanitize: Remove any labels the AI might have hallucinated
            result = result.replace(/^(Empresa|Aura|Vendedor|Assistant):\s*/i, '');

            return result;
        } catch (e) {
            console.error("AURA AI Proxy Fetch Error:", e);
            return null;
        }
    }

    async enhanceMessage(text, context = {}) {
        const openaiKey = MASTER_AI_KEY;
        if (!openaiKey || !text.trim()) return text;

        const systemPrompt = `
Você é um redator de vendas EXPERT e assistente de comunicação profissional. Sua missão é transformar o rascunho ou instrução do usuário em uma mensagem de WhatsApp impecável, persuasiva e humana.

CONTEXTO DO NEGÓCIO:
${context.briefing || 'Empresa de Alto Padrão'}

OBJETIVO:
Você deve agir de duas formas, dependendo do que o usuário enviar:

1. SE FOR UM RASCUNHO (Texto incompleto, com erros ou mal escrito):
   - Corrija ortografia, gramática e pontuação.
   - Melhore a fluidez e o tom (mantenha profissional mas próximo).
   - Não adicione informações que não estão lá, apenas "limpe" e "brilhe" o texto.

2. SE FOR UMA INSTRUÇÃO (Ex: "diga que não aceitamos convenio mas damos desconto"):
   - Entenda a INTENÇÃO do usuário.
   - Crie uma frase COMPLETA, elegante e profissional baseada no contexto.
   - Use gatilhos de empatia e conduza para o próximo passo.

REGRAS DE OURO:
- MÁXIMO 3 linhas.
- Naturalidade total (nada de "Caro cliente" ou tons robóticos).
- Vá direto ao ponto.
- Preserve a essência da mensagem.

RETORNE APENAS O TEXTO FINAL DA MENSAGEM, sem explicações, sem aspas, sem comentários.
        `.trim();

        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
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
                console.error("AURA AI Proxy Error:", data.error);
                return text;
            }

            return data.choices[0].message.content.trim();
        } catch (e) {
            console.error("AURA AI Proxy Fetch Error:", e);
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
