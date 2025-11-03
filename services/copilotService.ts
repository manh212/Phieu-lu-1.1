// services/copilotService.ts
import { GoogleGenAI, LiveServerMessage, Modality, LiveSession } from "@google/genai";
import { KnowledgeBase, GameMessage, ParsedAiResponse } from '@/types/index';
import { getAiClient, generateContentWithRateLimit } from './api/geminiClient';
import { PROMPT_FUNCTIONS } from '../prompts';
import { incrementApiCallCount } from '../utils/apiUsageTracker';

// Define the callback types for clarity
export interface CopilotCallbacks {
    onopen: () => void;
    onmessage: (message: LiveServerMessage) => void;
    onerror: (event: ErrorEvent) => void;
    onclose: (event: CloseEvent) => void;
}

export const connectToCopilotLiveSession = (
    knowledgeBase: KnowledgeBase,
    gameMessages: GameMessage[],
    sentPromptsLog: string[],
    callbacks: CopilotCallbacks
): Promise<LiveSession> => {
    const ai = getAiClient();

    // 1. Prepare context for the prompt
    const { turnHistory, ragVectorStore, userPrompts, ...kbSnapshot } = knowledgeBase;
    const last20Messages = gameMessages.slice(-20).map(msg => {
        if (msg.type === 'player_action') return `${knowledgeBase.worldConfig?.playerName || 'Người chơi'}: ${typeof msg.content === 'string' ? msg.content : '[Hành động phức tạp]'}`;
        if (msg.type === 'narration') return `AI: ${typeof msg.content === 'string' ? msg.content : '[Diễn biến phức tạp]'}`;
        return `[${msg.type.toUpperCase()}]: ${typeof msg.content === 'string' ? msg.content : '[Nội dung hệ thống]'}`;
    }).join('\n');
    const latestGameplayPrompt = sentPromptsLog[0] || "";

    // 2. Build the system instruction using the existing prompt function in "discussion-only" mode
    const systemInstruction = PROMPT_FUNCTIONS.copilot(
        kbSnapshot,
        last20Messages,
        "", // No chat history for the initial connection
        "", // No initial user question
        latestGameplayPrompt,
        userPrompts || [],
        false // IMPORTANT: isActionModus = false for Phase 1
    );

    // 3. Connect to the Live API
    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: systemInstruction,
        },
    });

    return sessionPromise;
};

// FIX: Add generateCopilotResponse function to be exported.
export async function generateCopilotResponse(
    knowledgeBaseSnapshot: Omit<KnowledgeBase, 'turnHistory' | 'ragVectorStore' | 'userPrompts'>,
    last20Messages: string,
    copilotChatHistory: string,
    userQuestionAndTask: string,
    latestGameplayPrompt: string,
    userPrompts: string[],
    onPromptConstructed: (prompt: string) => void,
    model: string,
    isActionModus: boolean,
    useGoogleSearch: boolean
): Promise<{response: ParsedAiResponse, rawText: string, constructedPrompt: string}> {
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
    
    const config: any = {};
    if (useGoogleSearch) {
        config.tools = [{ googleSearch: {} }];
    }

    return generateContentWithRateLimit(prompt, model, onPromptConstructed, config);
}
