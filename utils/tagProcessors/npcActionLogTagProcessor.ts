
// src/utils/tagProcessors/npcActionLogTagProcessor.ts
import { KnowledgeBase, GameMessage, NPC, Wife, Slave, Prisoner, Master, ActivityLogEntry } from '../../types';
import { diceCoefficient, normalizeStringForComparison } from '../questUtils';

const PERSON_SIMILARITY_THRESHOLD = 0.8;

const findPersonByName = (kb: KnowledgeBase, name: string): NPC | Wife | Slave | Prisoner | Master | null => {
    if (!name) return null;
    
    const allPeople: (NPC | Wife | Slave | Prisoner | Master)[] = [
        ...kb.discoveredNPCs, ...kb.wives, ...kb.slaves, ...kb.prisoners,
    ];
    if (kb.master && !allPeople.some(p => p.id === kb.master!.id)) {
        allPeople.push(kb.master);
    }

    let bestMatch = { person: null as (NPC | Wife | Slave | Prisoner | Master) | null, score: 0 };
    const normalizedName = normalizeStringForComparison(name);

    allPeople.forEach(person => {
        const score = diceCoefficient(normalizedName, normalizeStringForComparison(person.name));
        if (score > bestMatch.score) {
            bestMatch = { person, score };
        }
    });

    if (bestMatch.person && bestMatch.score >= PERSON_SIMILARITY_THRESHOLD) {
        return bestMatch.person;
    }
    
    console.warn(`[NPC_ACTION_LOG] Could not find a definitive match for name: "${name}".`);
    return null;
};

export const processNpcActionLog = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const { npcName, reason } = tagParams;

    if (!npcName || !reason) {
        console.warn("NPC_ACTION_LOG: Missing npcName or reason parameter.", tagParams);
        return { updatedKb: newKb, systemMessages: [] };
    }

    const npc = findPersonByName(newKb, npcName);

    if (npc) {
        if (!npc.activityLog) npc.activityLog = [];
        const logEntry: ActivityLogEntry = {
            turnNumber: turnForSystemMessages,
            description: reason,
            locationId: npc.locationId || 'unknown'
        };
        npc.activityLog.push(logEntry);
        if (npc.activityLog.length > 30) npc.activityLog.shift(); // Keep log from growing indefinitely
    } else {
        console.warn(`NPC_ACTION_LOG: NPC with name "${npcName}" not found.`);
    }

    // This tag does not produce a direct system message for the player.
    return { updatedKb: newKb, systemMessages: [] };
};
