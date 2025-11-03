// types/config.ts
import { HarmCategory, HarmBlockThreshold } from "@google/genai";

// NEW: Define the structure for a single activation condition
export interface PromptCondition {
    id: string;
    type: 'condition';
    trigger?: 'always' | 'on_true' | 'on_false'; // NEW: Trigger type
    // NEW: Expanded fields
    field: 'location_type' | 'player_status' | 'location_name' | 
           'player_hp_percent' | 'player_mp_percent' | 'player_currency' |
           'player_has_item' | 'quest_status' | 'world_hour' | 'world_season' | 'npc_affinity' |
           'player_in_combat' | 'location_is_safe'; // ADDED new fields here
    // NEW: Expanded operators
    operator: 'IS' | 'IS_NOT' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS';
    // NEW: Value can be complex
    value: any; 
}

export interface PromptConditionGroup {
    id: string;
    type: 'group';
    trigger?: 'always' | 'on_true' | 'on_false'; // NEW: Trigger type
    logic: 'AND' | 'OR';
    children: ConditionElement[];
}

export type ConditionElement = PromptCondition | PromptConditionGroup;


// NEW: Represents a single, configurable block within the AI prompt structure.
export interface PromptBlock {
    id: string; // Unique identifier (e.g., 'coreContext', 'rule_itemRules', 'custom-12345')
    label: string; // User-facing name (e.g., '[Bối Cảnh Cốt Lõi]', '[Quy Tắc Về Vật Phẩm]')
    description: string; // Brief explanation of the block's purpose
    type: 'system' | 'custom' | 'header'; // System-defined, user-defined, or a non-functional header
    enabled: boolean; // Whether to include this block in the final prompt
    isEditable: boolean; // Can the user edit the content of this block?
    isMovable: boolean; // Can the user reorder this block?
    content?: string; // The actual text content, mainly for 'custom' type blocks
    rulebookKey?: keyof AIRulebook; // Link to the specific rule in the AIRulebook object
    conditions?: ConditionElement[]; // NEW: Array of activation conditions (can be nested)
}


// This type is derived from the keys of DEFAULT_AI_RULEBOOK in constants/systemRulesNormal.ts
export interface AIRulebook {
    aiThinkingProcessGuidance: string;
    narrationAndVividness: string;
    proactiveNpc: string;
    rumorMill: string;
    formattingRules: string;
    timeRules: string;
    statRules: string;
    itemRules: string;
    skillRules: string;
    questRules: string;
    creationRules: string;
    updateRules: string;
    deletionRules: string;
    specialStatusRules: string;
    choiceRules: string;
    turnRules: string;
    statusEffectRules: string;
    combatStartRules: string;
    simpleCompanionRules: string;
    worldProgressionRules: string;
    specialEventRules: string;
    cultivationRules: string;
    // NEW: Keys for refactored rules
    difficultyEasy: string;
    difficultyNormal: string;
    difficultyHard: string;
    difficultyNightmare: string;
    nsfwHoaMy: string;
    nsfwTranTuc: string;
    nsfwGoiCam: string;
    nsfwManhBao: string;
    nsfwTuyChinh: string;
    // NEW: Keys for hardcoded system rules now made editable
    strictModeGuidance: string;
    aiProcessingGuidance: string;
    writingStyleGuidance: string;

    // NEW: Templates for previously hardcoded sections
    coreContextTemplate: string;
    conversationalContextTemplate: string;
    playerActionGuidanceTemplate: string;
    worldEventGuidanceWrapper: string;
    worldEventGuidanceUpcoming: string;
    worldEventGuidanceOngoing: string;
    worldEventGuidanceFinished: string;
    responseLengthGuidanceTemplate: string;
    
    // NEW WRAPPERS AND SEPARATOR
    blockSeparator: string;
    ragContextWrapper: string;
    stagedActionsContextWrapper: string;
    userPromptsWrapper: string;
    narrativeDirectiveWrapper: string;
}

export interface AIContextConfig {
    sendRagContext: boolean;
    sendCoreContext: boolean;
    sendConversationalContext: boolean;
    sendWritingStyle: boolean;
    sendUserPrompts: boolean;
    sendEventGuidance: boolean;
    sendDifficultyGuidance: boolean;
    sendNsfwGuidance: boolean;
    sendFormattingRules: boolean;
    sendShowDontTellRule: boolean;
    sendProactiveNpcRule: boolean;
    sendRumorMillRule: boolean;
    sendWorldProgressionRules: boolean;
    sendTimeRules: boolean;
    sendStatRules: boolean;
    sendItemRules: boolean;
    sendSkillRules: boolean;
    sendQuestRules: boolean;
    sendCreationRules: boolean;
    sendUpdateRules: boolean;
    sendDeletionRules: boolean;
    sendSpecialStatusRules: boolean;
    sendChoiceRules: boolean;
    sendTurnRules: boolean;
    sendStatusEffectRules: boolean;
    sendCombatStartRules: boolean;
    sendSpecialEventRules: boolean;
    sendSimpleCompanionRules: boolean;
    sendCultivationRules: boolean;
}

export interface AIPresetParameters {
    temperature?: number;
    topK?: number;
    topP?: number;
    thinkingBudget?: number;
    maxOutputTokens?: number;
    seed?: number;
}

export interface AIPreset {
    metadata: {
        name: string;
        description?: string;
        version: string;
        appVersion?: string;
        exportedAt?: string;
    };
    configuration: {
        contextToggles: AIContextConfig; // Kept for backward compatibility
        rulebookContent: AIRulebook;
        parameters: AIPresetParameters;
        promptStructure?: PromptBlock[]; // NEW: The modern way to store structure
    };
}

export type AIPresetCollection = Record<string, AIPreset>;


// --- Existing config-related types from the original app ---

export interface AICopilotConfig {
  id: string;
  name: string;
  model: string;
  systemInstruction: string;
}

export type StorageType = 'local';

export interface StorageSettings {
  storageType: StorageType;
}

export interface ApiConfig {
    apiKeySource: 'system' | 'user';
    userApiKeys: string[];
    model: string;
    economyModel: string;
    safetySettings: SafetySetting[];
    autoGenerateNpcAvatars: boolean;
    avatarGenerationEngine: AvatarGenerationEngine;
    ragTopK: number;
    temperature?: number;
    topK?: number;
    topP?: number;
    thinkingBudget?: number;
    maxOutputTokens?: number;
    seed?: number;
}

export type AvatarGenerationEngine = 'imagen-4.0-generate-001';

export interface SafetySetting {
  category: HarmCategory;
  threshold: HarmBlockThreshold;
}

export interface StyleSettingProperty {
    fontFamily?: string;
    fontSize?: string;
    textColor: string;
    backgroundColor?: string;
}

export interface StyleSettings {
    narration: StyleSettingProperty;
    playerAction: StyleSettingProperty;
    choiceButton: StyleSettingProperty;
    keywordHighlight: StyleSettingProperty;
    dialogueHighlight: StyleSettingProperty;
    enableKeywordHighlighting: boolean;
}
