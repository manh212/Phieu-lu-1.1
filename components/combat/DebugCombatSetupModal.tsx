import React, { useState, useMemo } from 'react';
import { KnowledgeBase, NPC, YeuThu } from '../../types/index';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import InputField from '../ui/InputField';
import { getDeterministicAvatarSrc } from '../../utils/avatarUtils';
import { VIETNAMESE } from '../../constants';

interface DebugCombatSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    knowledgeBase: KnowledgeBase;
    onStartCombat: (opponentIds: string[]) => void;
}

const DebugCombatSetupModal: React.FC<DebugCombatSetupModalProps> = ({ isOpen, onClose, knowledgeBase, onStartCombat }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const allOpponents = useMemo(() => {
        const npcs = knowledgeBase.discoveredNPCs.map(npc => ({ ...npc, type: 'NPC' as const }));
        const yeuThus = knowledgeBase.discoveredYeuThu.map(yt => ({ ...yt, type: 'Yêu Thú' as const }));
        return [...npcs, ...yeuThus].sort((a, b) => a.name.localeCompare(b.name));
    }, [knowledgeBase.discoveredNPCs, knowledgeBase.discoveredYeuThu]);

    const filteredOpponents = useMemo(() => {
        if (!searchTerm.trim()) return allOpponents;
        const lowerSearchTerm = searchTerm.toLowerCase();
        return allOpponents.filter(opp => opp.name.toLowerCase().includes(lowerSearchTerm));
    }, [allOpponents, searchTerm]);

    const handleToggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                if (newSet.size < 4) { // Limit to 4 opponents
                    newSet.add(id);
                }
            }
            return newSet;
        });
    };

    const handleStart = () => {
        onStartCombat(Array.from(selectedIds));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Chọn Đối Thủ Cho Trận Đấu Thử">
            <div className="flex flex-col h-[70vh]">
                <InputField
                    label=""
                    id="opponent-search"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Tìm kiếm theo tên..."
                    className="mb-3"
                />
                <div className="flex-grow overflow-y-auto custom-scrollbar border-t border-b border-gray-700 py-2 -mx-6 px-6">
                    <ul className="space-y-2">
                        {filteredOpponents.map(opp => (
                            <li key={opp.id}>
                                <label
                                    htmlFor={`opponent-${opp.id}`}
                                    className={`flex items-center p-2 rounded-lg transition-colors cursor-pointer ${selectedIds.has(opp.id) ? 'bg-indigo-800/70' : 'bg-gray-700/50 hover:bg-gray-700'}`}
                                >
                                    <input
                                        type="checkbox"
                                        id={`opponent-${opp.id}`}
                                        checked={selectedIds.has(opp.id)}
                                        onChange={() => handleToggleSelection(opp.id)}
                                        className="h-5 w-5 rounded text-indigo-500 bg-gray-600 border-gray-500 focus:ring-indigo-400"
                                        disabled={selectedIds.size >= 4 && !selectedIds.has(opp.id)}
                                    />
                                    <img
                                        src={getDeterministicAvatarSrc(opp)}
                                        alt={opp.name}
                                        className="w-10 h-10 rounded-full object-cover mx-3 border border-gray-600"
                                    />
                                    <div className="flex-grow">
                                        <p className="font-semibold text-gray-100">{opp.name}</p>
                                        <p className="text-xs text-gray-400">[{opp.type}] {opp.realm}</p>
                                    </div>
                                </label>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="pt-4 flex justify-between items-center">
                    <span className="text-sm text-gray-400">Đã chọn: {selectedIds.size} / 4</span>
                    <div>
                        <Button variant="secondary" onClick={onClose} className="mr-2">Hủy</Button>
                        <Button
                            variant="primary"
                            onClick={handleStart}
                            disabled={selectedIds.size === 0}
                        >
                            Bắt đầu Chiến đấu
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default DebugCombatSetupModal;
