import { useStore } from '../store/useStore';

class RAGService {
    /**
     * Searches for relevant context based on the query (patient's last message).
     * In this initial version, it simply concatenates matching snippets from RAG sources.
     */
    async getRelevantContext(query) {
        console.log("AURA RAG: Buscando contexto para query:", query);
        const { ragSources, briefing } = useStore.getState();
        let context = "";

        if (!query) return "";

        const cleanQuery = query.toLowerCase();
        const queryWords = cleanQuery.split(/\s+/);

        // 1. Check Briefing (Core Knowledge)
        if (briefing && (cleanQuery.includes('quem') || cleanQuery.includes('clinica') || cleanQuery.includes('onde'))) {
            context += `\n[Info Clínica]: ${briefing.substring(0, 500)}`;
        }

        // 2. Check specialist RAG Sources (Future: Vector Search)
        let processedSources = [];
        if (Array.isArray(ragSources)) {
            processedSources = ragSources;
        } else if (ragSources && typeof ragSources === 'object') {
            processedSources = Object.values(ragSources);
        }

        processedSources.forEach(source => {
            if (!source.keywords || !source.content) return;
            const triggerWords = Array.isArray(source.keywords) ? source.keywords : [source.keywords];

            // Check if any keyword is contained in the query OR if any query word matches a keyword
            const matches = triggerWords.some(word => {
                const cleanWord = String(word).toLowerCase();
                return cleanQuery.includes(cleanWord) || queryWords.includes(cleanWord);
            });

            if (matches) {
                console.log(`AURA RAG: ✅ Match encontrado! Fonte: ${source.name}`);
                context += `\n[Especialista - ${source.name}]: ${source.content}`;
            }
        });

        if (!context) console.log("AURA RAG: ❌ Nenhum contexto relevante encontrado.");
        return context;
    }
}

export default new RAGService();
