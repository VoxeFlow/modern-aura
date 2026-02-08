const MASTER_AI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

class OpenAIService {
    async generateSuggestion({ clientName, history, briefing, extraContext = "" }) {
        const openaiKey = MASTER_AI_KEY;
        if (!openaiKey) {
            console.error("AURA: OpenAI API Key missing in environment variables");
            return "⚠️ ERRO: Chave da OpenAI não configurada no Cloudflare (VITE_OPENAI_API_KEY).";
        }

        const historyPrompt = typeof history === 'string' ? history : (Array.isArray(history) ? history.slice(-10).map(m => `${m.isMe ? 'Vendedor' : 'Cliente'}: ${m.text}`).join('\n') : "");

        // Extract last 3 messages for better context
        const recentMessages = historyPrompt.split('\n').slice(-6).join('\n');
        const lastClientMsg = historyPrompt.split('\n').filter(line => line.startsWith('Cliente:')).pop() || "";

        const systemPrompt = `
Você é o Orquestrador da AURA, um consultor de vendas de alto nível.

CONTEXTO DO NEGÓCIO:
${briefing}

${extraContext ? `DADOS TÉCNICOS ESPECÍFICOS:\n${extraContext}\n` : ''}

ORDEM CRONOLÓGICA DAS MENSAGENS (A última é a mais recente):
${historyPrompt}

SITUAÇÃO ATUAL:
- Cliente: ${clientName}
- Última interação foi: ${historyPrompt.split('\n').pop()}

REGRAS DE OURO DE RESPOSTA (ORDEM DE IMPORTÂNCIA):

1. ATENÇÃO TOTAL À ÚLTIMA MENSAGEM:
   - Sua resposta DEVE ser uma reação direta e imediata ao que foi dito por último.
   - Ignore saudações iniciais se a conversa já estiver em andamento.

2. PROIBIÇÃO DE REPETIÇÃO:
   - Verifique o histórico. Se a "Empresa" já disse "Olá", "Que bom que você entrou em contato" ou já fez perguntas de boas-vindas, NÃO REPITA ISSO.
   - Se o cliente já informou o que quer (ex: implantes, preço), não pergunte "como posso ajudar" ou "o que você busca".

3. LÓGICA DE VENDAS POR CENÁRIO:
   A) SE O CLIENTE FALOU DE PREÇO/VALOR:
      - Foque 100% no VALOR do tratamento, tecnologia e nos benefícios.
      - NUNCA dê preços fixos.
      - Convide para uma avaliação clínica ou raio-X para um plano personalizado.

   B) SE O CLIENTE SÓ DISSE "OLÁ":
      - Seja acolhedor e faça uma pergunta de triagem (ex: "O que você busca melhorar no seu sorriso hoje?").

   C) SE O CLIENTE JÁ ESTÁ CONVERSANDO:
      - Seja objetivo. WhatsApp é rapidez. Máximo 2-3 linhas.

TOM DE VOZ:
- Humano, empático, profissional e objetivo.
- Máximo 1 emoji.

AGORA GERE A MELHOR RESPOSTA ESTRATÉGICA. Apenas o texto da resposta.
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
                        { role: 'user', content: 'Gere a melhor resposta estratégica para a última mensagem do cliente.' }
                    ],
                    temperature: 0.85,
                    max_tokens: 200
                })
            });

            const data = await response.json();
            if (data.error) {
                console.error("AURA AI Proxy Error:", data.error);
                return null;
            }

            return data.choices[0].message.content.trim();
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
