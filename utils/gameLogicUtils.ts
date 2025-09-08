import { AIContextConfig } from '../types/index';

// NEW: AI Context Settings Logic
export const DEFAULT_AI_CONTEXT_CONFIG: AIContextConfig = {
    sendRagContext: true,
    sendCoreContext: true,
    sendConversationalContext: true,
    sendWritingStyle: true,
    sendUserPrompts: true,
    sendEventGuidance: true,
    sendDifficultyGuidance: true,
    sendNsfwGuidance: true,
    sendFormattingRules: true,
    sendShowDontTellRule: true,
    sendProactiveNpcRule: true,
    sendRumorMillRule: true,
    sendWorldProgressionRules: true,
    sendTimeRules: true,
    sendStatRules: true,
    sendItemRules: true,
    sendSkillRules: true,
    sendQuestRules: true,
    sendCreationRules: true,
    sendUpdateRules: true,
    sendDeletionRules: true,
    sendSpecialStatusRules: true,
    sendChoiceRules: true,
    sendTurnRules: true,
    // New defaults
    sendStatusEffectRules: true,
    sendCombatStartRules: true,
    sendSpecialEventRules: true,
    sendSimpleCompanionRules: true,
};
// END NEW

export * from './questUtils';
export * from './statsCalculationUtils';
export * from './tagProcessingUtils';
export * from './turnHistoryUtils'; // Will export addTurnHistoryEntryRaw
export * from './paginationUtils';
export * from './parseTagValue';
export * from './vectorStore';
export * from './ragUtils';
export * from './dateUtils'; // NEW: Export date utilities
export * from './eventUtils'; // NEW: Export event utilities
export * from './apiUsageTracker'; // NEW: Export API usage tracker
export * from './livingWorldUtils'; // NEW: Export Living World utilities
export * from './setupTagProcessor'; // NEW: Export Setup Tag Processor

// NPC, YeuThu, and World Info Tag Processors
export * from './tagProcessors/npcTagProcessor';
export * from './tagProcessors/yeuThuTagProcessor';
export * from './tagProcessors/locationTagProcessor';
export * from './tagProcessors/factionTagProcessor';
export * from './tagProcessors/worldLoreTagProcessor';
export * from './tagProcessors/eventTagProcessor'; // NEW
export * from './tagProcessors/worldConfigTagProcessor'; // NEW
export * from './tagProcessors/relationshipEventTagProcessor'; // NEW
export * from './tagProcessors/npcActionLogTagProcessor'; // NEW
export * from './tagProcessors/npcItemProcessor'; // NEW
export * from './tagProcessors/stagedActionTagProcessor'; // NEW
export * from './tagProcessors/userPromptTagProcessor'; // NEW
export * from './tagProcessors/narrativeDirectiveTagProcessor'; // NEW
export * from './tagProcessors/aiContextTagProcessor'; // NEW
export * from './tagProcessors/aiRulebookTagProcessor'; // NEW
export * from './tagProcessors/rewriteTurnTagProcessor'; // NEW

// Other Tag Processors
export * from './tagProcessors/statusEffectTagProcessor'; 
export * from './tagProcessors/professionTagProcessor';
export * from './npcProgressionUtils';
export * from './tagProcessors/auctionTagProcessor';
export * from './tagProcessors/timeTagProcessor';
export * from './locationEvents';
export * from './tagProcessors/slaveTagProcessor';
export * from './avatarUtils';
export { PROMPT_FUNCTIONS } from '../prompts';
