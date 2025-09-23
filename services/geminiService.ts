// src/services/geminiService.ts
// FIX: Use getAiClient instead of new GoogleGenAI
import { getAiClient } from './api/geminiClient';
// FIX: Corrected import path for getApiSettings.
import { getApiSettings } from './api/geminiClient';
import { WorldSettings, GeneratedWorldElements, GenreType, NsfwDescriptionStyle, ViolenceLevel, StoryTone } from '@/types/index';
import { PROMPT_FUNCTIONS } from '../prompts';
import { parseGeneratedWorldDetails } from '../utils/responseParser';
// FIX: Add imports for default setting constants
import { VIETNAMESE, DEFAULT_VIOLENCE_LEVEL, DEFAULT_STORY_TONE, DEFAULT_NSFW_DESCRIPTION_STYLE } from "@/constants/index";
import { incrementApiCallCount } from "../utils/apiUsageTracker";
import { generateContentWithRateLimit, generateContentAndCheck } from "./api/geminiClient";
// FIX: Removed unused GoogleGenAI import
// import { GoogleGenAI } from '@google/genai';

// This file centralizes calls to the Gemini API for world generation.

async function generateContentWithProgress(
    prompt: string,
    modelId: string,
    onPromptConstructed?: (prompt: string) => void
): Promise<{ rawText: string, constructedPrompt: string }> {
    const { rawText, constructedPrompt } = await generateContentWithRateLimit(prompt, modelId, onPromptConstructed);
    if (!rawText || rawText.trim() === '') {
        throw new Error("Phản hồi từ AI trống. Điều này có thể do bộ lọc nội dung. Vui lòng thử lại.");
    }

    return { rawText, constructedPrompt };
}


export async function generateWorldDetailsFromStory(
    storyIdea: string, 
    nsfwMode: boolean, 
    genre: GenreType, 
    isCultivationEnabled: boolean, 
    violenceLevel: ViolenceLevel, 
    storyTone: StoryTone, 
    customGenreName: string | undefined, 
    nsfwDescriptionStyle: NsfwDescriptionStyle,
    onPromptConstructed?: (prompt: string) => void
): Promise<{response: GeneratedWorldElements, rawText: string, constructedPrompt: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.generateWorldDetails(storyIdea, nsfwMode, genre, isCultivationEnabled, violenceLevel, storyTone, customGenreName, nsfwDescriptionStyle);
    incrementApiCallCount('WORLD_GENERATION');
    
    const { rawText, constructedPrompt } = await generateContentWithProgress(prompt, model, onPromptConstructed);
    const parsed = parseGeneratedWorldDetails(rawText);
    return { response: parsed, rawText, constructedPrompt };
}

export async function generateFanfictionWorldDetails(
    sourceMaterial: string, 
    isContentProvided: boolean, 
    playerInputDescription: string, 
    nsfwMode: boolean, 
    genre: GenreType, 
    isCultivationEnabled: boolean, 
    violenceLevel: ViolenceLevel, 
    storyTone: StoryTone, 
    customGenreName: string | undefined, 
    nsfwDescriptionStyle: NsfwDescriptionStyle,
    onPromptConstructed?: (prompt: string) => void
): Promise<{response: GeneratedWorldElements, rawText: string, constructedPrompt: string}> {
     const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.generateFanfictionWorldDetails(sourceMaterial, isContentProvided, playerInputDescription, nsfwMode, genre, isCultivationEnabled, violenceLevel, storyTone, customGenreName, nsfwDescriptionStyle);
    incrementApiCallCount('FANFIC_GENERATION');
    
    const { rawText, constructedPrompt } = await generateContentWithProgress(prompt, model, onPromptConstructed);
    const parsed = parseGeneratedWorldDetails(rawText);
    return { response: parsed, rawText, constructedPrompt };
}

export async function generateCompletionForWorldDetails(
    settings: WorldSettings,
    onPromptConstructed?: (prompt: string) => void
): Promise<{response: GeneratedWorldElements, rawText: string, constructedPrompt: string}> {
    const { model } = getApiSettings();
    // FIX: Use imported default constants instead of hardcoded strings to prevent property not found errors.
    const prompt = PROMPT_FUNCTIONS.completeWorldDetails(settings, settings.nsfwMode || false, settings.genre, settings.isCultivationEnabled, settings.violenceLevel || DEFAULT_VIOLENCE_LEVEL, settings.storyTone || DEFAULT_STORY_TONE, settings.customGenreName, settings.nsfwDescriptionStyle || DEFAULT_NSFW_DESCRIPTION_STYLE);
    incrementApiCallCount('WORLD_COMPLETION');

    const { rawText, constructedPrompt } = await generateContentWithProgress(prompt, model, onPromptConstructed);
    const parsed = parseGeneratedWorldDetails(rawText);
    return { response: parsed, rawText, constructedPrompt };
}

export async function analyzeWritingStyle(textToAnalyze: string): Promise<string> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.analyzeStyle(textToAnalyze);
    incrementApiCallCount('STYLE_ANALYSIS');
    
    const response = await generateContentAndCheck({ model, contents: [{ parts: [{ text: prompt }] }] });
    return response.text;
}

export async function countTokens(text: string): Promise<number> {
    // FIX: Use the shared getAiClient instance instead of creating a new one.
    const ai = getAiClient();
    const { model } = getApiSettings();
    incrementApiCallCount('TOKEN_COUNT');
    // FIX: Correctly call the countTokens method on the shared client instance.
    const { totalTokens } = await ai.models.countTokens({
        model,
        contents: [{ parts: [{ text }] }],
    });
    return totalTokens;
}