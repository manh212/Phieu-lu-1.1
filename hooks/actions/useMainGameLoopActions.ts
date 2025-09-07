import { useCallback, useState } from 'react';
// FIX: Correct import path for types
import { KnowledgeBase, GameMessage, PlayerActionInputType, ResponseLength, GameScreen, AiChoice, NPC, FindLocationParams } from '../../types/index';
// FIX: Corrected import path for services
import { countTokens, generateRefreshedChoices, generateNextTurn, summarizeTurnHistory, findLocationWithAI, getApiSettings } from '../../services';
import { generateEmbeddings } from '../../services/embeddingService';
import { performTagProcessing, addTurnHistoryEntryRaw, getMessagesForPage, calculateEffectiveStats, handleLevelUps, progressNpcCultivation, updateGameEventsStatus, handleLocationEntryEvents, searchVectors, extractEntityContextsFromString, worldDateToTotalMinutes } from '../../utils/gameLogicUtils';
import { VIETNAMESE, TURNS_PER_PAGE, AUTO_SAVE_INTERVAL_TURNS, MAX_AUTO_SAVE_SLOTS, LIVING_WORLD_TICK_INTERVAL_HOURS } from '../../constants';

// Interface was likely shared, defining it here for clarity.
export interface UseMainGameLoopActionsProps {
  knowledgeBase: KnowledgeBase;
  setKnowledgeBase: React.Dispatch<React.SetStateAction<KnowledgeBase>>;
  gameMessages: GameMessage[];
  setGameMessages: React.Dispatch<React.SetStateAction<GameMessage[]>>;
  addMessageAndUpdateState: (newMessages: GameMessage[], newKnowledgeBase: KnowledgeBase, callback?: () => void) => void;
  setRawAiResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
  sentPromptsLog: string[];
  setSentPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
  setLatestPromptTokenCount: React.Dispatch<React.SetStateAction<number | null | string>>;
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
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
  setRetrievedRagContextLog: React.Dispatch<React.SetStateAction<string[]>>;
  executeWorldTick: (kbForTick: KnowledgeBase) => Promise<{ updatedKb: KnowledgeBase; worldEventMessages: GameMessage[] }>;
  handleNonCombatDefeat: (kbStateAtDefeat: KnowledgeBase, fatalNarration?: string) => Promise<void>;
  setSummarizationResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
  setSentEconomyPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
  setReceivedEconomyResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
  setSentGeneralSubLocationPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
  setReceivedGeneralSubLocationResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
}


export const useMainGameLoopActions = (props: UseMainGameLoopActionsProps) => {
    const { 
      setIsLoadingApi, isLoadingApi, 
      knowledgeBase, gameMessages, setGameMessages, addMessageAndUpdateState, showNotification, 
      resetApiError, setLatestPromptTokenCount, 
      setRawAiResponsesLog, setApiErrorWithTimeout,
      currentPageDisplay, setCurrentPageDisplay,
      setSummarizationResponsesLog,
      setSentEconomyPromptsLog, setReceivedEconomyResponsesLog,
      setSentGeneralSubLocationPromptsLog, setReceivedGeneralSubLocationResponsesLog,
      logNpcAvatarPromptCallback,
      handleNonCombatDefeat,
      setRetrievedRagContextLog,
      currentPageMessagesLog,
      previousPageSummaries,
      lastNarrationFromPreviousPage,
      executeWorldTick,
      isAutoPlaying, setIsAutoPlaying,
      setKnowledgeBase,
      executeSaveGame,
    } = props;
    
    const [isSummarizingNextPageTransition, setIsSummarizingNextPageTransition] = useState<boolean>(false);
    
    const logSentPromptCallback = useCallback((prompt: string) => {
      props.setSentPromptsLog(prev => [prompt, ...prev].slice(0, 10));
      setLatestPromptTokenCount('Chưa kiểm tra');
    }, [props.setSentPromptsLog, setLatestPromptTokenCount]);
    
    const logSummarizationResponseCallback = useCallback((response: string) => {
        setSummarizationResponsesLog(prev => [response, ...prev].slice(0, 10));
    }, [setSummarizationResponsesLog]);

    const handlePlayerAction = useCallback(async (
        action: string, 
        isChoice: boolean,
        inputType: PlayerActionInputType,
        responseLength: ResponseLength,
        isStrictMode: boolean
    ) => {
        setIsLoadingApi(true);
        resetApiError();
        
        const knowledgeBaseAtActionStart = JSON.parse(JSON.stringify(knowledgeBase));
        const gameMessagesAtActionStart = [...gameMessages];
        const turnOfPlayerAction = knowledgeBase.playerStats.turn + 1;

        const playerActionMessage: GameMessage = {
            id: Date.now().toString() + Math.random(), type: 'player_action',
            content: action, timestamp: Date.now(), isPlayerInput: !isChoice,
            turnNumber: turnOfPlayerAction 
        };
        
        let retrievedContext: string | undefined = undefined;
        const apiSettings = getApiSettings();
        const ragTopK = apiSettings.ragTopK ?? 10;
        if (knowledgeBase.ragVectorStore && knowledgeBase.ragVectorStore.vectors.length > 0 && ragTopK > 0) {
            try {
                const contextChunks = new Set<string>(extractEntityContextsFromString(action, knowledgeBase));
                const queryEmbedding = await generateEmbeddings([action]);
                if (queryEmbedding && queryEmbedding.length > 0) {
                    const searchResults = searchVectors(queryEmbedding[0], knowledgeBase.ragVectorStore, ragTopK, knowledgeBase.playerStats.turn);
                    searchResults.forEach(ctx => contextChunks.add(ctx));
                }
                if (contextChunks.size > 0) {
                    retrievedContext = Array.from(contextChunks).join('\n---\n');
                    setRetrievedRagContextLog(prev => [retrievedContext!, ...prev].slice(0, 10));
                }
            } catch (e) {
                showNotification("Lỗi khi truy xuất ký ức (RAG).", 'error');
            }
        }

        try {
            const { response, rawText } = await generateNextTurn(
                knowledgeBase, action, inputType, responseLength,
                currentPageMessagesLog, previousPageSummaries, isStrictMode,
                lastNarrationFromPreviousPage, retrievedContext, logSentPromptCallback
            );
            setRawAiResponsesLog(prev => [rawText, ...prev].slice(0, 50));
            
            let currentTurnKb = JSON.parse(JSON.stringify(knowledgeBaseAtActionStart));
            const { newKb: kbAfterTags, systemMessagesFromTags, turnIncrementedByTag } = await performTagProcessing(
                currentTurnKb, response.tags, turnOfPlayerAction, setKnowledgeBase, logNpcAvatarPromptCallback
            );
            
            let finalKbForThisTurn = kbAfterTags;
            let combinedSystemMessages = [...systemMessagesFromTags];
            
            if (!turnIncrementedByTag) finalKbForThisTurn.playerStats.turn = turnOfPlayerAction;
            
            const eventUpdateResult = updateGameEventsStatus(finalKbForThisTurn);
            finalKbForThisTurn = eventUpdateResult.updatedKb;
            combinedSystemMessages.push(...eventUpdateResult.systemMessages);

            const npcProgressionResult = progressNpcCultivation(finalKbForThisTurn);
            finalKbForThisTurn = npcProgressionResult.updatedKb;
            combinedSystemMessages.push(...npcProgressionResult.systemMessages);
            
            const lastTickDate = finalKbForThisTurn.lastWorldTickDate;
            const currentDate = finalKbForThisTurn.worldDate;
            const minutesSinceLastTick = worldDateToTotalMinutes(currentDate) - worldDateToTotalMinutes(lastTickDate);
            const hoursSinceLastTick = minutesSinceLastTick / 60;
            const shouldTickWorld = hoursSinceLastTick >= LIVING_WORLD_TICK_INTERVAL_HOURS;

            if (shouldTickWorld) {
                const { updatedKb, worldEventMessages } = await executeWorldTick(finalKbForThisTurn);
                finalKbForThisTurn = updatedKb;
                combinedSystemMessages.push(...worldEventMessages);
            }
            
            finalKbForThisTurn.playerStats.activeStatusEffects = (finalKbForThisTurn.playerStats.activeStatusEffects || []).map(effect => {
                if (effect.durationTurns > 0) effect.durationTurns -= 1;
                return effect;
            }).filter(effect => effect.durationTurns !== 0);
            
            const levelUpResult = handleLevelUps(finalKbForThisTurn);
            finalKbForThisTurn = levelUpResult.updatedKb;
            combinedSystemMessages.push(...levelUpResult.systemMessages);

            finalKbForThisTurn.playerStats = calculateEffectiveStats(finalKbForThisTurn.playerStats, finalKbForThisTurn.equippedItems, finalKbForThisTurn.inventory);

            finalKbForThisTurn.turnHistory = addTurnHistoryEntryRaw(
                knowledgeBaseAtActionStart.turnHistory || [], knowledgeBaseAtActionStart, gameMessagesAtActionStart
            );

            if (finalKbForThisTurn.playerStats.sinhLuc <= 0) {
                const defeatMessages: GameMessage[] = [playerActionMessage, { id: 'defeat-narration-' + Date.now(), type: 'narration', content: response.narration, timestamp: Date.now(), choices: [], turnNumber: finalKbForThisTurn.playerStats.turn }, ...combinedSystemMessages];
                addMessageAndUpdateState(defeatMessages, finalKbForThisTurn);
                await handleNonCombatDefeat(finalKbForThisTurn, response.narration);
                return;
            }

            finalKbForThisTurn.autoSaveTurnCounter = (finalKbForThisTurn.autoSaveTurnCounter + 1);
            if (finalKbForThisTurn.autoSaveTurnCounter >= AUTO_SAVE_INTERVAL_TURNS) {
                 finalKbForThisTurn.autoSaveTurnCounter = 0;
                const newSlotIndex = (knowledgeBase.currentAutoSaveSlotIndex + 1) % MAX_AUTO_SAVE_SLOTS;
                const saveName = `Auto Save Slot ${newSlotIndex + 1}`;
                const existingId = knowledgeBase.autoSaveSlotIds[newSlotIndex];
                const newSaveId = await executeSaveGame(finalKbForThisTurn, [...gameMessages, ...combinedSystemMessages], saveName, existingId, true);
                if (newSaveId) {
                    finalKbForThisTurn.autoSaveSlotIds[newSlotIndex] = newSaveId;
                    finalKbForThisTurn.currentAutoSaveSlotIndex = newSlotIndex;
                    showNotification(VIETNAMESE.autoSaveSuccess(saveName), 'info');
                }
            }
            
            const turnJustCompleted = finalKbForThisTurn.playerStats.turn;

            const newMessagesForThisCycle: GameMessage[] = [playerActionMessage, {
                id: Date.now().toString() + Math.random(), type: 'narration', content: response.narration,
                timestamp: Date.now(), choices: response.choices, turnNumber: turnJustCompleted
            }, ...combinedSystemMessages];

            if (turnJustCompleted > 0 && turnJustCompleted % TURNS_PER_PAGE === 0 && gameMessagesAtActionStart.length > 0) {
                setIsSummarizingNextPageTransition(true);
            
                const allMessagesForPage = [...gameMessagesAtActionStart, ...newMessagesForThisCycle];
                const messagesToSummarize = getMessagesForPage(currentPageDisplay, finalKbForThisTurn, allMessagesForPage);
                
                try {
                    const { processedSummary } = await summarizeTurnHistory(
                        messagesToSummarize,
                        finalKbForThisTurn.worldConfig?.theme || '',
                        finalKbForThisTurn.worldConfig?.playerName || '',
                        finalKbForThisTurn.worldConfig?.genre,
                        finalKbForThisTurn.worldConfig?.customGenreName,
                        logSentPromptCallback,
                        logSummarizationResponseCallback
                    );
                    
                    if (!finalKbForThisTurn.pageSummaries) finalKbForThisTurn.pageSummaries = {};
                    finalKbForThisTurn.pageSummaries[currentPageDisplay] = processedSummary;
                    
                    if (!finalKbForThisTurn.currentPageHistory) finalKbForThisTurn.currentPageHistory = [1];
                    if (finalKbForThisTurn.currentPageHistory[finalKbForThisTurn.currentPageHistory.length - 1] !== turnJustCompleted + 1) {
                        finalKbForThisTurn.currentPageHistory.push(turnJustCompleted + 1);
                    }
                    
                    finalKbForThisTurn.lastSummarizedTurn = turnJustCompleted;
            
                    const newTotalPages = finalKbForThisTurn.currentPageHistory.length;
            
                    addMessageAndUpdateState(newMessagesForThisCycle, finalKbForThisTurn, () => {
                        setCurrentPageDisplay(newTotalPages);
                        setIsSummarizingNextPageTransition(false);
                    });
            
                } catch (summaryError) {
                    console.error("Failed to summarize page, proceeding without pagination:", summaryError);
                    const errorMsg = summaryError instanceof Error ? summaryError.message : "Lỗi tóm tắt trang.";
                    showNotification(`Lỗi tóm tắt trang: ${errorMsg}`, 'error');
                    addMessageAndUpdateState(newMessagesForThisCycle, finalKbForThisTurn, () => {
                        setIsSummarizingNextPageTransition(false);
                    });
                }
            
            } else {
                addMessageAndUpdateState(newMessagesForThisCycle, finalKbForThisTurn);
            }

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            setApiErrorWithTimeout(errorMsg);
            if (isAutoPlaying) {
                setIsAutoPlaying(false);
                showNotification(VIETNAMESE.autoPlayStoppedOnError, 'warning');
            }
        } finally {
            setIsLoadingApi(false);
        }
    }, [
        knowledgeBase, gameMessages, addMessageAndUpdateState, setIsLoadingApi,
        resetApiError, logSentPromptCallback, setRawAiResponsesLog,
        currentPageDisplay, executeSaveGame, showNotification, setCurrentPageDisplay,
        setApiErrorWithTimeout, logNpcAvatarPromptCallback, handleNonCombatDefeat,
        setRetrievedRagContextLog, currentPageMessagesLog, previousPageSummaries,
        lastNarrationFromPreviousPage, setSummarizationResponsesLog,
        setSentEconomyPromptsLog, setReceivedEconomyResponsesLog,
        setSentGeneralSubLocationPromptsLog, setReceivedGeneralSubLocationResponsesLog,
        executeWorldTick, isAutoPlaying, setIsAutoPlaying, setKnowledgeBase, logSummarizationResponseCallback
    ]);
    
    const handleFindLocation = useCallback(async (params: FindLocationParams) => {
        setIsLoadingApi(true);
        resetApiError();
        showNotification(VIETNAMESE.findingLocationMessage, 'info');
        try {
            const { response: { narration, tags } } = await findLocationWithAI(
                knowledgeBase, params, currentPageMessagesLog, previousPageSummaries,
                lastNarrationFromPreviousPage,
                (prompt) => setSentGeneralSubLocationPromptsLog(prev => [prompt, ...prev].slice(0, 10))
            );
            const { newKb: kbAfterTags, systemMessagesFromTags } = await performTagProcessing(
                knowledgeBase, tags, knowledgeBase.playerStats.turn, setKnowledgeBase, logNpcAvatarPromptCallback
            );
            const narrationMessage: GameMessage = {
                id: 'find-location-narration-' + Date.now(), type: 'system',
                content: narration, timestamp: Date.now(), turnNumber: knowledgeBase.playerStats.turn
            };
            addMessageAndUpdateState([narrationMessage, ...systemMessagesFromTags], kbAfterTags);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            setApiErrorWithTimeout(errorMsg);
            showNotification(VIETNAMESE.errorFindingLocation + `: ${errorMsg}`, 'error');
        } finally {
            setIsLoadingApi(false);
        }
    }, [
        knowledgeBase, setIsLoadingApi, resetApiError, showNotification,
        addMessageAndUpdateState, setKnowledgeBase, logNpcAvatarPromptCallback,
        setSentGeneralSubLocationPromptsLog, setApiErrorWithTimeout,
        currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage
    ]);

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
        const lastNarration = typeof lastMessage.content === 'string' ? lastMessage.content : '';
        const currentChoices = lastMessage.choices || [];
        setIsLoadingApi(true);
        resetApiError();
        try {
            const { response, rawText } = await generateRefreshedChoices(
                lastNarration, currentChoices, playerHint, knowledgeBase, logSentPromptCallback
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
    }, [isLoadingApi, gameMessages, knowledgeBase, showNotification, setIsLoadingApi, resetApiError, logSentPromptCallback, setRawAiResponsesLog, setApiErrorWithTimeout, setGameMessages]);

    return {
      handlePlayerAction,
      handleFindLocation,
      isSummarizingNextPageTransition,
      handleRefreshChoices,
      handleCheckTokenCount,
      logSentPromptCallback,
    };
};
