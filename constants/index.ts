// src/constants.ts
// This file now acts as a barrel, re-exporting constants from modular files.

// Import and re-export all constants from their specific modules
export * from './api';
export * from './character';
export * from './equipment';
export * from './game';
export * from './knowledgeBase';
export * from './media';
export * from './nsfw';
export * from './storage';
export * from './ui';
export * from './world';
export * from './npc';

export * from './economy';
export * from './auction'; // NEW
export * from './combat'; // NEW
export * from './user_manual'; // NEW

// Re-export prompt templates
// Assuming 'prompts' directory is directly under 'src', so './prompts/index' from 'src/constants.ts'
export { PROMPT_FUNCTIONS } from '../prompts';

// Import translations from their respective modules
import { VIETNAMESE_TRANSLATIONS as BaseTranslations } from './translations';
import { NSFW_TRANSLATIONS } from './nsfw';

// Merge all translations into a single VIETNAMESE object
export const VIETNAMESE = {
    ...BaseTranslations,
    ...NSFW_TRANSLATIONS,
};

// Note: Type-related constants like GENRE_VALUES_FOR_TYPE are managed in types.ts
// and AVAILABLE_GENRES (which uses GENRE_VALUES_FOR_TYPE) is exported from ./constants/world.ts
// to prevent circular dependencies.
// The EquipmentSlotConfig in types.ts directly imports from './constants/translations' for its labelKey type
// to also avoid circular dependencies.