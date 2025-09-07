import React from 'react';
import { NPC, YeuThu } from '../../types/index';
import { getDeterministicAvatarSrc } from '../../utils/avatarUtils';

interface OpponentStatsPanelProps {
    opponents: (NPC | YeuThu)[];
}

const StatBar: React.FC<{ current: number; max: number; colorClass: string }> = ({ current, max, colorClass }) => {
    const percentage = max > 0 ? (current / max) * 100 : 0;
    return (
        <div className="w-full bg-gray-700 rounded-full h-2">
            <div
                className={`${colorClass} h-2 rounded-full`}
                style={{ width: `${percentage}%` }}
            ></div>
        </div>
    );
};

const OpponentStatsPanel: React.FC<OpponentStatsPanelProps> = ({ opponents }) => {
    if (!opponents || opponents.length === 0) {
        return null;
    }

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-4">
            <h3 className="text-lg font-semibold text-red-400 mb-3 border-b border-gray-700 pb-2">
                Đối Thủ
            </h3>
            <div className="space-y-4">
                {opponents.map((opponent) => (
                    <div key={opponent.id} className="flex items-center space-x-3">
                        <img 
                            src={getDeterministicAvatarSrc(opponent)} 
                            alt={opponent.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-600"
                        />
                        <div className="flex-grow">
                            <div className="flex justify-between items-baseline">
                                <p className="font-semibold text-gray-200">{opponent.name}</p>
                                <p className="text-xs text-gray-400">{opponent.realm}</p>
                            </div>
                            <div className="mt-1">
                                <StatBar 
                                    current={opponent.stats?.sinhLuc ?? 0}
                                    max={opponent.stats?.maxSinhLuc ?? 1}
                                    colorClass="bg-red-500"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OpponentStatsPanel;
