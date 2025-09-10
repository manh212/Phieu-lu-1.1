// src/services/copilotService.ts
import { KnowledgeBase, GameMessage, ParsedAiResponse } from '@/types/index';
import { PROMPT_FUNCTIONS } from '../prompts';
import { incrementApiCallCount } from '../utils/apiUsageTracker';
import { generateContentWithRateLimit, getApiSettings, generateContentAndCheck } from './api/geminiClient';

export async function generateCopilotResponse(
    knowledgeBaseSnapshot: Omit<KnowledgeBase, 'turnHistory' | 'ragVectorStore' | 'userPrompts'>,
    last20Messages: string,
    copilotChatHistory: string,
    userQuestionAndTask: string,
    latestGameplayPrompt: string,
    userPrompts: string[],
    onPromptConstructed?: (prompt: string) => void,
    copilotModelOverride?: string,
    isActionModus: boolean = true,
    useGoogleSearch: boolean = false
): Promise<{response: ParsedAiResponse, rawText: string, constructedPrompt: string}> {
    const { model } = getApiSettings();
    const modelToUse = copilotModelOverride || model;
    const prompt = PROMPT_FUNCTIONS.copilot(
        knowledgeBaseSnapshot, 
        last20Messages, 
        copilotChatHistory, 
        userQuestionAndTask, 
        latestGameplayPrompt, 
        userPrompts,
        isActionModus
    );
    incrementApiCallCount('AI_COPILOT');
    
    const config = useGoogleSearch ? { tools: [{googleSearch: {}}] } : {};

    return generateContentWithRateLimit(prompt, modelToUse, onPromptConstructed, config);
}


// --- NEW: AI Architect Function ---
export async function generateArchitectResponse(
    settingsJSON: string,
    chatHistory: string,
    userRequest: string,
    isActionModus: boolean,
    modelOverride?: string,
    useGoogleSearch?: boolean
): Promise<string> {
    const { model } = getApiSettings();
    const modelToUse = modelOverride || model; // Use override if provided
    const prompt = PROMPT_FUNCTIONS.architect(settingsJSON, chatHistory, userRequest, isActionModus);
    
    const config = useGoogleSearch ? { tools: [{googleSearch: {}}] } : {};
    
    // Using generateContentAndCheck to ensure a valid response is returned
    const response = await generateContentAndCheck({
        model: modelToUse, // Use the selected model
        contents: [{ parts: [{ text: prompt }] }],
        config: config
    });

    return response.text;
}