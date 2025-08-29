
import { useCallback } from 'react';
// FIX: The import path for types was incorrect, causing modules not to be found.
import { KnowledgeBase, GameMessage, PlayerActionInputType, ResponseLength, GameScreen, AiChoice, NPC } from '../../types';
import { countTokens, generateRefreshedChoices } from './../../services/geminiService';
import { useMainGameLoop } from './useMainGameLoop';

// This interface is intentionally kept large to be compatible with the props object passed from GameContext
// which is also used by the imported useMainGameLoop hook.
interface UseMainGameLoopActionsProps {
  knowledgeBase: KnowledgeBase;
  setKnowledgeBase: React.Dispatch<React.SetStateAction<KnowledgeBase>>;
  gameMessages: GameMessage[];
  setGameMessages: React.Dispatch<React.SetStateAction<GameMessage[]>>;
  addMessageAndUpdateState: (newMessages: GameMessage[], newKnowledgeBase: KnowledgeBase, callback?: () => void) => void;
  setRawAiResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
  setSentPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
  setLatestPromptTokenCount: React.Dispatch<React.SetStateAction<number | null | string>>;
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  setCurrentScreen: (screen: GameScreen) => void;
  currentPageDisplay: number;
  setCurrentPageDisplay: React.Dispatch<React.SetStateAction<number>>;
  isAutoPlaying: boolean;
  setIsAutoPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  executeSaveGame: (kbToSave: KnowledgeBase, messagesToSave: GameMessage[], saveName: string, existingId: string | null, isAuto: boolean) => Promise<string | null>;
  logNpcAvatarPromptCallback: (prompt: string) => void;
  setApiErrorWithTimeout: (message: string | null) => void;
  resetApiError: () => void;
  isLoadingApi: boolean;
  setIsLoadingApi: React.Dispatch<React.SetStateAction<boolean>>;
  onQuit: () => void;
  currentPageMessagesLog: string;
  previousPageSummaries: string[];
  lastNarrationFromPreviousPage?: string;
  sentPromptsLog: string[];
  setRetrievedRagContextLog: React.Dispatch<React.SetStateAction<string[]>>;
  executeWorldTick: (kbForTick: KnowledgeBase) => Promise<{ updatedKb: KnowledgeBase; worldEventMessages: GameMessage[] }>;
  handleNonCombatDefeat: (kbStateAtDefeat: KnowledgeBase, fatalNarration?: string) => Promise<void>;
  // FIX: Added missing properties required by useMainGameLoop's props to resolve type errors.
  setSummarizationResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
  setSentEconomyPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
  setReceivedEconomyResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
  setSentGeneralSubLocationPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
  setReceivedGeneralSubLocationResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
}

export const useMainGameLoopActions = (props: UseMainGameLoopActionsProps) => {
  // FIX: Removed `logSentPromptCallback` from destructuring as it is not a prop of UseMainGameLoopActionsProps. A local function 'logSentPrompt' is created and passed down to 'useMainGameLoop' instead.
  const { 
      setIsLoadingApi, isLoadingApi, 
      knowledgeBase, gameMessages, setGameMessages, addMessageAndUpdateState, showNotification, 
      resetApiError, setLatestPromptTokenCount, 
      setRawAiResponsesLog, setApiErrorWithTimeout, 
    } = props;

  const logSentPrompt = useCallback((prompt: string) => {
    props.setSentPromptsLog(prev => [prompt, ...prev].slice(0, 10));
    setLatestPromptTokenCount('Chưa kiểm tra');
  }, [props.setSentPromptsLog, setLatestPromptTokenCount]);

  const handleCheckTokenCount = useCallback(async () => {
    if (isLoadingApi) return;
    const latestPrompt = props.sentPromptsLog[0];
    if (!latestPrompt) {
        showNotification("Không có prompt nào gần đây để kiểm tra.", 'warning');
        return;
    }
    
    setIsLoadingApi(true);
    setLatestPromptTokenCount('Đang tính...');
    try {
        const tokenCount = await countTokens(latestPrompt);
        setLatestPromptTokenCount(tokenCount);
    } catch (err) {
        console.error("Error checking token count:", err);
        setLatestPromptTokenCount('Lỗi');
        const errorMsg = err instanceof Error ? err.message : "Lỗi khi kiểm tra token.";
        setApiErrorWithTimeout(errorMsg);
    } finally {
        setIsLoadingApi(false);
    }
  }, [props.sentPromptsLog, isLoadingApi, setIsLoadingApi, setLatestPromptTokenCount, setApiErrorWithTimeout, showNotification]);

  const mainGameLoopActions = useMainGameLoop({
      ...props,
      // FIX: The call to useMainGameLoop was failing because UseMainGameLoopActionsProps was missing
      // several properties expected by useMainGameLoop. They have been added to the interface.
      logSentPromptCallback: logSentPrompt,
  });

  const handleRefreshChoices = useCallback(async (playerHint: string) => {
    if (isLoadingApi) return;
    let lastMessageIndex = -1;
    for (let i = gameMessages.length - 1; i >= 0; i--) {
        const msg = gameMessages[i];
        if (msg.type === 'narration' && msg.choices && msg.choices.length > 0) {
            lastMessageIndex = i;
            break;
        }
    }
    if (lastMessageIndex === -1) {
        showNotification("Không có lựa chọn nào để làm mới.", 'warning');
        return;
    }
    const lastMessage = gameMessages[lastMessageIndex];
    const lastNarration = lastMessage.content;
    const currentChoices = lastMessage.choices || [];
    setIsLoadingApi(true);
    resetApiError();
    try {
        const { response, rawText } = await generateRefreshedChoices(
            lastNarration, currentChoices, playerHint, knowledgeBase, logSentPrompt
        );
        setRawAiResponsesLog(prev => [rawText, ...prev].slice(0, 50));
        if (response.choices && response.choices.length > 0) {
            setGameMessages(prevMessages => {
                const newMessages = [...prevMessages];
                const targetMessage = newMessages[lastMessageIndex];
                if (targetMessage) newMessages[lastMessageIndex] = { ...targetMessage, choices: response.choices };
                return newMessages;
            });
        } else {
            showNotification("AI không thể tạo ra lựa chọn mới. Vui lòng thử lại.", 'warning');
        }
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Lỗi khi làm mới lựa chọn.";
        setApiErrorWithTimeout(errorMsg);
    } finally {
        setIsLoadingApi(false);
    }
  }, [isLoadingApi, gameMessages, knowledgeBase, showNotification, setIsLoadingApi, resetApiError, logSentPrompt, setRawAiResponsesLog, setApiErrorWithTimeout, setGameMessages]);

  return {
    ...mainGameLoopActions,
    handleRefreshChoices,
    handleCheckTokenCount,
  };
};
