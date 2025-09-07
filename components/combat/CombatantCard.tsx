import React from 'react';
// FIX: Correct import path for types.
import { Combatant } from '@/types/index';
import { getDeterministicAvatarSrc } from '../../utils/avatarUtils';

interface CombatantCardProps {
    combatant: Combatant;
    isCurrentTurn?: boolean;
    isTargetable?: boolean;
    onClick?: (id: string) => void;
}

const StatBar: React.FC<{ current: number; max: number; colorClass: string; bgColorClass?: string }> = ({ current, max, colorClass, bgColorClass = 'bg-gray-700' }) => {
    const percentage = max > 0 ? (current / max) * 100 : 0;
    return (
        <div className={`w-full ${bgColorClass} rounded-full h-2.5 border border-gray-800`}>
            <div
                className={`${colorClass} h-full rounded-full transition-all duration-300`}
                style={{ width: `${percentage}%` }}
            ></div>
        </div>
    );
};

const CombatantCard: React.FC<CombatantCardProps> = ({ combatant, isCurrentTurn = false, isTargetable = false, onClick }) => {
    const { name, avatarUrl, gender, currentStats } = combatant;
    const { sinhLuc, maxSinhLuc, linhLuc, maxLinhLuc } = currentStats;

    const hpPercentage = maxSinhLuc > 0 ? (sinhLuc / maxSinhLuc) * 100 : 0;
    let hpColorClass = 'bg-green-500';
    if (hpPercentage < 50) hpColorClass = 'bg-yellow-500';
    if (hpPercentage < 25) hpColorClass = 'bg-red-500';

    let ringClass = 'border-gray-700';
    if (isCurrentTurn) {
        ringClass = 'ring-4 ring-yellow-400 ring-opacity-75 shadow-lg shadow-yellow-500/30';
    } else if (isTargetable) {
        ringClass = 'ring-4 ring-red-500 ring-opacity-75 shadow-lg shadow-red-500/30 cursor-pointer hover:ring-red-400';
    }

    const handleClick = (e: React.MouseEvent) => {
        if (isTargetable && onClick) {
            e.stopPropagation(); // Prevent the main screen's click handler from firing
            onClick(combatant.id);
        }
    };

    return (
        <div 
            className={`bg-gray-800 p-3 rounded-lg shadow-lg border w-full max-w-xs mx-auto flex items-center space-x-4 transition-all duration-300 ${ringClass}`}
            onClick={handleClick}
            role={isTargetable ? 'button' : undefined}
            tabIndex={isTargetable ? 0 : -1}
            onKeyDown={(e) => { if(isTargetable && onClick && (e.key === 'Enter' || e.key === ' ')) handleClick(e as any) }}
            aria-label={isTargetable ? `Chọn ${name} làm mục tiêu` : `Thông tin của ${name}`}
        >
            <img
                src={getDeterministicAvatarSrc({ id: combatant.id, avatarUrl, gender })}
                alt={`Avatar of ${name}`}
                className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500"
            />
            <div className="flex-grow space-y-2 min-w-0">
                <h4 className="text-md font-bold text-gray-100 truncate">{name}</h4>
                <div>
                    <div className="flex justify-between items-baseline text-xs mb-0.5">
                        <span className="font-semibold text-green-400">HP</span>
                        <span className="text-gray-300">{sinhLuc} / {maxSinhLuc}</span>
                    </div>
                    <StatBar current={sinhLuc} max={maxSinhLuc} colorClass={hpColorClass} />
                </div>
                {maxLinhLuc > 0 && (
                    <div>
                         <div className="flex justify-between items-baseline text-xs mb-0.5">
                            <span className="font-semibold text-blue-400">MP</span>
                            <span className="text-gray-300">{linhLuc} / {maxLinhLuc}</span>
                        </div>
                        <StatBar current={linhLuc} max={maxLinhLuc} colorClass="bg-blue-500" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CombatantCard;