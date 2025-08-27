// src/utils/livingWorldUtils.ts
import { KnowledgeBase, NPC, WorldTickUpdate, NpcAction, NpcActionType } from '../types';

const TICK_CANDIDATE_COUNT = 25;

/**
 * Scans all NPCs and calculates a priority score to determine who should "act" in the next world tick.
 * Returns a sorted list of the top NPCs to be processed by the AI.
 * @param kb The current knowledge base.
 * @returns An array of NPC objects with the highest priority scores.
 */
export const scheduleWorldTick = (kb: KnowledgeBase): NPC[] => {
    const { discoveredNPCs, playerStats, allQuests, gameEvents, discoveredLocations } = kb;
    const playerLocationId = kb.currentLocationId;
    const currentTurn = playerStats.turn;

    const scoredNpcs = discoveredNPCs.map(npc => {
        let priorityScore = 0;

        // 1. Proximity to Player
        if (playerLocationId && npc.locationId === playerLocationId) {
            priorityScore += 100;
        }

        // 2. Relationship to Player
        if (npc.relationshipToPlayer) {
            const relationship = npc.relationshipToPlayer.toLowerCase();
            if (['vợ', 'chồng', 'đạo lữ', 'sư phụ', 'đệ tử', 'kẻ thù'].some(r => relationship.includes(r))) {
                priorityScore += 80;
            }
        }
        
        // 3. Quest Relevance
        const isQuestRelevant = allQuests.some(quest => 
            quest.status === 'active' && 
            (quest.title.includes(npc.name) || quest.description.includes(npc.name))
        );
        if (isQuestRelevant) {
            priorityScore += 70;
        }

        // 4. Urgent Needs
        const urgentNeed = Object.values(npc.needs || {}).some(value => value > 90 || value < 10);
        if (urgentNeed) {
            priorityScore += 50;
        }
        
        // 5. "Forgotten" Score
        const turnsSinceLastTick = currentTurn - (npc.lastTickTurn || 0);
        priorityScore += Math.min(60, turnsSinceLastTick); // Cap the bonus to avoid extreme scores

        // 6. Emergency Quest / Event Relevance
        const isEventRelevant = gameEvents.some(event =>
            (event.status === 'Sắp diễn ra' || event.status === 'Đang diễn ra') &&
            (npc.shortTermGoal.includes(event.title) || npc.longTermGoal.includes(event.title))
        );
        if (isEventRelevant) {
            priorityScore += 90;
        }
        
        // 7. Volatile Location
        const npcLocation = discoveredLocations.find(l => l.id === npc.locationId);
        if (npcLocation && !npcLocation.isSafeZone) {
            priorityScore += 30;
        }
        
        // Assign the calculated score to a temporary property
        npc.tickPriorityScore = priorityScore;
        return npc;
    });

    // Sort by score descending
    scoredNpcs.sort((a, b) => b.tickPriorityScore - a.tickPriorityScore);

    // Return the top candidates
    return scoredNpcs.slice(0, TICK_CANDIDATE_COUNT);
};

/**
 * Validates the logical consistency of a parsed WorldTickUpdate object against the knowledge base.
 * @param update The parsed WorldTickUpdate object from the AI.
 * @param kb The current knowledge base.
 * @returns A validated (and potentially cleaned) WorldTickUpdate object. Invalid actions or plans are removed.
 */
const validateWorldTickUpdate = (update: WorldTickUpdate, kb: KnowledgeBase): WorldTickUpdate => {
    const validatedUpdates: WorldTickUpdate = { npcUpdates: [] };

    for (const plan of update.npcUpdates) {
        // 1. Check if NPC exists
        const npc = kb.discoveredNPCs.find(n => n.id === plan.npcId);
        if (!npc) {
            console.warn(`[Living World Validation] AI returned a plan for a non-existent NPC ID: ${plan.npcId}. Skipping.`);
            continue;
        }

        const validActions: NpcAction[] = [];
        for (const action of plan.actions) {
            let isValid = true;
            const params = action.parameters;

            // 2. Check for required parameters based on action type
            switch (action.type) {
                case 'MOVE':
                    if (!params.destinationLocationId || !kb.discoveredLocations.find(l => l.id === params.destinationLocationId)) {
                        console.warn(`[Living World Validation] Invalid MOVE action for ${npc.name}: destinationLocationId "${params.destinationLocationId}" does not exist.`);
                        isValid = false;
                    }
                    break;
                case 'INTERACT_NPC':
                case 'CONVERSE':
                    if (!params.targetNpcId || (!kb.discoveredNPCs.find(n => n.id === params.targetNpcId) && params.targetNpcId !== 'player')) {
                        console.warn(`[Living World Validation] Invalid ${action.type} action for ${npc.name}: targetNpcId "${params.targetNpcId}" does not exist.`);
                        isValid = false;
                    }
                    break;
                case 'INTERACT_OBJECT':
                     if (!params.locationId || !kb.discoveredLocations.find(l => l.id === params.locationId)) {
                        console.warn(`[Living World Validation] Invalid INTERACT_OBJECT action for ${npc.name}: locationId "${params.locationId}" does not exist.`);
                        isValid = false;
                    }
                     if (!params.objectName) {
                        console.warn(`[Living World Validation] Invalid INTERACT_OBJECT action for ${npc.name}: missing objectName.`);
                        isValid = false;
                    }
                    break;
                // Add more checks for other action types as needed (e.g., skillName exists)
            }
            
            if (isValid) {
                validActions.push(action);
            }
        }

        if (validActions.length > 0) {
            validatedUpdates.npcUpdates.push({ ...plan, actions: validActions });
        }
    }

    return validatedUpdates;
}


/**
 * Parses the JSON string from the Gemini API and validates its content.
 * @param jsonString The raw JSON string from the API.
 * @param kb The current knowledge base for validation.
 * @returns A validated WorldTickUpdate object, or null if parsing/validation fails.
 */
export const parseAndValidateResponse = (jsonString: string, kb: KnowledgeBase): WorldTickUpdate | null => {
    try {
        const parsedObject = JSON.parse(jsonString);

        // Basic structural check before deep validation
        if (!parsedObject || !Array.isArray(parsedObject.npcUpdates)) {
            console.error("[Living World] Parsed JSON is missing the required 'npcUpdates' array.", parsedObject);
            return null;
        }

        const validatedObject = validateWorldTickUpdate(parsedObject as WorldTickUpdate, kb);
        
        if (validatedObject.npcUpdates.length === 0 && parsedObject.npcUpdates.length > 0) {
            console.warn("[Living World] All NPC action plans were invalid after validation. Returning null.");
            return null;
        }

        return validatedObject;

    } catch (error) {
        console.error("Error parsing or validating World Tick JSON response:", error, "Raw JSON:", jsonString);
        return null;
    }
};

/**
 * Converts an NpcAction into a corresponding system tag string that the game engine can process.
 * @param action The NpcAction object from the AI.
 * @param npc The NPC performing the action.
 * @returns A system tag string (e.g., "[TAG: ...]") or null if the action has no direct tag equivalent.
 */
export const convertNpcActionToTag = (action: NpcAction, npc: NPC): string | null => {
    const params = action.parameters;
    switch (action.type) {
        case 'MOVE':
            // FIX: Generate the correct tag format that the updated processor expects.
            return `[LOCATION_CHANGE: characterName="${npc.name.replace(/"/g, '\\"')}", destination="${params.destinationLocationId}"]`;
        case 'UPDATE_GOAL':
            let goalTag = `[NPC_UPDATE: name="${npc.name.replace(/"/g, '\\"')}", shortTermGoal="${params.newShortTermGoal.replace(/"/g, '\\"')}"`;
            if (params.newLongTermGoal) {
                goalTag += `, longTermGoal="${params.newLongTermGoal.replace(/"/g, '\\"')}"`;
            }
            goalTag += ']';
            return goalTag;
        case 'UPDATE_PLAN':
            const planString = params.newPlanSteps.join('; ');
            return `[NPC_UPDATE: name="${npc.name.replace(/"/g, '\\"')}", currentPlan="${planString.replace(/"/g, '\\"')}" ]`;
        // Other actions like IDLE, INTERACT_NPC, ACQUIRE_ITEM, etc.,
        // are handled through narration via the world_event message system
        // and do not produce a direct system tag for game state change.
        // The special case for INTERACT_NPC with player is handled in `executeWorldTick`.
        default:
            return null;
    }
};