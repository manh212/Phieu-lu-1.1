import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { CombatState, Combatant, PlayerStats, NPC, YeuThu, Wife, Slave, CombatActionOutcome, KnowledgeBase, GameMessage, AiChoice, CombatEndPayload, CombatDispositionMap, CombatLogContent, GameScreen, Skill, StatusEffect, Item } from '../types';
import { useGame } from '../hooks/useGame';
import * as combatConstants from '../constants/combat';
import { VIETNAMESE } from '../constants';
import * as GameTemplates from '../templates';
import { calculateEffectiveStats } from '../utils/statsCalculationUtils';

export interface CombatContextType {
    combatState: CombatState;
    startCombat: (opponentIds: string[]) => void;
    processPlayerAction: (actionTag?: string) => void;
}

export const INITIAL_COMBAT_STATE: CombatState = {
    isInCombat: false,
    combatants: [],
    turnOrder: [],
    currentTurnIndex: 0,
    totalTurns: 1,
    playerActionChoices: [],
    damageDealtByPlayer: 0,
    damageTakenByPlayer: 0,
    notableEvents: [],
    fleeAttempts: 0,
};

export const CombatContext = createContext<CombatContextType | null>(null);

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

export const CombatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [combatState, setCombatState] = useState<CombatState>(INITIAL_COMBAT_STATE);
    const game = useGame();

    const addCombatLog = useCallback((logContent: CombatLogContent) => {
        const newMessage: GameMessage = {
            id: `combat-log-${Date.now()}-${Math.random()}`,
            type: 'combat_log',
            content: logContent,
            timestamp: Date.now(),
            turnNumber: combatState.totalTurns
        };
        // Use a function form of setState to ensure we're adding to the latest messages
        game.setGameMessages(prevMessages => [...prevMessages, newMessage]);
    }, [game.setGameMessages, combatState.totalTurns]);

    const calculateActionOutcome = useCallback((attacker: Combatant, target: Combatant, action: Skill | 'attack' = 'attack'): CombatActionOutcome => {
        const attackerStats = attacker.currentStats;
        const targetStats = target.currentStats;
        
        const hitChance = clamp(
            combatConstants.BASE_ACC_BONUS + (attackerStats.chinhXac ?? 0) - (targetStats.neTranh ?? 0),
            combatConstants.MIN_HIT_CHANCE,
            combatConstants.MAX_HIT_CHANCE
        );

        if (Math.random() * 100 > hitChance) {
            return { damage: 0, healing: 0, didCrit: false, didEvade: true, description: `${target.name} đã né được!`, statusEffectsToApply: [] };
        }

        let damage = 0;
        let healing = 0;
        let didCrit = false;
        let description = "";
        const statusEffectsToApply: StatusEffect[] = [];

        if (action === 'attack') {
            const critChance = attackerStats.tiLeChiMang ?? 5;
            let critMultiplier = 1.0;
            if (Math.random() * 100 < critChance) {
                critMultiplier = attackerStats.satThuongChiMang ?? 1.5;
                didCrit = true;
            }
            const baseDamage = attackerStats.sucTanCong;
            const targetDefense = targetStats.phongThu ?? 0;
            const damageReduction = targetDefense / (targetDefense + combatConstants.K_DEFENSE_FACTOR);
            const variance = Math.random() * (combatConstants.DAMAGE_VARIANCE_MAX - combatConstants.DAMAGE_VARIANCE_MIN) + combatConstants.DAMAGE_VARIANCE_MIN;
            damage = Math.max(1, Math.floor((baseDamage * critMultiplier * (1 - damageReduction)) * variance));
            description = `${attacker.name} tấn công ${target.name}, gây ${damage} sát thương.`;
            if (didCrit) description = `CHÍ MẠNG! ${description}`;

        } else {
            const skill = action;
            let critMultiplier = 1.0;
            if (Math.random() * 100 < (attackerStats.tiLeChiMang ?? 5)) {
                critMultiplier = attackerStats.satThuongChiMang ?? 1.5;
                didCrit = true;
            }

            if (skill.baseDamage > 0 || skill.damageMultiplier > 0) {
                const baseSkillDamage = (skill.baseDamage || 0) + (attackerStats.sucTanCong * (skill.damageMultiplier || 0));
                const targetDefense = targetStats.phongThu ?? 0;
                const damageReduction = targetDefense / (targetDefense + combatConstants.K_DEFENSE_FACTOR);
                const variance = Math.random() * (combatConstants.DAMAGE_VARIANCE_MAX - combatConstants.DAMAGE_VARIANCE_MIN) + combatConstants.DAMAGE_VARIANCE_MIN;
                damage = Math.max(1, Math.floor((baseSkillDamage * critMultiplier * (1 - damageReduction)) * variance));
            }

            if (skill.healingAmount > 0 || skill.healingMultiplier > 0) {
                healing = Math.floor((skill.healingAmount || 0) + (attackerStats.sucTanCong * (skill.healingMultiplier || 0)));
            }
            
            const allEffects = [...(skill.buffsApplied || []), ...(skill.debuffsApplied || [])];
            allEffects.forEach(effectInfo => {
                const chance = effectInfo.chance ?? 100;
                if (Math.random() * 100 < chance) {
                    const newEffect: StatusEffect = {
                        id: `se-${attacker.id}-${target.id}-${Date.now()}`, name: `${skill.name} - ${effectInfo.stat}`,
                        description: `Hiệu ứng từ kỹ năng ${skill.name}.`, type: skill.buffsApplied?.includes(effectInfo) ? 'buff' : 'debuff',
                        durationTurns: effectInfo.durationTurns, statModifiers: { [effectInfo.stat]: effectInfo.amount },
                        specialEffects: [], source: skill.name,
                    };
                    statusEffectsToApply.push(newEffect);
                }
            });

            let descParts = [`${attacker.name} đã dùng [${skill.name}] lên ${target.name}.`];
            if (damage > 0) descParts.push(`Gây ${damage} sát thương.`);
            if (healing > 0) descParts.push(`Hồi phục ${healing} sinh lực.`);
            if (didCrit) descParts.unshift("CHÍ MẠNG! ");
            if (statusEffectsToApply.length > 0) descParts.push(`Gây hiệu ứng ${statusEffectsToApply.map(e => e.name).join(', ')}.`);
            description = descParts.join(' ');
        }
        
        return { damage, healing, didCrit, didEvade: false, description, statusEffectsToApply };
    }, []);

    const endCombat = useCallback((outcome: 'victory' | 'defeat' | 'escaped', killingBlowBy: string) => {
        const player = combatState.combatants.find(c => c.isPlayer);
        if (!player) return;

        const finalPayload: CombatEndPayload = {
            outcome: outcome, totalTurns: combatState.totalTurns,
            damageDealtByPlayer: combatState.damageDealtByPlayer, damageTakenByPlayer: combatState.damageTakenByPlayer,
            killingBlowBy: killingBlowBy, notableEvents: combatState.notableEvents,
            finalPlayerState: player.currentStats,
            finalCombatantStates: combatState.combatants.map(c => ({ id: c.id, finalStats: c.currentStats })),
            opponentIds: combatState.combatants.filter(c => !c.isPlayer).map(c => c.id),
            dispositions: combatState.combatants.reduce((acc, c) => {
                if (!c.isPlayer && c.currentStats.sinhLuc <= 0) {
                    acc[c.id] = c.disposition || 'kill';
                }
                return acc;
            }, {} as CombatDispositionMap),
        };

        game.setKnowledgeBase((prevKb: KnowledgeBase) => {
            const newKb = JSON.parse(JSON.stringify(prevKb));
            newKb.postCombatState = finalPayload;
            newKb.playerStats.isInCombat = false;
            newKb.playerStats.sinhLuc = player.currentStats.sinhLuc;
            newKb.playerStats.linhLuc = player.currentStats.linhLuc;
            newKb.playerStats.activeStatusEffects = player.currentStats.activeStatusEffects;
            return newKb;
        });
        
        addCombatLog({ type: 'info', message: `--- TRẬN CHIẾN KẾT THÚC! (${VIETNAMESE[outcome === 'victory' ? 'combatVictory' : (outcome === 'defeat' ? 'combatDefeat' : 'Thoát')]}) ---` });
        
        setCombatState(INITIAL_COMBAT_STATE);
        game.setCurrentScreen(GameScreen.Gameplay);

    }, [game, combatState, addCombatLog]);

    const checkCombatEnd = useCallback((updatedCombatants: Combatant[], lastAttackerId: string): boolean => {
        const playerTeam = updatedCombatants.filter(c => c.isPlayer);
        const opponentTeam = updatedCombatants.filter(c => !c.isPlayer);
        const isPlayerTeamDefeated = playerTeam.every(p => p.currentStats.sinhLuc <= 0);
        const isOpponentTeamDefeated = opponentTeam.every(o => o.currentStats.sinhLuc <= 0);
        if (isPlayerTeamDefeated) { endCombat('defeat', lastAttackerId); return true; }
        if (isOpponentTeamDefeated) { endCombat('victory', lastAttackerId); return true; }
        return false;
    }, [endCombat]);
    
    const generatePlayerChoices = useCallback((livingOpponents: Combatant[]): AiChoice[] => {
        const choices: AiChoice[] = [];
        livingOpponents.forEach(opponent => {
            choices.push({ text: `Tấn công ${opponent.name}`, actionTag: `attack:${opponent.id}` });
        });
        choices.push({ text: VIETNAMESE.fleeAttempt || "Thử bỏ chạy", actionTag: 'flee' });
        return choices;
    }, []);

    const executeNpcTurns = useCallback(async (currentCombatants: Combatant[], currentTurnOrder: string[], initialTurnIndex: number) => {
        let combatantsAfterNpcTurns = [...currentCombatants];
        let combatEnded = false;
        
        for (let i = initialTurnIndex; i < currentTurnOrder.length; i++) {
            if (combatEnded) break;

            const npcId = currentTurnOrder[i];
            const npc = combatantsAfterNpcTurns.find(c => c.id === npcId);
            if (!npc || npc.currentStats.sinhLuc <= 0) continue;
            
            const player = combatantsAfterNpcTurns.find(c => c.isPlayer && c.currentStats.sinhLuc > 0);
            if (!player) break;

            await new Promise(resolve => setTimeout(resolve, 800));

            const outcome = calculateActionOutcome(npc, player, 'attack');
            const finalTargetHp = Math.max(0, player.currentStats.sinhLuc - outcome.damage);

            addCombatLog({
                type: 'action', actorId: npc.id, actorName: npc.name,
                targetId: player.id, targetName: player.name, actionName: "tấn công",
                damage: outcome.damage, didCrit: outcome.didCrit, didEvade: outcome.didEvade,
                healing: outcome.healing, finalTargetHp: finalTargetHp,
                maxTargetHp: player.currentStats.maxSinhLuc, isPlayerActor: false,
                isPlayerTarget: true, message: outcome.description,
            });
            
            const playerIndex = combatantsAfterNpcTurns.findIndex(c => c.isPlayer);
            combatantsAfterNpcTurns[playerIndex].currentStats.sinhLuc = finalTargetHp;

            setCombatState(prev => ({
                ...prev, combatants: [...combatantsAfterNpcTurns],
                damageTakenByPlayer: prev.damageTakenByPlayer + outcome.damage,
                notableEvents: [...prev.notableEvents, outcome.description],
            }));
            
            combatEnded = checkCombatEnd(combatantsAfterNpcTurns, npc.id);
        }

        if (!combatEnded) {
            const newTurn = combatState.totalTurns + 1;
            addCombatLog({ type: 'info', message: `--- Lượt ${newTurn} ---`, turnNumber: newTurn });
            const livingOpponents = combatantsAfterNpcTurns.filter(c => !c.isPlayer && c.currentStats.sinhLuc > 0);
            setCombatState(prev => ({
                ...prev, combatants: combatantsAfterNpcTurns,
                currentTurnIndex: 0, totalTurns: newTurn,
                playerActionChoices: generatePlayerChoices(livingOpponents),
            }));
        }
    }, [calculateActionOutcome, checkCombatEnd, addCombatLog, generatePlayerChoices, combatState.totalTurns]);

    const processPlayerAction = useCallback((actionTag?: string) => {
        if (!actionTag || !combatState.isInCombat) return;

        const [action, param1, param2] = actionTag.split(':');
        let workingCombatants = [...combatState.combatants];
        const playerIndex = workingCombatants.findIndex(c => c.isPlayer);
        if (playerIndex === -1) return;
        const player = workingCombatants[playerIndex];
        if (combatState.turnOrder[combatState.currentTurnIndex] !== player.id) return;
        
        setCombatState(prev => ({ ...prev, playerActionChoices: [] }));
        let combatHasEnded = false;

        if (action === 'attack') {
            const targetId = param1;
            const targetIndex = workingCombatants.findIndex(c => c.id === targetId);
            if (targetIndex === -1) return;
            const target = workingCombatants[targetIndex];
            const outcome = calculateActionOutcome(player, target, 'attack');
            const finalTargetHp = Math.max(0, target.currentStats.sinhLuc - outcome.damage);

            addCombatLog({ type: 'action', actorId: player.id, actorName: player.name, targetId: target.id, targetName: target.name, actionName: "tấn công", damage: outcome.damage, healing: outcome.healing, didCrit: outcome.didCrit, didEvade: outcome.didEvade, finalTargetHp: finalTargetHp, maxTargetHp: target.currentStats.maxSinhLuc, isPlayerActor: true, isPlayerTarget: false, message: outcome.description, });
            workingCombatants[targetIndex].currentStats.sinhLuc = finalTargetHp;
            setCombatState(prev => ({ ...prev, combatants: workingCombatants, damageDealtByPlayer: prev.damageDealtByPlayer + outcome.damage, notableEvents: [...prev.notableEvents, outcome.description] }));
            combatHasEnded = checkCombatEnd(workingCombatants, player.id);
        } else if (action === 'use_skill') {
            const skillId = param1;
            const targetId = param2;
            const skill = game.knowledgeBase.playerSkills.find(s => s.id === skillId);
            if (!skill) return;
            if ((skill.currentCooldown ?? 0) > 0) { addCombatLog({ type: 'info', message: `Kỹ năng ${skill.name} đang trong thời gian hồi!` }); return; }
            if (player.currentStats.linhLuc < (skill.manaCost || 0)) { addCombatLog({ type: 'info', message: 'Không đủ linh lực!' }); return; }
            const targetIndex = workingCombatants.findIndex(c => c.id === targetId);
            if (targetIndex === -1) return;
            const target = workingCombatants[targetIndex];
            const outcome = calculateActionOutcome(player, target, skill);
            const finalTargetHp = Math.max(0, Math.min(target.currentStats.maxSinhLuc, target.currentStats.sinhLuc - outcome.damage + (outcome.healing || 0)));
            workingCombatants[targetIndex].currentStats.sinhLuc = finalTargetHp;
            workingCombatants[playerIndex].currentStats.linhLuc -= (skill.manaCost || 0);
            
            if (outcome.statusEffectsToApply && outcome.statusEffectsToApply.length > 0) {
                if (!workingCombatants[targetIndex].currentStats.activeStatusEffects) {
                    workingCombatants[targetIndex].currentStats.activeStatusEffects = [];
                }
                workingCombatants[targetIndex].currentStats.activeStatusEffects.push(...outcome.statusEffectsToApply);
            }
            
            addCombatLog({ type: 'action', actorId: player.id, actorName: player.name, targetId: target.id, targetName: target.name, actionName: skill.name, damage: outcome.damage, healing: outcome.healing, didCrit: outcome.didCrit, didEvade: outcome.didEvade, finalTargetHp: finalTargetHp, maxTargetHp: target.currentStats.maxSinhLuc, isPlayerActor: true, isPlayerTarget: false, message: outcome.description, });
            game.setKnowledgeBase(prev => {
                const newKb = JSON.parse(JSON.stringify(prev));
                const skillInKb = newKb.playerSkills.find((s: Skill) => s.id === skillId);
                if (skillInKb) skillInKb.currentCooldown = skill.cooldown;
                return newKb;
            });
            setCombatState(prev => ({ ...prev, combatants: workingCombatants, damageDealtByPlayer: prev.damageDealtByPlayer + outcome.damage, notableEvents: [...prev.notableEvents, outcome.description] }));
            combatHasEnded = checkCombatEnd(workingCombatants, player.id);
        } else if (action === 'use_item') {
            const itemId = param1;
            const targetId = param2;
            const itemIndexInKb = game.knowledgeBase.inventory.findIndex(i => i.id === itemId);
            if (itemIndexInKb === -1) return;
            const item = game.knowledgeBase.inventory[itemIndexInKb];
        
            const targetIndex = workingCombatants.findIndex(c => c.id === targetId);
            if (targetIndex === -1 || item.category !== GameTemplates.ItemCategory.POTION) return;
            
            const target = workingCombatants[targetIndex];
            const potion = item as GameTemplates.PotionTemplate;
            
            let totalHealing = 0;
            const statusEffectsToApply: StatusEffect[] = [];
            let descriptionParts = [`${player.name} dùng ${item.name} cho ${target.name}.`];
        
            // Parse effects from the potion
            potion.effects.forEach(effectStr => {
                const healMatch = effectStr.match(/Hồi phục (\d+) (sinh lực|linh lực)/i) || effectStr.match(/Hồi (\d+) (HP|MP|LL)/i);
                if (healMatch) {
                    const amount = parseInt(healMatch[1], 10);
                    const type = healMatch[2].toLowerCase();
                    if (type.includes('sinh lực') || type.includes('hp')) {
                        totalHealing += amount;
                    }
                }
        
                const buffMatch = effectStr.match(/Tăng (\d+) (\w+) trong (\d+) lượt/i);
                if (buffMatch) {
                    const amount = parseInt(buffMatch[1], 10);
                    const statNameRaw = buffMatch[2].toLowerCase();
                    const duration = parseInt(buffMatch[3], 10);
                    
                    let statKey: keyof PlayerStats | null = null;
                    if (['công', 'sức tấn công', 'atk'].includes(statNameRaw)) statKey = 'sucTanCong';
                    else if (['thủ', 'phòng thủ', 'def'].includes(statNameRaw)) statKey = 'phongThu';
                    else if (['tốc', 'tốc độ', 'spd'].includes(statNameRaw)) statKey = 'tocDo';
                    
                    if (statKey) {
                        const newEffect: StatusEffect = {
                            id: `se-item-${item.id}-${statKey}-${Date.now()}`,
                            name: `${item.name} Buff`,
                            description: `Tăng ${statNameRaw} từ ${item.name}.`,
                            type: 'buff',
                            durationTurns: duration,
                            statModifiers: { [statKey]: `+=${amount}` }, // Use relative string modifier
                            specialEffects: [],
                            source: item.name,
                        };
                        statusEffectsToApply.push(newEffect);
                    }
                }
            });
        
            // Apply effects
            const finalTargetHp = Math.min(target.currentStats.maxSinhLuc, target.currentStats.sinhLuc + totalHealing);
            workingCombatants[targetIndex].currentStats.sinhLuc = finalTargetHp;
        
            if (statusEffectsToApply.length > 0) {
                if (!workingCombatants[targetIndex].currentStats.activeStatusEffects) {
                    workingCombatants[targetIndex].currentStats.activeStatusEffects = [];
                }
                workingCombatants[targetIndex].currentStats.activeStatusEffects.push(...statusEffectsToApply);
                 // Recalculate effective stats for the target after applying effects
                const companionToUpdate = target.isPlayer 
                    ? undefined
                    : (game.knowledgeBase.slaves.find(s=>s.id === target.id) || game.knowledgeBase.wives.find(w=>w.id === target.id));
                
                workingCombatants[targetIndex].currentStats = calculateEffectiveStats(
                    workingCombatants[targetIndex].currentStats, 
                    companionToUpdate ? companionToUpdate.equippedItems : game.knowledgeBase.equippedItems,
                    game.knowledgeBase.inventory
                );
            }
        
            // Create log message
            if (totalHealing > 0) descriptionParts.push(`Hồi phục ${totalHealing} sinh lực.`);
            if (statusEffectsToApply.length > 0) descriptionParts.push(`Nhận được hiệu ứng tăng cường.`);
            
            addCombatLog({ 
                type: 'action', 
                actorId: player.id, 
                actorName: player.name, 
                targetId: target.id, 
                targetName: target.name, 
                actionName: `dùng ${item.name}`, 
                healing: totalHealing, 
                finalTargetHp: finalTargetHp, 
                maxTargetHp: target.currentStats.maxSinhLuc, 
                message: descriptionParts.join(' ') 
            });
            
            // Consume item
            game.setKnowledgeBase(prev => {
                const newKb = JSON.parse(JSON.stringify(prev));
                const itemInKbIndex = newKb.inventory.findIndex((i: Item) => i.id === itemId);
                if (itemInKbIndex > -1) {
                    newKb.inventory[itemInKbIndex].quantity -= 1;
                    if (newKb.inventory[itemInKbIndex].quantity <= 0) {
                        newKb.inventory.splice(itemInKbIndex, 1);
                    }
                }
                return newKb;
            });
        
            setCombatState(prev => ({ ...prev, combatants: workingCombatants }));
            combatHasEnded = checkCombatEnd(workingCombatants, player.id);
        } else if (action === 'flee') {
            const fastestOpponentSpeed = Math.max(...workingCombatants.filter(c => !c.isPlayer && c.currentStats.sinhLuc > 0).map(o => o.currentStats.tocDo ?? 0), 0);
            const penalty = combatState.fleeAttempts * combatConstants.FAILED_FLEE_CHANCE_PENALTY;
            const fleeChance = clamp( combatConstants.BASE_FLEE_CHANCE + (player.currentStats.tocDo - fastestOpponentSpeed) * combatConstants.SPD_TO_FLEE_MOD - penalty, combatConstants.MIN_FLEE_CHANCE, combatConstants.MAX_FLEE_CHANCE );
            if (Math.random() * 100 < fleeChance) { addCombatLog({ type: 'info', message: "Bạn đã bỏ chạy thành công!" }); endCombat('escaped', 'player'); combatHasEnded = true;
            } else { addCombatLog({ type: 'info', message: "Bạn cố gắng bỏ chạy nhưng đã thất bại!" }); setCombatState(prev => ({ ...prev, fleeAttempts: prev.fleeAttempts + 1 })); }
        }
        
        if (!combatHasEnded) {
            const nextTurnIndex = combatState.currentTurnIndex + 1;
            setCombatState(prev => ({ ...prev, currentTurnIndex: nextTurnIndex }));
            setTimeout(() => executeNpcTurns(workingCombatants, combatState.turnOrder, nextTurnIndex), 500);
        }
    }, [combatState, addCombatLog, calculateActionOutcome, checkCombatEnd, endCombat, executeNpcTurns, game.knowledgeBase, game.setKnowledgeBase]);

    const startCombat = useCallback((opponentIds: string[]) => {
        // Clear previous combat logs before starting a new combat session
        game.setGameMessages(prevMessages => prevMessages.filter(msg => msg.type !== 'combat_log'));

        const { knowledgeBase, setCurrentScreen } = game;
        const playerCombatant: Combatant = {
            id: 'player', name: knowledgeBase.worldConfig?.playerName || "Nhân Vật Chính",
            entityType: 'player', isPlayer: true,
            currentStats: JSON.parse(JSON.stringify(knowledgeBase.playerStats)),
            avatarUrl: knowledgeBase.playerAvatarData || knowledgeBase.worldConfig?.playerAvatarUrl,
        };
        
        const allPotentialOpponents: (NPC | YeuThu | Wife | Slave)[] = [
            ...knowledgeBase.discoveredNPCs, ...knowledgeBase.discoveredYeuThu,
            ...knowledgeBase.wives, ...knowledgeBase.slaves,
        ];
        
        const opponentCombatants: Combatant[] = opponentIds.map((id): Combatant | null => {
            const opponentEntity = allPotentialOpponents.find(o => o.id === id || o.name === id);
            if (!opponentEntity) return null;
            let entityType: 'npc' | 'yeuThu' | 'wife' | 'slave' = 'npc';
            if ('species' in opponentEntity) entityType = 'yeuThu';
            else if ('entityType' in opponentEntity && (opponentEntity.entityType === 'wife' || opponentEntity.entityType === 'slave')) { entityType = opponentEntity.entityType; }
            return {
                id: opponentEntity.id, name: opponentEntity.name, entityType,
                isPlayer: false, gender: 'gender' in opponentEntity ? opponentEntity.gender : undefined,
                currentStats: JSON.parse(JSON.stringify(opponentEntity.stats)), avatarUrl: opponentEntity.avatarUrl,
            };
        }).filter((c): c is Combatant => c !== null);

        if (opponentCombatants.length === 0) return;
        const allCombatants = [playerCombatant, ...opponentCombatants];
        const turnOrder = allCombatants.sort((a, b) => (b.currentStats.tocDo ?? 0) - (a.currentStats.tocDo ?? 0)).map(c => c.id);
        setCombatState({
            ...INITIAL_COMBAT_STATE, isInCombat: true,
            combatants: allCombatants, turnOrder,
            playerActionChoices: generatePlayerChoices(opponentCombatants),
        });
        setCurrentScreen(GameScreen.Combat);
        addCombatLog({ type: 'info', message: '--- TRẬN CHIẾN BẮT ĐẦU! ---', turnNumber: 1 });
        addCombatLog({ type: 'info', message: '--- Lượt 1 ---', turnNumber: 1 });
    }, [game, generatePlayerChoices, addCombatLog]);

    const value: CombatContextType = {
        combatState,
        startCombat,
        processPlayerAction,
    };

    return (
        <CombatContext.Provider value={value}>
            {children}
        </CombatContext.Provider>
    );
};