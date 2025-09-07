import React, { useRef, useEffect } from 'react';
// FIX: Correct import path for types.
import { GameMessage, CombatLogContent } from '@/types/index';

interface CombatLogProps {
    messages: GameMessage[];
}

const CombatLogRenderer: React.FC<{ log: CombatLogContent }> = React.memo(({ log }) => {
    if (log.type === 'info') {
        return (
            <p className="text-center font-semibold text-gray-400 my-2 italic">
                {log.message}
            </p>
        );
    }

    const {
        actorName, targetName, damage, healing,
        didCrit, didEvade, finalTargetHp, maxTargetHp,
        isPlayerActor, isPlayerTarget, message
    } = log;

    let damageColorClass = '';
    if (damage !== undefined) {
        if (isPlayerActor) damageColorClass = 'text-yellow-400';
        else if (isPlayerTarget) damageColorClass = 'text-red-400';
        else damageColorClass = 'text-gray-300';
    }
    
    // Fallback message rendering if structured data is incomplete
    if(!actorName || !targetName) {
        return <p className="text-gray-300">{message}</p>
    }

    return (
        <p className="text-sm leading-relaxed">
            <span className={isPlayerActor ? "text-cyan-300 font-semibold" : "text-red-300 font-semibold"}>{actorName}</span>
            <span className="text-gray-400"> tấn công </span>
            <span className={isPlayerTarget ? "text-cyan-300 font-semibold" : "text-red-300 font-semibold"}>{targetName}</span>
            <span className="text-gray-400">. </span>

            {didEvade ? (
                <span className="italic font-bold text-sky-400">NÉ TRÁNH!</span>
            ) : (
                <>
                    {didCrit && <span className="font-bold text-red-500 animate-pulse">CHÍ MẠNG! </span>}
                    {damage !== undefined && damage > 0 && (
                        <>
                            <span className="text-gray-400">Gây </span>
                            <span className={`font-bold text-lg ${damageColorClass}`}>{damage}</span>
                            <span className="text-gray-400"> sát thương. </span>
                        </>
                    )}
                    {healing !== undefined && healing > 0 && (
                         <>
                            <span className="text-gray-400">Hồi phục </span>
                            <span className="font-bold text-lg text-green-400">{healing}</span>
                            <span className="text-gray-400"> sinh lực. </span>
                        </>
                    )}
                    {(finalTargetHp !== undefined && maxTargetHp !== undefined) &&
                        <span className="text-xs text-gray-500">
                            (HP của {targetName}: {finalTargetHp}/{maxTargetHp})
                        </span>
                    }
                </>
            )}
        </p>
    );
});

const CombatLog: React.FC<CombatLogProps> = ({ messages }) => {
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    return (
        <div className="h-full bg-gray-800 rounded-lg p-4 border border-gray-700 overflow-y-auto custom-scrollbar">
            {messages.length === 0 ? (
                <p className="text-gray-500 italic text-center">Nhật ký chiến đấu...</p>
            ) : (
                <div className="space-y-2">
                    {messages.map(msg => (
                        <div key={msg.id}>
                            <CombatLogRenderer log={msg.content as CombatLogContent} />
                        </div>
                    ))}
                    <div ref={logEndRef} />
                </div>
            )}
        </div>
    );
};

export default CombatLog;