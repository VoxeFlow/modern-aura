async function callAiProxy(payload) {
    const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`AI proxy failed: ${response.status}`);
    }

    const data = await response.json();
    if (data?.error) {
        throw new Error(typeof data.error === 'string' ? data.error : 'AI proxy returned an error');
    }

    return data;
}

function hasConfirmedCalendarAccess(text = '') {
    // Only allow concrete slots when explicit marker is present from a real calendar integration.
    return String(text).includes('[AGENDA_CONFIRMED]');
}

function containsSpecificScheduling(text = '') {
    const lower = String(text).toLowerCase();
    if (/(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)/.test(lower)) return true;
    if (/\b\d{1,2}[:h]\d{0,2}\b/.test(lower)) return true;
    if (/\b\d{1,2}\s?(am|pm)\b/.test(lower)) return true;
    return false;
}

function normalizeForSimilarity(text = '') {
    return String(text || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .trim();
}

function isVerySimilar(a = '', b = '') {
    const aa = normalizeForSimilarity(a);
    const bb = normalizeForSimilarity(b);
    if (!aa || !bb) return false;
    if (aa === bb) return true;
    if (aa.includes(bb) || bb.includes(aa)) return true;
    return false;
}

function soundsLikeGenericTemplate(text = '') {
    const lower = String(text || '').toLowerCase();
    return (
        lower.includes('sugestão de mensagem de boas-vindas') ||
        lower.includes('olá [nome do cliente]') ||
        lower.includes('é com grande satisfação') ||
        lower.includes('esperamos que sua experiência')
    );
}

function sanitizeEnhancedOutput(text = '') {
    let out = String(text || '').trim();
    if (!out) return '';

    // Remove prefácios e pós-textos de "assistente explicando"
    out = out.replace(/^claro[,!.\s-]*aqui est[áa].*?:\s*/i, '');
    out = out.replace(/^aqui est[áa].*?:\s*/i, '');
    out = out.replace(/^sugest[ãa]o de mensagem.*?:\s*/i, '');
    out = out.replace(/---/g, ' ');
    out = out.replace(/\s{2,}/g, ' ').trim();

    // Corta rodapé típico que volta a se oferecer para ajustar
    out = out.replace(/(espero que esta mensagem.*)$/i, '').trim();
    out = out.replace(/(se precisar de ajustes.*)$/i, '').trim();
    out = out.replace(/(estou [àa] disposi[çc][ãa]o para ajudar.*)$/i, '').trim();

    // Não permitir placeholders
    out = out.replace(/\[(nome|cliente|seu nome)[^\]]*]/gi, '').trim();

    // Guardrail de tamanho para WhatsApp real
    if (out.length > 240) {
        out = `${out.slice(0, 237).trim()}...`;
    }

    return out;
}

class OpenAIService {
    async generateSuggestion({ clientName, history, briefing, extraContext = '', lastClientText = '', lastAssistantText = '', currentStage = '' }) {
        const lowerLastClient = String(lastClientText || '').toLowerCase();
        const isCancellationIntent =
            /\bcancel(ar|a|ado|amento)?\b/.test(lowerLastClient) ||
            /\bn[aã]o vou conseguir ir\b/.test(lowerLastClient) ||
            /\bdesmarc(ar|a|ado)?\b/.test(lowerLastClient);

        const stageContext = currentStage ? `ETAPA ATUAL DO FUNIL: ${currentStage}` : 'ETAPA ATUAL DO FUNIL: não informada';

        const systemPrompt = `
Você é a AURA, copiloto comercial conversacional.
Sua missão permanente é manter CONTINUIDADE DE DIÁLOGO e avançar o funil com estratégia estável.

PRINCÍPIOS NÚCLEO (NÃO MUDAR):
1. CONTEXTO TOTAL: considere o histórico inteiro antes de responder.
2. ÂNCORA NA ÚLTIMA FALA: responda diretamente o último cliente antes de avançar.
3. CONTINUIDADE: mantenha coerência com a última mensagem do assistente (sem contradizer, sem reiniciar conversa).
4. RITMO COMERCIAL: validar -> conduzir -> convidar para próximo passo.
5. BREVIDADE ÚTIL: máximo 3 frases curtas, WhatsApp natural.
6. FECHAMENTO CONVERSACIONAL: terminar com pergunta tática quando fizer sentido.
7. ESTRATÉGIA FIXA: não trocar estilo, apenas refinar com aprendizado operacional.
8. MEMÓRIA VIVA: usar padrões aceitos pelo operador (incluindo varinha mágica aceita e enviada).
9. CÉREBRO TRAVADO: usar APENAS base de conhecimento e contexto fornecidos.
10. OBJETIVO DE NEGÓCIO: priorizar comparecimento e avanço para receita.
11. TODA resposta deve conter próximo passo claro (micro-compromisso).
12. SEM AGENDA INTEGRADA: nunca inventar disponibilidade, dia ou horário específico.
13. ANTI-REPETIÇÃO: nunca repetir texto já enviado, nunca mandar texto longo institucional.
14. TAMANHO MÁXIMO: resposta final com até 220 caracteres, objetiva e natural.
15. PROIBIDO PLACEHOLDER: não use [Nome], [Cliente] ou modelos prontos.

PLAYBOOK COMERCIAL OBRIGATÓRIO:
- Se houver intenção de cancelar/desmarcar: validar e acolher primeiro, confirmar cancelamento sem atrito, e imediatamente conduzir para remarcação leve (duas opções de data/turno OU permissão para retorno).
- Evitar resposta genérica de "consulta inicial" quando o contexto já é de paciente em acompanhamento.
- Sempre proteger relacionamento, mas conduzir para ação concreta.

BASE DE CONHECIMENTO (Sua Única Verdade):
${briefing}

${stageContext}

${extraContext ? `CONTEXTO EXTRA (RAG + MEMÓRIA OPERACIONAL): ${extraContext}` : ''}
`.trim();

        const messages = [{ role: 'system', content: systemPrompt }];
        if (Array.isArray(history)) messages.push(...history);
        messages.push({
            role: 'user',
            content: `Responda ${clientName} como continuação natural do diálogo.

            ÚLTIMA MENSAGEM DO CLIENTE:
            ${lastClientText || '[Sem texto identificado]'}

            ÚLTIMA MENSAGEM ENVIADA PELO ASSISTENTE:
            ${lastAssistantText || '[Sem referência anterior]'}
            
            🚨 REGRAS CRÍTICAS:
            1. Primeiro responda o ponto da última mensagem do cliente.
            2. Mantenha a linha estratégica e tom já estabelecidos no histórico.
            3. Curto (máximo 3 frases).
            4. Sem resposta genérica ou reinício de conversa.
            5. Se não souber: [KNOWLEDGE_GAP: Pergunta curta para o dono]`,
        });

        if (isCancellationIntent) {
            messages.push({
                role: 'user',
                content: `Contexto crítico: o cliente quer cancelar/desmarcar.
                Responda com estratégia de retenção leve: acolha, confirme cancelamento e proponha o próximo passo de remarcação com pergunta objetiva.`,
            });
        }

        const payload = {
            model: 'gpt-4o',
            messages,
            temperature: 0.35,
            max_tokens: 350,
        };

        try {
            const data = await callAiProxy(payload);
            const result = data?.choices?.[0]?.message?.content?.trim() || '';
            const cleaned = result.replace(/^(Empresa|Aura|Vendedor|Assistant|Atendente):\s*/i, '');
            const contextText = [briefing, extraContext, lastClientText, lastAssistantText].filter(Boolean).join('\n');
            const allowScheduling = hasConfirmedCalendarAccess(contextText);
            const tooLong = cleaned.length > 260;
            const repeated = isVerySimilar(cleaned, lastAssistantText);
            const generic = soundsLikeGenericTemplate(cleaned);
            const invalidByGuardrail = tooLong || repeated || generic;

            if (!allowScheduling && containsSpecificScheduling(cleaned)) {
                return 'Perfeito, já posso cancelar para você. Quer remarcar? Se sim, me diga o melhor dia e período (manhã/tarde/noite).';
            }

            if (invalidByGuardrail) {
                if (isCancellationIntent) {
                    return 'Entendi, sem problema. Posso cancelar agora para você. Prefere remarcar depois ou já me diz o melhor período para eu te ajudar a reagendar?';
                }
                return 'Perfeito, te entendi. Para avançar, me confirma só um ponto rápido: você prefere resolver isso ainda hoje ou quer que eu te chame no melhor horário para você?';
            }

            return cleaned;
        } catch (error) {
            console.error('AURA: generateSuggestion failed', error);
            return null;
        }
    }

    async enhanceMessage(text, context = {}) {
        const lowerText = String(text || '').toLowerCase();
        const isGreetingIntent =
            /\bsauda[çc][ãa]o\b/.test(lowerText) ||
            /\bboas[-\s]?vindas\b/.test(lowerText) ||
            /\bbem[-\s]?vindo\b/.test(lowerText);

        const systemPrompt = `
Você é o revisor da varinha mágica da AURA.
Seu trabalho é devolver uma mensagem PRONTA PARA ENVIAR no WhatsApp.

REGRAS OBRIGATÓRIAS:
1. Responda SOMENTE com o texto final (sem explicação, sem "claro", sem "aqui está").
2. Sem placeholders como [Nome], [Cliente], [Seu nome].
3. Texto curto e natural: máximo 2 frases.
4. Português do Brasil, tom humano e comercial.
5. Nunca repetir bloco institucional longo.
6. Nunca usar delimitadores tipo ---.
7. Se for saudação/boas-vindas, entregar uma versão objetiva e calorosa.

CONTEXTO DA EMPRESA:
${context.briefing || 'Empresa de Alto Padrão'}
`.trim();

        const payload = {
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text },
            ],
            temperature: 0.7,
            max_tokens: 300,
        };

        try {
            const data = await callAiProxy(payload);
            const raw = data?.choices?.[0]?.message?.content?.trim() || text;
            const cleaned = sanitizeEnhancedOutput(raw);

            if (!cleaned || soundsLikeGenericTemplate(cleaned)) {
                if (isGreetingIntent) {
                    return 'Olá! Seja muito bem-vindo(a) à Clínica Inova. Estamos à disposição para te atender com todo cuidado e agendar seu próximo passo quando você quiser.';
                }
                return String(text || '').trim();
            }

            return cleaned;
        } catch (error) {
            console.error('AURA: enhanceMessage failed', error);
            return text;
        }
    }

    async analyzeNextSteps(chatHistory) {
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
                { role: 'user', content: 'Analise e sugira os próximos passos.' },
            ],
            temperature: 0.7,
            max_tokens: 300,
            response_format: { type: 'json_object' },
        };

        const fallbackError = {
            steps: ['Revisar conversa manualmente'],
            priority: 'medium',
            reasoning: 'Erro na análise automática',
        };

        try {
            const data = await callAiProxy(payload);
            return JSON.parse(data?.choices?.[0]?.message?.content || '{}');
        } catch (error) {
            console.error('AURA: analyzeNextSteps failed', error);
            return fallbackError;
        }
    }

    async generateNextBriefingQuestion(currentAnswers) {
        const systemPrompt = `Você é o Arquiteto de Inteligência da AURA. Entreviste o dono do negócio. Conhecido: ${JSON.stringify(currentAnswers)}. Faça UMA pergunta por vez. Se acabar, diga COMPLETE.`;

        const payload = {
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: 'Gere a próxima pergunta ou COMPLETE.' },
            ],
            temperature: 0.7,
            max_tokens: 150,
        };

        try {
            const data = await callAiProxy(payload);
            return data?.choices?.[0]?.message?.content?.trim() || 'Algum outro detalhe importante?';
        } catch (error) {
            console.error('AURA: generateNextBriefingQuestion failed', error);
            return 'Algum outro detalhe importante?';
        }
    }

    async analyzeKnowledgePoint(question, answer) {
        const systemPrompt = 'Analise este ponto de conhecimento para vendas. Resposta curta (2 linhas).';
        const payload = {
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Pergunta: ${question}\nResposta: ${answer}` },
            ],
            temperature: 0.5,
            max_tokens: 100,
        };

        try {
            const data = await callAiProxy(payload);
            return data?.choices?.[0]?.message?.content?.trim() || 'Ponto estratégico validado.';
        } catch (error) {
            console.error('AURA: analyzeKnowledgePoint failed', error);
            return 'Ponto estratégico validado.';
        }
    }
}

export default new OpenAIService();
