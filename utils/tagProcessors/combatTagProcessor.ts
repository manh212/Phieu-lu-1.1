import { KnowledgeBase, GameMessage, NPC, YeuThu, ActivityLogEntry } from '../../types';
import { diceCoefficient, normalizeStringForComparison } from '../questUtils';

const SIMILARITY_THRESHOLD = 0.8; // Match if 80% similar

export const processSetCombatStatus = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const status = tagParams.status?.toLowerCase();
    if (status === 'start' || tagParams.value?.toLowerCase() === 'true') { // Added check for legacy "value"
        newKb.playerStats.isInCombat = true;
    } else if (status === 'end' || tagParams.value?.toLowerCase() === 'false') {
        newKb.playerStats.isInCombat = false;
    }
    return { updatedKb: newKb, systemMessages: [] };
};

export const processBeginCombat = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    let newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const opponentIdsStr = tagParams.opponentIds;

    if (!opponentIdsStr) {
        console.warn("BEGIN_COMBAT: Missing opponentIds parameter.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }
    
    const opponentNamesOrIds = opponentIdsStr.split(',').map(id => id.trim()).filter(id => id);
    if(opponentNamesOrIds.length === 0){
        console.warn("BEGIN_COMBAT: opponentIds parameter is empty after parsing.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }

    newKb.playerStats.isInCombat = true;
    newKb.pendingOpponentIdsForCombat = opponentNamesOrIds;
    
    // Log activity for the opponents
    const allCombatants: (NPC | YeuThu)[] = [...newKb.discoveredNPCs, ...newKb.discoveredYeuThu];

     opponentNamesOrIds.forEach(nameOrId => {
        let opponent: (NPC | YeuThu) | undefined = allCombatants.find(c => c.id === nameOrId || c.name.toLowerCase() === nameOrId.toLowerCase());
        
        if (opponent && 'activityLog' in opponent) {
            if (!opponent.activityLog) opponent.activityLog = [];
            const logEntry: ActivityLogEntry = {
                turnNumber: newKb.playerStats.turn,
                description: `Đã giao chiến với ${newKb.worldConfig?.playerName || 'người chơi'}.`,
                locationId: opponent.locationId || newKb.currentLocationId || 'unknown'
            };
            opponent.activityLog.push(logEntry);
            if (opponent.activityLog.length > 30) opponent.activityLog.shift();
        }
    });
    
    return { updatedKb: newKb, systemMessages };
};