// types/config.ts
import { HarmCategory, HarmBlockThreshold } from "@google/genai";

export interface AIRulebook {
    // Rules from storytellingRulesSection
    narrationAndVividness: string;
    proactiveNpc: string;
    rumorMill: string;
    // Individual rules from continuePromptSystemRules
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
    cultivationRules: string; // NEW
}

export interface AIContextConfig {
    // Context
    sendRagContext: boolean;
    sendCoreContext: boolean;
    sendConversationalContext: boolean;
    // Guidance
    sendWritingStyle: boolean;
    sendUserPrompts: boolean;
    sendEventGuidance: boolean;
    sendDifficultyGuidance: boolean;
    sendNsfwGuidance: boolean;
    // Rules
    sendFormattingRules: boolean;
    sendShowDontTellRule: boolean; // Corresponds to narrationAndVividness
    sendProactiveNpcRule: boolean; // Corresponds to proactiveNpc
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
    // New defaults
    sendStatusEffectRules: boolean;
    sendCombatStartRules: boolean;
    sendSpecialEventRules: boolean;
    sendSimpleCompanionRules: boolean;
    sendCultivationRules: boolean; // NEW
}

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