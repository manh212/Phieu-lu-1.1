
import { useCallback, useState } from 'react';
import { KnowledgeBase, GameMessage, PlayerActionInputType, ResponseLength, GameScreen, FindLocationParams } from '../../types';
import { VIETNAMESE, TURNS_PER_PAGE, AUTO_SAVE_INTERVAL_TURNS, MAX_AUTO_SAVE_SLOTS, LIVING_WORLD_TICK_INTERVAL } from '../../constants';
import { generateNextTurn, summarizeTurnHistory, generateCityEconomy, generateGeneralSubLocations, findLocationWithAI, getApiSettings } from '../../services/geminiService';
import { generateEmbeddings } from '../../services/embeddingService';
import { performTagProcessing, addTurnHistoryEntryRaw, getMessagesForPage, calculateEffectiveStats, handleLevelUps, progressNpcCultivation, updateGameEventsStatus, handleLocationEntryEvents, searchVectors, extractEntityContextsFromString } from '../../utils/gameLogicUtils';
import * as GameTemplates from '../../templates';

interface UseMainGameLoopProps {
  knowledgeBase: KnowledgeBase;
  setKnowledgeBase: React.Dispatch<React.SetStateAction<KnowledgeBase>>;
  gameMessages: GameMessage[];
  addMessageAndUpdateState: (newMessages: GameMessage[], newKnowledgeBase: KnowledgeBase, callback?: () => void) => void;
  setRawAiResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
  logSentPromptCallback: (prompt: string) => void;
  setSummarizationResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  currentPageDisplay: number;
  setCurrentPageDisplay: React.Dispatch<React.SetStateAction<number>>;
  executeSaveGame: (kbToSave: KnowledgeBase, messagesToSave: GameMessage[], saveName: string, existingId: string | null, isAuto: boolean) => Promise<string | null>;
  logNpcAvatarPromptCallback: (prompt: string) => void;
  setIsLoadingApi: React.Dispatch<React.SetStateAction<boolean>>;
  setApiErrorWithTimeout: (message: string | null) => void;
  resetApiError: () => void;
  setSentEconomyPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
  setReceivedEconomyResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
  setSentGeneralSubLocationPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
  setReceivedGeneralSubLocationResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
  handleNonCombatDefeat: (kbStateAtDefeat: KnowledgeBase, fatalNarration: string) => Promise<void>;
  setRetrievedRagContextLog: React.Dispatch<React.SetStateAction<string[]>>;
  currentPageMessagesLog: string;
  previousPageSummaries: string[];
  lastNarrationFromPreviousPage?: string;
  executeWorldTick: (kbForTick: KnowledgeBase) => Promise<{ updatedKb: KnowledgeBase; worldEventMessages: GameMessage[] }>;
  isAutoPlaying: boolean;
  setIsAutoPlaying: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useMainGameLoop = (props: UseMainGameLoopProps) => {
    const {
        knowledgeBase, setKnowledgeBase, gameMessages, addMessageAndUpdateState,
        setIsLoadingApi, resetApiError, logSentPromptCallback, setRawAiResponsesLog,
        currentPageDisplay, executeSaveGame, showNotification, setCurrentPageDisplay,
        setApiErrorWithTimeout, logNpcAvatarPromptCallback, handleNonCombatDefeat,
        setRetrievedRagContextLog, currentPageMessagesLog, previousPageSummaries,
        lastNarrationFromPreviousPage, setSummarizationResponsesLog,
        setSentEconomyPromptsLog, setReceivedEconomyResponsesLog,
        setSentGeneralSubLocationPromptsLog, setReceivedGeneralSubLocationResponsesLog,
        executeWorldTick, isAutoPlaying, setIsAutoPlaying
    } = props;

    const [isSummarizingNextPageTransition, setIsSummarizingNextPageTransition] = useState<boolean>(false);
    
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
                    const searchResults = searchVectors(queryEmbedding[0], knowledgeBase.ragVectorStore, ragTopK);
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
            
            const shouldTickWorld = (finalKbForThisTurn.playerStats.turn % LIVING_WORLD_TICK_INTERVAL === 0) && finalKbForThisTurn.playerStats.turn > finalKbForThisTurn.lastWorldTickTurn;
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
                // Auto-save logic...
            }
            
            const newMessagesForThisCycle: GameMessage[] = [playerActionMessage, {
                id: Date.now().toString() + Math.random(), type: 'narration', content: response.narration,
                timestamp: Date.now(), choices: response.choices, turnNumber: finalKbForThisTurn.playerStats.turn
            }, ...combinedSystemMessages];

            addMessageAndUpdateState(newMessagesForThisCycle, finalKbForThisTurn);

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
        executeWorldTick, isAutoPlaying, setIsAutoPlaying, setKnowledgeBase
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

    return {
        handlePlayerAction,
        isSummarizingNextPageTransition,
        handleFindLocation,
    };
};
