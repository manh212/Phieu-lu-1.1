import { useCallback } from 'react';
import { KnowledgeBase, GameMessage } from '../../types/index';
import { generateCopilotResponse, getApiSettings } from '../../services';

export interface UseCopilotActionsProps {
    knowledgeBase: KnowledgeBase;
    gameMessages: GameMessage[];
    isLoadingApi: boolean;
    setIsLoadingApi: React.Dispatch<React.SetStateAction<boolean>>;
    resetApiError: () => void;
    setApiErrorWithTimeout: (message: string | null) => void;
    aiCopilotMessages: GameMessage[];
    setAiCopilotMessages: React.Dispatch<React.SetStateAction<GameMessage[]>>;
    sentPromptsLog: string[];
    sentCopilotPromptsLog: string[];
    setSentCopilotPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
}

export const useCopilotActions = (props: UseCopilotActionsProps) => {
    const {
        knowledgeBase, gameMessages,
        isLoadingApi, setIsLoadingApi,
        resetApiError, setApiErrorWithTimeout,
        aiCopilotMessages, setAiCopilotMessages,
        sentPromptsLog, sentCopilotPromptsLog, setSentCopilotPromptsLog,
    } = props;

    const handleCopilotQuery = useCallback(async (userQuestion: string, context?: string, isActionModus: boolean = true) => {
        setIsLoadingApi(true);
        resetApiError();
        const userMessageContent = context ? `${userQuestion}\n\n**Bối cảnh:**\n${context}` : userQuestion;
        const userMessage: GameMessage = {
            id: `copilot-user-${Date.now()}`, type: 'player_action', content: userMessageContent,
            timestamp: Date.now(), turnNumber: knowledgeBase.playerStats.turn, isPlayerInput: true,
        };
        const newCopilotMessages = [...(aiCopilotMessages || []), userMessage];
        setAiCopilotMessages(newCopilotMessages);

        try {
            // Destructure to remove large/unnecessary parts for the prompt
            const { turnHistory, ragVectorStore, userPrompts, ...kbSnapshot } = knowledgeBase;
            
            const last20Messages = gameMessages.slice(-20).map(msg => {
                if (msg.type === 'player_action') return `${knowledgeBase.worldConfig?.playerName || 'Người chơi'}: ${typeof msg.content === 'string' ? msg.content : '[Hành động phức tạp]'}`;
                if (msg.type === 'narration') return `AI: ${typeof msg.content === 'string' ? msg.content : '[Diễn biến phức tạp]'}`;
                return `[${msg.type.toUpperCase()}]: ${typeof msg.content === 'string' ? msg.content : '[Nội dung hệ thống]'}`;
            }).join('\n');

            const copilotChatHistory = newCopilotMessages.slice(0, -1).map(msg => {
                return msg.isPlayerInput ? `Người chơi: ${msg.content}` : `Trợ lý: ${msg.content}`;
            }).join('\n');
            
            const latestGameplayPrompt = sentPromptsLog[0] || "";
            const activeCopilotConfig = knowledgeBase.aiCopilotConfigs.find(c => c.id === knowledgeBase.activeAICopilotConfigId);
            const copilotModel = activeCopilotConfig?.model || getApiSettings().model;
            
            const { response: copilotResponse, rawText, constructedPrompt } = await generateCopilotResponse(
                kbSnapshot, last20Messages, copilotChatHistory, userMessageContent,
                latestGameplayPrompt, userPrompts || [],
                (prompt) => setSentCopilotPromptsLog(prev => [prompt, ...prev].slice(0, 10)),
                copilotModel,
                isActionModus
            );

            // The rawText is the full response from AI. We need to parse it here.
            let narration = rawText;
            let actionTags: string[] = [];
            const changesMatch = rawText.match(/<GAME_CHANGES>([\s\S]*?)<\/GAME_CHANGES>/);
            
            if (changesMatch && changesMatch[1]) {
                const tagsBlock = changesMatch[1].trim();
                const tagRegex = /\[[^\]]+\]/g;
                let match;
                while ((match = tagRegex.exec(tagsBlock)) !== null) {
                    actionTags.push(match[0]);
                }
                narration = rawText.replace(/<GAME_CHANGES>[\s\S]*?<\/GAME_CHANGES>/, '').trim();
                if (!narration) narration = "Tôi đã chuẩn bị các thay đổi bạn yêu cầu. Nhấn 'Áp Dụng Thay Đổi' để xác nhận.";
            }

            const aiMessage: GameMessage = {
                id: `copilot-ai-${Date.now()}`, type: 'narration', content: narration,
                timestamp: Date.now(), turnNumber: knowledgeBase.playerStats.turn,
                actionTags: actionTags.length > 0 ? actionTags : undefined,
            };
            setAiCopilotMessages(prev => [...prev, aiMessage]);

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Lỗi khi liên hệ Siêu Trợ Lý AI.";
            setApiErrorWithTimeout(errorMsg);
            const errorMessage: GameMessage = {
                id: `copilot-error-${Date.now()}`, type: 'error', content: `Lỗi: ${errorMsg}`,
                timestamp: Date.now(), turnNumber: knowledgeBase.playerStats.turn,
            };
            setAiCopilotMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoadingApi(false);
        }
    }, [knowledgeBase, gameMessages, aiCopilotMessages, setAiCopilotMessages, setIsLoadingApi, resetApiError, setApiErrorWithTimeout, setSentCopilotPromptsLog, sentPromptsLog]);
    
    return {
        handleCopilotQuery,
    };
};
