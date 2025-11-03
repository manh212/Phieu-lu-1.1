

import type { KnowledgeBase, PlayerActionInputType, ResponseLength, GameMessage, AIContextConfig, WorldSettings, PromptBlock, PromptCondition, ConditionElement, PromptConditionGroup } from '@/types/index';
import { VIETNAMESE, CUSTOM_GENRE_VALUE, SPECIAL_EVENT_INTERVAL_TURNS } from '../constants';
import { getWorldDateDifferenceString, getTimeOfDayContext, getSeason } from '../utils/dateUtils';
import { interpolate } from '../utils/gameLogicUtils';


// --- NEW: Recursive Condition Evaluation Logic ---
const evaluateSingleCondition = (condition: PromptCondition, knowledgeBase: KnowledgeBase, previousStates: Record<string, boolean>, newStates: Record<string, boolean>): boolean => {
    const { discoveredLocations, playerStats, inventory, allQuests, worldDate, discoveredNPCs, wives, slaves, prisoners } = knowledgeBase;
    const currentLocation = discoveredLocations.find(l => l.id === knowledgeBase.currentLocationId);
    
    let actualValue: any;
    let conditionValue: any = condition.value;
    let evaluationResult = false;

    // 1. Get the actual value from the game state (knowledgeBase)
    switch (condition.field) {
        case 'location_type': actualValue = currentLocation?.locationType || 'Unknown'; break;
        case 'location_name': actualValue = currentLocation?.name || 'Unknown'; break;
        case 'player_status': actualValue = playerStats.playerSpecialStatus?.type || 'free'; break;
        case 'player_hp_percent': actualValue = playerStats.maxSinhLuc > 0 ? (playerStats.sinhLuc / playerStats.maxSinhLuc) * 100 : 0; break;
        case 'player_mp_percent': actualValue = playerStats.maxLinhLuc > 0 ? (playerStats.linhLuc / playerStats.maxLinhLuc) * 100 : 0; break;
        case 'player_currency': actualValue = playerStats.currency; break;
        case 'player_has_item':
            actualValue = inventory.some(item => item.name.toLowerCase().includes(String(conditionValue || '').toLowerCase()));
            conditionValue = true;
            break;
        case 'quest_status':
            const quest = allQuests.find(q => q.title.toLowerCase() === String(conditionValue?.title || '').toLowerCase());
            actualValue = quest?.status || 'not_found';
            conditionValue = conditionValue?.status;
            break;
        case 'world_hour': actualValue = worldDate.hour; break;
        case 'world_season': actualValue = getSeason(worldDate); break;
        case 'npc_affinity':
            const allPeople = [...discoveredNPCs, ...wives, ...slaves, ...prisoners];
            const person = allPeople.find(n => n.name.toLowerCase() === String(conditionValue?.name || '').toLowerCase());
            actualValue = person?.affinity ?? -101;
            conditionValue = conditionValue?.value;
            break;
        case 'player_in_combat':
            actualValue = playerStats.isInCombat;
            conditionValue = String(condition.value).toLowerCase() === 'true';
            break;
        case 'location_is_safe':
            actualValue = currentLocation?.isSafeZone ?? false;
            conditionValue = String(condition.value).toLowerCase() === 'true';
            break;
        default:
            newStates[condition.id] = false;
            return false;
    }

    // 2. Perform the comparison based on the operator
    const numericOperators: PromptCondition['operator'][] = ['GREATER_THAN', 'LESS_THAN', 'EQUALS'];
    if (numericOperators.includes(condition.operator)) {
        const numActual = parseFloat(actualValue);
        const numCondition = parseFloat(conditionValue);
        if (!isNaN(numActual) && !isNaN(numCondition)) {
            switch (condition.operator) {
                case 'GREATER_THAN': evaluationResult = numActual > numCondition; break;
                case 'LESS_THAN': evaluationResult = numActual < numCondition; break;
                case 'EQUALS': evaluationResult = numActual === numCondition; break;
            }
        }
    } else {
        const strActual = String(actualValue).toLowerCase();
        const strCondition = String(conditionValue || '').toLowerCase();
        switch (condition.operator) {
            case 'IS': evaluationResult = strActual === strCondition; break;
            case 'IS_NOT': evaluationResult = strActual !== strCondition; break;
            case 'CONTAINS':
                if (condition.field === 'player_has_item') {
                    evaluationResult = actualValue === (String(conditionValue).toLowerCase() === 'true');
                } else {
                    evaluationResult = strActual.includes(strCondition);
                }
                break;
        }
    }

    // ALWAYS store the raw result for the next turn's `previousStates`
    newStates[condition.id] = evaluationResult;
    
    // Now, determine the trigger-based result to decide if the block is active THIS turn
    if (condition.trigger === 'on_true') {
        return evaluationResult && (previousStates[condition.id] === false || previousStates[condition.id] === undefined);
    }
    if (condition.trigger === 'on_false') {
        return !evaluationResult && previousStates[condition.id] === true;
    }
    
    return evaluationResult;
};

const evaluateConditionGroup = (group: PromptConditionGroup, knowledgeBase: KnowledgeBase, previousStates: Record<string, boolean>, newStates: Record<string, boolean>): boolean => {
    const childrenTriggeredResults = group.children.map(child =>
        child.type === 'group'
            ? evaluateConditionGroup(child, knowledgeBase, previousStates, newStates)
            : evaluateSingleCondition(child, knowledgeBase, previousStates, newStates)
    );

    let rawGroupResult: boolean;
    if (group.logic === 'AND') {
        rawGroupResult = group.children.every(child => newStates[child.id] === true);
    } else { // OR logic
        rawGroupResult = group.children.some(child => newStates[child.id] === true);
    }
    newStates[group.id] = rawGroupResult;
    
    if (group.trigger === 'on_true') {
        return rawGroupResult && (previousStates[group.id] === false || previousStates[group.id] === undefined);
    }
    if (group.trigger === 'on_false') {
        return !rawGroupResult && previousStates[group.id] === true;
    }

    // If no trigger on group, its activation depends on its children's triggered results.
    return group.logic === 'AND'
        ? childrenTriggeredResults.every(r => r)
        : childrenTriggeredResults.some(r => r);
};

const evaluateConditions = (conditions: ConditionElement[], knowledgeBase: KnowledgeBase, previousStates: Record<string, boolean>, newStates: Record<string, boolean>): boolean => {
    // Top-level is always OR logic.
    return conditions.some(condition => {
        const conditionType = (condition as any).type || 'condition';
        return conditionType === 'group'
            ? evaluateConditionGroup(condition as PromptConditionGroup, knowledgeBase, previousStates, newStates)
            : evaluateSingleCondition(condition as PromptCondition, knowledgeBase, previousStates, newStates);
    });
};


/**
 * NEW: Dynamic Prompt Generation Function
 * Constructs the entire prompt string by iterating through a user-defined structure.
 * @param knowledgeBase The full game state.
 * @param playerActionText The player's input for the current turn.
 * @param inputType The type of player input ('action' or 'story').
 * @param responseLength The desired length of the AI's response.
 * @param currentPageMessagesLog A string log of messages on the current page.
 * @param previousPageSummaries An array of summaries from previous pages.
 * @param isStrictMode A boolean indicating if strict mode is enabled.
 * @param lastNarrationFromPreviousPage The last narration from the previous page, if applicable.
 * @param retrievedContext The context retrieved from the RAG system.
 * @param narrativeDirective A specific instruction for the AI for this turn.
 * @returns The final, dynamically constructed prompt string.
 */
export const generateContinuePrompt = (
  knowledgeBase: KnowledgeBase,
  playerActionText: string,
  inputType: PlayerActionInputType,
  responseLength: ResponseLength,
  currentPageMessagesLog: string,
  previousPageSummaries: string[],
  isStrictMode: boolean,
  lastNarrationFromPreviousPage?: string,
  retrievedContext?: string,
  narrativeDirective?: string
): { prompt: string, newConditionStates: Record<string, boolean> } => {
    const { worldConfig, worldDate, playerStats, userPrompts, stagedActions, aiRulebook, promptStructure, discoveredLocations, previousConditionStates } = knowledgeBase;
    
    if (!promptStructure || !worldConfig || !aiRulebook) {
        console.error("Critical Error: promptStructure, worldConfig, or aiRulebook is missing from KnowledgeBase.");
        return { prompt: "Lỗi hệ thống: Cấu trúc prompt hoặc sổ tay quy tắc không tồn tại.", newConditionStates: {} };
    }

    const finalPromptParts: string[] = [];
    const newConditionStates: Record<string, boolean> = {};
    const prevStates = previousConditionStates || {};

    // --- Iterate through the Prompt Structure ---
    for (const block of promptStructure) {
        if (!block.enabled) continue;
        
        // --- NEW: Conditional Activation Logic (Recursive) ---
        if (block.conditions && block.conditions.length > 0) {
            const conditionsMet = evaluateConditions(block.conditions, knowledgeBase, prevStates, newConditionStates);
            if (!conditionsMet) {
                continue;
            }
        }
        // --- END: Conditional Activation Logic ---


        let blockContent = '';

        switch (block.type) {
            case 'header':
                blockContent = `\n---\n**${block.label}**`;
                break;
            
            case 'custom':
                if (block.content !== undefined && block.content !== null) {
                    blockContent = `**${block.label}:**\n${interpolate(block.content, knowledgeBase)}`;
                }
                break;

            case 'system':
                if (block.rulebookKey && aiRulebook[block.rulebookKey]) {
                    let ruleText = aiRulebook[block.rulebookKey];
                    const playerRaceSystem = worldConfig.raceCultivationSystems.find(s => s.raceName === (worldConfig.playerRace || 'Nhân Tộc'));
                    const realmProgressionList = (playerRaceSystem?.realmSystem || '').split(' - ').map(s => s.trim()).filter(Boolean);

                    // A single, powerful replacement function for all simple placeholders
                    const replaceAllPlaceholders = (text: string) => {
                        return text
                            .replace(/\{\{\s*BLOCK_LABEL\s*\}\}/g, block.label)
                            .replace(/\{\{\s*RAG_CONTENT\s*\}\}/g, retrievedContext || "Không có.")
                            .replace(/\{\{\s*CORE_CONTEXT_JSON\s*\}\}/g, JSON.stringify({
                                playerInfo: { name: worldConfig.playerName, status: playerStats },
                                worldState: { theme: worldConfig.theme, worldDate: worldDate, currentLocation: discoveredLocations.find(l => l.id === knowledgeBase.currentLocationId) }
                            }, null, 2))
                            .replace(/\{\{\s*PREVIOUS_PAGE_SUMMARIES\s*\}\}/g, previousPageSummaries.length > 0 ? previousPageSummaries.join("\n\n") : "Không có.")
                            .replace(/\{\{\s*LAST_NARRATION\s*\}\}/g, lastNarrationFromPreviousPage || "Chưa có.")
                            .replace(/\{\{\s*CURRENT_PAGE_LOG\s*\}\}/g, currentPageMessagesLog || "Chưa có.")
                            .replace(/\{\{\s*STAGED_ACTIONS_JSON\s*\}\}/g, (stagedActions && Object.keys(stagedActions).length > 0) ? JSON.stringify(stagedActions, null, 2) : "{}")
                            .replace(/\{\{\s*USER_PROMPTS_LIST\s*\}\}/g, (userPrompts && userPrompts.length > 0) ? userPrompts.map(p => `- ${p}`).join('\n') : "Không có.")
                            .replace(/\{\{\s*NARRATIVE_DIRECTIVE_CONTENT\s*\}\}/g, narrativeDirective || "Không có.")
                            .replace(/\{\{\s*PLAYER_ACTION_TYPE\s*\}\}/g, inputType === 'action' ? 'Hành động trực tiếp' : 'Gợi ý câu chuyện')
                            .replace(/\{\{\s*PLAYER_ACTION_CONTENT\s*\}\}/g, playerActionText)
                            .replace(/\{\{\s*RESPONSE_LENGTH_TEXT\s*\}\}/g, responseLength === 'short' ? 'Ngắn' : responseLength === 'medium' ? 'Trung bình' : responseLength === 'long' ? 'Dài' : 'Mặc định')
                            .replace(/\{\{\s*WRITING_STYLE_GUIDE\s*\}\}/g, worldConfig.writingStyleGuide || 'Không có hướng dẫn văn phong.')
                            .replace(/\{\{\s*PLAYER_NAME\s*\}\}/g, worldConfig.playerName || 'Người chơi')
                            .replace(/\{\{\s*CURRENCY_NAME\s*\}\}/g, worldConfig.currencyName || 'Tiền tệ')
                            .replace(/\{\{\s*MAIN_REALMS\s*\}\}/g, realmProgressionList.join(' | '))
                            .replace(/\{\{\s*SEASON_CONTEXT\s*\}\}/g, getSeason(worldDate))
                            .replace(/\{\{\s*TIME_OF_DAY_CONTEXT\s*\}\}/g, getTimeOfDayContext(worldDate));
                    };

                    blockContent = replaceAllPlaceholders(ruleText);

                    // Special handling for worldEventGuidance as it has sub-templates
                    if (block.id === 'worldEventGuidance') {
                        const currentLocationId = knowledgeBase.currentLocationId;
                        const relevantEvents = (knowledgeBase.gameEvents || []).filter(event =>
                            event.locationId === currentLocationId && 
                            (event.status === 'Sắp diễn ra' || event.status === 'Đang diễn ra' || event.status === 'Đã kết thúc') &&
                            !event.isCancelled
                        );
                
                        if (relevantEvents.length > 0) {
                            const eventDetails = relevantEvents.map(event => {
                                const timeDiff = getWorldDateDifferenceString(event.startDate, event.endDate, knowledgeBase.worldDate);
                                let template = '';
                                if (event.status === 'Sắp diễn ra' && aiRulebook.worldEventGuidanceUpcoming) {
                                    template = aiRulebook.worldEventGuidanceUpcoming;
                                } else if (event.status === 'Đang diễn ra' && aiRulebook.worldEventGuidanceOngoing) {
                                    template = aiRulebook.worldEventGuidanceOngoing;
                                } else if (event.status === 'Đã kết thúc' && aiRulebook.worldEventGuidanceFinished) {
                                    template = aiRulebook.worldEventGuidanceFinished;
                                }
                                return template
                                    .replace(/\{\{\s*EVENT_TITLE\s*\}\}/g, event.title)
                                    .replace(/\{\{\s*TIME_DIFFERENCE\s*\}\}/g, timeDiff);
                            }).join('\n');
                            
                            if (eventDetails) {
                                blockContent = blockContent.replace('{{EVENT_DETAILS}}', eventDetails);
                            } else {
                                blockContent = '';
                            }
                        } else {
                           blockContent = ''; // No relevant events, so don't include the block.
                        }
                    }
                }
                break;
        }
        
        if (blockContent) {
            finalPromptParts.push(blockContent);
        }
    }

    const separator = aiRulebook.blockSeparator || '\n\n';
    const prompt = finalPromptParts.join(separator);
    return { prompt, newConditionStates };
};