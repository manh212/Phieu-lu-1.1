import React from 'react';
// FIX: Correct import path for types.
import { Combatant } from '@/types/index';
import CombatantCard from './CombatantCard';

interface OpponentAreaProps {
    opponents: Combatant[];
    currentTurnId?: string;
    isTargetingMode: boolean;
    onTargetSelect: (targetId: string) => void;
}

const OpponentArea: React.FC<OpponentAreaProps> = ({ opponents, currentTurnId, isTargetingMode, onTargetSelect }) => {
    return (
        <div className="h-full flex items-center justify-center p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <div className="flex flex-wrap items-center justify-center gap-4">
                {opponents.length > 0 ? (
                    opponents.map(opponent => (
                        <CombatantCard 
                            key={opponent.id} 
                            combatant={opponent} 
                            isCurrentTurn={opponent.id === currentTurnId}
                            isTargetable={isTargetingMode && opponent.currentStats.sinhLuc > 0}
                            onClick={onTargetSelect}
                        />
                    ))
                ) : (
                    <p className="text-gray-500 italic">Không có đối thủ.</p>
                )}
            </div>
        </div>
    );
};

export default OpponentArea;