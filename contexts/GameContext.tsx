import React, { createContext, ReactNode, useRef, useState, useCallback, useEffect } from 'react';
import * as jsonpatch from 'fast-json-patch';
import { GameScreen, KnowledgeBase, GameMessage, WorldSettings, PlayerStats, ApiConfig, SaveGameData, StorageType, SaveGameMeta, RealmBaseStatDefinition, TurnHistoryEntry, StyleSettings, PlayerActionInputType, EquipmentSlotId, Item as ItemType, NPC, GameLocation, ResponseLength, StorageSettings, FindLocationParams, Skill, Prisoner, Wife, Slave, CombatEndPayload, AuctionSlave, CombatDispositionMap, NpcAction, CombatLogContent } from '@/types/index';
import { INITIAL_KNOWLEDGE_BASE, VIETNAMESE, APP_VERSION, MAX_AUTO_SAVE_SLOTS, TURNS_PER_PAGE, DEFAULT_TIERED_STATS, KEYFRAME_INTERVAL, EQUIPMENT_SLOTS_CONFIG } from '@/constants/index';
import { saveGameToIndexedDB, loadGamesFromIndexedDB, loadSpecificGameFromIndexedDB, deleteGameFromIndexedDB, importGameToIndexedDB, resetDBConnection as resetIndexedDBConnection } from '../services/indexedDBService';
import * as GameTemplates from '@/types/index';
import { useAppInitialization } from '../hooks/useAppInitialization';
import { useGameNotifications, NotificationState } from '../hooks/useGameNotifications';
import { useGameData } from '../hooks/useGameData';
import { useGameplayModals } from '../hooks/useGameplayModals';
import type { GameEntity, GameEntityType } from '../hooks/types';
import {
    generateInitialStory, generateNextTurn, summarizeTurnHistory, generateRefreshedChoices,
    generateCombatConsequence, generateNonCombatDefeatConsequence,
    generateCraftedItemViaAI, findLocationWithAI, generateAuctionData, runAuctionTurn, 
    runAuctioneerCall, generateSlaveAuctionData, runSlaveAuctionTurn, runSlaveAuctioneerCall, 
    generateCityEconomy, generateGeneralSubLocations, generateVendorRestock,
    handleCompanionInteraction, handlePrisonerInteraction, summarizeCompanionInteraction, 
    summarizePrisonerInteraction, generateCultivationSession, summarizeCultivationSession,
    generateWorldTickUpdate,
    generateImageUnified,
    generateCopilotResponse,
    getApiSettings as getGeminiApiSettings
} from '../services';
import { uploadImageToCloudinary } from '../services/cloudinaryService';
import { isValidImageUrl } from '../utils/imageValidationUtils';
import { performTagProcessing, handleLevelUps, calculateEffectiveStats, addTurnHistoryEntryRaw, updateGameEventsStatus, handleLocationEntryEvents } from '../utils/gameLogicUtils';

// Import action hooks
import { useMainGameLoopActions } from '../hooks/actions/useMainGameLoopActions';
import { useSetupActions } from '../hooks/actions/useSetupActions';
import { useAuctionActions } from '../hooks/actions/useAuctionActions';
import { useCultivationActions } from '../hooks/actions/useCultivationActions';
import { useCharacterActions } from '../hooks/actions/useCharacterActions';
import { usePostCombatActions } from '../hooks/actions/usePostCombatActions';
import { useLivingWorldActions } from '../hooks/actions/useLivingWorldActions';
import { useCopilotActions } from '../hooks/actions/useCopilotActions';
import { useGameActions } from '../hooks/useGameActions';


// Define the shape of the context value
export interface GameContextType {
    // State
    currentScreen: GameScreen;
    knowledgeBase: KnowledgeBase;
    gameMessages: GameMessage[];
    aiCopilotMessages: GameMessage[];
    sentCopilotPromptsLog: string[];
    styleSettings: StyleSettings;
    storageSettings: StorageSettings;
    isInitialLoading: boolean;
    storageInitError: string | null;
    notification: NotificationState | null;
    showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
    apiError: string | null;
    isLoadingApi: boolean;
    isSummarizingNextPageTransition: boolean;
    isAutoPlaying: boolean;
    isSavingGame: boolean;
    isAutoSaving: boolean;
    isSummarizingOnLoad: boolean;
    isCraftingItem: boolean;
    isUploadingAvatar: boolean;
    isCultivating: boolean;
    rawAiResponsesLog: string[];
    sentPromptsLog: string[];
    sentEconomyPromptsLog: string[];
    receivedEconomyResponsesLog: string[];
    sentGeneralSubLocationPromptsLog: string[];
    receivedGeneralSubLocationResponsesLog: string[];
    latestPromptTokenCount: number | string | null;
    summarizationResponsesLog: string[];
    sentCraftingPromptsLog: string[];
    receivedCraftingResponsesLog: string[];
    sentNpcAvatarPromptsLog: string[];
    sentCultivationPromptsLog: string[];
    receivedCultivationResponsesLog: string[];
    prisonerInteractionLog: string[];
    companionInteractionLog: string[];
    sentPrisonerPromptsLog: string[];
    receivedPrisonerResponsesLog: string[];
    sentCompanionPromptsLog: string[];
    receivedCompanionResponsesLog: string[];
    retrievedRagContextLog: string[];
    sentCombatSummaryPromptsLog: string[];
    receivedCombatSummaryResponsesLog: string[];
    sentVictoryConsequencePromptsLog: string[];
    receivedVictoryConsequenceResponsesLog: string[];
    sentLivingWorldPromptsLog: string[];
    rawLivingWorldResponsesLog: string[];
    lastScoredNpcsForTick: { npc: NPC, score: number }[];
    currentPageDisplay: number;
    totalPages: number;
    messageIdBeingEdited: string | null;

    currentPageMessagesLog: string;
    previousPageSummaries: string[];
    lastNarrationFromPreviousPage?: string;

    // Modal State
    selectedEntity: { type: GameEntityType; entity: GameEntity } | null;
    isStyleSettingsModalOpen: boolean;
    isAiContextModalOpen: boolean;
    activeEconomyModal: {type: 'marketplace' | 'shopping_center', locationId: string} | null;
    activeSlaveMarketModal: {locationId: string} | null;

    // Actions (will be populated by allActions)
    resetCopilotConversation: () => void;
    [key: string]: any; // Index signature to allow dynamic action properties
}

export const GameContext = createContext<GameContextType | null>(null);

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const gameplayScrollPosition = useRef(0);
    const justLoadedGame = useRef(false);
    
    const { storageSettings, styleSettings, setStorageSettings, setStyleSettings, isInitialLoading, storageInitError } = useAppInitialization();
    const { notification, showNotification } = useGameNotifications();
    const gameData = useGameData();
    const { 
        selectedEntity, isStyleSettingsModalOpen, isAiContextModalOpen, activeEconomyModal, activeSlaveMarketModal,
        openEntityModal, closeModal, closeEconomyModal, closeSlaveMarketModal,
        setIsStyleSettingsModalOpen, setIsAiContextModalOpen, setActiveEconomyModal, setActiveSlaveMarketModal
    } = useGameplayModals();
    
    const [currentScreen, setCurrentScreen] = useState<GameScreen>(GameScreen.Initial);
    const [sentNpcAvatarPromptsLog, setSentNpcAvatarPromptsLog] = useState<string[]>([]);
    const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
    const [isSavingGame, setIsSavingGame] = useState<boolean>(false);
    const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
    const [isSummarizingOnLoad, setIsSummarizingOnLoad] = useState<boolean>(false);
    const [isCraftingItem, setIsCraftingItem] = useState<boolean>(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
    const [isCultivating, setIsCultivating] = useState<boolean>(false);
    const [isLoadingApi, setIsLoadingApi] = useState<boolean>(false);
    const [isSummarizingNextPageTransition, setIsSummarizingNextPageTransition] = useState<boolean>(false);
    
    const apiErrorTimer = useRef<number | undefined>(undefined);
    const [apiError, setApiError] = useState<string | null>(null);

    const resetApiError = useCallback(() => {
        if (apiErrorTimer.current) clearTimeout(apiErrorTimer.current);
        setApiError(null);
    }, []);

    const setApiErrorWithTimeout = useCallback((message: string | null) => {
        resetApiError();
        setApiError(message);
        if (message) {
            apiErrorTimer.current = window.setTimeout(() => setApiError(null), 7000);
        }
    }, [resetApiError]);

    const onQuit = useCallback(() => {
        gameData.resetGameData();
        setCurrentScreen(GameScreen.Initial);
        setIsAutoPlaying(false);
      }, [gameData.resetGameData, setCurrentScreen, setIsAutoPlaying]);

    const resetCopilotConversation = useCallback(() => {
        gameData.setAiCopilotMessages([]);
        gameData.setSentCopilotPromptsLog([]);
        showNotification("Cuộc trò chuyện với Siêu Trợ Lý đã được làm mới.", "info");
    }, [gameData.setAiCopilotMessages, gameData.setSentCopilotPromptsLog, showNotification]);

    const lastPageNumberForPrompt = (gameData.knowledgeBase.currentPageHistory?.length || 1) - 1;
    let lastNarrationFromPreviousPage: string | undefined = undefined;
    if (lastPageNumberForPrompt > 0 && gameData.currentPageDisplay > lastPageNumberForPrompt) { 
        const messagesOfLastSummarizedPagePrompt = gameData.getMessagesForPage(lastPageNumberForPrompt);
        const lastNarrationMessage = [...messagesOfLastSummarizedPagePrompt].reverse().find(msg => msg.type === 'narration' && typeof msg.content === 'string');
        if (lastNarrationMessage && typeof lastNarrationMessage.content === 'string') {
            lastNarrationFromPreviousPage = lastNarrationMessage.content;
        }
    }

    const messagesForCurrentPagePrompt = gameData.getMessagesForPage(gameData.currentPageDisplay);
    const currentPageMessagesLog = messagesForCurrentPagePrompt
        .map(msg => {
            switch (msg.type) {
                case 'player_action':
                    if (typeof msg.content === 'string') {
                        const prefix = `${gameData.knowledgeBase.worldConfig?.playerName || 'Người chơi'} ${msg.isPlayerInput ? 'đã làm' : 'đã chọn'}: `;
                        return prefix + msg.content;
                    }
                    break;
                case 'narration':
                    if (typeof msg.content === 'string') {
                        const prefix = "AI kể: ";
                        return prefix + msg.content;
                    }
                    break;
                case 'combat_log':
                    if (msg.content && typeof msg.content === 'object' && 'message' in msg.content) {
                        return `[Diễn biến chiến đấu] ${(msg.content as CombatLogContent).message}`;
                    }
                    break;
                case 'system':
                    if (typeof msg.content === 'string') {
                        const contentLower = msg.content.toLowerCase();
                        const isExcluded = 
                            contentLower.includes("tóm tắt") || 
                            contentLower.includes("trang") ||
                            contentLower.startsWith("nhận được:") ||
                            contentLower.startsWith("học được kỹ năng mới:") ||
                            contentLower.startsWith("bạn đã gặp npc mới:");
                        
                        if (!isExcluded) {
                            return `Hệ thống: ${msg.content}`;
                        }
                    }
                    break;
                default:
                    return null;
            }
            return null;
        })
        .filter(Boolean)
        .join("\n---\n");

    const previousPageSummariesContent: string[] = (gameData.knowledgeBase.currentPageHistory?.slice(0, -1) || [])
        .map((_, index) => gameData.knowledgeBase.pageSummaries?.[index + 1])
        .filter((summary): summary is string => !!summary);

    const logNpcAvatarPromptCallback = useCallback((prompt: string) => {
        setSentNpcAvatarPromptsLog(prev => [prompt, ...prev].slice(0, 10));
    }, []);

    const onGoToPrevPage = useCallback(() => {
        if (isSummarizingNextPageTransition) return;
        gameData.setCurrentPageDisplay(prev => clamp(prev - 1, 1, gameData.totalPages));
    }, [gameData, isSummarizingNextPageTransition]);

    const onGoToNextPage = useCallback(() => {
        if (isSummarizingNextPageTransition) return;
        gameData.setCurrentPageDisplay(prev => clamp(prev + 1, 1, gameData.totalPages));
    }, [gameData, isSummarizingNextPageTransition]);
    
    const onJumpToPage = useCallback((page: number) => {
        if (isSummarizingNextPageTransition) return;
        gameData.setCurrentPageDisplay(clamp(page, 1, gameData.totalPages));
    }, [gameData, isSummarizingNextPageTransition]);
    

    const gameActions = useGameActions({ ...gameData, showNotification, setCurrentScreen, justLoadedGame, setIsSummarizingOnLoad });

    const postCombatActions = usePostCombatActions({
        ...gameData, showNotification, setCurrentScreen, onQuit, isLoadingApi, setIsLoadingApi,
        resetApiError, setApiErrorWithTimeout, logNpcAvatarPromptCallback,
        setRawAiResponsesLog: gameData.setRawAiResponsesLog, setSentPromptsLog: gameData.setSentPromptsLog,
        setSentCombatSummaryPromptsLog: gameData.setSentCombatSummaryPromptsLog,
        setReceivedCombatSummaryResponsesLog: gameData.setReceivedCombatSummaryResponsesLog,
        setSentVictoryConsequencePromptsLog: gameData.setSentVictoryConsequencePromptsLog,
        setReceivedVictoryConsequenceResponsesLog: gameData.setReceivedVictoryConsequenceResponsesLog,
// FIX: Changed 'previousPageSummaries' to 'previousPageSummariesContent' to match the declared variable.
        currentPageMessagesLog, previousPageSummaries: previousPageSummariesContent, lastNarrationFromPreviousPage,
    });

    const livingWorldActions = useLivingWorldActions({
        ...gameData, showNotification, logNpcAvatarPromptCallback,
        setSentLivingWorldPromptsLog: gameData.setSentLivingWorldPromptsLog,
        setRawLivingWorldResponsesLog: gameData.setRawLivingWorldResponsesLog,
        setLastScoredNpcsForTick: gameData.setLastScoredNpcsForTick,
    });

    const mainGameLoopActions = useMainGameLoopActions({
// FIX: Added missing 'setCurrentPageDisplay' prop.
        ...gameData, showNotification, setCurrentPageDisplay: gameData.setCurrentPageDisplay, onQuit, isLoadingApi, setIsLoadingApi,
        resetApiError, setApiErrorWithTimeout, isAutoPlaying, setIsAutoPlaying,
        executeSaveGame: gameActions.onSaveGame as any,
        logNpcAvatarPromptCallback,
        handleNonCombatDefeat: postCombatActions.handleNonCombatDefeat,
        executeWorldTick: livingWorldActions.executeWorldTick,
// FIX: Changed 'previousPageSummaries' to 'previousPageSummariesContent' to match the declared variable.
        currentPageMessagesLog, previousPageSummaries: previousPageSummariesContent, lastNarrationFromPreviousPage,
        setRawAiResponsesLog: gameData.setRawAiResponsesLog,
        sentPromptsLog: gameData.sentPromptsLog,
        setSentPromptsLog: gameData.setSentPromptsLog,
        setLatestPromptTokenCount: gameData.setLatestPromptTokenCount,
        setSummarizationResponsesLog: gameData.setSummarizationResponsesLog,
        isSummarizingNextPageTransition, setIsSummarizingNextPageTransition,
        setRetrievedRagContextLog: gameData.setRetrievedRagContextLog,
        // FIX: Pass the missing log setters from gameData to the main game loop actions hook.
        setSentGeneralSubLocationPromptsLog: gameData.setSentGeneralSubLocationPromptsLog,
        setReceivedGeneralSubLocationResponsesLog: gameData.setReceivedGeneralSubLocationResponsesLog,
    });

    const handleProcessDebugTags = useCallback(async (narration: string, tags: string) => {
        setIsLoadingApi(true);
        try {
            const tagArray = tags.split('\n').map(t => t.trim()).filter(t => t);
            if (tagArray.length === 0 && !narration.trim()) {
                showNotification("Vui lòng nhập tag hoặc lời kể để xử lý.", 'warning');
                return;
            }
            const turnForMessages = gameData.knowledgeBase.playerStats.turn;
    
            const { newKb: kbAfterTags, systemMessagesFromTags, rewriteTurnDirective } = await performTagProcessing(
                gameData.knowledgeBase, tagArray, turnForMessages,
                gameData.setKnowledgeBase, logNpcAvatarPromptCallback
            );

            // NEW: Handle Rewrite Turn directive from Copilot
            if (rewriteTurnDirective) {
                await mainGameLoopActions.handleRewriteTurn(rewriteTurnDirective);
                return; // Stop further processing for this call
            }
    
            let finalKb = handleLevelUps(kbAfterTags).updatedKb;
            finalKb.playerStats = calculateEffectiveStats(finalKb.playerStats, finalKb.equippedItems, finalKb.inventory);
    
            if (finalKb.playerStats.sinhLuc <= 0) {
                await postCombatActions.handleNonCombatDefeat(finalKb, narration || 'Bạn đã bị gục ngã do một sự kiện không rõ.');
                return;
            }
    
            const newMessages: GameMessage[] = [];
            if (narration.trim()) {
                newMessages.push({
                    id: `debug-narration-${Date.now()}`, type: 'narration', content: narration.trim(),
                    timestamp: Date.now(), turnNumber: turnForMessages
                });
            }
            newMessages.push(...systemMessagesFromTags);
    
            gameData.addMessageAndUpdateState(newMessages, finalKb);
            showNotification("Debug tags đã được xử lý.", "success");
    
        } catch (error) {
            console.error("Error processing debug tags:", error);
            showNotification(`Lỗi xử lý debug tags: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        } finally {
            setIsLoadingApi(false);
        }
    }, [gameData, setIsLoadingApi, showNotification, logNpcAvatarPromptCallback, postCombatActions.handleNonCombatDefeat, mainGameLoopActions.handleRewriteTurn]);
    
    const setupActions = useSetupActions({
        setIsLoadingApi, resetApiError, setKnowledgeBase: gameData.setKnowledgeBase,
        setCurrentPageDisplay: gameData.setCurrentPageDisplay, setCurrentScreen,
        addMessageAndUpdateState: gameData.addMessageAndUpdateState,
        logSentPromptCallback: mainGameLoopActions.logSentPromptCallback,
        setRawAiResponsesLog: gameData.setRawAiResponsesLog,
        setApiErrorWithTimeout, logNpcAvatarPromptCallback,
    });
    
    const auctionActions = useAuctionActions({
        ...gameData, showNotification, setCurrentScreen, isLoadingApi, setIsLoadingApi,
        resetApiError, setApiErrorWithTimeout, logNpcAvatarPromptCallback,
        setSentEconomyPromptsLog: gameData.setSentEconomyPromptsLog,
        setReceivedEconomyResponsesLog: gameData.setReceivedEconomyResponsesLog,
    });
    
    const cultivationActions = useCultivationActions({
// FIX: Removed incorrect 'isCultivating' prop. 'setIsCultivating' is correct and already present.
        ...gameData, showNotification, setCurrentScreen, setIsCultivating,
        resetApiError, setApiErrorWithTimeout, logNpcAvatarPromptCallback,
        setSentCultivationPromptsLog: gameData.setSentCultivationPromptsLog,
        setReceivedCultivationResponsesLog: gameData.setReceivedCultivationResponsesLog,
// FIX: Changed 'previousPageSummaries' to 'previousPageSummariesContent' to match the declared variable.
        currentPageMessagesLog, previousPageSummaries: previousPageSummariesContent, lastNarrationFromPreviousPage,
    });

    const characterActions = useCharacterActions({
        ...gameData, showNotification, setCurrentScreen, isLoadingApi, setIsLoadingApi,
        resetApiError, setApiErrorWithTimeout, logNpcAvatarPromptCallback,
// FIX: Changed 'previousPageSummaries' to 'previousPageSummariesContent' to match the declared variable.
        handleProcessDebugTags, currentPageMessagesLog, previousPageSummaries: previousPageSummariesContent, lastNarrationFromPreviousPage,
        prisonerInteractionLog: gameData.prisonerInteractionLog, setPrisonerInteractionLog: gameData.setPrisonerInteractionLog,
        sentPrisonerPromptsLog: gameData.sentPrisonerPromptsLog, setSentPrisonerPromptsLog: gameData.setSentPrisonerPromptsLog,
        receivedPrisonerResponsesLog: gameData.receivedPrisonerResponsesLog, setReceivedPrisonerResponsesLog: gameData.setReceivedPrisonerResponsesLog,
        companionInteractionLog: gameData.companionInteractionLog, setCompanionInteractionLog: gameData.setCompanionInteractionLog,
        sentCompanionPromptsLog: gameData.sentCompanionPromptsLog, setSentCompanionPromptsLog: gameData.setSentCompanionPromptsLog,
        receivedCompanionResponsesLog: gameData.receivedCompanionResponsesLog, setReceivedCompanionResponsesLog: gameData.setReceivedCompanionResponsesLog,
    });
    
    const copilotActions = useCopilotActions({
        ...gameData, isLoadingApi, setIsLoadingApi,
        resetApiError, setApiErrorWithTimeout,
        sentPromptsLog: gameData.sentPromptsLog,
    });

    const allActions = { ...setupActions, ...mainGameLoopActions, ...auctionActions, ...cultivationActions, ...characterActions, ...postCombatActions, ...livingWorldActions, ...copilotActions, ...gameActions, handleProcessDebugTags };
    const isCurrentlyActivePage = gameData.currentPageDisplay === gameData.totalPages;
    
    const contextValue: GameContextType = {
        ...gameData, currentScreen, styleSettings, storageSettings, isInitialLoading, storageInitError,
        notification, showNotification, apiError, isLoadingApi, isSummarizingNextPageTransition,
        isAutoPlaying, isSavingGame, isAutoSaving, isSummarizingOnLoad, isCraftingItem,
        isUploadingAvatar, isCultivating, sentNpcAvatarPromptsLog, currentPageMessagesLog,
        previousPageSummaries: previousPageSummariesContent, lastNarrationFromPreviousPage,
        selectedEntity, isStyleSettingsModalOpen, isAiContextModalOpen, activeEconomyModal, activeSlaveMarketModal,
        setCurrentScreen, setKnowledgeBase: gameData.setKnowledgeBase, setGameMessages: gameData.setGameMessages,
        setStyleSettings, openEntityModal, closeModal, closeEconomyModal, closeSlaveMarketModal,
        setIsStyleSettingsModalOpen, setIsAiContextModalOpen, setActiveEconomyModal, setActiveSlaveMarketModal,
        ...allActions, onQuit, resetCopilotConversation, isCurrentlyActivePage, gameplayScrollPosition, justLoadedGame,
        onGoToPrevPage, onGoToNextPage, onJumpToPage,
    };

    return <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>;
};
