import { useCallback } from 'react';
// FIX: Corrected import path for types
import { KnowledgeBase, GameMessage, WorldSettings, GameScreen, RealmBaseStatDefinition, TurnHistoryEntry, WorldDate, StartingLocation } from '../../types/index';
import { INITIAL_KNOWLEDGE_BASE, APP_VERSION, DEFAULT_PLAYER_STATS, DEFAULT_TIERED_STATS, VIETNAMESE, MAX_AUTO_SAVE_SLOTS, DEFAULT_MODEL_ID } from '../../constants';
// FIX: Corrected import path for services
import { generateInitialStory } from '../../services';
import { performTagProcessing, calculateRealmBaseStats, addTurnHistoryEntryRaw, calculateEffectiveStats, vectorizeKnowledgeBase, DEFAULT_AI_CONTEXT_CONFIG, normalizeLocationName } from '../../utils/gameLogicUtils'; // Import vectorizeKnowledgeBase
// FIX: Corrected import path for templates
import * as GameTemplates from '../../types/index';
// FIX: Add missing React import to resolve namespace errors.
import type React from 'react';


interface UseSetupActionsProps {
// FIX: Correctly type the setIsLoadingApi parameter.
  setIsLoadingApi: React.Dispatch<React.SetStateAction<boolean>>;
  resetApiError: () => void;
// FIX: Correctly type the setKnowledgeBase parameter.
  setKnowledgeBase: React.Dispatch<React.SetStateAction<KnowledgeBase>>;
// FIX: Correctly type the setCurrentPageDisplay parameter.
  setCurrentPageDisplay: React.Dispatch<React.SetStateAction<number>>;
  setCurrentScreen: (screen: GameScreen) => void;
  addMessageAndUpdateState: (newMessages: GameMessage[], newKnowledgeBase: KnowledgeBase, callback?: () => void) => void;
  logSentPromptCallback: (prompt: string) => void;
// FIX: Correctly type the setRawAiResponsesLog parameter.
  setRawAiResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
  setApiErrorWithTimeout: (message: string | null) => void;
  logNpcAvatarPromptCallback?: (prompt: string) => void;
}

export const useSetupActions = ({
  setIsLoadingApi,
  resetApiError,
  setKnowledgeBase,
  setCurrentPageDisplay,
  setCurrentScreen,
  addMessageAndUpdateState,
  logSentPromptCallback,
  setRawAiResponsesLog,
  setApiErrorWithTimeout,
  logNpcAvatarPromptCallback,
}: UseSetupActionsProps) => {

  const handleSetupComplete = useCallback(async (settings: WorldSettings, dataForKbPlayerAvatar?: string | null) => { 
    setIsLoadingApi(true);
    resetApiError();
    
    const worldConfigForKb = { ...settings }; // Use a mutable copy

    // --- STEP 5: LOCATION AUTO-GENERATION & NPC-LOCATION LINKING ---
    // Part 1: Auto-generate locations based on NPC starting points.
    
    const updatedLocations: StartingLocation[] = [...worldConfigForKb.startingLocations];
    const locationNameToObjectMap = new Map<string, StartingLocation>();
    
    // Seed the map with user-defined locations
    updatedLocations.forEach(location => {
        locationNameToObjectMap.set(normalizeLocationName(location.name), location);
    });

    // Process NPCs to find or create their starting locations
    (worldConfigForKb.startingNPCs || []).forEach(npc => {
        if (npc.locationName && npc.locationName.trim()) {
            const normalizedLocationName = normalizeLocationName(npc.locationName);
            if (!locationNameToObjectMap.has(normalizedLocationName)) {
                // Location doesn't exist, create it.
                const newLocation: StartingLocation = {
                    name: npc.locationName.trim(), // Use the original, non-normalized name
                    description: `Một địa điểm được nhắc đến, có liên quan đến ${npc.name}. Chi tiết chưa được khám phá.`,
                    isSafeZone: false, // Default to not safe
                    locationType: GameTemplates.LocationType.LANDMARK, // Default to a landmark
                };
                updatedLocations.push(newLocation);
                // Add the new location to the map to prevent duplicates in this loop
                locationNameToObjectMap.set(normalizedLocationName, newLocation);
            }
        }
    });
    
    // Update the config with the new locations before building the KB
    worldConfigForKb.startingLocations = updatedLocations;
    
    // --- End of Location Auto-Generation ---

    const playerRaceTrimmed = settings.playerRace.trim();
    let playerRaceSystem = settings.raceCultivationSystems.find(s => s.raceName.trim() === playerRaceTrimmed);

    // Fallback logic if the specific race is not found.
    if (!playerRaceSystem) {
        // Attempt to match the start of the realm string to a race name.
        playerRaceSystem = settings.raceCultivationSystems.find(s => settings.canhGioiKhoiDau.trim().startsWith(s.raceName.trim()));
        if (playerRaceSystem) {
            console.log(`[SETUP_DEBUG] Player race "${settings.playerRace}" not found. Inferred race "${playerRaceSystem.raceName}" from starting realm "${settings.canhGioiKhoiDau}".`);
        }
    }
    
    // Fallback to the first system in the array as a last resort.
    const realmProgression = (playerRaceSystem?.realmSystem || settings.raceCultivationSystems[0]?.realmSystem || '').split(' - ').map(s => s.trim()).filter(Boolean);
    const initialRealm = settings.canhGioiKhoiDau;
    
    const generatedBaseStats: Record<string, RealmBaseStatDefinition> = {};
    realmProgression.forEach((realmName, index) => {
        generatedBaseStats[realmName] = DEFAULT_TIERED_STATS[Math.min(index, DEFAULT_TIERED_STATS.length - 1)];
    });
    
    const initialCalculatedStats = calculateRealmBaseStats(initialRealm, realmProgression, generatedBaseStats);
    
    // Failsafe: Ensure the startingDate object has the 'buoi' property.
    const dateToUse = { ...settings.startingDate };
    if (typeof (dateToUse as any).buoi !== 'undefined') {
        console.warn("[Setup] `buoi` was found in settings.startingDate. Migrating to hour/minute.", dateToUse);
        const buoi = (dateToUse as any).buoi;
        delete (dateToUse as any).buoi;
        switch(buoi) {
            case 'Sáng Sớm': (dateToUse as WorldDate).hour = 6; (dateToUse as WorldDate).minute = 0; break;
            case 'Buổi Sáng': (dateToUse as WorldDate).hour = 8; (dateToUse as WorldDate).minute = 0; break;
            case 'Buổi Trưa': (dateToUse as WorldDate).hour = 12; (dateToUse as WorldDate).minute = 0; break;
            case 'Buổi Chiều': (dateToUse as WorldDate).hour = 15; (dateToUse as WorldDate).minute = 0; break;
            case 'Hoàng Hôn': (dateToUse as WorldDate).hour = 18; (dateToUse as WorldDate).minute = 0; break;
            case 'Buổi Tối': (dateToUse as WorldDate).hour = 20; (dateToUse as WorldDate).minute = 0; break;
            case 'Nửa Đêm': (dateToUse as WorldDate).hour = 0; (dateToUse as WorldDate).minute = 0; break;
            default: (dateToUse as WorldDate).hour = 8; (dateToUse as WorldDate).minute = 0;
        }
    }
    if (typeof (dateToUse as WorldDate).hour === 'undefined') (dateToUse as WorldDate).hour = 8;
    if (typeof (dateToUse as WorldDate).minute === 'undefined') (dateToUse as WorldDate).minute = 0;


    let minimalInitialKB: KnowledgeBase = {
      ...INITIAL_KNOWLEDGE_BASE, 
      worldDate: dateToUse as WorldDate,
      aiContextConfig: DEFAULT_AI_CONTEXT_CONFIG, // NEW: Add default AI config
      playerStats: {
        ...DEFAULT_PLAYER_STATS, 
        realm: initialRealm, 
        ...initialCalculatedStats, 
        sinhLuc: initialCalculatedStats.baseMaxSinhLuc || DEFAULT_PLAYER_STATS.maxSinhLuc,
        linhLuc: initialCalculatedStats.baseMaxLinhLuc || DEFAULT_PLAYER_STATS.maxLinhLuc,
        kinhNghiem: 0,
        turn: 0, // Turn is 0 before the first AI response generates turn 1 content
        hieuUngBinhCanh: false,
        activeStatusEffects: [], 
        spiritualRoot: settings.playerSpiritualRoot || "Phàm Căn",
        specialPhysique: settings.playerSpecialPhysique || "Phàm Thể",
        professions: [],
        thoNguyen: settings.playerThoNguyen ?? 120,
        maxThoNguyen: settings.playerMaxThoNguyen ?? 120,
        playerSpecialStatus: null,
      },
      realmProgressionList: realmProgression,
      currentRealmBaseStats: generatedBaseStats,
      worldConfig: worldConfigForKb, 
      appVersion: APP_VERSION,
      pageSummaries: {},
      currentPageHistory: [1], // Initial page starts at turn 1 (after AI gen)
      lastSummarizedTurn: 0,
      turnHistory: [], // Starts empty
      autoSaveTurnCounter: 0,
      currentAutoSaveSlotIndex: 0,
      autoSaveSlotIds: Array(MAX_AUTO_SAVE_SLOTS).fill(null),
      manualSaveId: null,
      manualSaveName: settings.saveGameName || VIETNAMESE.saveGameNamePlaceholder.replace("[Tên Nhân Vật]", settings.playerName || "Tân Đạo Hữu"),
      playerAvatarData: dataForKbPlayerAvatar || settings.playerAvatarUrl || undefined, 
    };
    
    // History entry for "before turn 1" (initial state)
    minimalInitialKB.turnHistory = addTurnHistoryEntryRaw(
        [], // No previous history
        JSON.parse(JSON.stringify(minimalInitialKB)), // Snapshot of the very initial KB
        []  // No messages before the game starts
    );
    
    // Add default AI Copilot configuration
    const DEFAULT_COPILOT_CONFIG_ID = 'default-copilot';
    minimalInitialKB.aiCopilotConfigs = [{
        id: DEFAULT_COPILOT_CONFIG_ID,
        name: 'Siêu Trợ Lý Mặc Định',
        model: DEFAULT_MODEL_ID,
        systemInstruction: ''
    }];
    minimalInitialKB.activeAICopilotConfigId = DEFAULT_COPILOT_CONFIG_ID;

    setKnowledgeBase(minimalInitialKB); 
    setCurrentPageDisplay(1);
    setCurrentScreen(GameScreen.Gameplay); 

    try {
      const {response, rawText} = await generateInitialStory(minimalInitialKB, logSentPromptCallback); 
      setRawAiResponsesLog(prev => [rawText, ...prev].slice(0,50));
      
      let workingKbForProcessing = JSON.parse(JSON.stringify(minimalInitialKB));
       // The turn for the first AI-generated content is 1.
      // Tags in initial story should modify this "turn 1" state.
      const { 
        newKb: kbAfterTags, 
        turnIncrementedByTag, // This should ideally not happen or be handled carefully for turn 1
        systemMessagesFromTags: systemMessagesFromInitialTags, 
        realmChangedByTag: realmChangedByInitTag 
      } = await performTagProcessing(workingKbForProcessing, response.tags, 1, setKnowledgeBase, logNpcAvatarPromptCallback); 
      
      let finalKbForDisplay = kbAfterTags;
      
      // Part 2: Link NPCs to their correct location IDs.
      if (finalKbForDisplay.discoveredNPCs.length > 0 && settings.startingNPCs.length > 0) {
        const locationNameToIdMap = new Map<string, string>();
        finalKbForDisplay.discoveredLocations.forEach(location => {
            locationNameToIdMap.set(normalizeLocationName(location.name), location.id);
        });

        settings.startingNPCs.forEach(startingNpc => {
            if (startingNpc.locationName && startingNpc.locationName.trim()) {
                // Find the corresponding NPC created by the AI in the knowledge base
                const discoveredNpc = finalKbForDisplay.discoveredNPCs.find(
                    n => n.name === startingNpc.name
                );

                if (discoveredNpc) {
                    const normalizedLocationName = normalizeLocationName(startingNpc.locationName);
                    const locationId = locationNameToIdMap.get(normalizedLocationName);

                    if (locationId) {
                        discoveredNpc.locationId = locationId;
                    } else {
                        console.warn(`[Setup Linking] Could not find a location ID for "${startingNpc.locationName}" for NPC "${startingNpc.name}". The location should have been auto-created.`);
                    }
                }
            }
        });
      }
      
      // --- End of NPC-Location Linking ---
      
      // FIX: Re-apply the user's settings for lifespan over any values the AI might have generated.
      // This ensures user input from the setup screen is always respected.
      if (settings.playerThoNguyen !== undefined) {
          finalKbForDisplay.playerStats.thoNguyen = Number(settings.playerThoNguyen);
      }
      if (settings.playerMaxThoNguyen !== undefined) {
          finalKbForDisplay.playerStats.maxThoNguyen = Number(settings.playerMaxThoNguyen);
      }

      // FIX: Force turn to 1 after initial setup, regardless of AI response.
      // This ensures the game always starts on turn 1 for the player.
      finalKbForDisplay.playerStats.turn = 1;
      const turnForInitialMessages = 1;
      
      if (realmChangedByInitTag) {
          const reCalculatedStats = calculateRealmBaseStats(finalKbForDisplay.playerStats.realm, finalKbForDisplay.realmProgressionList, finalKbForDisplay.currentRealmBaseStats);
          finalKbForDisplay.playerStats = { ...finalKbForDisplay.playerStats, ...reCalculatedStats };
          finalKbForDisplay.playerStats.sinhLuc = finalKbForDisplay.playerStats.maxSinhLuc;
          finalKbForDisplay.playerStats.linhLuc = finalKbForDisplay.playerStats.maxLinhLuc;
          finalKbForDisplay.playerStats.kinhNghiem = Math.min(finalKbForDisplay.playerStats.kinhNghiem, finalKbForDisplay.playerStats.maxKinhNghiem);
      } else {
          finalKbForDisplay.playerStats.sinhLuc = initialCalculatedStats.baseMaxSinhLuc || finalKbForDisplay.playerStats.maxSinhLuc;
          finalKbForDisplay.playerStats.linhLuc = initialCalculatedStats.baseMaxLinhLuc || finalKbForDisplay.playerStats.maxLinhLuc;
      }
      
      // currentPageHistory should correctly point to the start turn of the first page.
      finalKbForDisplay.playerStats = calculateEffectiveStats(finalKbForDisplay.playerStats, finalKbForDisplay.equippedItems, finalKbForDisplay.inventory);
      
      // Set initial location based on the first discovered location from the setup
      // This is now redundant since NPCs are linked, but good as a fallback
      if (!finalKbForDisplay.currentLocationId) {
          const firstLocation = finalKbForDisplay.discoveredLocations?.[0];
          if (firstLocation) {
              finalKbForDisplay.currentLocationId = firstLocation.id;
          }
      }

      const newMessages: GameMessage[] = [];
      newMessages.push({
        id: Date.now().toString() + Math.random(), type: 'narration', content: response.narration, 
        timestamp: Date.now(), choices: response.choices, turnNumber: turnForInitialMessages
      });
      if (response.systemMessage) {
        newMessages.push({
          id: Date.now().toString() + Math.random(), type: 'system', content: response.systemMessage, 
          timestamp: Date.now(), turnNumber: turnForInitialMessages
        });
      }
      newMessages.push(...systemMessagesFromInitialTags.map(m => ({...m, turnNumber: turnForInitialMessages})));
      
      // Vectorize the initial knowledge base for RAG
      try {
        console.log("Vectorizing initial knowledge base for RAG...");
        finalKbForDisplay.ragVectorStore = await vectorizeKnowledgeBase(finalKbForDisplay);
        console.log(`Initial vectorization complete. Vector store has ${finalKbForDisplay.ragVectorStore.vectors.length} entries.`);
        newMessages.push({
          id: `rag-init-${Date.now()}`,
          type: 'system',
          content: `[DEBUG] Đã tạo ${finalKbForDisplay.ragVectorStore.metadata.length} vector cho ngữ cảnh RAG.`,
          timestamp: Date.now(),
          turnNumber: turnForInitialMessages
        });
      } catch (embeddingError) {
          console.error("Failed to vectorize initial knowledge base:", embeddingError);
          newMessages.push({
            id: `rag-init-error-${Date.now()}`,
            type: 'error',
            content: `Lỗi tạo vector ngữ cảnh: ${embeddingError instanceof Error ? embeddingError.message : 'Unknown error'}.`,
            timestamp: Date.now(),
            turnNumber: turnForInitialMessages
          });
      }
      
      addMessageAndUpdateState(newMessages, finalKbForDisplay);

    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setApiErrorWithTimeout(`Lỗi khi tạo cốt truyện ban đầu: ${errorMsg}`);
      setCurrentScreen(GameScreen.Initial);
    } finally {
      setIsLoadingApi(false);
    }
  }, [
    setIsLoadingApi,
    resetApiError,
    setKnowledgeBase,
    setCurrentPageDisplay,
    setCurrentScreen,
    addMessageAndUpdateState,
    logSentPromptCallback,
    setRawAiResponsesLog,
    setApiErrorWithTimeout,
    logNpcAvatarPromptCallback
  ]);

  return { handleSetupComplete };
};