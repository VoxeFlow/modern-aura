import React, { useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import KanbanCRM from '../../../components/CRMView'; // Reusing the existing Kanban component
import { Loader } from 'lucide-react';

const CRMView = () => {
    const { userEmail, fetchStages, setChats, tags } = useStore();

    // Sync Stages on Mount
    useEffect(() => {
        if (userEmail) {
            fetchStages();
        }
    }, [userEmail, fetchStages]);

    // Fetch Leads (Chats) to populate the board
    useEffect(() => {
        const loadLeads = async () => {
            try {
                const res = await fetch('/api/crm/leads', {
                    headers: { 'X-User-Email': userEmail }
                });
                if (res.ok) {
                    const data = await res.json();
                    // We need to map these "leads" to "chats" format expected by Kanban
                    // The Kanban component expects "chats" in store.
                    // Let's rely on the store's "chats" if fully synced, or force update it.
                    // For now, let's assume the Kanban component reads from store.chats. 
                    // But we likely need to MAP the lead.status to tags.

                    // Actually, the Kanban uses `useStore().chats` and `useStore().chatTags`.
                    // We need to ensure those are populated from the API data.

                    // Implementation Detail:
                    // The existing Kanban uses `chatTags` { jid: tagId }.
                    // The API returns leads with `status` (which should match tag ID or name).

                    const chatTags = {};
                    const chats = data.map(l => {
                        const jid = l.phone + '@s.whatsapp.net'; // Approx
                        // Try to find tag by name (status)
                        const tagId = tags.find(t => t.name.toLowerCase() === (l.status || 'novo').toLowerCase())?.id || 'novo';
                        chatTags[jid] = tagId;

                        return {
                            id: jid,
                            remoteJid: jid,
                            name: l.name,
                            pushName: l.name,
                            crmKey: jid, // Kanban key
                            dbId: l.id, // Database ID for API updates
                            lastMessage: { message: { conversation: l.last_message } }
                        };
                    });

                    useStore.getState().setChats(chats);
                    useStore.getState().setChatTags(chatTags);
                }
            } catch (e) {
                console.error("Failed to load leads for Kanban", e);
            }
        };
        loadLeads();
    }, [userEmail, tags]); // Re-run if tags change to remap correctly

    return (
        <div className="h-full w-full bg-gray-50 flex flex-col">
            <KanbanCRM />
        </div>
    );
};

export default CRMView;
