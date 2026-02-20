import React, { useState, useEffect } from 'react';
import { NeonButton } from '../../components/NeonButton';
import { Check, X, User, Clock, ShieldAlert } from 'lucide-react';

const AdminUsers = ({ user }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users', {
                headers: { 'X-User-Email': user.email }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleApprove = async (userId, approve) => {
        // Optimistic update
        setUsers(users.map(u => u.id === userId ? { ...u, approved: approve } : u));

        try {
            await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Email': user.email
                },
                body: JSON.stringify({ userId, approve })
            });
        } catch (e) {
            alert('Erro ao atualizar usuário');
            fetchUsers(); // Revert
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <ShieldAlert className="text-monstro-primary" />
                Controle de Acesso
            </h2>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">Email</th>
                            <th className="p-4">Função</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Data</th>
                            <th className="p-4 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan="5" className="p-8 text-center text-gray-400">Carregando...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan="5" className="p-8 text-center text-gray-400">Nenhum usuário encontrado.</td></tr>
                        ) : (
                            users.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-medium text-gray-800 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                            <User size={14} />
                                        </div>
                                        {u.email}
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {u.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {u.approved ? (
                                            <span className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded w-fit">
                                                <Check size={12} /> Aprovado
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-orange-500 text-xs font-bold bg-orange-50 px-2 py-1 rounded w-fit">
                                                <Clock size={12} /> Pendente
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-gray-400">
                                        {new Date(u.created_at * 1000).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        {!u.approved && (
                                            <button
                                                onClick={() => handleApprove(u.id, true)}
                                                className="text-white bg-green-500 hover:bg-green-600 px-3 py-1 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-green-500/20"
                                            >
                                                APROVAR
                                            </button>
                                        )}
                                        {u.approved && u.role !== 'admin' && (
                                            <button
                                                onClick={() => handleApprove(u.id, false)}
                                                className="text-red-500 hover:bg-red-50 px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                                            >
                                                Bloquear
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminUsers;
