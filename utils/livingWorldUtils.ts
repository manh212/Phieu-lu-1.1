// src/utils/livingWorldUtils.ts
import { KnowledgeBase, NPC, WorldTickUpdate, NpcAction, NpcActionPlan, ActivityLogEntry } from '../types';

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
            parsedObject.npcUpdates.forEach((plan: NpcActionPlan) => {
                if (plan.actions) {
                    plan.actions.forEach((action: NpcAction) => {
                        if (action.type && action.parameters && !(action.parameters as any).type) {
                            (action.parameters as any).type = action.type;
                        }
                    });
                }
            });
        }
        
        return parsedObject as WorldTickUpdate;

    } catch (error) {
        console.error("Error parsing or validating World Tick JSON response:", error, "Raw JSON:", jsonString);
        return null;
    }
};

/**
 * Converts an NpcAction into a corresponding system tag string (or strings) that the game engine can process.
 * This is the core logic that translates AI decisions into game state changes.
 * @param action The NpcAction object from the AI.
 * @param npc The NPC performing the action.
 * @returns A system tag string (e.g., "[TAG: ...]") or an array of strings, or null if no tag equivalent.
 */
export const convertNpcActionToTag = (action: NpcAction, npc: NPC): string | string[] | null => {
    const params = action.parameters;
    
    const createLogReason = (actionDescription: string): string => {
        return `Hành động: ${actionDescription}. Lý do: ${action.reason.replace(/"/g, '\\"')}`;
    };
    
    switch (params.type) {
        case 'MOVE':
            return `[LOCATION_CHANGE: characterName="${npc.name.replace(/"/g, '\\"')}", destination="${params.destinationLocationId}"]`;
        
        case 'UPDATE_GOAL': {
            let goalTag = `[NPC_UPDATE: name="${npc.name.replace(/"/g, '\\"')}", shortTermGoal="${params.newShortTermGoal.replace(/"/g, '\\"')}"`;
            if (params.newLongTermGoal) {
                goalTag += `, longTermGoal="${params.newLongTermGoal.replace(/"/g, '\\"')}"`;
            }
            goalTag += ']';
            return goalTag;
        }

        case 'UPDATE_PLAN': {
            const planString = params.newPlanSteps.join('; ');
            return `[NPC_UPDATE: name="${npc.name.replace(/"/g, '\\"')}", currentPlan="${planString.replace(/"/g, '\\"')}" ]`;
        }

        case 'BUILD_RELATIONSHIP': {
            const affinityChange = params.relationshipType === 'rivalry' ? -10 : 10;
            const reasonText = `chủ động xây dựng mối quan hệ ${params.relationshipType}`.replace(/"/g, '\\"');
            return `[RELATIONSHIP_EVENT: source="${npc.name.replace(/"/g, '\\"')}", target="${params.targetNpcId}", reason="${reasonText}", affinity_change=${affinityChange}]`;
        }
        
        case 'INFLUENCE_FACTION': {
            const repChange = params.influenceType === 'positive' ? params.magnitude : -params.magnitude;
            return `[FACTION_UPDATE: name="${params.factionId.replace(/"/g, '\\"')}", npcIdForReputationUpdate="${npc.id}", reputationChange=${repChange}]`;
        }

        case 'PRODUCE_ITEM': {
            // This now becomes an executable action instead of just a log.
            return `[NPC_PRODUCE_ITEM: npcId="${npc.id}", itemName="${params.itemName.replace(/"/g, '\\"')}", quantity=${params.quantity}]`;
        }

        case 'OFFER_SERVICE': {
             // This becomes two executable actions, one for each NPC's currency.
            const serviceReceiverTag = `[NPC_UPDATE: name="${params.targetNpcId.replace(/"/g, '\\"')}", currency=-=${params.price}]`;
            const serviceProviderTag = `[NPC_UPDATE: name="${npc.name.replace(/"/g, '\\"')}", currency=+=${params.price}]`;
            return [serviceReceiverTag, serviceProviderTag];
        }
        
        case 'COMMIT_CRIME': {
            if (params.crimeType === 'theft') {
                 // This becomes an inventory transfer action.
                return `[NPC_INVENTORY_TRANSFER: fromNpcId="${params.targetNpcId}", toNpcId="${npc.id}", itemName="${params.itemName.replace(/"/g, '\\"')}", quantity=${params.quantity}]`;
            } else {
                 const logReason = createLogReason(`Phạm tội ${params.crimeType} nhắm vào ${params.target}`);
                 return `[NPC_ACTION_LOG: npcName="${npc.name.replace(/"/g, '\\"')}", reason="${logReason}"]`;
            }
        }

        // Actions that are purely narrative and don't change state are logged.
        case 'RESEARCH_TOPIC':
        case 'PATROL_AREA':
        case 'INTERACT_NPC':
        case 'IDLE':
        case 'ACQUIRE_ITEM':
        case 'PRACTICE_SKILL':
        case 'USE_SKILL':
        case 'INTERACT_OBJECT':
        case 'CONVERSE':
        default:
             const simpleLogReason = createLogReason(`Thực hiện hành động '${action.type}'`);
             return `[NPC_ACTION_LOG: npcName="${npc.name.replace(/"/g, '\\"')}", reason="${simpleLogReason}"]`;
    }
};