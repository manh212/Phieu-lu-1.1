import React, { useState } from 'react';
import { Combatant, Skill, Item } from '../../types/index';
import CombatantCard from './CombatantCard';
import Button from '../ui/Button';
import Tooltip from '../ui/Tooltip'; // NEW: Import Tooltip component
import { useCombat } from '../../hooks/useCombat';
import { VIETNAMESE } from '../../constants';
import * as GameTemplates from '../../types/index';

export type ActionSelection = {
    type: 'skill' | 'item';
    id: string;
};

interface PlayerControlPanelProps {
    player: Combatant;
    currentTurnId?: string;
    skills: Skill[];
    items: Item[];
    onActionSelect: (selection: ActionSelection) => void;
    onCancelTargeting: () => void;
    isTargetingMode: boolean;
    isPlayerTargetable: boolean; // NEW: To highlight player card for self-targeting
    onPlayerTargetSelect: (targetId: string) => void; // NEW: Handler for self-targeting
}

type ActionTab = 'attack' | 'skill' | 'item' | 'other';

const PlayerControlPanel: React.FC<PlayerControlPanelProps> = ({ 
    player, 
    currentTurnId, 
    skills,
    items,
    onActionSelect,
    onCancelTargeting,
    isTargetingMode,
    isPlayerTargetable, // NEW
    onPlayerTargetSelect, // NEW
}) => {
    const { combatState, processPlayerAction } = useCombat();
    const [activeTab, setActiveTab] = useState<ActionTab>('attack');
    const [tooltip, setTooltip] = useState<{ content: React.ReactNode; target: HTMLElement | null }>({ content: null, target: null });

    const isPlayerTurn = combatState.turnOrder[combatState.currentTurnIndex] === player.id;
    const livingOpponents = combatState.combatants.filter(c => !c.isPlayer && c.currentStats.sinhLuc > 0);
    const usableItems = items.filter(item => item.category === GameTemplates.ItemCategory.POTION && item.quantity > 0);

    const handleActionClick = (selection: ActionSelection) => {
        if (isPlayerTurn) {
            onActionSelect(selection);
        }
    };
    
    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>, content: React.ReactNode) => {
        setTooltip({ content, target: e.currentTarget });
    };

    const handleMouseLeave = () => {
        setTooltip({ content: null, target: null });
    };

    const renderTabContent = () => {
        if (isTargetingMode) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-yellow-300 font-semibold text-lg">Chọn mục tiêu...</p>
                    <Button
                        variant="danger"
                        size="sm"
                        className="mt-2"
                        onClick={(e) => {
                            e.stopPropagation();
                            onCancelTargeting();
                        }}
                    >
                        Hủy
                    </Button>
                </div>
            );
        }

        switch (activeTab) {
            case 'attack':
                return (
                    <div className="grid grid-cols-2 gap-2">
                        {livingOpponents.map(opponent => (
                            <Button
                                key={opponent.id}
                                variant="secondary"
                                className="border-red-500 text-red-300 hover:bg-red-700 hover:text-white"
                                onClick={() => processPlayerAction(`attack:${opponent.id}`)}
                                disabled={!isPlayerTurn}
                            >
                                {opponent.name}
                            </Button>
                        ))}
                    </div>
                );
            case 'skill':
                 return (
                    <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-full custom-scrollbar pr-1">
                        {skills.length > 0 ? skills.map(skill => {
                            const isDisabled = !isPlayerTurn || (skill.currentCooldown ?? 0) > 0 || player.currentStats.linhLuc < skill.manaCost;
                            const tooltipContent = (
                                <div className="text-xs">
                                    <p className="font-bold">{skill.name}</p>
                                    <p className="italic text-gray-300">{skill.description}</p>
                                    <p>Tiêu hao: {skill.manaCost} MP. Hồi chiêu: {skill.cooldown} lượt.</p>
                                    {(skill.currentCooldown ?? 0) > 0 && <p className="text-red-400">Đang hồi: {skill.currentCooldown} lượt</p>}
                                </div>
                            );
                            return (
                                <Button
                                    key={skill.id}
                                    variant="secondary"
                                    className="border-sky-500 text-sky-300 hover:bg-sky-700 hover:text-white relative"
                                    onClick={() => handleActionClick({ type: 'skill', id: skill.id })}
                                    disabled={isDisabled}
                                    onMouseEnter={(e) => handleMouseEnter(e, tooltipContent)}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    {skill.name}
                                     {(skill.currentCooldown ?? 0) > 0 && <span className="absolute -top-1 -right-1 bg-gray-900 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{skill.currentCooldown}</span>}
                                </Button>
                            )
                        }) : <p className="col-span-2 text-gray-500 italic text-sm text-center">{VIETNAMESE.noSkillsAvailable}</p>}
                    </div>
                );
            case 'item':
                return (
                    <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-full custom-scrollbar pr-1">
                        {usableItems.length > 0 ? usableItems.map(item => {
                            const potion = item as GameTemplates.PotionTemplate;
                            const tooltipContent = (
                                <div className="text-xs">
                                    <p className="font-bold">{item.name} (x{item.quantity})</p>
                                    <p className="italic text-gray-300">{item.description}</p>
                                    <p>Hiệu ứng: {potion.effects.join(', ')}</p>
                                </div>
                            );
                            return (
                                <Button
                                    key={item.id}
                                    variant="secondary"
                                    className="border-green-500 text-green-300 hover:bg-green-700 hover:text-white"
                                    onClick={() => handleActionClick({ type: 'item', id: item.id })}
                                    disabled={!isPlayerTurn}
                                    onMouseEnter={(e) => handleMouseEnter(e, tooltipContent)}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    {item.name} (x{item.quantity})
                                </Button>
                            )
                        }) : <p className="col-span-2 text-gray-500 italic text-sm text-center">{VIETNAMESE.noItemsAvailable}</p>}
                    </div>
                );
            case 'other':
                 return (
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="secondary"
                            className="border-yellow-500 text-yellow-300 hover:bg-yellow-700 hover:text-white"
                            onClick={() => processPlayerAction('flee')}
                            disabled={!isPlayerTurn}
                        >
                           {VIETNAMESE.fleeAttempt || "Thử bỏ chạy"}
                        </Button>
                    </div>
                );
            default:
                return null;
        }
    };
    
    const getTabClass = (tabName: ActionTab) => {
        return `flex-1 py-2 text-sm font-semibold transition-colors ${
            activeTab === tabName 
            ? 'text-amber-400 border-b-2 border-amber-400' 
            : 'text-gray-400 hover:text-white'
        }`;
    };

    return (
        <>
            <div 
                className="h-full flex items-center justify-center p-4 bg-gray-900/50 rounded-lg border border-gray-700"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
                    <div className="flex items-center justify-center">
                        <CombatantCard 
                            combatant={player} 
                            isCurrentTurn={player.id === currentTurnId}
                            isTargetable={isPlayerTargetable}
                            onClick={onPlayerTargetSelect}
                        />
                    </div>
                    
                    <div className={`bg-gray-800 p-3 rounded-lg border border-gray-700 transition-opacity flex flex-col ${isPlayerTurn ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                         <div className="flex border-b border-gray-600 mb-3 flex-shrink-0">
                            <button className={getTabClass('attack')} onClick={() => { setActiveTab('attack'); onCancelTargeting(); }}>Tấn Công</button>
                            <button className={getTabClass('skill')} onClick={() => { setActiveTab('skill'); onCancelTargeting(); }}>Kỹ Năng</button>
                            <button className={getTabClass('item')} onClick={() => { setActiveTab('item'); onCancelTargeting(); }}>Vật Phẩm</button>
                            <button className={getTabClass('other')} onClick={() => { setActiveTab('other'); onCancelTargeting(); }}>Khác</button>
                         </div>
                         <div className="h-32 flex flex-col items-center justify-center p-2 flex-grow">
                            {isPlayerTurn ? renderTabContent() : <p className="text-gray-500 italic text-sm">Đang chờ lượt...</p>}
                         </div>
                    </div>
                </div>
            </div>
            {tooltip.target && <Tooltip target={tooltip.target}>{tooltip.content}</Tooltip>}
        </>
    );
};

export default PlayerControlPanel;