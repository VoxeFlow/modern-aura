const MASTER_AI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

class OpenAIService {
    async generateSuggestion({ patientName, history, briefing, extraContext = "" }) {
        const openaiKey = MASTER_AI_KEY;
        if (!openaiKey) return null;

        const historyPrompt = typeof history === 'string' ? history : (Array.isArray(history) ? history.slice(-10).map(m => `${m.isMe ? 'Vendedor' : 'Paciente'}: ${m.text}`).join('\n') : "");

        // Extract last 3 messages for better context
        const recentMessages = historyPrompt.split('\n').slice(-6).join('\n');
        const lastPatientMsg = historyPrompt.split('\n').filter(line => line.startsWith('Paciente:')).pop() || "";

        const systemPrompt = `
Você é um consultor de vendas EXPERT em odontologia de alto padrão. Sua missão é converter leads em agendamentos.

CONTEXTO DA CLÍNICA:
${briefing}

${extraContext ? `INFORMAÇÃO TÉCNICA RELEVANTE:\n${extraContext}\n` : ''}

HISTÓRICO RECENTE DA CONVERSA:
${recentMessages}

ÚLTIMA MENSAGEM DO PACIENTE:
${lastPatientMsg}

INTELIGÊNCIA DE RESPOSTA - SIGA RIGOROSAMENTE:

1. ANÁLISE DE CONTEXTO:
   - Leia TODO o histórico, não apenas a última mensagem
   - Identifique o ESTÁGIO da conversa (primeiro contato, dúvida, objeção, pronto para agendar)
   - Detecte EMOÇÕES (ansiedade, urgência, desconfiança, empolgação)

2. REGRAS DE OURO:
   - MÁXIMO 2-3 linhas (WhatsApp é rápido!)
   - Use o NOME do paciente quando apropriado (${patientName !== 'Paciente' ? patientName : 'mas evite "Paciente" genérico'})
   - NUNCA repita informações já ditas
   - NUNCA dê valores exatos (sempre "varia conforme o caso")
   - SEMPRE conduza para AGENDAMENTO

3. ESTRATÉGIAS POR ESTÁGIO:
   
   A) PRIMEIRO CONTATO / DÚVIDA INICIAL:
      - Seja acolhedor e mostre interesse genuíno
      - Faça UMA pergunta qualificadora
      - Exemplo: "Oi! Que bom que você entrou em contato. Você já tem alguma urgência ou está buscando melhorar algo específico?"
   
   B) OBJEÇÃO DE PREÇO:
      - NUNCA dê valor direto
      - Foque no VALOR (qualidade, resultado, tecnologia)
      - Redirecione para avaliação gratuita
      - Exemplo: "O investimento varia bastante conforme o caso. Que tal fazer uma avaliação sem custo? Assim você sai com um plano personalizado e o valor exato."
   
   C) OBJEÇÃO DE CONVÊNIO:
      - Seja direto mas ofereça solução
      - Destaque facilidades de pagamento
      - Exemplo: "Não trabalhamos com convênio, mas temos parcelamento facilitado em até 24x. Prefere agendar e ver as condições?"
   
   D) PRONTO PARA AGENDAR:
      - Seja DIRETO e objetivo
      - Ofereça opções de horário
      - Exemplo: "Perfeito! Temos horários amanhã de manhã ou na quinta à tarde. Qual funciona melhor?"

4. TOM E ESTILO:
   - Natural e humano (como se fosse um amigo profissional)
   - Confiante mas não arrogante
   - Empático com as preocupações
   - Máximo 1 emoji por mensagem (use com sabedoria)

5. PROIBIDO:
   - Frases robóticas ("Claro, Paciente!")
   - Jargões técnicos desnecessários
   - Textos longos (mais de 3 linhas)
   - Repetir informações já ditas
   - Ser vago ou genérico

AGORA GERE A MELHOR RESPOSTA POSSÍVEL. Apenas a resposta, sem explicações.
        `.trim();

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: 'Gere a melhor resposta estratégica para a última mensagem do paciente.' }
                    ],
                    temperature: 0.85, // Balanced for natural variation
                    max_tokens: 200 // Allow slightly longer for complete thoughts
                })
            });

            const data = await response.json();
            if (data.error) {
                console.error("OpenAI API Error:", data.error);
                return null;
            }

            return data.choices[0].message.content.trim();
        } catch (e) {
            console.error("OpenAI Fetch Error:", e);
            return null;
        }
    }

    async enhanceMessage(text, context = {}) {
        const openaiKey = MASTER_AI_KEY;
        if (!openaiKey || !text.trim()) return text;

        const systemPrompt = `
Você é um assistente de escrita especializado em comunicação profissional para clínicas odontológicas.

CONTEXTO DA CLÍNICA:
${context.briefing || 'Clínica odontológica de alto padrão'}

MISSÃO: Melhorar a mensagem do usuário mantendo SUA ESSÊNCIA e INTENÇÃO.

REGRAS CRÍTICAS:
1. CORRIJA ortografia e gramática (prioridade máxima)
2. MANTENHA o tom original (se informal, mantenha informal; se formal, mantenha formal)
3. PRESERVE a intenção e o significado (não mude o que a pessoa quis dizer)
4. SEJA CONCISO: não adicione informações desnecessárias
5. MELHORE a clareza sem perder naturalidade
6. Se já estiver bom, faça apenas ajustes mínimos

EXEMPLOS:

Input: "oila como vai vocie"
Output: "Olá! Como vai você?"

Input: "bom dia, gostaria de saber sobre implante"
Output: "Bom dia! Gostaria de saber sobre implante."

Input: "vc atende sabado? presiso marcar"
Output: "Você atende sábado? Preciso marcar."

Input: "Boa tarde, estou interessado em fazer uma avaliação para implante dentário"
Output: "Boa tarde! Estou interessado em fazer uma avaliação para implante dentário."

IMPORTANTE: Retorne APENAS o texto corrigido, sem aspas, sem explicações, sem comentários.
        `.trim();

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini', // Faster model for corrections
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: text }
                    ],
                    temperature: 0.2, // Low for consistent corrections
                    max_tokens: 250
                })
            });

            const data = await response.json();
            if (data.error) {
                console.error("OpenAI API Error:", data.error);
                return null;
            }

            return data.choices[0].message.content.trim();
        } catch (e) {
            console.error("OpenAI Fetch Error:", e);
            return null;
        }
    }

    async enhanceMessage(text, context = {}) {
        const openaiKey = MASTER_AI_KEY;
        if (!openaiKey || !text.trim()) return text;

        const systemPrompt = `
Você é um assistente de escrita que corrige e melhora mensagens para WhatsApp.

REGRAS:
1. Corrija TODOS os erros de ortografia e gramática
2. Mantenha o TOM ORIGINAL do usuário (não formalize demais)
3. Mantenha a INTENÇÃO original (não mude o significado)
4. Seja CONCISO: não adicione informações desnecessárias
5. Se já estiver bom, retorne o texto original com pequenos ajustes

CONTEXTO:
${context.briefing || 'Clínica odontológica'}

Retorne APENAS o texto corrigido, sem explicações.
        `.trim();

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini', // Faster model for simple corrections
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Corrija e melhore: "${text}"` }
                    ],
                    temperature: 0.3, // Lower for consistent corrections
                    max_tokens: 200
                })
            });

            const data = await response.json();
            if (data.error) {
                console.error("OpenAI Enhance Error:", data.error);
                return text; // Return original on error
            }

            return data.choices[0].message.content.trim();
        } catch (e) {
            console.error("OpenAI Enhance Fetch Error:", e);
            return text; // Return original on error
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
Você é um consultor de vendas EXPERT em odontologia.

CONTEXTO:
- Paciente: ${patientName}
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
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`
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
