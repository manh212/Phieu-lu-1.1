// FIX: Add missing React import to resolve namespace errors.
import type React from 'react';
import { useCallback, useState, useRef } from 'react';
import { KnowledgeBase, GameMessage, PlayerActionInputType, ResponseLength, GameScreen, AiChoice, NPC, FindLocationParams } from '../../types/index';
import { countTokens, generateRefreshedChoices, generateNextTurn, summarizeTurnHistory, findLocationWithAI, getApiSettings } from '../../services';
import { generateEmbeddings } from '../../services/embeddingService';
import { performTagProcessing, addTurnHistoryEntryRaw, getMessagesForPage, calculateEffectiveStats, handleLevelUps, progressNpcCultivation, updateGameEventsStatus, handleLocationEntryEvents, searchVectors, extractEntityContextsFromString, worldDateToTotalMinutes } from '../../utils/gameLogicUtils';
import { VIETNAMESE, TURNS_PER_PAGE, AUTO_SAVE_INTERVAL_TURNS, MAX_AUTO_SAVE_SLOTS, LIVING_WORLD_TICK_INTERVAL_HOURS } from '../../constants';

export interface UseMainGameLoopActionsProps {
  knowledgeBase: KnowledgeBase;
// FIX: Correctly type the setKnowledgeBase parameter.
  setKnowledgeBase: React.Dispatch<React.SetStateAction<KnowledgeBase>>;
  gameMessages: GameMessage[];
// FIX: Correctly type the setGameMessages parameter.
  setGameMessages: React.Dispatch<React.SetStateAction<GameMessage[]>>;
  addMessageAndUpdateState: (newMessages: GameMessage[], newKnowledgeBase: KnowledgeBase, callback?: () => void) => void;
// FIX: Correctly type the setRawAiResponsesLog parameter.
  setRawAiResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
  sentPromptsLog: string[];
// FIX: Correctly type the setSentPromptsLog parameter.
  setSentPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
// FIX: Correctly type the setLatestPromptTokenCount parameter.
  setLatestPromptTokenCount: React.Dispatch<React.SetStateAction<number | null | string>>;
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  currentPageDisplay: number;
// FIX: Correctly type the setCurrentPageDisplay parameter.
  setCurrentPageDisplay: React.Dispatch<React.SetStateAction<number>>;
  isAutoPlaying: boolean;
// FIX: Correctly type the setIsAutoPlaying parameter.
  setIsAutoPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  executeSaveGame: (kbToSave: KnowledgeBase, messagesToSave: GameMessage[], saveName: string, existingId: string | null, isAuto: boolean) => Promise<string | null>;
  logNpcAvatarPromptCallback: (prompt: string) => void;
  setApiErrorWithTimeout: (message: string | null) => void;
  resetApiError: () => void;
  isLoadingApi: boolean;
// FIX: Correctly type the setIsLoadingApi parameter.
  setIsLoadingApi: React.Dispatch<React.SetStateAction<boolean>>;
  onQuit: () => void;
  currentPageMessagesLog: string;
  previousPageSummaries: string[];
  lastNarrationFromPreviousPage?: string;
// FIX: Correctly type the setRetrievedRagContextLog parameter.
  setRetrievedRagContextLog: React.Dispatch<React.SetStateAction<string[]>>;
  executeWorldTick: (kbForTick: KnowledgeBase) => Promise<{ updatedKb: KnowledgeBase; worldEventMessages: GameMessage[] }>;
  handleNonCombatDefeat: (kbStateAtDefeat: KnowledgeBase, fatalNarration?: string) => Promise<void>;
// FIX: Correctly type the setSummarizationResponsesLog parameter.
  setSummarizationResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
  isSummarizingNextPageTransition: boolean;
// FIX: Correctly type the setIsSummarizingNextPageTransition parameter.
  setIsSummarizingNextPageTransition: React.Dispatch<React.SetStateAction<boolean>>;
  // FIX: Added missing properties to the interface to resolve type errors.
// FIX: Correctly type the setSentGeneralSubLocationPromptsLog parameter.
  setSentGeneralSubLocationPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
// FIX: Correctly type the setReceivedGeneralSubLocationResponsesLog parameter.
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
      isSummarizingNextPageTransition, setIsSummarizingNextPageTransition,
    } = props;
    
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
        isStrictMode: boolean,
        narrativeDirective?: string // NEW: Added optional directive
    ) => {
        setIsLoadingApi(true);
        resetApiError();
        
        const knowledgeBaseAtActionStart = JSON.parse(JSON.stringify(knowledgeBase));
        const gameMessagesAtActionStart = [...gameMessages];
        const turnOfPlayerAction = knowledgeBase.playerStats.turn + 1;

        if (narrativeDirective) {
            knowledgeBaseAtActionStart.narrativeDirectiveForNextTurn = undefined;
        }

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
                lastNarrationFromPreviousPage, retrievedContext, logSentPromptCallback,
                narrativeDirective
            );
            setRawAiResponsesLog(prev => [rawText, ...prev].slice(0, 50));
            
            let currentTurnKb = JSON.parse(JSON.stringify(knowledgeBaseAtActionStart));

            if (narrativeDirective) {
                currentTurnKb.narrativeDirectiveForNextTurn = undefined;
            }

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
        executeWorldTick, isAutoPlaying, setIsAutoPlaying, setKnowledgeBase, logSummarizationResponseCallback
    ]);
    
    const handleRewriteTurn = useCallback(async (directive: string) => {
        if (isLoadingApi) return;
    
        const history = knowledgeBase.turnHistory;
        if (!history || history.length < 1) {
            showNotification("Lỗi viết lại: Không có lịch sử để quay lại.", 'error');
            return;
        }
    
        const turnToRewrite = knowledgeBase.playerStats.turn;
        const lastPlayerActionMessage = [...gameMessages].reverse().find(msg => msg.type === 'player_action' && msg.turnNumber === turnToRewrite);
    
        if (!lastPlayerActionMessage || typeof lastPlayerActionMessage.content !== 'string') {
            showNotification("Lỗi viết lại: Không tìm thấy hành động của người chơi cho lượt này.", 'error');
            return;
        }
    
        setIsLoadingApi(true);
        resetApiError();
    
        const stateToRestore = history[history.length - 1];
        const newHistory = history.slice(0, -1);
    
        const kbForRewrite = {
            ...stateToRestore.knowledgeBaseSnapshot,
            turnHistory: newHistory,
            narrativeDirectiveForNextTurn: directive
        };
        
        const messagesBeforeRewrite = gameMessages.filter(m => m.turnNumber < turnToRewrite);
        setGameMessages(messagesBeforeRewrite);
        setKnowledgeBase(kbForRewrite);
    
        setTimeout(() => {
            handlePlayerAction(
                lastPlayerActionMessage.content as string,
                !lastPlayerActionMessage.isPlayerInput,
                'action', 'default', false, directive
            );
        }, 100);
    
    }, [isLoadingApi, knowledgeBase, gameMessages, showNotification, setKnowledgeBase, setGameMessages, handlePlayerAction, resetApiError]);
    
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

    const onRollbackTurn = useCallback(() => {
        if (isSummarizingNextPageTransition || isLoadingApi) return;

        // We need at least one state to roll back TO. The initial state (length 1) cannot be rolled back from.
        if (!knowledgeBase.turnHistory || knowledgeBase.turnHistory.length < 2) {
            showNotification(VIETNAMESE.cannotRollbackFurther, 'error');
            return;
        }
        
        const historyCopy = [...knowledgeBase.turnHistory];
        
        // Pop the state for the beginning of the *current* turn. This IS the state we want to restore.
        const lastTurnState = historyCopy.pop(); 
        
        if (lastTurnState) {
            // The state to restore is the snapshot from the popped entry...
            const kbToRestore = lastTurnState.knowledgeBaseSnapshot;
            
            // ...but we explicitly overwrite its history with the new, shorter history array.
            // This is the critical fix to allow multiple rollbacks.
            kbToRestore.turnHistory = historyCopy;

            setKnowledgeBase(kbToRestore);
            setGameMessages(lastTurnState.gameMessagesSnapshot);

            // Recalculate current page display based on the restored turn number.
            const newTurn = kbToRestore.playerStats.turn;
            const historyForPageCalc = kbToRestore.currentPageHistory || [1];
            
            let newPage = 1;
            for (let i = historyForPageCalc.length - 1; i >= 0; i--) {
                if (newTurn >= historyForPageCalc[i]) {
                    newPage = i + 1;
                    break;
                }
            }
            setCurrentPageDisplay(newPage);

            showNotification(VIETNAMESE.rollbackSuccess, 'success');
        } else {
            // This case should be rare given the length check above.
            showNotification("Lỗi: Không tìm thấy trạng thái để lùi về.", 'error');
        }
    }, [
        knowledgeBase.turnHistory,
        setKnowledgeBase,
        setGameMessages,
        setCurrentPageDisplay,
        showNotification,
        isSummarizingNextPageTransition,
        isLoadingApi
    ]);


    const handleFindLocation = useCallback(async (params: FindLocationParams) => {
        setIsLoadingApi(true);
        resetApiError();
        showNotification(VIETNAMESE.findingLocationMessage, 'info');
        try {
            const { response: { narration, tags } } = await findLocationWithAI(
                knowledgeBase, params, currentPageMessagesLog, previousPageSummaries,
                lastNarrationFromPreviousPage,
                (prompt) => props.setSentGeneralSubLocationPromptsLog(prev => [prompt, ...prev].slice(0, 10))
            );
            props.setReceivedGeneralSubLocationResponsesLog(prev => [narration, ...prev].slice(0, 10)); // Assuming narration is the raw text for this service
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
        setApiErrorWithTimeout,
        currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage,
        // Dependencies were using props. but should not
        props.setSentGeneralSubLocationPromptsLog, props.setReceivedGeneralSubLocationResponsesLog
    ]);

    return {
      handlePlayerAction,
      onRollbackTurn,
      handleFindLocation,
      isSummarizingNextPageTransition,
      handleRefreshChoices,
      handleCheckTokenCount,
      logSentPromptCallback,
      handleRewriteTurn,
    };
};
