const MASTER_AI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

class OpenAIService {
    async generateSuggestion({ clientName, history, briefing, extraContext = "" }) {
        const openaiKey = MASTER_AI_KEY;
        if (!openaiKey) {
            console.error("AURA: OpenAI API Key missing");
            return "⚠️ ERRO: Chave da OpenAI não configurada.";
        }

        const systemPrompt = `
Você é o Orquestrador da AURA, um consultor de vendas EXPERT focado em persuasão humana e conversão.

DIRETRIZES TÁTICAS SUPREMAS:
1. SEM SCRIPTS: NUNCA diga frases prontas como "Os implantes são uma solução incrível". Fale como um ser humano: "Entendo que o preço preocupa...", "Deixa eu te explicar por que é difícil dar um valor agora...".
2. ROTAÇÃO DE ARGUMENTO: Verifique o histórico. Se você já deu uma resposta e o cliente INSISTIU na mesma pergunta, NÃO REPITA o mesmo argumento. Mude o ângulo.
   - Ex: Se ele pediu preço e você disse "precisa de avaliação", e ele insistiu "mas só uma média", mude para: "Entendo sua pressa, mas dar um valor errado aqui seria desonesto, pois um implante pode precisar de enxerto ou não. O ideal é vermos isso juntos na avaliação, sem compromisso."
3. FOCO NA ÚLTIMA DEMANDA: Identifique a dor imediata do cliente e responda a ela primeiro.
4. AGENDAMENTO NATURAL: Toda conversa deve fluir para um "vamos ver isso de perto?" de forma orgânica.
5. ZERO RÓTULOS: Retorne apenas a mensagem. Sem "Empresa:", "Aura:", etc.
6. CONTEXTO: ${briefing}
${extraContext ? `7. DADOS TÉCNICOS: ${extraContext}` : ''}

REGRAS DE WHATSAPP:
- Máximo 3 linhas curtas.
- Tom próximo, empático e resolutivo.
- Máximo 1 emoji.
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
}

export default new OpenAIService();
