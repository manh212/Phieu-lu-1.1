// FIX: Correct import path for types
import { KnowledgeBase, ParsedAiResponse, PlayerActionInputType, ResponseLength, GameMessage, GenreType, CombatEndPayload, AiChoice, AIContextConfig } from '@/types/index';
import { PROMPT_FUNCTIONS } from '../prompts';
import { getApiSettings, generateContentAndCheck, generateContentWithRateLimit } from './api/geminiClient';
import { incrementApiCallCount } from '../utils/apiUsageTracker';
import { parseAiResponseText } from '../utils/responseParser';


export async function generateInitialStory(
    knowledgeBase: KnowledgeBase,
    onPromptConstructed?: (prompt: string) => void
): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.initial(knowledgeBase.worldConfig!, knowledgeBase.aiContextConfig);
    incrementApiCallCount('STORY_GENERATION');
    const { response, rawText } = await generateContentWithRateLimit(prompt, model, onPromptConstructed);
    return { response, rawText };
}

export async function generateNextTurn(
    knowledgeBase: KnowledgeBase,
    playerActionText: string,
    inputType: PlayerActionInputType,
    responseLength: ResponseLength,
    currentPageMessagesLog: string,
    previousPageSummaries: string[],
    isStrictMode: boolean,
    lastNarrationFromPreviousPage: string | undefined,
    retrievedContext: string | undefined,
    onPromptConstructed?: (prompt: string) => void
): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.continue(
        knowledgeBase,
        playerActionText,
        inputType,
        responseLength,
        currentPageMessagesLog,
        previousPageSummaries,
        isStrictMode,
        lastNarrationFromPreviousPage,
        retrievedContext
    );
    incrementApiCallCount('STORY_GENERATION');
    const { response, rawText } = await generateContentWithRateLimit(prompt, model, onPromptConstructed);
    return { response, rawText };
}

export async function summarizeTurnHistory(messagesToSummarize: GameMessage[], worldTheme: string, playerName: string, genre: GenreType | undefined, customGenreName: string | undefined, onPromptConstructed?: (prompt: string) => void, onResponseReceived?: (response: string) => void): Promise<{ rawSummary: string, processedSummary: string }> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.summarizePage(messagesToSummarize, worldTheme, playerName, genre, customGenreName);
    if (onPromptConstructed) onPromptConstructed(prompt);
    incrementApiCallCount('PAGE_SUMMARY');
    const response = await generateContentAndCheck({ model, contents: [{ parts: [{ text: prompt }] }] });
    const rawText = response.text;
    if(onResponseReceived) onResponseReceived(rawText);
    return { rawSummary: rawText, processedSummary: rawText.trim() };
}

export async function generateCombatConsequence(kb: KnowledgeBase, combatResult: CombatEndPayload, currentPageMessagesLog: string, previousPageSummaries: string[], lastNarrationFromPreviousPage: string | undefined, onPromptConstructed?: (prompt: string) => void): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.summarizeCombat(kb, combatResult, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage);
    incrementApiCallCount('COMBAT_SUMMARY');
    return generateContentWithRateLimit(prompt, model, onPromptConstructed);
}

export async function generateNonCombatDefeatConsequence(kb: KnowledgeBase, currentPageMessagesLog: string, previousPageSummaries: string[], fatalNarration: string, lastNarrationFromPreviousPage: string | undefined, onPromptConstructed?: (prompt: string) => void): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.generateNonCombatDefeatConsequence(kb, currentPageMessagesLog, previousPageSummaries, fatalNarration, lastNarrationFromPreviousPage);
    incrementApiCallCount('COMBAT_SUMMARY');
    return generateContentWithRateLimit(prompt, model, onPromptConstructed);
}

export async function generateRefreshedChoices(
    lastNarration: string,
    currentChoices: AiChoice[],
    playerHint: string,
    knowledgeBase: KnowledgeBase,
    onPromptConstructed?: (prompt: string) => void
): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.refreshChoices(
        lastNarration,
        currentChoices,
        playerHint,
        knowledgeBase
    );
    incrementApiCallCount('STORY_GENERATION');
    return generateContentWithRateLimit(prompt, model, onPromptConstructed);
}