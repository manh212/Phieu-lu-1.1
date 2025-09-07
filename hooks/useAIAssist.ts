import { useState, useCallback, useRef, useEffect } from 'react';
import { useGameSetup } from '../contexts/GameSetupContext';
import { WorldSettings, GeneratedWorldElements } from '../types/index';
import { 
    generateWorldDetailsFromStory as apiGenerateFromStory, 
    generateFanfictionWorldDetails as apiGenerateFromFanfic, 
    generateCompletionForWorldDetails as apiGenerateCompletion, 
    analyzeWritingStyle as apiAnalyzeStyle,
    countTokens as apiCountTokens
} from '../services/geminiService';
import { VIETNAMESE, MAX_TOKENS_FANFIC } from '../constants';

type LoadingStates = {
    fromStory: boolean;
    fromFanfic: boolean;
    completion: boolean;
    styleAnalysis: boolean;
    tokenCount: boolean;
};

export const useAIAssist = () => {
    const { dispatch } = useGameSetup();
    const abortControllerRef = useRef<AbortController | null>(null);

    const [loadingStates, setLoadingStates] = useState<LoadingStates>({
        fromStory: false,
        fromFanfic: false,
        completion: false,
        styleAnalysis: false,
        tokenCount: false,
    });
    const [error, setError] = useState<string | null>(null);
    const [generatorMessage, setGeneratorMessage] = useState<string | null>(null);
    
    // States for debug modals
    const [rawApiResponseText, setRawApiResponseText] = useState<string | null>(null);
    const [sentWorldGenPrompt, setSentWorldGenPrompt] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

    const manageApiCall = useCallback(async <T>(
        apiFunction: () => Promise<T>,
        loadingKey: keyof LoadingStates,
        successCallback: (result: T) => void,
        errorMessagePrefix: string
    ) => {
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));
        setError(null);
        setGeneratorMessage('Đang xử lý...');
        setRawApiResponseText(null);
        setSentWorldGenPrompt(null);

        try {
            const result = await apiFunction();
            if (!controller.signal.aborted) {
                successCallback(result);
            }
        } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') {
                console.log('API call was aborted.');
                setGeneratorMessage('Hành động đã được hủy.');
            } else if (!controller.signal.aborted) {
                const errorMsg = e instanceof Error ? e.message : String(e);
                setError(`${errorMessagePrefix}: ${errorMsg}`);
                dispatch({ type: 'SET_ERROR', payload: `${errorMessagePrefix}: ${errorMsg}` });
            }
        } finally {
            if (!controller.signal.aborted) {
                setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
            }
        }
    }, [dispatch]);

    const generateFromStoryIdea = useCallback((storyIdea: string, settings: WorldSettings) => {
        if (!storyIdea.trim()) {
            setError(VIETNAMESE.storyIdeaDescriptionPlaceholder);
            return;
        }
        
        manageApiCall(
            () => apiGenerateFromStory(
                storyIdea, 
                settings.nsfwMode || false, 
                settings.genre, 
                settings.isCultivationEnabled,
                settings.violenceLevel!,
                settings.storyTone!,
                settings.customGenreName,
                settings.nsfwDescriptionStyle!,
                (prompt) => setSentWorldGenPrompt(prompt)
            ),
            'fromStory',
            (result: { response: GeneratedWorldElements, rawText: string }) => {
                dispatch({ type: 'APPLY_AI_GENERATION', payload: result.response });
                setRawApiResponseText(result.rawText);
                setGeneratorMessage(VIETNAMESE.worldDetailsGeneratedSuccess);
            },
            VIETNAMESE.errorGeneratingWorldDetails
        );
    }, [manageApiCall, dispatch]);

    const generateFromFanfic = useCallback((sourceMaterial: string, isContentProvided: boolean, playerInputDescription: string, settings: WorldSettings) => {
        if (!sourceMaterial.trim()) {
            setError(VIETNAMESE.pleaseProvideFanficSource);
            return;
        }
        
        manageApiCall(
            () => apiGenerateFromFanfic(
                sourceMaterial,
                isContentProvided,
                playerInputDescription,
                settings.nsfwMode || false, 
                settings.genre, 
                settings.isCultivationEnabled,
                settings.violenceLevel!,
                settings.storyTone!,
                settings.customGenreName,
                settings.nsfwDescriptionStyle!,
                (prompt) => setSentWorldGenPrompt(prompt)
            ),
            'fromFanfic',
            (result: { response: GeneratedWorldElements, rawText: string }) => {
                dispatch({ type: 'APPLY_AI_GENERATION', payload: result.response });
                setRawApiResponseText(result.rawText);
                setGeneratorMessage(VIETNAMESE.fanficDetailsGeneratedSuccess);
            },
            VIETNAMESE.errorGeneratingFanficDetails
        );
    }, [manageApiCall, dispatch]);
    
    const generateCompletion = useCallback((settings: WorldSettings) => {
        manageApiCall(
            () => apiGenerateCompletion(
                settings,
                (prompt) => setSentWorldGenPrompt(prompt)
            ),
            'completion',
            (result: { response: GeneratedWorldElements, rawText: string }) => {
                dispatch({ type: 'APPLY_AI_GENERATION', payload: result.response });
                setRawApiResponseText(result.rawText);
                setGeneratorMessage("Hoàn thiện tự động thành công!");
            },
            "Lỗi khi hoàn thiện tự động"
        );
    }, [manageApiCall, dispatch]);

    const analyzeWritingStyle = useCallback((textToAnalyze: string): Promise<string | null> => {
        if (!textToAnalyze.trim()) {
            setError("Vui lòng nhập văn bản hoặc tải file để phân tích.");
            return Promise.resolve(null);
        }
        let analysisResult: string | null = null;
        return manageApiCall(
            () => apiAnalyzeStyle(textToAnalyze),
            'styleAnalysis',
            (result: string) => {
                analysisResult = result;
                setGeneratorMessage("Phân tích văn phong hoàn tất.");
            },
            "Lỗi khi phân tích văn phong"
        ).then(() => analysisResult);
    }, [manageApiCall]);

    const countFileTokens = useCallback(async (file: File): Promise<number | null> => {
        let tokens: number | null = null;
        await manageApiCall(
            async () => {
                const content = await file.text();
                return apiCountTokens(content);
            },
            'tokenCount',
            (result: number) => {
                tokens = result;
                if (result > MAX_TOKENS_FANFIC) {
                    setError(VIETNAMESE.tokenCountExceededError(MAX_TOKENS_FANFIC));
                    setGeneratorMessage(null);
                } else {
                    setGeneratorMessage(`File sẵn sàng. Ước tính ${result.toLocaleString()} token.`);
                }
            },
            "Lỗi đếm token"
        );
        return tokens;
    }, [manageApiCall]);

    const clearError = useCallback(() => {
        setError(null);
        dispatch({ type: 'SET_ERROR', payload: null });
    }, [dispatch]);

    return {
        loadingStates,
        error,
        generatorMessage,
        rawApiResponseText,
        sentWorldGenPrompt,
        clearError,
        generateFromStoryIdea,
        generateFromFanfic,
        generateCompletion,
        analyzeWritingStyle,
        countFileTokens
    };
};