import React, { createContext, ReactNode, useRef, useState, useCallback, useEffect } from 'react';
import * as jsonpatch from 'fast-json-patch';
// FIX: Removed unused and non-existent `AvatarUploadHandlers` type import.
import { GameScreen, KnowledgeBase, GameMessage, WorldSettings, PlayerStats, ApiConfig, SaveGameData, StorageType, SaveGameMeta, RealmBaseStatDefinition, TurnHistoryEntry, StyleSettings, PlayerActionInputType, EquipmentSlotId, Item as ItemType, NPC, GameLocation, ResponseLength, StorageSettings, FindLocationParams, Skill, Prisoner, Wife, Slave, CombatEndPayload, AuctionSlave, CombatDispositionMap, NpcAction, CombatLogContent } from '../types';
import { INITIAL_KNOWLEDGE_BASE, VIETNAMESE, APP_VERSION, MAX_AUTO_SAVE_SLOTS, TURNS_PER_PAGE, DEFAULT_TIERED_STATS, KEYFRAME_INTERVAL, EQUIPMENT_SLOTS_CONFIG } from '../constants';
import { saveGameToIndexedDB, loadGamesFromIndexedDB, loadSpecificGameFromIndexedDB, deleteGameFromIndexedDB, importGameToIndexedDB, resetDBConnection as resetIndexedDBConnection } from '../services/indexedDBService';
import * as GameTemplates from '../templates';
import { useAppInitialization } from '../hooks/useAppInitialization';
import { useGameNotifications, NotificationState } from '../hooks/useGameNotifications';
import { useGameData } from '../hooks/useGameData';
import { useGameplayModals } from '../hooks/useGameplayModals';
import type { GameEntity, GameEntityType } from '../hooks/types';
// FIX: Removed incorrect `generateDefeatConsequence` import. It's handled correctly in the usePostCombatActions hook.
import { getApiSettings as getGeminiApiSettings, countTokens, generateCraftedItemViaAI, summarizeTurnHistory, generateWorldTickUpdate } from '../services/geminiService'; 
import { uploadImageToCloudinary } from '../services/cloudinaryService';
import { isValidImageUrl } from '../utils/imageValidationUtils';
// FIX: Add missing utility function imports.
import { performTagProcessing, handleLevelUps, calculateEffectiveStats, addTurnHistoryEntryRaw, updateGameEventsStatus } from '../utils/gameLogicUtils';

// Import action hooks
import { useMainGameLoopActions } from '../hooks/actions/useMainGameLoopActions';
import { useSetupActions } from '../hooks/actions/useSetupActions';
import { useAuctionActions } from '../hooks/actions/useAuctionActions';
import { useCultivationActions } from '../hooks/actions/useCultivationActions';
import { useCharacterActions } from '../hooks/actions/useCharacterActions';
import { usePostCombatActions } from '../hooks/actions/usePostCombatActions';
import { useLivingWorldActions } from '../hooks/actions/useLivingWorldActions';
import { useCopilotActions } from '../hooks/actions/useCopilotActions';


// Define the shape of the context value
export interface GameContextType {
    // State
    currentScreen: GameScreen;
    knowledgeBase: KnowledgeBase;
    gameMessages: GameMessage[];
    aiCopilotMessages: GameMessage[];
    sentCopilotPromptsLog: string[]; // NEW
    styleSettings: StyleSettings;
    storageSettings: StorageSettings;
    isInitialLoading: boolean;
    storageInitError: string | null;
    notification: NotificationState | null;
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
    retrievedRagContextLog: string[]; // NEW
    // New log states
    sentCombatSummaryPromptsLog: string[];
    receivedCombatSummaryResponsesLog: string[];
    sentVictoryConsequencePromptsLog: string[];
    receivedVictoryConsequenceResponsesLog: string[];
    // Living World Debug States (Phase 4)
    sentLivingWorldPromptsLog: string[];
    rawLivingWorldResponsesLog: string[];
    lastScoredNpcsForTick: { npc: NPC, score: number }[];
    currentPageDisplay: number;
    totalPages: number;
    messageIdBeingEdited: string | null;

    // New Context Strings for Prompts
    currentPageMessagesLog: string;
    previousPageSummaries: string[];
    lastNarrationFromPreviousPage?: string;

    // Modal State
    selectedEntity: { type: GameEntityType; entity: GameEntity } | null;
    isStyleSettingsModalOpen: boolean;
    isAiContextModalOpen: boolean; // NEW
    activeEconomyModal: {type: 'marketplace' | 'shopping_center', locationId: string} | null;
    activeSlaveMarketModal: {locationId: string} | null;

    // Actions (will be populated by allActions)
    [key: string]: any; // Index signature to allow dynamic action properties
}

export const GameContext = createContext<GameContextType | null>(null);

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

    const lastPageNumberForPrompt = (gameData.knowledgeBase.currentPageHistory?.length || 1) - 1;
    let lastNarrationFromPreviousPage: string | undefined = undefined;
    if (lastPageNumberForPrompt > 0 && gameData.currentPageDisplay > lastPageNumberForPrompt) { 
        const messagesOfLastSummarizedPagePrompt = gameData.getMessagesForPage(lastPageNumberForPrompt);
        // FIX: Added type guard to ensure content is a string before assigning to a string variable.
        const lastNarrationMessage = [...messagesOfLastSummarizedPagePrompt].reverse().find(msg => msg.type === 'narration' && typeof msg.content === 'string');
        if (lastNarrationMessage && typeof lastNarrationMessage.content === 'string') {
            lastNarrationFromPreviousPage = lastNarrationMessage.content;
        }
    }

    const messagesForCurrentPagePrompt = gameData.getMessagesForPage(gameData.currentPageDisplay);
    const currentPageMessagesLog = messagesForCurrentPagePrompt
        .map(msg => {
            // FIX: Handle different message content types to prevent type errors.
            // Specifically, ensure CombatLogContent is handled correctly by extracting its string message.
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
                // Other types are intentionally ignored for the prompt log
                default:
                    return null;
            }
            return null; // Return null if content type is unexpected for a given message type
        })
        .filter(Boolean)
        .join("\n---\n");

    const previousPageSummariesContent: string[] = (gameData.knowledgeBase.currentPageHistory?.slice(0, -1) || [])
        .map((_, index) => gameData.knowledgeBase.pageSummaries?.[index + 1])
        .filter((summary): summary is string => !!summary);

    const executeSaveGame = useCallback(async (kbToSave: KnowledgeBase, messagesToSave: GameMessage[], saveName: string, existingId: string | null, isAuto: boolean): Promise<string | null> => {
        if (isAuto) setIsAutoSaving(true); else setIsSavingGame(true);
        try {
            const idForLocal = typeof existingId === 'string' ? parseInt(existingId, 10) : existingId;
            const newSaveId = await saveGameToIndexedDB(kbToSave, messagesToSave, saveName, isNaN(idForLocal as number) ? existingId : idForLocal);
            if (!isAuto) showNotification(VIETNAMESE.gameSavedSuccess + ` ("${saveName}")`, 'success');
            return newSaveId;
        } catch (e) {
            const errorMsg = VIETNAMESE.errorSavingGame + (e instanceof Error ? `: ${e.message}` : '');
            if (!isAuto) showNotification(errorMsg, 'error'); else console.error(VIETNAMESE.autoSaveError(saveName), errorMsg);
            return null;
        } finally {
            if (isAuto) setIsAutoSaving(false); else setIsSavingGame(false);
        }
    }, [showNotification]);

    const logNpcAvatarPromptCallback = useCallback((prompt: string) => {
        setSentNpcAvatarPromptsLog(prev => [prompt, ...prev].slice(0, 10));
    }, []);
    
    const handleProcessDebugTags = useCallback(async (narration: string, tags: string) => {
        setIsLoadingApi(true);
        try {
            const tagArray = tags.split('\n').map(t => t.trim()).filter(t => t);
            if (tagArray.length === 0 && !narration.trim()) {
                showNotification("Vui lòng nhập tag hoặc lời kể để xử lý.", 'warning');
                setIsLoadingApi(false);
                return;
            }
            const turnForMessages = gameData.knowledgeBase.playerStats.turn;
    
            const { newKb: kbAfterTags, systemMessagesFromTags } = await performTagProcessing(
                gameData.knowledgeBase, tagArray, turnForMessages,
                gameData.setKnowledgeBase, logNpcAvatarPromptCallback
            );
    
            let finalKb = handleLevelUps(kbAfterTags).updatedKb;
            finalKb.playerStats = calculateEffectiveStats(finalKb.playerStats, finalKb.equippedItems, finalKb.inventory);
    
            if (finalKb.playerStats.sinhLuc <= 0) {
                // This is a tricky part due to initialization order. We will call it directly from `allActions` later.
                // For now, this logic is deferred to the context value creation.
                // await allActions.handleNonCombatDefeat(finalKb, narration || 'Bạn đã bị gục ngã do một sự kiện không rõ.');
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
    }, [gameData, setIsLoadingApi, showNotification, logNpcAvatarPromptCallback]);
    
    const [isSummarizingNextPageTransition, setIsSummarizingNextPageTransition] = useState<boolean>(false);

    // *** COMPOSITION ROOT ***
    // 1. Create a base props object that ALL action hooks will need.
    const baseActionProps = {
        ...gameData,
        onQuit,
        showNotification,
        setCurrentScreen,
        isAutoPlaying,
        setIsAutoPlaying,
        executeSaveGame,
        isLoadingApi,
        setIsLoadingApi,
        logNpcAvatarPromptCallback,
        setApiErrorWithTimeout,
        resetApiError,
        isCultivating,
        setIsCultivating,
        currentPageMessagesLog,
        previousPageSummaries: previousPageSummariesContent,
        lastNarrationFromPreviousPage,
        handleProcessDebugTags,
        isSummarizingNextPageTransition,
        setIsSummarizingNextPageTransition,
    };
    
    // 2. Instantiate hooks that are dependencies for other hooks.
    const livingWorldActions = useLivingWorldActions(baseActionProps as any);
    const postCombatActions = usePostCombatActions(baseActionProps as any);
    
    // 3. Instantiate the main game loop, injecting its dependencies.
    const mainGameLoopActions = useMainGameLoopActions({
        ...baseActionProps,
        executeWorldTick: livingWorldActions.executeWorldTick,
        handleNonCombatDefeat: postCombatActions.handleNonCombatDefeat,
    } as any);

    // 4. Instantiate the remaining independent action hooks.
    const setupActions = useSetupActions(baseActionProps as any);
    const auctionActions = useAuctionActions(baseActionProps as any);
    const cultivationActions = useCultivationActions(baseActionProps as any);
    const characterActions = useCharacterActions(baseActionProps as any);
    const copilotActions = useCopilotActions(baseActionProps as any);

    // 5. Combine all actions into a single object for the context value.
    const allActions: Omit<GameContextType, keyof typeof gameData | 'currentScreen' | 'styleSettings' | 'storageSettings' | 'isInitialLoading' | 'storageInitError' | 'notification' | 'apiError' | 'isLoadingApi' | 'isSummarizingNextPageTransition' | 'isAutoPlaying' | 'isSavingGame' | 'isAutoSaving' | 'isSummarizingOnLoad' | 'isCraftingItem' | 'isUploadingAvatar' | 'isCultivating' | 'sentNpcAvatarPromptsLog' | 'currentPageMessagesLog' | 'previousPageSummaries' | 'lastNarrationFromPreviousPage' | 'selectedEntity' | 'isStyleSettingsModalOpen' | 'isAiContextModalOpen' | 'activeEconomyModal' | 'activeSlaveMarketModal' | 'isCurrentlyActivePage' | 'gameplayScrollPosition' | 'justLoadedGame' | 'setKnowledgeBase' | 'setGameMessages' | 'setCurrentScreen' | 'setStyleSettings' | 'openEntityModal' | 'closeModal' | 'closeEconomyModal' | 'setIsStyleSettingsModalOpen' | 'setIsAiContextModalOpen' | 'setActiveEconomyModal' | 'setActiveSlaveMarketModal' | 'closeSlaveMarketModal' | 'onSettingsSaved'> = {
        ...mainGameLoopActions,
        ...setupActions,
        ...auctionActions,
        ...cultivationActions,
        ...characterActions,
        ...postCombatActions,
        ...livingWorldActions,
        ...copilotActions,
    };

    useEffect(() => {
        let autoPlayTimeoutId: number | undefined;
        if (isAutoPlaying && !isLoadingApi && !isSummarizingNextPageTransition && !isSummarizingOnLoad && currentScreen === GameScreen.Gameplay && gameData.currentPageDisplay === gameData.totalPages) {
            const latestMessageWithChoices = [...gameData.gameMessages].reverse().find((msg) => msg.type === 'narration' && msg.choices && msg.choices.length > 0);
            let actionToTake: string | null = null;
            let actionType: PlayerActionInputType = 'action';
            if (latestMessageWithChoices && latestMessageWithChoices.choices && latestMessageWithChoices.choices.length > 0) {
                actionToTake = latestMessageWithChoices.choices[0].text;
                actionType = 'action';
            } else {
                actionToTake = VIETNAMESE.autoPlayContinueAction || "Tiếp tục diễn biến.";
                actionType = 'story';
            }
            if (actionToTake) {
                autoPlayTimeoutId = window.setTimeout(async () => {
                    if (isAutoPlaying && !isLoadingApi && !isSummarizingNextPageTransition && !isSummarizingOnLoad && currentScreen === GameScreen.Gameplay && gameData.currentPageDisplay === gameData.totalPages) {
                        await allActions.handlePlayerAction(actionToTake!, true, actionType, 'default', false);
                    }
                }, 1000);
            }
        }
        return () => { if (autoPlayTimeoutId) clearTimeout(autoPlayTimeoutId); };
    }, [isAutoPlaying, isLoadingApi, gameData.gameMessages, currentScreen, allActions, isSummarizingOnLoad, gameData.currentPageDisplay, gameData.totalPages, isSummarizingNextPageTransition]);
    
    const onSaveGame = async () => {
        setIsSavingGame(true);
        const saveName = gameData.knowledgeBase.manualSaveName || gameData.knowledgeBase.worldConfig?.saveGameName || "Cuộc Phiêu Lưu Mặc Định";
        if (!saveName.trim()) {
            showNotification(VIETNAMESE.manualSaveErrorNoName, 'error');
            setIsSavingGame(false);
            return;
        }
        const newSaveId = await executeSaveGame(gameData.knowledgeBase, gameData.gameMessages, saveName, gameData.knowledgeBase.manualSaveId, false);
        if(newSaveId) {
            gameData.setKnowledgeBase(prev => ({...prev, manualSaveId: newSaveId, manualSaveName: saveName}));
        }
        setIsSavingGame(false);
    };

    const onLoadGame = async (saveId: string) => {
        setIsSavingGame(true);
        if (apiErrorTimer.current) clearTimeout(apiErrorTimer.current); setApiError(null);
        setIsSummarizingOnLoad(false);
        try {
            justLoadedGame.current = true;
            const gameDataToLoad = await loadSpecificGameFromIndexedDB(saveId);
            if (gameDataToLoad) {
                let loadedKb = gameDataToLoad.knowledgeBase;
                if (loadedKb.turnHistory && Array.isArray(loadedKb.turnHistory)) {
                    let lastKeyframeKbSnapshot: KnowledgeBase | null = null;
                    let lastKeyframeMessagesSnapshot: GameMessage[] | null = null;
                    const reconstructedTurnHistory: TurnHistoryEntry[] = [];
                    for (const entry of loadedKb.turnHistory) {
                        if (entry.type === 'keyframe') {
                            lastKeyframeKbSnapshot = JSON.parse(JSON.stringify(entry.knowledgeBaseSnapshot));
                            lastKeyframeMessagesSnapshot = JSON.parse(JSON.stringify(entry.gameMessagesSnapshot));
                            reconstructedTurnHistory.push(entry);
                        } else if (entry.type === 'delta') {
                            if (!lastKeyframeKbSnapshot || !lastKeyframeMessagesSnapshot || !entry.knowledgeBaseDelta || !entry.gameMessagesDelta) { continue; }
                            let newKbSnapshotForDelta = lastKeyframeKbSnapshot;
                            if (entry.knowledgeBaseDelta.length > 0) newKbSnapshotForDelta = jsonpatch.applyPatch(JSON.parse(JSON.stringify(lastKeyframeKbSnapshot)), entry.knowledgeBaseDelta as readonly jsonpatch.Operation[]).newDocument as KnowledgeBase;
                            let newMessagesSnapshotForDelta = lastKeyframeMessagesSnapshot;
                            if (entry.gameMessagesDelta.length > 0) newMessagesSnapshotForDelta = jsonpatch.applyPatch(JSON.parse(JSON.stringify(lastKeyframeMessagesSnapshot)), entry.gameMessagesDelta as readonly jsonpatch.Operation[]).newDocument as GameMessage[];
                            reconstructedTurnHistory.push({ ...entry, knowledgeBaseSnapshot: newKbSnapshotForDelta, gameMessagesSnapshot: newMessagesSnapshotForDelta });
                            lastKeyframeKbSnapshot = newKbSnapshotForDelta;
                            lastKeyframeMessagesSnapshot = newMessagesSnapshotForDelta;
                        } else {
                            reconstructedTurnHistory.push(entry);
                        }
                    }
                    loadedKb.turnHistory = reconstructedTurnHistory;
                }
                gameData.setGameMessages(gameDataToLoad.gameMessages);
                loadedKb.manualSaveName = gameDataToLoad.name || loadedKb.manualSaveName || loadedKb.worldConfig?.saveGameName || "Không Tên";
                // FIX: Convert potential number 'id' from save data to string for 'manualSaveId'
                loadedKb.manualSaveId = loadedKb.manualSaveId ?? gameDataToLoad.id?.toString() ?? null;
                gameData.setKnowledgeBase(loadedKb);
                const loadedTotalPages = Math.max(1, loadedKb.currentPageHistory?.length || 1);
                gameData.setCurrentPageDisplay(loadedTotalPages); 
                setCurrentScreen(GameScreen.Gameplay);
                showNotification(VIETNAMESE.gameLoadedSuccess, 'success');
            } else { throw new Error("Không tìm thấy dữ liệu game."); }
        } catch (e) {
            const errorMsg = VIETNAMESE.errorLoadingGame + (e instanceof Error ? `: ${e.message}` : '');
            if (apiErrorTimer.current) clearTimeout(apiErrorTimer.current); setApiError(errorMsg);
            setCurrentScreen(GameScreen.LoadGameSelection);
        } finally {
            setIsSavingGame(false);
            setIsSummarizingOnLoad(false);
        }
    };

    const handleUpdateEquipment = useCallback((slotId: EquipmentSlotId, itemIdToEquip: string | null, previousItemIdInSlot: string | null) => {
        gameData.setKnowledgeBase(prevKb => {
            const newKb = JSON.parse(JSON.stringify(prevKb)) as KnowledgeBase;
            if (newKb.equippedItems[slotId] === itemIdToEquip) return prevKb; 
            newKb.equippedItems[slotId] = itemIdToEquip;
            newKb.playerStats = calculateEffectiveStats(newKb.playerStats, newKb.equippedItems, newKb.inventory);
            const slotConfig = EQUIPMENT_SLOTS_CONFIG.find(s => s.id === slotId);
            const slotName = slotConfig ? (VIETNAMESE[slotConfig.labelKey] as string) : slotId;
            if (itemIdToEquip) {
                const equippedItem = newKb.inventory.find((i: ItemType) => i.id === itemIdToEquip);
                if (equippedItem) showNotification(VIETNAMESE.itemEquipped(equippedItem.name, slotName), 'success');
            } else if (previousItemIdInSlot) {
                const unequippedItem = newKb.inventory.find((i: ItemType) => i.id === previousItemIdInSlot);
                if (unequippedItem) showNotification(VIETNAMESE.itemUnequipped(unequippedItem.name, slotName), 'info');
            }
            return newKb;
        });
    }, [gameData.setKnowledgeBase, showNotification]);

    const handleCraftItem = useCallback(async (desiredCategory: GameTemplates.ItemCategoryValues, requirements: string, materialIds: string[]) => {
        setIsCraftingItem(true);
        setIsLoadingApi(true); 
        if (apiErrorTimer.current) clearTimeout(apiErrorTimer.current); setApiError(null);
        const materialsUsed = gameData.knowledgeBase.inventory.filter(item => materialIds.includes(item.id));
        if (materialsUsed.length !== materialIds.length) {
            showNotification("Lỗi: Một số nguyên liệu không tìm thấy trong túi đồ.", "error");
            setIsCraftingItem(false);
            setIsLoadingApi(false); 
            return;
        }
        try {
            const { response, rawText } = await generateCraftedItemViaAI(
                desiredCategory, requirements, materialsUsed, gameData.knowledgeBase.playerStats,
                gameData.knowledgeBase.worldConfig, currentPageMessagesLog, previousPageSummariesContent,
                lastNarrationFromPreviousPage, (prompt) => gameData.setSentCraftingPromptsLog(prev => [prompt, ...prev].slice(0, 10))
            );
            gameData.setReceivedCraftingResponsesLog(prev => [rawText, ...prev].slice(0, 10));
            let workingKb = JSON.parse(JSON.stringify(gameData.knowledgeBase));
            const turnNumber = workingKb.playerStats.turn;
            materialIds.forEach(id => {
                const itemIndex = workingKb.inventory.findIndex((i: ItemType) => i.id === id);
                if (itemIndex > -1) {
                    workingKb.inventory[itemIndex].quantity -= 1;
                    if (workingKb.inventory[itemIndex].quantity <= 0) workingKb.inventory.splice(itemIndex, 1);
                }
            });
            const { newKb: kbAfterCraft, systemMessagesFromTags } = await performTagProcessing(
                workingKb, response.tags, turnNumber, gameData.setKnowledgeBase, (prompt) => setSentNpcAvatarPromptsLog(prev => [prompt, ...prev].slice(0, 10))
            );
            workingKb = kbAfterCraft;
            const newMessages: GameMessage[] = [...systemMessagesFromTags];
            if (response.narration) newMessages.push({ id: 'crafting-narration-' + Date.now(), type: 'system', content: response.narration, timestamp: Date.now(), turnNumber: turnNumber });
            gameData.addMessageAndUpdateState(newMessages, workingKb);
            const newItemName = response.tags.find(t => t.includes('ITEM_ACQUIRED'))?.match(/name="([^"]+)"/)?.[1];
            if (newItemName) showNotification(VIETNAMESE.craftingSuccess(newItemName), 'success');
            else showNotification("Luyện chế hoàn tất!", 'info');
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            if (apiErrorTimer.current) clearTimeout(apiErrorTimer.current); setApiError(errorMsg);
            showNotification(VIETNAMESE.errorCraftingItem + `: ${errorMsg}`, 'error');
        } finally {
            setIsCraftingItem(false);
            setIsLoadingApi(false);
        }
    }, [gameData, showNotification, setSentNpcAvatarPromptsLog, currentPageMessagesLog, previousPageSummariesContent, lastNarrationFromPreviousPage]);
    
    const handleBuyItem = useCallback((itemId: string, vendorId: string, quantity: number = 1) => {
        gameData.setKnowledgeBase(prevKb => {
            const newKb = JSON.parse(JSON.stringify(prevKb)) as KnowledgeBase;
            const vendor = newKb.discoveredNPCs.find((n: NPC) => n.id === vendorId);
            if (!vendor || !vendor.shopInventory) return prevKb;
            const itemIndexInShop = vendor.shopInventory.findIndex(i => i.id === itemId);
            if (itemIndexInShop === -1) return prevKb;
            const itemInShop = vendor.shopInventory[itemIndexInShop];
            const totalPrice = (itemInShop.value || 0) * quantity;
            if (newKb.playerStats.currency < totalPrice) {
                showNotification(VIETNAMESE.notEnoughMoney, 'error');
                return prevKb;
            }
            if (itemInShop.quantity < quantity) {
                showNotification(`Cửa hàng không đủ số lượng "${itemInShop.name}".`, 'warning');
                return prevKb;
            }
            newKb.playerStats.currency -= totalPrice;
            const existingPlayerItemIndex = newKb.inventory.findIndex(i => i.name === itemInShop.name && i.stackable !== false);
            if (existingPlayerItemIndex > -1) newKb.inventory[existingPlayerItemIndex].quantity += quantity;
            else newKb.inventory.push({ ...itemInShop, id: `item-${itemInShop.name.replace(/\s+/g, '-')}-${Date.now()}`, quantity: quantity });
            itemInShop.quantity -= quantity;
            if (itemInShop.quantity <= 0) vendor.shopInventory.splice(itemIndexInShop, 1);
            showNotification(VIETNAMESE.itemBought(itemInShop.name, totalPrice, newKb.worldConfig?.currencyName || "Tiền"), 'success');
            return newKb;
        });
    }, [gameData.setKnowledgeBase, showNotification]);

    const handleSellItem = useCallback((itemId: string, vendorId: string, sellPrice: number, quantity: number = 1) => {
        gameData.setKnowledgeBase(prevKb => {
            const newKb = JSON.parse(JSON.stringify(prevKb)) as KnowledgeBase;
            const itemIndexInInventory = newKb.inventory.findIndex(i => i.id === itemId);
            if (itemIndexInInventory === -1) return prevKb;
            const itemToSell = newKb.inventory[itemIndexInInventory];
            if (itemToSell.quantity < quantity) {
                showNotification(`Bạn không có đủ số lượng "${itemToSell.name}" để bán.`, 'warning');
                return prevKb;
            }
            const vendor = newKb.discoveredNPCs.find(n => n.id === vendorId);
            if (!vendor) return prevKb;
            const totalPrice = sellPrice * quantity;
            newKb.playerStats.currency += totalPrice;
            itemToSell.quantity -= quantity;
            if (itemToSell.quantity <= 0) newKb.inventory.splice(itemIndexInInventory, 1);
            if (!vendor.shopInventory) vendor.shopInventory = [];
            const existingVendorItemIndex = vendor.shopInventory.findIndex(i => i.name === itemToSell.name);
            if (existingVendorItemIndex > -1) vendor.shopInventory[existingVendorItemIndex].quantity += quantity;
            else vendor.shopInventory.push({ ...itemToSell, id: `item-${itemToSell.name.replace(/\s+/g, '-')}-${Date.now()}`, quantity: quantity });
            showNotification(VIETNAMESE.itemSold(itemToSell.name, totalPrice, newKb.worldConfig?.currencyName || "Tiền"), 'success');
            return newKb;
        });
    }, [gameData.setKnowledgeBase, showNotification]);

    const onRollbackTurn = useCallback(() => {
        if ((!isLoadingApi && isAutoPlaying) || !gameData.knowledgeBase.turnHistory || gameData.knowledgeBase.turnHistory.length <= 1) {
            setIsAutoPlaying(false);
            if (gameData.knowledgeBase.turnHistory && gameData.knowledgeBase.turnHistory.length <= 1) showNotification(VIETNAMESE.cannotRollbackFurther, 'warning');
            else showNotification(VIETNAMESE.actionStopErrorNoHistory, 'error');
            return;
        }
        if (isLoadingApi) showNotification(VIETNAMESE.actionStoppedAndRolledBack, 'info');
        else showNotification(VIETNAMESE.rollbackSuccess, 'success');
        setIsLoadingApi(false);
        if (apiErrorTimer.current) clearTimeout(apiErrorTimer.current);
        setApiError(null);
        const historyCopy = [...(gameData.knowledgeBase.turnHistory || [])];
        const stateToRestore = historyCopy.pop();
        if (stateToRestore && stateToRestore.knowledgeBaseSnapshot) {
            const restoredKbSnapshot = { ...stateToRestore.knowledgeBaseSnapshot, turnHistory: historyCopy };
            const { updatedKb: fullySyncedKb } = updateGameEventsStatus(restoredKbSnapshot);
            gameData.setKnowledgeBase(fullySyncedKb);
            gameData.setGameMessages([...stateToRestore.gameMessagesSnapshot]);
            const restoredTotalPages = Math.max(1, stateToRestore.knowledgeBaseSnapshot.currentPageHistory?.length || 1);
            gameData.setCurrentPageDisplay(restoredTotalPages);
        } else {
            console.error("Rollback failed: Could not retrieve a valid state to restore from history.");
            onQuit();
        }
    }, [isLoadingApi, isAutoPlaying, gameData.knowledgeBase.turnHistory, showNotification, setIsLoadingApi, gameData.setKnowledgeBase, gameData.setGameMessages, gameData.setCurrentPageDisplay, onQuit]);

    const fetchSaveGamesForImportExport = async (): Promise<SaveGameMeta[]> => loadGamesFromIndexedDB();
    const loadSpecificGameDataForExport = async (saveId: string): Promise<SaveGameData | null> => loadSpecificGameFromIndexedDB(saveId);
    const handleImportGameData = async (gameDataToImport: Omit<SaveGameData, 'id' | 'timestamp'> & { name: string; }) => {
        try {
            await importGameToIndexedDB(gameDataToImport);
            showNotification(VIETNAMESE.dataImportedSuccess, 'success');
        } catch (e) { throw e; }
    };
    const onSettingsSaved = (newSettings: StorageSettings) => {
        setStorageSettings(newSettings);
        resetIndexedDBConnection();
        showNotification(VIETNAMESE.storageSettingsSavedMessage, 'success');
    };
    
    const updateLocationCoordinates = useCallback((locationId: string, x: number, y: number) => {
        gameData.setKnowledgeBase(prevKb => {
            const newKb = JSON.parse(JSON.stringify(prevKb));
            const locIndex = newKb.discoveredLocations.findIndex((l: GameLocation) => l.id === locationId);
            if (locIndex > -1) {
                newKb.discoveredLocations[locIndex].mapX = Math.round(x);
                newKb.discoveredLocations[locIndex].mapY = Math.round(y);
                showNotification(`Đã cập nhật tọa độ của ${newKb.discoveredLocations[locIndex].name}.`, 'success');
            }
            return newKb;
        });
    }, [gameData.setKnowledgeBase, showNotification]);

    const contextValue: GameContextType = {
        // State
        currentScreen, ...gameData, styleSettings, storageSettings, isInitialLoading, storageInitError, notification,
        apiError, isLoadingApi, isSummarizingNextPageTransition, isAutoPlaying,
        isSavingGame, isAutoSaving, isSummarizingOnLoad, isCraftingItem, isUploadingAvatar, isCultivating,
        sentNpcAvatarPromptsLog, currentPageMessagesLog, previousPageSummaries: previousPageSummariesContent,
        lastNarrationFromPreviousPage, selectedEntity, isStyleSettingsModalOpen, isAiContextModalOpen,
        activeEconomyModal, activeSlaveMarketModal, isCurrentlyActivePage: gameData.currentPageDisplay === gameData.totalPages,
        gameplayScrollPosition, justLoadedGame,

        // Setters & Actions
        ...allActions,
        setCurrentScreen, 
        setStyleSettings, 
        onQuit, 
        onSaveGame, 
        onLoadGame, 
        handleUpdateEquipment,
        handleCraftItem, 
        handleBuyItem, 
        handleSellItem,
        onGoToNextPage: () => gameData.setCurrentPageDisplay(prev => Math.min(prev + 1, gameData.totalPages)),
        onGoToPrevPage: () => gameData.setCurrentPageDisplay(prev => Math.max(prev - 1, 1)),
        onJumpToPage: (page: number) => gameData.setCurrentPageDisplay(Math.max(1, Math.min(page, gameData.totalPages))),
        getMessagesForPage: gameData.getMessagesForPage, 
        onRollbackTurn,
        onToggleAutoPlay: () => setIsAutoPlaying(prev => !prev),
        onStartEditMessage: (id) => gameData.setMessageIdBeingEdited(id),
        onSaveEditedMessage: (id, content) => {
            gameData.setGameMessages(prev => prev.map(msg => msg.id === id ? { ...msg, content: content, timestamp: Date.now() } : msg));
            gameData.setMessageIdBeingEdited(null);
            showNotification(VIETNAMESE.messageEditedSuccess, 'success');
        },
        onCancelEditMessage: () => gameData.setMessageIdBeingEdited(null),
        onUpdatePlayerAvatar: allActions.onUpdatePlayerAvatar, 
        onUpdateNpcAvatar: allActions.onUpdateNpcAvatar,
        fetchSaveGamesForImportExport, 
        loadSpecificGameDataForExport, 
        handleImportGameData,
        showNotification, 
        onSettingsSaved,
        handleProcessDebugTags,
        updateLocationCoordinates,

        // Modal Actions
        openEntityModal, closeModal, closeEconomyModal, closeSlaveMarketModal,
        setIsStyleSettingsModalOpen, setIsAiContextModalOpen, setActiveEconomyModal, setActiveSlaveMarketModal,
    };

    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
};