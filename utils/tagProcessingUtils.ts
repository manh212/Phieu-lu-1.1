import { KnowledgeBase, GameMessage, VectorMetadata } from '@/types/index';
import { parseTagValue } from './parseTagValue'; 
import { processPlayerStatsInit, processStatsUpdate, processRemoveBinhCanhEffect, processBecomeSpecialStatus, processPlayerSpecialStatusUpdate, processBecomeFree } from './tagProcessors/statsTagProcessor';
import { processItemAcquired, processItemConsumed, processItemUpdate, processShopItem } from './tagProcessors/itemTagProcessor';
import { processSkillLearned, processSkillUpdate } from './tagProcessors/skillTagProcessor';
import { 
    processQuestAssigned, 
    processQuestUpdated, 
    processQuestCompleted,
    processQuestFailed,    
    processObjectiveUpdate 
} from './tagProcessors/questTagProcessor';
import { 
    processNpc, 
    processNpcUpdate, 
    processNpcRemove 
} from './tagProcessors/npcTagProcessor';
import { 
    processYeuThu, 
    processYeuThuRemove 
} from './tagProcessors/yeuThuTagProcessor';
import { 
    processMainLocation, 
    processSubLocation, 
    processLocationUpdate, 
    processLocationChange 
} from './tagProcessors/locationTagProcessor';
import { 
    processFactionDiscovered, 
    processFactionUpdate, 
    processFactionRemove 
} from './tagProcessors/factionTagProcessor';
import { 
    processWorldLoreAdd, 
    processWorldLoreUpdate 
} from './tagProcessors/worldLoreTagProcessor';
import { processSetCombatStatus, processBeginCombat } from './tagProcessors/combatTagProcessor';
import { 
    processCompanionAdd, 
    processCompanionLeave, 
    processCompanionStatsUpdate 
} from './tagProcessors/companionTagProcessor';
import { processMessage, processRealmList } from './tagProcessors/systemInfoTagProcessor';
import { processStatusEffectApply, processStatusEffectRemove } from './tagProcessors/statusEffectTagProcessor';
import { processProfessionLearned } from './tagProcessors/professionTagProcessor';
import { processAuctionItem, processNpcBid, processAuctionNpc } from './tagProcessors/auctionTagProcessor';
import { processChangeTime } from './tagProcessors/timeTagProcessor';
import { processPrisonerAdd, processWifeAdd, processSlaveAdd, processWifeUpdate, processSlaveUpdate, processPrisonerUpdate, processWifeRemove, processSlaveRemove, processPrisonerRemove } from './tagProcessors/companionAndPrisonerTagProcessor';
import { processMasterUpdate } from './tagProcessors/masterTagProcessor';
import { processSlaveForSale, processAuctionSlave } from './tagProcessors/slaveTagProcessor';
import { processEventTriggered, processEventUpdate, processEventDetailRevealed } from './tagProcessors/eventTagProcessor';
import { processWorldConfigUpdate } from './tagProcessors/worldConfigTagProcessor';
import { processRelationshipEvent } from './tagProcessors/relationshipEventTagProcessor';
import { processNpcActionLog } from './tagProcessors/npcActionLogTagProcessor';
import { generateEmbeddings } from '@/services/embeddingService';
import { processNpcProduceItem, processNpcInventoryTransfer } from './tagProcessors/npcItemProcessor'; // NEW
import { processStagedActionSet, processStagedActionClear } from './tagProcessors/stagedActionTagProcessor';
import { processUserPromptAdd, processUserPromptRemove } from './tagProcessors/userPromptTagProcessor'; // MODIFIED
import { processNarrativeDirective } from './tagProcessors/narrativeDirectiveTagProcessor';
import { processAiContextConfigUpdate } from './tagProcessors/aiContextTagProcessor'; // NEW
import { processAiRuleUpdate, processAiRuleReset } from './tagProcessors/aiRulebookTagProcessor'; // NEW
import { processRewriteTurn } from './tagProcessors/rewriteTurnTagProcessor'; // NEW
// FIX: Add missing React import to resolve namespace errors.
import type React from 'react';


export { parseTagValue }; 

// --- Tag Processor Registry ---
const tagProcessorRegistry: Record<string, Function> = {
    // Stats
    'PLAYER_STATS_INIT': processPlayerStatsInit,
    'STATS_UPDATE': processStatsUpdate,
    'REMOVE_BINH_CANH_EFFECT': processRemoveBinhCanhEffect,
    'BECOMEPRISONER': (kb: KnowledgeBase, params: any, turn: number) => processBecomeSpecialStatus(kb, params, 'BECOMEPRISONER', turn),
    'BECOMESLAVE': (kb: KnowledgeBase, params: any, turn: number) => processBecomeSpecialStatus(kb, params, 'BECOMESLAVE', turn),
    'PLAYER_SPECIAL_STATUS_UPDATE': processPlayerSpecialStatusUpdate,
    'BECOMEFREE': processBecomeFree,

    // Items
    'ITEM_ACQUIRED': processItemAcquired,
    'ITEM_CONSUMED': processItemConsumed,
    'ITEM_UPDATE': processItemUpdate,
    'SHOP_ITEM': processShopItem,

    // Skills & Professions
    'SKILL_LEARNED': processSkillLearned,
    'SKILL_UPDATE': processSkillUpdate,
    'PROFESSION_LEARNED': processProfessionLearned,

    // Quests
    'QUEST_ASSIGNED': processQuestAssigned,
    'QUEST_UPDATED': processQuestUpdated,
    'QUEST_COMPLETED': processQuestCompleted,
    'QUEST_FAILED': processQuestFailed,
    'OBJECTIVE_UPDATE': processObjectiveUpdate,

    // Entities (NPC, YeuThu, Companions)
    'NPC': processNpc,
    'NPC_UPDATE': processNpcUpdate,
    'NPC_REMOVE': processNpcRemove,
    'YEUTHU': processYeuThu,
    'YEUTHU_REMOVE': processYeuThuRemove,
    'COMPANION_ADD': processCompanionAdd,
    'COMPANION_JOIN': processCompanionAdd, // Alias
    'COMPANION_LEAVE': processCompanionLeave,
    'COMPANION_STATS_UPDATE': processCompanionStatsUpdate,

    // Locations & World
    'MAINLOCATION': processMainLocation,
    'SUBLOCATION': processSubLocation,
    'LOCATION_UPDATE': processLocationUpdate,
    'LOCATION_CHANGE': processLocationChange,
    'FACTION_DISCOVERED': processFactionDiscovered,
    'FACTION_UPDATE': processFactionUpdate,
    'FACTION_REMOVE': processFactionRemove,
    'WORLD_LORE_ADD': processWorldLoreAdd,
    'WORLD_LORE_UPDATE': processWorldLoreUpdate,
    'WORLD_CONFIG_UPDATE': processWorldConfigUpdate,

    // Combat
    'SET_COMBAT_STATUS': processSetCombatStatus,
    'BEGIN_COMBAT': processBeginCombat,

    // System & Time
    'MESSAGE': processMessage,
    'REALM_LIST': processRealmList,
    'CHANGE_TIME': processChangeTime,

    // Status Effects
    'STATUS_EFFECT_APPLY': processStatusEffectApply,
    'STATUS_EFFECT_REMOVE': processStatusEffectRemove,

    // Auction
    'AUCTION_ITEM': processAuctionItem,
    'AUCTION_NPC': processAuctionNpc,
    'NPC_BID': processNpcBid,
    
    // Slaves, Wives, Prisoners
    'PRISONER_ADD': processPrisonerAdd,
    'WIFE_ADD': processWifeAdd,
    'SLAVE_ADD': processSlaveAdd,
    'WIFE_UPDATE': processWifeUpdate,
    'SLAVE_UPDATE': processSlaveUpdate,
    'PRISONER_UPDATE': processPrisonerUpdate,
    'WIFE_REMOVE': processWifeRemove,
    'SLAVE_REMOVE': processSlaveRemove,
    'PRISONER_REMOVE': processPrisonerRemove,
    'MASTER_UPDATE': processMasterUpdate,
    'SLAVE_FOR_SALE': processSlaveForSale,
    'AUCTION_SLAVE': processAuctionSlave,

    // Living World & Events
    'EVENT_TRIGGERED': processEventTriggered,
    'EVENT_UPDATE': processEventUpdate,
    'EVENT_DETAIL_REVEALED': processEventDetailRevealed,
    'RELATIONSHIP_EVENT': processRelationshipEvent,
    'NPC_ACTION_LOG': processNpcActionLog,
    'NPC_PRODUCE_ITEM': processNpcProduceItem,
    'NPC_INVENTORY_TRANSFER': processNpcInventoryTransfer,
    // Story Director Tags
    'STAGED_ACTION_SET': processStagedActionSet,
    'STAGED_ACTION_CLEAR': processStagedActionClear,
    'NARRATIVE_DIRECTIVE': processNarrativeDirective,
    'REWRITE_TURN': processRewriteTurn, // NEW

    // Meta-Analyst & AI Control Tags (NEWLY ADDED/UPDATED)
    'USER_PROMPT_ADD': processUserPromptAdd,
    'USER_PROMPT_REMOVE': processUserPromptRemove,
    'AI_CONTEXT_CONFIG_UPDATE': processAiContextConfigUpdate,
    'AI_RULE_UPDATE': processAiRuleUpdate, // NEW
    'AI_RULE_RESET': processAiRuleReset,   // NEW
};


const addOrUpdateVectorMetadata = (
    metadataQueue: VectorMetadata[],
    newMetadata: VectorMetadata
) => {
    const existingIndex = metadataQueue.findIndex(m => m.entityId === newMetadata.entityId);
    if (existingIndex > -1) {
        metadataQueue[existingIndex] = newMetadata;
    } else {
        metadataQueue.push(newMetadata);
    }
};

export const performTagProcessing = async (
    currentKb: KnowledgeBase, 
    tagBatch: string[], 
    turnForSystemMessages: number,
// FIX: Correctly type the setKnowledgeBaseDirectly parameter.
    setKnowledgeBaseDirectly: React.Dispatch<React.SetStateAction<KnowledgeBase>>, 
    logNpcAvatarPromptCallback?: (prompt: string) => void 
): Promise<{ 
    newKb: KnowledgeBase;
    turnIncrementedByTag: boolean;
    systemMessagesFromTags: GameMessage[];
    realmChangedByTag: boolean;
    appliedBinhCanhViaTag: boolean;
    removedBinhCanhViaTag: boolean;
    rewriteTurnDirective?: string; // NEW: The special signal for the rewrite feature
}> => {
    let workingKb: KnowledgeBase = JSON.parse(JSON.stringify(currentKb));
    let turnIncrementedByAnyTag = false;
    const allSystemMessages: GameMessage[] = [];
    let realmChangedByAnyTag = false;
    let appliedBinhCanhByAnyTag = false;
    let removedBinhCanhByAnyTag = false;
    const metadataToVectorize: VectorMetadata[] = [];
    let rewriteTurnDirective: string | undefined = undefined; // NEW

    for (const originalTag of tagBatch) { 
        const mainMatch = originalTag.match(/\[(.*?)(?::\s*(.*))?\]$/s);
        if (!mainMatch || !mainMatch[1]) {
             console.warn(`Malformed tag structure: ${originalTag}`);
             continue; 
        }
        const tagName = mainMatch[1].trim().toUpperCase();
        const rawTagParameterString = mainMatch[2] ? mainMatch[2].trim() : '';
        
        let tempCleanedParams = rawTagParameterString.replace(/\\\\"/g, '\\"').replace(/\\\\'/g, "\\'"); 
        tempCleanedParams = tempCleanedParams.replace(/\\"/g, '"').replace(/\\'/g, "'"); 
        const cleanedTagParameterString = tempCleanedParams;
        
        let tagParams: Record<string, string> = {};
         if (cleanedTagParameterString) {
            if (tagName === 'MESSAGE' && !cleanedTagParameterString.includes('=')) {
                tagParams = { message: cleanedTagParameterString.replace(/^"|"$/g, '') };
            } else {
                tagParams = parseTagValue(cleanedTagParameterString);
            }
        }
// FIX: Added the body of the for loop to process tags and the final return statement.
        const processor = tagProcessorRegistry[tagName];
        if (processor) {
            try {
                let result;
                // Check if the processor is async. This covers `processNpc` and `processYeuThu`.
                if (processor.constructor.name === 'AsyncFunction') {
                    result = await processor(workingKb, tagParams, turnForSystemMessages, setKnowledgeBaseDirectly, logNpcAvatarPromptCallback);
                } else {
                    result = processor(workingKb, tagParams, turnForSystemMessages, setKnowledgeBaseDirectly, logNpcAvatarPromptCallback);
                }
                
                if (result) {
                    if (result.updatedKb) {
                        workingKb = result.updatedKb;
                    }
                    if (result.systemMessages && Array.isArray(result.systemMessages)) {
                        allSystemMessages.push(...result.systemMessages);
                    }
                    if (result.turnIncremented) {
                        turnIncrementedByAnyTag = true;
                    }
                    if (result.realmChanged) {
                        realmChangedByAnyTag = true;
                    }
                    // This flag comes from processStatsUpdate and processRemoveBinhCanhEffect
                    if (result.removedBinhCanh) {
                        removedBinhCanhByAnyTag = true;
                    }
                    // Handle appliedBinhCanh from STATS_UPDATE
                    if (tagName === 'STATS_UPDATE' && tagParams.hieuUngBinhCanh?.toLowerCase() === 'true') {
                        appliedBinhCanhByAnyTag = true;
                    }
                    // NEW: Check for the rewrite directive
                    if (result.rewriteTurnDirective) {
                        rewriteTurnDirective = result.rewriteTurnDirective;
                    }

                    // Handle vector metadata
                    if (result.newVectorMetadata) {
                        addOrUpdateVectorMetadata(metadataToVectorize, result.newVectorMetadata);
                    }
                    if (result.updatedVectorMetadata) {
                        addOrUpdateVectorMetadata(metadataToVectorize, result.updatedVectorMetadata);
                    }
                }
            } catch (e) {
                console.error(`Error processing tag "${tagName}":`, e, 'with params:', tagParams);
            }
        } else {
            console.warn(`No processor found for tag: ${tagName}`);
        }
    }
    
    // After processing all tags, handle vectorization for collected metadata
    if (metadataToVectorize.length > 0 && workingKb.ragVectorStore) {
        try {
            const textChunks = metadataToVectorize.map(m => m.text);
            const newVectors = await generateEmbeddings(textChunks);

            if (newVectors.length === metadataToVectorize.length) {
                newVectors.forEach((vector, index) => {
                    const metadata = metadataToVectorize[index];
                    const existingIndex = workingKb.ragVectorStore!.metadata.findIndex(m => m.entityId === metadata.entityId);
                    if (existingIndex > -1) {
                        // Update existing vector and metadata
                        workingKb.ragVectorStore!.vectors[existingIndex] = vector;
                        workingKb.ragVectorStore!.metadata[existingIndex] = metadata;
                    } else {
                        // Add new vector and metadata
                        workingKb.ragVectorStore!.vectors.push(vector);
                        workingKb.ragVectorStore!.metadata.push(metadata);
                    }
                });
            } else {
                 console.warn("Mismatch between metadata and generated vectors count.");
            }
        } catch (embeddingError) {
            console.error("Failed to generate and update embeddings:", embeddingError);
            allSystemMessages.push({
                id: `rag-update-error-${Date.now()}`,
                type: 'error',
                content: `Lỗi cập nhật vector ngữ cảnh: ${embeddingError instanceof Error ? embeddingError.message : 'Unknown error'}.`,
                timestamp: Date.now(),
                turnNumber: turnForSystemMessages
            });
        }
    }

    return {
        newKb: workingKb,
        turnIncrementedByTag: turnIncrementedByAnyTag,
        systemMessagesFromTags: allSystemMessages,
        realmChangedByTag: realmChangedByAnyTag,
        appliedBinhCanhViaTag: appliedBinhCanhByAnyTag,
        removedBinhCanhViaTag: removedBinhCanhByAnyTag,
        rewriteTurnDirective, // NEW
    };
};