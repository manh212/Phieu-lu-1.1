// FIX: Corrected import path for types
import { KnowledgeBase, ParsedAiResponse, Prisoner, Wife, Slave, Skill, NPC } from '@/types/index';
import { PROMPT_FUNCTIONS } from '../prompts';
import { getApiSettings, generateContentAndCheck, generateContentWithRateLimit } from './api/geminiClient';
import { incrementApiCallCount } from '../utils/apiUsageTracker';


export async function handleCompanionInteraction(kb: KnowledgeBase, companion: Wife | Slave, action: string, currentPageMessagesLog: string, previousPageSummaries: string[], lastNarrationFromPreviousPage: string | undefined, onPromptConstructed?: (prompt: string) => void): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.companionInteraction(kb, companion, action, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage);
    incrementApiCallCount('CHARACTER_INTERACTION');
    return generateContentWithRateLimit(prompt, model, onPromptConstructed);
}
export async function handlePrisonerInteraction(kb: KnowledgeBase, prisoner: Prisoner, action: string, currentPageMessagesLog: string, previousPageSummaries: string[], lastNarrationFromPreviousPage: string | undefined, onPromptConstructed?: (prompt: string) => void): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.prisonerInteraction(kb, prisoner, action, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage);
    incrementApiCallCount('CHARACTER_INTERACTION');
    return generateContentWithRateLimit(prompt, model, onPromptConstructed);
}
export async function summarizeCompanionInteraction(log: string[]): Promise<string> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.summarizeCompanionInteraction(log);
    incrementApiCallCount('CHARACTER_INTERACTION');
    const response = await generateContentAndCheck({ model, contents: [{ parts: [{ text: prompt }] }] });
    return response.text.trim();
}
export async function summarizePrisonerInteraction(log: string[]): Promise<string> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.summarizePrisonerInteraction(log);
    incrementApiCallCount('CHARACTER_INTERACTION');
    const response = await generateContentAndCheck({ model, contents: [{ parts: [{ text: prompt }] }] });
    return response.text.trim();
}

export async function generateCultivationSession(kb: KnowledgeBase, type: 'skill' | 'method', duration: number, currentPageMessagesLog: string, previousPageSummaries: string[], lastNarrationFromPreviousPage: string | undefined, skill?: Skill, method?: Skill, partner?: NPC | Wife | Slave, onPromptConstructed?: (prompt: string) => void): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.cultivationSession(kb, type, duration, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage, skill, method, partner);
    incrementApiCallCount('CULTIVATION');
    return generateContentWithRateLimit(prompt, model, onPromptConstructed);
}

export async function summarizeCultivationSession(log: string[]): Promise<string> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.summarizeCultivation(log);
    incrementApiCallCount('CULTIVATION');
    const response = await generateContentAndCheck({ model, contents: [{ parts: [{ text: prompt }] }] });
    return response.text.trim();
}