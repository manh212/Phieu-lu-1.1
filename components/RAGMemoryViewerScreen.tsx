// components/RAGMemoryViewerScreen.tsx
import React, { useState, useMemo } from 'react';
import { useGame } from '../hooks/useGame';
import { GameScreen } from '@/types/enums/core';
import Button from './ui/Button';
import InputField from './ui/InputField';
import { getDeterministicAvatarSrc } from '../utils/avatarUtils';

type EntityTypeKey = 'npc' | 'item' | 'skill' | 'location' | 'lore' | 'faction' | 'yeuThu' | 'wife' | 'slave' | 'prisoner' | 'quest' | 'companion';

const RAGMemoryViewerScreen: React.FC = () => {
    const { knowledgeBase, handlePinEntity, setCurrentScreen } = useGame();
    const [activeTab, setActiveTab] = useState<EntityTypeKey>('npc');
    const [filter, setFilter] = useState<'all' | 'pinned'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const entityLists: Record<EntityTypeKey, { label: string, data: any[] }> = {
        npc: { label: "NPC", data: knowledgeBase.discoveredNPCs || [] },
        item: { label: "Vật Phẩm", data: knowledgeBase.inventory || [] },
        skill: { label: "Kỹ Năng", data: knowledgeBase.playerSkills || [] },
        location: { label: "Địa Điểm", data: knowledgeBase.discoveredLocations || [] },
        lore: { label: "Tri Thức", data: knowledgeBase.worldLore || [] },
        faction: { label: "Phe Phái", data: knowledgeBase.discoveredFactions || [] },
        yeuThu: { label: "Yêu Thú", data: knowledgeBase.discoveredYeuThu || [] },
        wife: { label: "Đạo Lữ", data: knowledgeBase.wives || [] },
        slave: { label: "Nô Lệ", data: knowledgeBase.slaves || [] },
        prisoner: { label: "Tù Nhân", data: knowledgeBase.prisoners || [] },
        quest: { label: "Nhiệm Vụ", data: (knowledgeBase.allQuests || []).filter(q => q.status === 'active') },
        companion: { label: "Đồng Hành", data: knowledgeBase.companions || [] },
    };

    const filteredData = useMemo(() => {
        let data = entityLists[activeTab].data;
        if (filter === 'pinned') {
            data = data.filter(item => item.isPinned);
        }
        if (searchTerm.trim()) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            data = data.filter(item => 
                (item.name || item.title)?.toLowerCase().includes(lowerSearchTerm)
            );
        }
        return data;
    }, [activeTab, filter, searchTerm, knowledgeBase]);

    const renderEntityCard = (entity: any) => {
        const title = entity.name || entity.title || 'Không rõ';
        const description = entity.realm || entity.species || `Số lượng: ${entity.quantity}` || entity.description || '';

        return (
            <div key={entity.id} className="bg-gray-800 p-3 rounded-lg shadow-md flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                    {['npc', 'yeuThu', 'wife', 'slave', 'prisoner'].includes(activeTab) && (
                         <img src={getDeterministicAvatarSrc(entity)} alt={title} className="w-10 h-10 rounded-full object-cover flex-shrink-0"/>
                    )}
                    <div className="overflow-hidden">
                        <p className="font-semibold text-indigo-300 truncate" title={title}>{title}</p>
                        <p className="text-xs text-gray-400 truncate" title={description}>{description}</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePinEntity(activeTab, entity.id)}
                    className={`!py-1 !px-2 text-xs w-24 justify-center transition-colors ${
                        entity.isPinned
                        ? 'text-yellow-300 border-yellow-500 bg-yellow-900/40 hover:bg-yellow-800/60'
                        : 'text-gray-400 border-gray-600 hover:border-yellow-500 hover:text-yellow-300'
                    }`}
                    title={entity.isPinned ? 'Bỏ ghim khỏi bối cảnh cốt lõi' : 'Ghim yếu tố này vào bối cảnh cốt lõi'}
                >
                    {entity.isPinned ? 'Đã ghim' : 'Chưa ghim'}
                </Button>
            </div>
        );
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-800 p-4 sm:p-6 text-gray-100">
            <div className="w-full max-w-4xl bg-gray-900 shadow-2xl rounded-xl flex flex-col h-[90vh]">
                <header className="mb-4 flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500">
                        Trình xem Trí nhớ RAG
                    </h1>
                    <Button variant="secondary" onClick={() => setCurrentScreen(GameScreen.Gameplay)}>
                        Quay Lại Game
                    </Button>
                </header>

                <div className="px-4 pb-3 flex-shrink-0 space-y-3">
                    <InputField
                        label=""
                        id="rag-search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={`Tìm kiếm trong tab ${entityLists[activeTab].label}...`}
                    />
                    <div className="flex items-center justify-between">
                         <div className="flex bg-gray-800 rounded-lg p-1">
                            <Button size="sm" variant={filter === 'all' ? 'primary' : 'ghost'} onClick={() => setFilter('all')} className="!py-1 !px-3">Tất cả</Button>
                            <Button size="sm" variant={filter === 'pinned' ? 'primary' : 'ghost'} onClick={() => setFilter('pinned')} className="!py-1 !px-3">Đã ghim</Button>
                        </div>
                    </div>
                </div>

                <div className="flex border-b border-gray-700 overflow-x-auto custom-scrollbar flex-shrink-0 px-2">
                    {Object.entries(entityLists).map(([key, {label, data}]) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key as EntityTypeKey)}
                            className={`py-2 px-4 text-sm whitespace-nowrap ${activeTab === key ? 'text-cyan-300 border-b-2 border-cyan-400 font-semibold' : 'text-gray-400 hover:text-white'}`}
                        >
                            {label} ({data.length})
                        </button>
                    ))}
                </div>

                <div className="flex-grow overflow-y-auto custom-scrollbar p-4">
                    {filteredData.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredData.map(renderEntityCard)}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 italic mt-8">
                            {filter === 'pinned' ? `Không có ${entityLists[activeTab].label} nào được ghim.` : `Không có ${entityLists[activeTab].label} nào.`}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RAGMemoryViewerScreen;