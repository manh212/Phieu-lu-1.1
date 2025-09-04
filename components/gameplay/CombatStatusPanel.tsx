import React from 'react';
import { useCombat } from '../../hooks/useCombat';
import { Combatant } from '../../types';

const HPBar: React.FC<{ combatant: Combatant }> = ({ combatant }) => {
    const { sinhLuc, maxSinhLuc } = combatant.currentStats;
    const percentage = maxSinhLuc > 0 ? (sinhLuc / maxSinhLuc) * 100 : 0;
    const isLowHealth = percentage < 25;

    let barColor = 'bg-green-500';
    if (percentage < 50) barColor = 'bg-yellow-500';
    if (isLowHealth) barColor = 'bg-red-500';

    return (
        <div className="w-full bg-gray-700 rounded-full h-2.5 border border-gray-800">
            <div 
                className={`${barColor} h-full rounded-full transition-all duration-300`} 
                style={{ width: `${percentage}%` }}
            ></div>
        </div>
    );
};

const CombatStatusPanel: React.FC = () => {
    const { combatState } = useCombat();
    const { isInCombat, combatants } = combatState;

    if (!isInCombat || combatants.length === 0) {
        return null;
    }

    const player = combatants.find(c => c.isPlayer);
    const opponents = combatants.filter(c => !c.isPlayer);

    return (
        <div className="absolute top-2 left-2 z-20 bg-gray-900/70 backdrop-blur-sm p-3 rounded-lg border border-gray-700 w-48 md:w-60 space-y-3 shadow-lg">
            {player && (
                <div>
                    <div className="flex justify-between items-center text-sm mb-1">
                        <span className="font-bold text-cyan-300">{player.name} (Bạn)</span>
                        <span className="text-xs text-gray-300">{player.currentStats.sinhLuc}/{player.currentStats.maxSinhLuc}</span>
                    </div>
                    <HPBar combatant={player} />
                </div>
            )}
            
            {opponents.length > 0 && <hr className="border-gray-700" />}

            {opponents.map(opponent => (
                 <div key={opponent.id}>
                    <div className="flex justify-between items-center text-sm mb-1">
                        <span className={`font-bold ${opponent.currentStats.sinhLuc > 0 ? 'text-red-400' : 'text-gray-500'}`}>{opponent.name}</span>
                        <span className="text-xs text-gray-300">{opponent.currentStats.sinhLuc}/{opponent.currentStats.maxSinhLuc}</span>
                    </div>
                    <HPBar combatant={opponent} />
                </div>
            ))}
        </div>
    );
};

export default CombatStatusPanel;