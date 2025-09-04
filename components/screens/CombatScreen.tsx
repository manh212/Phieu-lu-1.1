
import React, { useState, useCallback } from 'react';
import { useCombat } from '../../hooks/useCombat';
import { useGame } from '../../hooks/useGame';
import OpponentArea from '../combat/OpponentArea';
import PlayerControlPanel, { ActionSelection } from '../combat/PlayerControlPanel';
import CombatLog from '../combat/CombatLog';
import Spinner from '../ui/Spinner';
import { Skill, Item } from '../../types';
import * as GameTemplates from '../../templates';

type InteractionState = 'idle' | 'selecting_target';

const CombatScreen: React.FC = () => {
    const { combatState, processPlayerAction } = useCombat();
    const { gameMessages, knowledgeBase } = useGame();
    
    const [interactionState, setInteractionState] = useState<InteractionState>('idle');
    const [pendingAction, setPendingAction] = useState<ActionSelection | null>(null);
    const [isPlayerTargetable, setIsPlayerTargetable] = useState(false);
    const [isOpponentTargetable, setIsOpponentTargetable] = useState(false);


    if (!combatState.isInCombat || combatState.combatants.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-6 text-center">
                <Spinner text="Đang tải trận chiến..." />
            </div>
        );
    }

    const player = combatState.combatants.find(c => c.isPlayer);
    const opponents = combatState.combatants.filter(c => !c.isPlayer);
    const combatLogMessages = gameMessages.filter(msg => msg.type === 'combat_log');
    
    const currentTurnCombatantId = combatState.turnOrder[combatState.currentTurnIndex];

    const handleActionSelect = useCallback((selection: ActionSelection) => {
        // This function determines if an action needs target selection, and what kind of target.
        let targetType: 'opponent' | 'self' = 'opponent'; // Default to opponent

        if (selection.type === 'skill') {
            const skill = knowledgeBase.playerSkills.find(s => s.id === selection.id);
            if (skill) {
                // FIX: Handle self-targeted skills immediately without requiring target selection.
                // This is a "targetless" action from the UI perspective.
                if (skill.targetType === 'Tự Thân') {
                    const player = combatState.combatants.find(c => c.isPlayer);
                    if (player) {
                        processPlayerAction(`use_skill:${selection.id}:${player.id}`);
                    }
                    return; // Action processed, exit function.
                }

                // Determine if the skill targets allies (self) or enemies (opponent)
                const isAllyTargeted = skill.targetType?.includes('Đồng Minh');
                // Heuristic: if it heals but doesn't damage, it's a self/ally target. Otherwise opponent.
                const isPrimarilyHealing = ((skill.healingAmount ?? 0) > 0 || (skill.healingMultiplier ?? 0) > 0) && (skill.baseDamage ?? 0) === 0 && (skill.damageMultiplier ?? 0) === 0;
                
                if (isAllyTargeted || isPrimarilyHealing) {
                    targetType = 'self';
                }
            }
        } else if (selection.type === 'item') {
            const item = knowledgeBase.inventory.find(i => i.id === selection.id);
            // Most usable items in combat (like potions) are self-targeted.
            if (item && item.category === GameTemplates.ItemCategory.POTION) {
                targetType = 'self';
            }
        }

        // All remaining actions require the user to select a target from the UI.
        // The old `if (targetType === 'none')` block is removed as it was unreachable code.
        setPendingAction(selection);
        setInteractionState('selecting_target');
        setIsPlayerTargetable(targetType === 'self');
        setIsOpponentTargetable(targetType === 'opponent');

    }, [knowledgeBase.playerSkills, knowledgeBase.inventory, processPlayerAction, combatState.combatants]);
    
    const handleTargetSelect = useCallback((targetId: string) => {
        if (interactionState === 'selecting_target' && pendingAction) {
            const actionPrefix = pendingAction.type === 'skill' ? 'use_skill' : 'use_item';
            const actionTag = `${actionPrefix}:${pendingAction.id}:${targetId}`;
            processPlayerAction(actionTag);
            
            // Reset state
            setPendingAction(null);
            setInteractionState('idle');
            setIsPlayerTargetable(false);
            setIsOpponentTargetable(false);
        }
    }, [interactionState, pendingAction, processPlayerAction]);

    const handleCancelTargeting = useCallback(() => {
        setInteractionState('idle');
        setPendingAction(null);
        setIsPlayerTargetable(false);
        setIsOpponentTargetable(false);
    }, []);


    return (
        <div 
            className="h-screen w-screen bg-gray-900 flex flex-col p-4 font-sans overflow-hidden"
            onClick={() => {
                if(interactionState === 'selecting_target') {
                    handleCancelTargeting();
                }
            }}
        >
            {/* Top Area: Opponents */}
            <div className="flex-shrink-0 h-1/3">
                <OpponentArea 
                    opponents={opponents} 
                    currentTurnId={currentTurnCombatantId}
                    isTargetingMode={isOpponentTargetable}
                    onTargetSelect={handleTargetSelect}
                />
            </div>

            {/* Middle Area: Combat Log */}
            <div className="flex-grow my-4 overflow-hidden min-h-0">
                <CombatLog messages={combatLogMessages} />
            </div>

            {/* Bottom Area: Player Panel */}
            <div className="flex-shrink-0 h-1/3">
                {player && (
                    <PlayerControlPanel 
                        player={player} 
                        currentTurnId={currentTurnCombatantId}
                        skills={knowledgeBase.playerSkills}
                        items={knowledgeBase.inventory}
                        onActionSelect={handleActionSelect}
                        onCancelTargeting={handleCancelTargeting}
                        isTargetingMode={interactionState === 'selecting_target'}
                        isPlayerTargetable={isPlayerTargetable}
                        onPlayerTargetSelect={handleTargetSelect}
                    />
                )}
            </div>
        </div>
    );
};

export default CombatScreen;