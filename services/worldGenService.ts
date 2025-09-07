// FIX: Correct import path for types
import { GeneratedWorldElements, WorldSettings, GenreType, ViolenceLevel, StoryTone, NsfwDescriptionStyle } from '@/types/index';
import { PROMPT_FUNCTIONS } from '../prompts';
import { incrementApiCallCount } from '../utils/apiUsageTracker';
import { getApiSettings, generateContentAndCheck } from './api/geminiClient';
import { parseGeneratedWorldDetails } from '../utils/responseParser';
import { DEFAULT_VIOLENCE_LEVEL, DEFAULT_STORY_TONE, CUSTOM_GENRE_VALUE, DEFAULT_NSFW_DESCRIPTION_STYLE } from '../constants';


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
    if (onPromptConstructed) onPromptConstructed(prompt);
    incrementApiCallCount('WORLD_GENERATION');
    const response = await generateContentAndCheck({ model, contents: [{ parts: [{ text: prompt }] }] });
    const rawText = response.text;
    const parsed = parseGeneratedWorldDetails(rawText);
    return { response: parsed, rawText, constructedPrompt: prompt };
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
    if (onPromptConstructed) onPromptConstructed(prompt);
    incrementApiCallCount('FANFIC_GENERATION');
    const response = await generateContentAndCheck({ model, contents: [{ parts: [{ text: prompt }] }] });
    const rawText = response.text;
    const parsed = parseGeneratedWorldDetails(rawText);
    return { response: parsed, rawText, constructedPrompt: prompt };
}

export async function generateCompletionForWorldDetails(
    settings: WorldSettings,
    onPromptConstructed?: (prompt: string) => void
): Promise<{response: GeneratedWorldElements, rawText: string, constructedPrompt: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.completeWorldDetails(settings, settings.nsfwMode || false, settings.genre, settings.isCultivationEnabled, settings.violenceLevel || DEFAULT_VIOLENCE_LEVEL, settings.storyTone || DEFAULT_STORY_TONE, settings.customGenreName, settings.nsfwDescriptionStyle || DEFAULT_NSFW_DESCRIPTION_STYLE);
    if (onPromptConstructed) onPromptConstructed(prompt);
    incrementApiCallCount('WORLD_COMPLETION');
    const response = await generateContentAndCheck({ model, contents: [{ parts: [{ text: prompt }] }] });
    const rawText = response.text;
    const parsed = parseGeneratedWorldDetails(rawText);
    return { response: parsed, rawText, constructedPrompt: prompt };
}

export async function analyzeWritingStyle(textToAnalyze: string): Promise<string> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.analyzeStyle(textToAnalyze);
    incrementApiCallCount('STYLE_ANALYSIS');
    const response = await generateContentAndCheck({ model, contents: [{ parts: [{ text: prompt }] }] });
    return response.text;
}