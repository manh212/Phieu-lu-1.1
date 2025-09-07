// src/utils/livingWorldUtils.ts
// FIX: Correct import path for types
import { KnowledgeBase, NPC, WorldTickUpdate, NpcAction, NpcActionPlan, ActivityLogEntry, ActionParameters } from '@/types/index';

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
    // FIX: Add type guard (`|| 0`) to ensure tickPriorityScore is a number before comparison.
    scoredNpcs.sort((a, b) => (b.tickPriorityScore || 0) - (a.tickPriorityScore || 0));


    // Return the top candidates
    return scoredNpcs.slice(0, TICK_CANDIDATE_COUNT);
};

/**
 * Parses the JSON string from the Gemini API, injects the necessary 'type' property for discriminated unions, and validates its content.
 * @param jsonString The raw JSON string from the API.
 * @param kb The current knowledge base for validation.
 * @returns A validated WorldTickUpdate object, or null if parsing/validation fails.
 */
export const parseAndValidateResponse = (jsonString: string, kb: KnowledgeBase): WorldTickUpdate | null => {
    try {
        const parsedObject = JSON.parse(jsonString);

        if (!parsedObject || !Array.isArray(parsedObject.npcUpdates)) {
            console.error("[Living World] Parsed JSON is missing the required 'npcUpdates' array.", parsedObject);
            return null;
        }
        
        // Shim to make ActionParameters a valid discriminated union
        if (parsedObject.npcUpdates) {
            for (const update of parsedObject.npcUpdates) {
                if (update.actions && Array.isArray(update.actions)) {
                    for (const action of update.actions) {
                        if (action.parameters && typeof action.type === 'string') {
                            action.parameters.type = action.type;
                        }
                    }
                }
            }
        }

        // TODO: Add more robust validation here if needed, e.g., using a schema validation library like Zod.
        // For now, we assume the AI respects the schema passed in the prompt.
        
        return parsedObject as WorldTickUpdate;

    } catch (error) {
        console.error("[Living World] Failed to parse or validate JSON response:", error, "Raw JSON:", jsonString);
        return null;
    }
};

/**
 * Converts an NpcAction object into a system tag string that can be processed by the game engine.
 * @param action The NpcAction object.
 * @param npc The NPC performing the action.
 * @returns A string representing the tag, or null if no tag is needed.
 */
export const convertNpcActionToTag = (action: NpcAction, npc: NPC): string | string[] | null => {
    const params = action.parameters as ActionParameters & { type: NpcAction['type'] }; // Add type to parameters for discriminated union
    switch (params.type) {
        case 'MOVE':
            return `[LOCATION_CHANGE: characterName="${npc.name}", destination="${params.destinationLocationId}"]`;
        case 'INTERACT_NPC': {
            let affinityChange = 0;
            switch (params.intent) {
                case 'friendly': affinityChange = 5; break;
                case 'hostile': affinityChange = -15; break;
            }
            return `[RELATIONSHIP_EVENT: source="${npc.name}", target="${params.targetNpcId}", reason="${action.reason}", affinity_change=${affinityChange}]`;
        }
        case 'UPDATE_GOAL': {
            const parts = [`name="${npc.name}"`];
            if (params.newShortTermGoal) parts.push(`shortTermGoal="${params.newShortTermGoal.replace(/"/g, '\\"')}"`);
            if (params.newLongTermGoal) parts.push(`longTermGoal="${params.newLongTermGoal.replace(/"/g, '\\"')}"`);
            return `[NPC_UPDATE: ${parts.join(', ')}]`;
        }
        case 'UPDATE_PLAN':
            return `[NPC_UPDATE: name="${npc.name}", currentPlan="${params.newPlanSteps.join('; ')}"]`;
        case 'ACQUIRE_ITEM':
            // This is complex. For now, we'll log it. A more robust implementation would
            // require the AI to specify WHERE the item comes from (looting, buying, finding).
            // The NPC_INVENTORY_TRANSFER is a better pattern for this.
            return `[NPC_ACTION_LOG: npcName="${npc.name}", reason="${action.reason}"]`;
        case 'PRODUCE_ITEM':
             return `[NPC_PRODUCE_ITEM: npcId="${npc.id}", name="${params.itemName}", quantity=${params.quantity || 1}, category="Material", rarity="Phổ Thông", description="Sản phẩm do ${npc.name} tạo ra."]`;
        case 'PRACTICE_SKILL':
        case 'USE_SKILL':
        case 'INTERACT_OBJECT':
        case 'CONVERSE':
        case 'BUILD_RELATIONSHIP':
        case 'FORM_GROUP':
        case 'INFLUENCE_FACTION':
        case 'OFFER_SERVICE':
        case 'RESEARCH_TOPIC':
        case 'PATROL_AREA':
        case 'COMMIT_CRIME':
        case 'IDLE':
            // For now, these actions are only reflected in the activity log and don't generate a direct tag.
            // This can be expanded later.
            return `[NPC_ACTION_LOG: npcName="${npc.name}", reason="${action.reason}"]`;
        default:
            return null;
    }
};
