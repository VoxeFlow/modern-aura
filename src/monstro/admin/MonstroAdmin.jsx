import React, { useState } from 'react';
import { useMonstroStore } from '../store/monstroStore';
import { Save, DollarSign, Link as LinkIcon, Star } from 'lucide-react';

const MonstroAdmin = () => {
    const { products, config, updateProduct, updateConfig } = useMonstroStore();
    const [activeTab, setActiveTab] = useState('products');

    return (
        <div className="flex-1 bg-gray-50 h-full overflow-y-auto p-8">
            <div className="max-w-5xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">COMANDO CENTRAL</h1>
                    <p className="text-gray-500">Gestão parâmetros do sistema O MONSTRO.</p>
                </header>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`pb-4 px-2 font-bold text-sm uppercase tracking-wide ${activeTab === 'products' ? 'border-b-2 border-black text-black' : 'text-gray-400'}`}
                    >
                        Produtos
                    </button>
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`pb-4 px-2 font-bold text-sm uppercase tracking-wide ${activeTab === 'config' ? 'border-b-2 border-black text-black' : 'text-gray-400'}`}
                    >
                        Configurações
                    </button>
                </div>

                {/* Products Tab */}
                {activeTab === 'products' && (
                    <div className="grid grid-cols-1 gap-6">
                        {products.map((product) => (
                            <div key={product.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-start">
                                <div className="flex-1 space-y-4 w-full">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {product.highlight && <Star className="text-yellow-400 fill-current" size={20} />}
                                            <h3 className="font-bold text-lg">{product.name}</h3>
                                        </div>
                                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-500">{product.id}</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Preço (R$)</label>
                                            <div className="relative">
                                                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="number"
                                                    value={product.price}
                                                    onChange={(e) => updateProduct(product.id, { price: Number(e.target.value) })}
                                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Link de Checkout</label>
                                            <div className="relative">
                                                <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={product.link}
                                                    onChange={(e) => updateProduct(product.id, { link: e.target.value })}
                                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Features (separar por vírgula)</label>
                                        <textarea
                                            value={product.features.join(', ')}
                                            onChange={(e) => updateProduct(product.id, { features: e.target.value.split(',').map(s => s.trim()) })}
                                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none text-sm h-24"
                                        />
                                    </div>
                                </div>

                                <div className="w-full md:w-auto flex flex-col gap-2">
                                    <button
                                        onClick={() => updateProduct(product.id, { highlight: !product.highlight })}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold border ${product.highlight ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                                    >
                                        {product.highlight ? 'Destacado' : 'Destacar'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Config Tab */}
                {activeTab === 'config' && (
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">WhatsApp do Robô</label>
                                <input
                                    type="text"
                                    value={config.whatsappNumber}
                                    onChange={(e) => updateConfig({ whatsappNumber: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none"
                                    placeholder="5511999999999"
                                />
                                <p className="text-xs text-gray-400 mt-1">Número para onde o Widget de Chat irá redirecionar.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Nome do Assistente</label>
                                <input
                                    type="text"
                                    value={config.botName}
                                    onChange={(e) => updateConfig({ botName: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none"
                                />
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <button className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors">
                                    <Save size={18} />
                                    Salvar Alterações
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MonstroAdmin;
