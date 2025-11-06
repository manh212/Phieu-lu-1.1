import React, { createContext, ReactNode, useRef, useState, useCallback, useEffect, useMemo } from 'react';
import * as jsonpatch from 'fast-json-patch';
import { GameScreen, KnowledgeBase, GameMessage, WorldSettings, PlayerStats, ApiConfig, SaveGameData, StorageType, SaveGameMeta, RealmBaseStatDefinition, TurnHistoryEntry, StyleSettings, PlayerActionInputType, EquipmentSlotId, Item as ItemType, NPC, GameLocation, ResponseLength, StorageSettings, FindLocationParams, Skill, Prisoner, Wife, Slave, CombatEndPayload, AuctionSlave, CombatDispositionMap, NpcAction, CombatLogContent, YeuThu, Companion, Faction, WorldLoreEntry, VectorMetadata, Quest, AIPresetCollection, AIPreset, PromptBlock } from '@/types/index';
import { INITIAL_KNOWLEDGE_BASE, VIETNAMESE, APP_VERSION, MAX_AUTO_SAVE_SLOTS, TURNS_PER_PAGE, DEFAULT_TIERED_STATS, KEYFRAME_INTERVAL, EQUIPMENT_SLOTS_CONFIG, DEFAULT_WORLD_SETTINGS, DEFAULT_PLAYER_STATS } from '@/constants/index';
import { saveGameToIndexedDB, loadGamesFromIndexedDB, loadSpecificGameFromIndexedDB, deleteGameFromIndexedDB, importGameToIndexedDB, resetDBConnection as resetIndexedDBConnection } from '../services/indexedDBService';
import { getAIPresets, saveAIPresets } from '../services/presetService';
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
    getApiSettings as getGeminiApiSettings,
    generateEmbeddings, // NEW: Import embedding service
    connectToCopilotLiveSession
} from '../services';
import { uploadImageToCloudinary } from '../services/cloudinaryService';
import { isValidImageUrl } from '../utils/imageValidationUtils';
import { performTagProcessing, handleLevelUps, calculateEffectiveStats, addTurnHistoryEntryRaw, updateGameEventsStatus, handleLocationEntryEvents, calculateRealmBaseStats, createPcmBlob, decodeAudioData, decode } from '../utils/gameLogicUtils';
// NEW: Import RAG formatters
import { formatItemForEmbedding, formatSkillForEmbedding, formatQuestForEmbedding, formatPersonForEmbedding, formatLocationForEmbedding, formatLoreForEmbedding, formatFactionForEmbedding, formatYeuThuForEmbedding } from '../utils/ragUtils';
import type { LiveServerMessage, LiveSession } from "@google/genai";


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
    aiArchitectMessages: GameMessage[]; // NEW
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
    aiThinkingLog: string[]; // NEW
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
    aiPresets: AIPresetCollection; // NEW
    isStrictMode: boolean; // NEW: The synchronized strict mode state

    currentPageMessagesLog: string;
    previousPageSummaries: string[];
    lastNarrationFromPreviousPage?: string;

    // Modal State
    selectedEntity: { type: GameEntityType; entity: GameEntity, isEditing?: boolean } | null;
    isStyleSettingsModalOpen: boolean;
    isAiContextModalOpen: boolean;
    activeEconomyModal: {type: 'marketplace' | 'shopping_center', locationId: string} | null;
    activeSlaveMarketModal: {locationId: string} | null;
    
    // NEW Copilot State & Actions
    copilotSessionState: 'disconnected' | 'connecting' | 'connected' | 'error';
    startCopilotSession: () => void;
    endCopilotSession: () => void;

    // NEW Architect (Text Chat) Actions
    handleArchitectQuery: (userQuestion: string, modelOverride: string, isActionModus: boolean, useGoogleSearch: boolean) => Promise<void>;
    applyArchitectChanges: (tags: string[], messageId: string) => void;
    resetArchitectConversation: () => void; // NEW


    // Actions (will be populated by allActions)
    startQuickPlay: () => void;
    handleUpdateEntity: (entityType: GameEntityType, entityData: GameEntity) => Promise<void>; // NOW ASYNC
    handlePinEntity: (entityType: GameEntityType, entityId: string) => void; // NEW
    resetCopilotConversation: () => void;
    saveNewAIPreset: (presetName: string, newPreset: AIPreset) => void; // NEW
    deleteAIPreset: (presetName: string) => void; // NEW
    renameAIPreset: (oldName: string, newName: string) => boolean; // NEW
    importAIPresets: (importedPresets: AIPreset[]) => void; // NEW
    toggleStrictMode: () => void; // NEW: The function to toggle strict mode globally
    [key: string]: any; // Index signature to allow dynamic action properties
}

export const GameContext = createContext<GameContextType | null>(null);

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const gameplayScrollPosition = useRef(0);
    const justLoadedGame = useRef(false);

    // --- NEW REFS FOR AUDIO ---
    const copilotSessionRef = useRef<LiveSession | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextAudioStartTimeRef = useRef<number>(0);
    // --- END NEW REFS ---
    
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
    const [copilotSessionState, setCopilotSessionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected'); // NEW

    const apiErrorTimer = useRef<number | undefined>(undefined);
    const [apiError, setApiError] = useState<string | null>(null);

    // NEW: Load AI Presets on initial app load
    useEffect(() => {
        const loadedPresets = getAIPresets();
        gameData.setAiPresets(loadedPresets);
    }, []); // Empty dependency array ensures this runs only once

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
        showNotification("Cuộc trò chuyện với Đạo Diễn AI đã được làm mới.", "info");
    }, [gameData.setAiCopilotMessages, gameData.setSentCopilotPromptsLog, showNotification]);

    const resetArchitectConversation = useCallback(() => {
        gameData.setAiArchitectMessages([]);
        showNotification("Cuộc trò chuyện với Kiến Trúc Sư AI đã được làm mới.", "info");
    }, [gameData.setAiArchitectMessages, showNotification]);
    
    const endCopilotSession = useCallback(() => {
        if (copilotSessionRef.current) {
            console.log("Closing copilot session...");
            copilotSessionRef.current.close(); // This will trigger the onclose callback
        }
    
        // Cleanup audio resources
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        nextAudioStartTimeRef.current = 0;
    
        // Even if there was no session, ensure the state is disconnected.
        if (copilotSessionState !== 'disconnected') {
            setCopilotSessionState('disconnected');
        }
    }, [copilotSessionState]);

    const startCopilotSession = useCallback(async () => {
        if (copilotSessionState === 'connected' || copilotSessionState === 'connecting') {
            return;
        }

        console.log("Attempting to start copilot session...");
        setCopilotSessionState('connecting');
        showNotification("Đang kết nối cuộc gọi...", 'info');
        
        try {
            const sessionPromise = connectToCopilotLiveSession(
                gameData.knowledgeBase, gameData.gameMessages, gameData.sentPromptsLog,
                {
                    onopen: async () => {
                        console.log("Copilot session opened. Initializing audio stream...");
                        setCopilotSessionState('connected');
                        showNotification("Đã kết nối! Bắt đầu nói chuyện.", 'success');
                        
                        // Initialize audio contexts
                        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                        nextAudioStartTimeRef.current = 0;

                        // Start microphone input
                        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                        const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
                        const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createPcmBlob(inputData);
                            if (copilotSessionRef.current) {
                                copilotSessionRef.current.sendRealtimeInput({ media: pcmBlob });
                            }
                        };
                        
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current.destination);
                        scriptProcessorRef.current = scriptProcessor;
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // --- START: TRANSCRIPT PROCESSING ---
                        gameData.setAiCopilotMessages(prevMessages => {
                            let newMessages = [...prevMessages];
                            let lastMessage = newMessages.length > 0 ? newMessages[newMessages.length - 1] : null;
                        
                            if (message.serverContent?.inputTranscription) {
                                const text = message.serverContent.inputTranscription.text;
                                if (lastMessage && lastMessage.isPlayerInput && !lastMessage.isFinal) {
                                    lastMessage.content = (lastMessage.content as string) + text;
                                } else {
                                    newMessages.push({
                                        id: `copilot-user-${Date.now()}`, type: 'player_action', content: text,
                                        timestamp: Date.now(), turnNumber: gameData.knowledgeBase.playerStats.turn,
                                        isPlayerInput: true, isFinal: false,
                                    });
                                }
                            }
                        
                            if (message.serverContent?.outputTranscription) {
                                const text = message.serverContent.outputTranscription.text;
                                if (lastMessage && !lastMessage.isPlayerInput && !lastMessage.isFinal) {
                                    lastMessage.content = (lastMessage.content as string) + text;
                                } else {
                                    newMessages.push({
                                        id: `copilot-ai-${Date.now()}`, type: 'narration', content: text,
                                        timestamp: Date.now(), turnNumber: gameData.knowledgeBase.playerStats.turn,
                                        isPlayerInput: false, isFinal: false,
                                    });
                                }
                            }
                        
                            if (message.serverContent?.turnComplete) {
                                newMessages = newMessages.map(msg => ({ ...msg, isFinal: true }));
                            }
                        
                            return newMessages;
                        });
                        // --- END: TRANSCRIPT PROCESSING ---

                        // Handle audio output
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            nextAudioStartTimeRef.current = Math.max(nextAudioStartTimeRef.current, outputAudioContextRef.current.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current.destination);
                            
                            source.addEventListener('ended', () => {
                                audioSourcesRef.current.delete(source);
                            });

                            source.start(nextAudioStartTimeRef.current);
                            nextAudioStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }

                        // Handle interruptions
                        if (message.serverContent?.interrupted) {
                            audioSourcesRef.current.forEach(source => source.stop());
                            audioSourcesRef.current.clear();
                            nextAudioStartTimeRef.current = 0;
                        }
                    },
                    onerror: (event: ErrorEvent) => {
                        console.error("Copilot session error:", event);
                        setApiErrorWithTimeout(`Lỗi kết nối giọng nói: ${event.message}`);
                        endCopilotSession(); // Full cleanup on error
                    },
                    onclose: (event: CloseEvent) => {
                        console.log("Copilot session closed.", event);
                        endCopilotSession(); // Full cleanup on close
                    },
                }
            );

            copilotSessionRef.current = await sessionPromise;

        } catch (error) {
            console.error("Failed to initiate copilot connection:", error);
            const errorMsg = `Không thể bắt đầu cuộc gọi: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`;
            setApiErrorWithTimeout(errorMsg);
            endCopilotSession(); // Full cleanup on failure
        }
    }, [copilotSessionState, gameData.knowledgeBase, gameData.gameMessages, gameData.sentPromptsLog, showNotification, setApiErrorWithTimeout, endCopilotSession, gameData.aiCopilotMessages, gameData.setAiCopilotMessages]);

    const handlePinEntity = useCallback((entityType: GameEntityType, entityId: string) => {
        gameData.setKnowledgeBase(prevKb => {
            const newKb = JSON.parse(JSON.stringify(prevKb));
            let listToUpdate: any[] | undefined;

            switch(entityType) {
                case 'npc': listToUpdate = newKb.discoveredNPCs; break;
                case 'item': listToUpdate = newKb.inventory; break;
                case 'skill': listToUpdate = newKb.playerSkills; break;
                case 'quest': listToUpdate = newKb.allQuests; break;
                case 'location': listToUpdate = newKb.discoveredLocations; break;
                case 'lore': listToUpdate = newKb.worldLore; break;
                case 'faction': listToUpdate = newKb.discoveredFactions; break;
                case 'companion': listToUpdate = newKb.companions; break;
                case 'yeuThu': listToUpdate = newKb.discoveredYeuThu; break;
                case 'wife': listToUpdate = newKb.wives; break;
                case 'slave': listToUpdate = newKb.slaves; break;
                case 'prisoner': listToUpdate = newKb.prisoners; break;
            }

            if(listToUpdate) {
                const entity = listToUpdate.find(item => item.id === entityId);
                if (entity) {
                    entity.isPinned = !entity.isPinned;
                    showNotification(`Đã ${entity.isPinned ? 'ghim' : 'bỏ ghim'} '${entity.name || entity.title}'.`, 'info');
                } else {
                    console.warn(`handlePinEntity: Could not find entity with ID ${entityId} in list ${entityType}`);
                }
            } else {
                 console.warn(`handlePinEntity: Could not find list for entity type ${entityType}`);
            }

            return newKb;
        });
    }, [gameData.setKnowledgeBase, showNotification]);

    const handleUpdateEntity = useCallback(async (entityType: GameEntityType, entityData: GameEntity) => {
        // A helper function to get the correct formatted text for the RAG system
        const getFormattedTextForEntity = (kb: KnowledgeBase): string | null => {
            switch(entityType) {
                case 'npc': return formatPersonForEmbedding(entityData as NPC, kb);
                case 'item': return formatItemForEmbedding(entityData as ItemType, kb);
                case 'skill': return formatSkillForEmbedding(entityData as Skill, kb);
                case 'quest': return formatQuestForEmbedding(entityData as Quest, kb);
                case 'location': return formatLocationForEmbedding(entityData as GameLocation, kb);
                case 'lore': return formatLoreForEmbedding(entityData as WorldLoreEntry, kb);
                case 'faction': return formatFactionForEmbedding(entityData as Faction, kb);
                case 'yeuThu': return formatYeuThuForEmbedding(entityData as YeuThu, kb);
                case 'wife': return formatPersonForEmbedding(entityData as Wife, kb);
                case 'slave': return formatPersonForEmbedding(entityData as Slave, kb);
                case 'prisoner': return formatPersonForEmbedding(entityData as Prisoner, kb);
                // Companions are simple and not in RAG for now
                case 'companion': return null; 
                default: return null;
            }
        };

        gameData.setKnowledgeBase(prevKb => {
            const newKb = JSON.parse(JSON.stringify(prevKb));
            let listToUpdate: any[] | undefined;
            switch(entityType) {
                case 'npc': listToUpdate = newKb.discoveredNPCs; break;
                case 'item': listToUpdate = newKb.inventory; break;
                case 'skill': listToUpdate = newKb.playerSkills; break;
                case 'quest': listToUpdate = newKb.allQuests; break;
                case 'location': listToUpdate = newKb.discoveredLocations; break;
                case 'lore': listToUpdate = newKb.worldLore; break;
                case 'faction': listToUpdate = newKb.discoveredFactions; break;
                case 'companion': listToUpdate = newKb.companions; break;
                case 'yeuThu': listToUpdate = newKb.discoveredYeuThu; break;
                case 'wife': listToUpdate = newKb.wives; break;
                case 'slave': listToUpdate = newKb.slaves; break;
                case 'prisoner': listToUpdate = newKb.prisoners; break;
            }

            if(listToUpdate) {
                const index = listToUpdate.findIndex(item => item.id === (entityData as any).id);
                if (index > -1) {
                    const originalEntity = listToUpdate[index];
                    let finalEntityData = entityData; 

                    const isPersonLike = ['npc', 'yeuThu', 'wife', 'slave', 'prisoner'].includes(entityType);
                    if (isPersonLike && originalEntity.realm !== (entityData as NPC | YeuThu).realm) {
                        const updatedEntity = { ...finalEntityData } as NPC | YeuThu | Wife | Slave | Prisoner;
                        
                        let realmProgressionList: string[];
                        if (entityType === 'yeuThu') {
                            realmProgressionList = (newKb.worldConfig?.yeuThuRealmSystem || '').split(' - ').map((s: string) => s.trim());
                        } else {
                            const personRace = (updatedEntity as NPC).race || 'Nhân Tộc';
                            const raceSystem = newKb.worldConfig?.raceCultivationSystems.find((rs: any) => rs.raceName === personRace);
                            realmProgressionList = (raceSystem?.realmSystem || newKb.realmProgressionList.join(' - ')).split(' - ').map((s: string) => s.trim());
                        }

                        const newBaseStats = calculateRealmBaseStats(updatedEntity.realm || '', realmProgressionList, newKb.currentRealmBaseStats);
                        
                        const statsForCalc: PlayerStats = {
                            ...DEFAULT_PLAYER_STATS,
                            ...(updatedEntity.stats || {}),
                            ...newBaseStats,
                            realm: updatedEntity.realm || '',
                        };
                        const equippedItemsForCalc = ('equippedItems' in updatedEntity && updatedEntity.equippedItems) ? updatedEntity.equippedItems : { ...INITIAL_KNOWLEDGE_BASE.equippedItems };
                        const newEffectiveStats = calculateEffectiveStats(statsForCalc, equippedItemsForCalc, newKb.inventory);

                        updatedEntity.stats = {
                           ...newEffectiveStats,
                           sinhLuc: Math.min(statsForCalc.sinhLuc || newEffectiveStats.maxSinhLuc, newEffectiveStats.maxSinhLuc),
                           linhLuc: Math.min(statsForCalc.linhLuc || newEffectiveStats.maxSinhLuc, newEffectiveStats.maxSinhLuc)
                        };
                        
                        finalEntityData = updatedEntity;
                    }

                    listToUpdate[index] = finalEntityData;
                    
                    // --- NEW: RAG UPDATE LOGIC ---
                    const textForEmbedding = getFormattedTextForEntity(newKb);
                    if (textForEmbedding && newKb.ragVectorStore) {
                        (async () => {
                            try {
                                const newVector = await generateEmbeddings([textForEmbedding]);
                                if (newVector && newVector.length > 0) {
                                    const metadata: VectorMetadata = {
                                        entityId: (finalEntityData as any).id,
                                        entityType: entityType as any,
                                        text: textForEmbedding,
                                        turnNumber: newKb.playerStats.turn,
                                    };

                                    // Find and update existing vector, or add a new one
                                    const vectorIndex = newKb.ragVectorStore.metadata.findIndex(m => m.entityId === (finalEntityData as any).id);
                                    if (vectorIndex > -1) {
                                        newKb.ragVectorStore.vectors[vectorIndex] = newVector[0];
                                        newKb.ragVectorStore.metadata[vectorIndex] = metadata;
                                        console.log(`[RAG SYNC] Updated vector for edited entity: ${metadata.entityId}`);
                                    } else {
                                        newKb.ragVectorStore.vectors.push(newVector[0]);
                                        newKb.ragVectorStore.metadata.push(metadata);
                                         console.log(`[RAG SYNC] Added new vector for edited entity: ${metadata.entityId}`);
                                    }
                                }
                            } catch (e) {
                                console.error("Error updating RAG vector on manual edit:", e);
                                // Don't block UI, just log the error
                            }
                        })();
                    }
                    // --- END RAG UPDATE ---
                    
                    showNotification(`Đã cập nhật: ${(finalEntityData as any).name || (finalEntityData as any).title}`, 'success');

                    if (entityType === 'item') {
                        newKb.playerStats = calculateEffectiveStats(newKb.playerStats, newKb.equippedItems, newKb.inventory);
                    }
                } else {
                    showNotification(`Lỗi: Không tìm thấy thực thể để cập nhật.`, 'error');
                }
            }
            return newKb;
        });
        closeModal();
    }, [gameData.setKnowledgeBase, showNotification, closeModal]);

    // --- NEW: AI Preset Management Actions ---
    const saveNewAIPreset = useCallback((presetName: string, newPreset: AIPreset) => {
        gameData.setAiPresets(prevPresets => {
            const newPresets = { ...prevPresets, [presetName]: newPreset };
            saveAIPresets(newPresets);
            return newPresets;
        });
        showNotification(`Đã lưu preset "${presetName}"!`, 'success');
    }, [gameData.setAiPresets, showNotification]);

    const deleteAIPreset = useCallback((presetName: string) => {
        gameData.setAiPresets(prevPresets => {
            const newPresets = { ...prevPresets };
            delete newPresets[presetName];
            saveAIPresets(newPresets);
            return newPresets;
        });
        showNotification(`Đã xóa preset "${presetName}".`, 'info');
    }, [gameData.setAiPresets, showNotification]);

    const renameAIPreset = useCallback((oldName: string, newName: string): boolean => {
        if (!newName.trim() || newName === oldName) return false;
        let success = false;
        gameData.setAiPresets(prevPresets => {
            if (prevPresets[newName]) {
                showNotification(`Tên preset "${newName}" đã tồn tại.`, 'error');
                success = false;
                return prevPresets;
            }
            const newPresets = { ...prevPresets };
            const presetToRename = newPresets[oldName];
            if (presetToRename) {
                delete newPresets[oldName];
                presetToRename.metadata.name = newName;
                newPresets[newName] = presetToRename;
                saveAIPresets(newPresets);
                showNotification(`Đã đổi tên preset thành "${newName}".`, 'success');
                success = true;
                return newPresets;
            }
            success = false;
            return prevPresets;
        });
        return success;
    }, [gameData.setAiPresets, showNotification]);

    const importAIPresets = useCallback((importedPresets: AIPreset[]) => {
        gameData.setAiPresets(prevPresets => {
            const newPresets = { ...prevPresets };
            let importedCount = 0;
            
            importedPresets.forEach(preset => {
                let finalName = preset.metadata.name;
                let counter = 1;
                while (newPresets[finalName]) {
                    finalName = `${preset.metadata.name} (${counter})`;
                    counter++;
                }
                newPresets[finalName] = { ...preset, metadata: { ...preset.metadata, name: finalName } };
                importedCount++;
            });
    
            saveAIPresets(newPresets);
            showNotification(`Đã nhập thành công ${importedCount} preset.`, 'success');
            return newPresets;
        });
    }, [gameData.setAiPresets, showNotification]);
    // --- END: AI Preset Management Actions ---

    const startQuickPlay = useCallback(() => {
        gameData.resetGameData(); 
    
        // Define the quick play entities
        const quickPlaySkill: Skill = {
            id: 'qp-skill-fireball',
            name: 'Hỏa Cầu Thuật',
            description: 'Tạo ra một quả cầu lửa nhỏ tấn công kẻ địch.',
            skillType: GameTemplates.SkillType.LINH_KI,
            detailedEffect: 'Gây 20 sát thương Hỏa.',
            manaCost: 10,
            cooldown: 1,
            currentCooldown: 0,
            baseDamage: 20,
            damageMultiplier: 0,
            healingAmount: 0,
            healingMultiplier: 0,
            linhKiDetails: {
                category: 'Tấn công',
                activation: 'Chủ động',
            }
        };

        const quickPlayItem: ItemType = {
            id: 'qp-item-potion',
            name: 'Hồi Phục Tán',
            description: 'Một loại thuốc bột giúp hồi phục một lượng nhỏ sinh lực.',
            quantity: 5,
            category: GameTemplates.ItemCategory.POTION,
            rarity: GameTemplates.ItemRarity.PHO_THONG,
            value: 10,
            itemRealm: 'Phàm Nhân',
            potionType: GameTemplates.PotionType.HOI_PHUC,
            effects: ['Hồi 50 HP'],
            isConsumedOnUse: true,
            usable: true,
            consumable: true,
        };

        const quickPlayNpc: NPC = {
            id: 'qp-npc-tester',
            name: 'NPC Thử Nghiệm',
            title: 'Người Hướng Dẫn',
            gender: 'Nam',
            race: 'Nhân Tộc',
            description: 'Một người đàn ông thân thiện ở đây để giúp bạn kiểm tra các tính năng.',
            personalityTraits: ['Thân thiện', 'Hay giúp đỡ'],
            affinity: 50,
            realm: 'Phàm Nhân',
            locationId: 'start-loc', // Match the location ID below
            stats: {
                sinhLuc: 100,
                maxSinhLuc: 100,
                sucTanCong: 10,
            },
            mood: 'Bình Thường',
            needs: {},
            longTermGoal: 'Giúp đỡ người mới.',
            shortTermGoal: 'Chào hỏi người chơi.',
            currentPlan: [],
            relationships: {},
            lastTickTurn: 0,
            tickPriorityScore: 0,
            activityLog: [],
        };
        
        // NEW ENTITIES FOR QUICK PLAY
        const quickPlayYeuThu: YeuThu = {
            id: 'qp-yeuthu-wolf',
            name: 'Sói Hoang',
            species: 'Lang Tộc',
            description: 'Một con sói hoang với bộ lông xám tro, ánh mắt đầy cảnh giác.',
            isHostile: true,
            realm: 'Phàm Nhân',
            stats: {
                sinhLuc: 50,
                maxSinhLuc: 50,
                sucTanCong: 15,
            },
            locationId: 'start-loc',
        };

        const quickPlayCompanion: Companion = {
            id: 'qp-comp-dog',
            name: 'Tiểu Hắc',
            description: 'Một chú chó mực trung thành, luôn quấn quýt bên chân bạn.',
            hp: 100,
            maxHp: 100,
            mana: 0,
            maxMana: 0,
            atk: 10,
        };

        const quickPlayFaction: Faction = {
            id: 'qp-faction-village',
            name: 'Làng Tân Thủ',
            description: 'Một ngôi làng nhỏ yên bình, là nơi những người mới bắt đầu cuộc hành trình của mình.',
            alignment: GameTemplates.FactionAlignment.TRUNG_LAP,
            playerReputation: 10,
        };

        const quickPlayLore: WorldLoreEntry = {
            id: 'qp-lore-welcome',
            title: 'Chào Mừng Đến Thế Giới Mẫu',
            content: 'Đây là một thế giới được tạo ra để thử nghiệm các tính năng của game. Mọi thứ ở đây đều có thể thay đổi. Chúc bạn có một trải nghiệm vui vẻ!'
        };

        const quickPlayKb: KnowledgeBase = {
            ...INITIAL_KNOWLEDGE_BASE,
            worldConfig: {
                ...DEFAULT_WORLD_SETTINGS,
                saveGameName: "Chơi Nhanh (Xem Trước)",
                playerName: "Lữ Khách Vô Danh",
                theme: "Thế Giới Mẫu",
            },
            playerStats: {
                ...DEFAULT_PLAYER_STATS,
                turn: 1,
            },
            playerSkills: [quickPlaySkill],
            inventory: [quickPlayItem],
            discoveredNPCs: [quickPlayNpc],
            discoveredYeuThu: [quickPlayYeuThu],
            companions: [quickPlayCompanion],
            discoveredFactions: [quickPlayFaction],
            worldLore: [quickPlayLore],
            discoveredLocations: [{
                id: 'start-loc',
                name: 'Khu Vực Mẫu',
                description: 'Một nơi để bắt đầu.',
                isSafeZone: true,
                visited: true,
            }],
            currentLocationId: 'start-loc',
        };
    
        const startingMessage: GameMessage = {
            id: 'quick-play-start',
            type: 'system',
            content: 'Chào mừng đến với chế độ Chơi Nhanh! Đây là giao diện xem trước. Không có cốt truyện nào được tạo. Hãy thoải mái khám phá các tính năng!',
            timestamp: Date.now(),
            turnNumber: 1,
        };
    
        gameData.setKnowledgeBase(quickPlayKb);
        gameData.setGameMessages([startingMessage]);
        setCurrentScreen(GameScreen.Gameplay);
    }, [gameData, setCurrentScreen]);


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
    
    // NEW: Centralized Strict Mode logic
    const isStrictMode = useMemo(() => {
        const structure = gameData.knowledgeBase.promptStructure || [];
        const strictModeBlock = structure.find(b => b.id === 'strictModeGuidance');
        return strictModeBlock ? strictModeBlock.enabled : false; // default to false if not found
    }, [gameData.knowledgeBase.promptStructure]);

    const toggleStrictMode = useCallback(() => {
        gameData.setKnowledgeBase(prevKb => {
            const newKb = JSON.parse(JSON.stringify(prevKb));
            const structure = newKb.promptStructure || [];
            const strictModeBlockIndex = structure.findIndex((b: PromptBlock) => b.id === 'strictModeGuidance');

            if (strictModeBlockIndex > -1) {
                structure[strictModeBlockIndex].enabled = !structure[strictModeBlockIndex].enabled;
                const enabled = structure[strictModeBlockIndex].enabled;
                showNotification(`Chế độ Nghiêm ngặt đã được ${enabled ? 'BẬT' : 'TẮT'}.`, 'info');
            } else {
                console.warn("toggleStrictMode: 'strictModeGuidance' block not found in promptStructure.");
            }
            
            newKb.promptStructure = structure;
            return newKb;
        });
    }, [gameData.setKnowledgeBase, showNotification]);


    const gameActions = useGameActions({
        ...gameData,
        showNotification,
        setCurrentScreen,
        justLoadedGame,
        setIsSummarizingOnLoad
    });
    
    const postCombatActions = usePostCombatActions({
        ...gameData,
        showNotification,
        setCurrentScreen,
        onQuit,
        isLoadingApi,
        setIsLoadingApi,
        resetApiError,
        setApiErrorWithTimeout,
        logNpcAvatarPromptCallback,
        setRawAiResponsesLog: gameData.setRawAiResponsesLog,
        setSentPromptsLog: gameData.setSentPromptsLog,
        setSentCombatSummaryPromptsLog: gameData.setSentCombatSummaryPromptsLog,
        setReceivedCombatSummaryResponsesLog: gameData.setReceivedCombatSummaryResponsesLog,
        setSentVictoryConsequencePromptsLog: gameData.setSentVictoryConsequencePromptsLog,
        setReceivedVictoryConsequenceResponsesLog: gameData.setReceivedVictoryConsequenceResponsesLog,
        currentPageMessagesLog,
        previousPageSummaries: previousPageSummariesContent,
        lastNarrationFromPreviousPage,
    });
    
    const livingWorldActions = useLivingWorldActions({
        ...gameData,
        showNotification,
        logNpcAvatarPromptCallback,
        setSentLivingWorldPromptsLog: gameData.setSentLivingWorldPromptsLog,
        setRawLivingWorldResponsesLog: gameData.setRawLivingWorldResponsesLog,
        setLastScoredNpcsForTick: gameData.setLastScoredNpcsForTick,
    });
    
    const mainGameLoopActions = useMainGameLoopActions({
        ...gameData,
        showNotification,
        setCurrentPageDisplay: gameData.setCurrentPageDisplay,
        onQuit,
        isLoadingApi,
        setIsLoadingApi,
        resetApiError,
        setApiErrorWithTimeout,
        isAutoPlaying,
        setIsAutoPlaying,
        executeSaveGame: gameActions.onSaveGame as any,
        logNpcAvatarPromptCallback,
        handleNonCombatDefeat: postCombatActions.handleNonCombatDefeat,
        executeWorldTick: livingWorldActions.executeWorldTick,
        currentPageMessagesLog,
        previousPageSummaries: previousPageSummariesContent,
        lastNarrationFromPreviousPage,
        setRawAiResponsesLog: gameData.setRawAiResponsesLog,
        sentPromptsLog: gameData.sentPromptsLog,
        setSentPromptsLog: gameData.setSentPromptsLog,
        setLatestPromptTokenCount: gameData.setLatestPromptTokenCount,
        setSummarizationResponsesLog: gameData.setSummarizationResponsesLog,
        isSummarizingNextPageTransition,
        setIsSummarizingNextPageTransition,
        setRetrievedRagContextLog: gameData.setRetrievedRagContextLog,
        setSentGeneralSubLocationPromptsLog: gameData.setSentGeneralSubLocationPromptsLog,
        setReceivedGeneralSubLocationResponsesLog: gameData.setReceivedGeneralSubLocationResponsesLog,
        setAiThinkingLog: gameData.setAiThinkingLog,
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
        setIsLoadingApi,
        resetApiError,
        setKnowledgeBase: gameData.setKnowledgeBase,
        setCurrentPageDisplay: gameData.setCurrentPageDisplay,
        setCurrentScreen,
        addMessageAndUpdateState: gameData.addMessageAndUpdateState,
        logSentPromptCallback: mainGameLoopActions.logSentPromptCallback,
        setRawAiResponsesLog: gameData.setRawAiResponsesLog,
        setApiErrorWithTimeout,
        logNpcAvatarPromptCallback,
    });
    
    const auctionActions = useAuctionActions({
        ...gameData,
        showNotification,
        setCurrentScreen,
        isLoadingApi,
        setIsLoadingApi,
        resetApiError,
        setApiErrorWithTimeout,
        logNpcAvatarPromptCallback,
        setSentEconomyPromptsLog: gameData.setSentEconomyPromptsLog,
        setReceivedEconomyResponsesLog: gameData.setReceivedEconomyResponsesLog,
    });
    
    const cultivationActions = useCultivationActions({
        ...gameData,
        showNotification,
        setCurrentScreen,
        setIsCultivating,
        resetApiError,
        setApiErrorWithTimeout,
        logNpcAvatarPromptCallback,
        setSentCultivationPromptsLog: gameData.setSentCultivationPromptsLog,
        setReceivedCultivationResponsesLog: gameData.setReceivedCultivationResponsesLog,
        currentPageMessagesLog,
        previousPageSummaries: previousPageSummariesContent,
        lastNarrationFromPreviousPage,
    });

    const characterActions = useCharacterActions({
        ...gameData,
        showNotification,
        setCurrentScreen,
        isLoadingApi,
        setIsLoadingApi,
        resetApiError,
        setApiErrorWithTimeout,
        logNpcAvatarPromptCallback,
        handleProcessDebugTags,
        currentPageMessagesLog,
        previousPageSummaries: previousPageSummariesContent,
        lastNarrationFromPreviousPage,
        prisonerInteractionLog: gameData.prisonerInteractionLog,
        setPrisonerInteractionLog: gameData.setPrisonerInteractionLog,
        sentPrisonerPromptsLog: gameData.sentPrisonerPromptsLog,
        setSentPrisonerPromptsLog: gameData.setSentPrisonerPromptsLog,
        receivedPrisonerResponsesLog: gameData.receivedPrisonerResponsesLog,
        setReceivedPrisonerResponsesLog: gameData.setReceivedPrisonerResponsesLog,
        companionInteractionLog: gameData.companionInteractionLog,
        setCompanionInteractionLog: gameData.setCompanionInteractionLog,
        sentCompanionPromptsLog: gameData.sentCompanionPromptsLog,
        setSentCompanionPromptsLog: gameData.setSentCompanionPromptsLog,
        receivedCompanionResponsesLog: gameData.receivedCompanionResponsesLog,
        setReceivedCompanionResponsesLog: gameData.setReceivedCompanionResponsesLog,
    });
    
    const copilotActions = useCopilotActions({
        ...gameData,
        isLoadingApi,
        setIsLoadingApi,
        resetApiError,
        setApiErrorWithTimeout,
        sentPromptsLog: gameData.sentPromptsLog,
        setSentCopilotPromptsLog: gameData.setSentCopilotPromptsLog,
    });

    const allActions = { ...setupActions, ...mainGameLoopActions, ...auctionActions, ...cultivationActions, ...characterActions, ...postCombatActions, ...livingWorldActions, ...copilotActions, ...gameActions, handleProcessDebugTags };
    
    const handleArchitectQuery = useCallback(async (userQuestion: string, modelOverride: string, isActionModus: boolean, useGoogleSearch: boolean) => {
        await copilotActions.handleCopilotQuery(
            userQuestion,
            gameData.aiArchitectMessages, // Pass architect history
            gameData.setAiArchitectMessages, // Pass architect state setter
            undefined, // no extra context
            isActionModus,
            modelOverride,
            useGoogleSearch
        );
    }, [copilotActions, gameData.aiArchitectMessages, gameData.setAiArchitectMessages]);

    const applyArchitectChanges = useCallback((tags: string[], messageId: string) => {
        allActions.handleProcessDebugTags('', tags.join('\n'));
    
        gameData.setAiArchitectMessages(prev =>
            prev.map(msg =>
                msg.id === messageId ? { ...msg, applied: true } : msg
            )
        );
    }, [allActions, gameData.setAiArchitectMessages]);


    const isCurrentlyActivePage = gameData.currentPageDisplay === gameData.totalPages;
    
    const contextValue: GameContextType = {
        ...gameData, currentScreen, styleSettings, storageSettings, isInitialLoading, storageInitError,
        notification, showNotification, apiError, isLoadingApi, isSummarizingNextPageTransition,
        isAutoPlaying, isSavingGame, isAutoSaving, isSummarizingOnLoad, isCraftingItem,
        isUploadingAvatar, isCultivating, sentNpcAvatarPromptsLog, currentPageMessagesLog,
        previousPageSummaries: previousPageSummariesContent, lastNarrationFromPreviousPage,
        selectedEntity, isStyleSettingsModalOpen, isAiContextModalOpen, activeEconomyModal, activeSlaveMarketModal,
        copilotSessionState, startCopilotSession, endCopilotSession, // NEW
        handleArchitectQuery, applyArchitectChanges, resetArchitectConversation, // NEW
        setCurrentScreen, setKnowledgeBase: gameData.setKnowledgeBase, setGameMessages: gameData.setGameMessages,
        setStyleSettings, openEntityModal, closeModal, closeEconomyModal, closeSlaveMarketModal,
        setIsStyleSettingsModalOpen, setIsAiContextModalOpen, setActiveEconomyModal, setActiveSlaveMarketModal,
        handleUpdateEntity, handlePinEntity,
        isStrictMode, // NEW
        toggleStrictMode, // NEW
        // NEW: Expose preset actions
        saveNewAIPreset,
        deleteAIPreset,
        renameAIPreset,
        importAIPresets,
        ...allActions, onQuit, startQuickPlay, resetCopilotConversation, isCurrentlyActivePage, gameplayScrollPosition, justLoadedGame,
        onGoToPrevPage, onGoToNextPage, onJumpToPage,
    };

    return <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>;
};