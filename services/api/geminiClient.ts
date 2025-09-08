// FIX: Removed 'RequestOptions' as it is not an exported member of '@google/genai'.
import { GoogleGenAI, GenerateContentResponse, HarmCategory, HarmBlockThreshold, CountTokensResponse, Type } from "@google/genai";
import { ApiConfig, SafetySetting, ParsedAiResponse, AiChoice } from '../../types/index'; 
// FIX: Corrected constant name from API_SETTINGS_STORAGE_KEY to STORAGE_SETTINGS_STORAGE_KEY.
import { VIETNAMESE, STORAGE_SETTINGS_STORAGE_KEY, HARM_CATEGORIES, DEFAULT_API_CONFIG, AVAILABLE_MODELS, AVAILABLE_AVATAR_ENGINES, DEFAULT_AVATAR_GENERATION_ENGINE } from '../../constants';
import { parseAiResponseText } from "../../utils/responseParser";

// Rate Limiting constants and state
export const RATE_LIMIT_MODEL_ID = 'gemini-2.5-flash';
export const MAX_REQUESTS_PER_MINUTE = 5;
export const TIME_WINDOW_MS = 60 * 1000; // 1 minute
export let requestTimestamps: number[] = [];

let ai: GoogleGenAI | null = null;
let lastUsedEffectiveApiKey: string | null = null;
let lastUsedApiKeySource: 'system' | 'user' | null = null;
let lastUsedModelForClient: string | null = null;
let currentApiKeyIndex = 0; // for round-robin


export const getApiSettings = (): ApiConfig => {
  const storedSettings = localStorage.getItem(STORAGE_SETTINGS_STORAGE_KEY);
  if (storedSettings) {
    try {
      const parsed = JSON.parse(storedSettings);

      const validSafetySettings =
        parsed.safetySettings &&
        Array.isArray(parsed.safetySettings) &&
        parsed.safetySettings.length === HARM_CATEGORIES.length &&
        parsed.safetySettings.every((setting: any) =>
          typeof setting.category === 'string' &&
          typeof setting.threshold === 'string' &&
          HARM_CATEGORIES.some(cat => cat.id === setting.category)
        );
      
      const modelExists = AVAILABLE_MODELS.some(m => m.id === parsed.model);
      const avatarEngineExists = AVAILABLE_AVATAR_ENGINES.some(e => e.id === parsed.avatarGenerationEngine);
      const ragTopKIsValid = typeof parsed.ragTopK === 'number' && parsed.ragTopK >= 0 && parsed.ragTopK <= 100;

      // Handle user API keys with backward compatibility
      let userApiKeys: string[] = [''];
      if (parsed.userApiKeys && Array.isArray(parsed.userApiKeys) && parsed.userApiKeys.length > 0) {
        userApiKeys = parsed.userApiKeys;
      } else if (parsed.userApiKey && typeof parsed.userApiKey === 'string' && parsed.userApiKey.trim() !== '') {
        // Legacy support for old string-based userApiKey
        userApiKeys = [parsed.userApiKey];
      }

      return {
        apiKeySource: parsed.apiKeySource || DEFAULT_API_CONFIG.apiKeySource,
        userApiKeys: userApiKeys,
        model: modelExists ? parsed.model : DEFAULT_API_CONFIG.model,
        economyModel: parsed.economyModel || (modelExists ? parsed.model : DEFAULT_API_CONFIG.model),
        safetySettings: validSafetySettings ? parsed.safetySettings : DEFAULT_API_CONFIG.safetySettings,
        autoGenerateNpcAvatars: parsed.autoGenerateNpcAvatars === undefined ? DEFAULT_API_CONFIG.autoGenerateNpcAvatars : parsed.autoGenerateNpcAvatars,
        avatarGenerationEngine: avatarEngineExists ? parsed.avatarGenerationEngine : DEFAULT_API_CONFIG.avatarGenerationEngine,
        ragTopK: ragTopKIsValid ? parsed.ragTopK : DEFAULT_API_CONFIG.ragTopK,
      };
    } catch (e) {
      console.error("Failed to parse API settings from localStorage, using defaults:", e);
    }
  }
  return { ...DEFAULT_API_CONFIG }; 
};

export const getAiClient = (): GoogleGenAI => {
  const settings = getApiSettings();
  let effectiveApiKey: string;

  if (settings.apiKeySource === 'system') {
    const systemApiKey = process.env.API_KEY; 

    if (typeof systemApiKey !== 'string' || systemApiKey.trim() === '') {
        throw new Error(VIETNAMESE.apiKeySystemUnavailable + " (API_KEY not found in environment)");
    }
    effectiveApiKey = systemApiKey;
  } else {
    const validKeys = settings.userApiKeys.filter(k => k && k.trim() !== '');
    if (validKeys.length === 0) {
      throw new Error(VIETNAMESE.apiKeyMissing);
    }
    // Round-robin key selection
    if (currentApiKeyIndex >= validKeys.length) {
        currentApiKeyIndex = 0; // Wrap around
    }
    effectiveApiKey = validKeys[currentApiKeyIndex];
    currentApiKeyIndex = (currentApiKeyIndex + 1) % validKeys.length;
  }

  if (!ai || lastUsedApiKeySource !== settings.apiKeySource || lastUsedEffectiveApiKey !== effectiveApiKey || lastUsedModelForClient !== settings.model) {
    try {
      ai = new GoogleGenAI({ apiKey: effectiveApiKey });
      lastUsedEffectiveApiKey = effectiveApiKey;
      lastUsedApiKeySource = settings.apiKeySource;
      lastUsedModelForClient = settings.model; 
    } catch (initError) {
        console.error("Failed to initialize GoogleGenAI client:", initError);
        if (settings.apiKeySource === 'system') {
            throw new Error(`${VIETNAMESE.apiKeySystemUnavailable} Details: ${initError instanceof Error ? initError.message : String(initError)} (Using system key: API_KEY)`);
        } else {
            throw new Error(`Lỗi khởi tạo API Key người dùng: ${initError instanceof Error ? initError.message : String(initError)}`);
        }
    }
  }
  return ai;
};

export async function generateContentAndCheck(
    params: { model: string, contents: any, config?: any }
): Promise<GenerateContentResponse> {
    const ai = getAiClient();
    const response = await ai.models.generateContent(params);
    
    if (!response.text || response.text.trim() === '') {
        throw new Error("Phản hồi từ AI trống. Điều này có thể do bộ lọc nội dung. Vui lòng thử một hành động khác hoặc lùi lượt.");
    }
    
    return response;
}

export async function countTokens(text: string): Promise<number> {
    const ai = getAiClient();
    const { model } = getApiSettings();
    const response: CountTokensResponse = await ai.models.countTokens({
        model,
        contents: [{ parts: [{ text }] }],
    });
    return response.totalTokens;
}

export async function generateContentWithRateLimit(
    prompt: string, 
    modelId: string, 
    onPromptConstructed?: (prompt: string) => void
): Promise<{response: ParsedAiResponse, rawText: string, constructedPrompt: string}> {
    const { safetySettings } = getApiSettings();

    if (onPromptConstructed) {
        onPromptConstructed(prompt);
    }
    
    const response = await generateContentAndCheck({
        model: modelId,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            safetySettings: safetySettings,
        },
    });
    const rawText = response.text;
    const parsedResponse = parseAiResponseText(rawText);
    return { response: parsedResponse, rawText, constructedPrompt: prompt };
}