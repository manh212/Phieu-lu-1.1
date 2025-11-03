import { useCallback } from 'react';
// FIX: Corrected import path for types
import { KnowledgeBase, GameMessage, WorldSettings, GameScreen, RealmBaseStatDefinition, TurnHistoryEntry, WorldDate, StartingLocation } from '../../types/index';
import { INITIAL_KNOWLEDGE_BASE, APP_VERSION, DEFAULT_PLAYER_STATS, DEFAULT_TIERED_STATS, VIETNAMESE, MAX_AUTO_SAVE_SLOTS, DEFAULT_MODEL_ID } from '../../constants';
// FIX: Corrected import path for services
import { generateInitialStory } from '../../services';
import { performTagProcessing, calculateRealmBaseStats, addTurnHistoryEntryRaw, calculateEffectiveStats, vectorizeKnowledgeBase, normalizeLocationName } from '../../utils/gameLogicUtils'; // Import vectorizeKnowledgeBase
import { DEFAULT_PROMPT_STRUCTURE } from '../../constants/promptStructure';
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
    const updatedLocations: StartingLocation[] = [...worldConfigForKb.startingLocations];
    const locationNameToObjectMap = new Map<string, StartingLocation>();
    updatedLocations.forEach(location => {
        locationNameToObjectMap.set(normalizeLocationName(location.name), location);
    });
    (worldConfigForKb.startingNPCs || []).forEach(npc => {
        if (npc.locationName && npc.locationName.trim()) {
            const normalizedLocationName = normalizeLocationName(npc.locationName);
            if (!locationNameToObjectMap.has(normalizedLocationName)) {
                const newLocation: StartingLocation = {
                    name: npc.locationName.trim(),
                    description: `Một địa điểm được nhắc đến, có liên quan đến ${npc.name}. Chi tiết chưa được khám phá.`,
                    isSafeZone: false,
                    locationType: GameTemplates.LocationType.LANDMARK,
                };
                updatedLocations.push(newLocation);
                locationNameToObjectMap.set(normalizedLocationName, newLocation);
            }
        }
    });
    worldConfigForKb.startingLocations = updatedLocations;
    // --- End of Location Auto-Generation ---

    const playerRaceTrimmed = settings.playerRace.trim();
    let playerRaceSystem = settings.raceCultivationSystems.find(s => s.raceName.trim() === playerRaceTrimmed);

    if (!playerRaceSystem) {
        playerRaceSystem = settings.raceCultivationSystems.find(s => settings.canhGioiKhoiDau.trim().startsWith(s.raceName.trim()));
    }
    
    const realmProgression = (playerRaceSystem?.realmSystem || settings.raceCultivationSystems[0]?.realmSystem || '').split(' - ').map(s => s.trim()).filter(Boolean);
    const initialRealm = settings.canhGioiKhoiDau;
    
    const generatedBaseStats: Record<string, RealmBaseStatDefinition> = {};
    realmProgression.forEach((realmName, index) => {
        generatedBaseStats[realmName] = DEFAULT_TIERED_STATS[Math.min(index, DEFAULT_TIERED_STATS.length - 1)];
    });
    
    const initialCalculatedStats = calculateRealmBaseStats(initialRealm, realmProgression, generatedBaseStats);
    
    const dateToUse = { ...settings.startingDate };
    if (typeof (dateToUse as any).buoi !== 'undefined') {
        const buoi = (dateToUse as any).buoi;
        delete (dateToUse as any).buoi;
        switch(buoi) {
            case 'Sáng Sớm': (dateToUse as WorldDate).hour = 6; (dateToUse as WorldDate).minute = 0; break;
            case 'Buổi Sáng': (dateToUse as WorldDate).hour = 8; (dateToUse as WorldDate).minute = 0; break;
            default: (dateToUse as WorldDate).hour = 8; (dateToUse as WorldDate).minute = 0;
        }
    }
     if (typeof (dateToUse as WorldDate).hour === 'undefined') (dateToUse as WorldDate).hour = 8;
    if (typeof (dateToUse as WorldDate).minute === 'undefined') (dateToUse as WorldDate).minute = 0;


    let minimalInitialKB: KnowledgeBase = {
      ...INITIAL_KNOWLEDGE_BASE, 
      worldDate: dateToUse as WorldDate,
      promptStructure: [...DEFAULT_PROMPT_STRUCTURE], // NEW: Initialize with default structure
      playerStats: {
        ...DEFAULT_PLAYER_STATS, 
        realm: initialRealm, 
        ...initialCalculatedStats, 
        sinhLuc: initialCalculatedStats.baseMaxSinhLuc || DEFAULT_PLAYER_STATS.maxSinhLuc,
        linhLuc: initialCalculatedStats.baseMaxLinhLuc || DEFAULT_PLAYER_STATS.maxLinhLuc,
        turn: 0,
        thoNguyen: settings.playerThoNguyen ?? 120,
        maxThoNguyen: settings.playerMaxThoNguyen ?? 120,
      },
      realmProgressionList: realmProgression,
      currentRealmBaseStats: generatedBaseStats,
      worldConfig: worldConfigForKb, 
      manualSaveName: settings.saveGameName || VIETNAMESE.saveGameNamePlaceholder.replace("[Tên Nhân Vật]", settings.playerName || "Tân Đạo Hữu"),
      playerAvatarData: dataForKbPlayerAvatar || settings.playerAvatarUrl || undefined, 
    };
    
    minimalInitialKB.turnHistory = addTurnHistoryEntryRaw([], JSON.parse(JSON.stringify(minimalInitialKB)), []);
    
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
      const { newKb: kbAfterTags, systemMessagesFromTags, realmChangedByTag: realmChangedByInitTag } = await performTagProcessing(workingKbForProcessing, response.tags, 1, setKnowledgeBase, logNpcAvatarPromptCallback); 
      
      let finalKbForDisplay = kbAfterTags;
      
      if (finalKbForDisplay.discoveredNPCs.length > 0 && settings.startingNPCs.length > 0) {
        const locationNameToIdMap = new Map<string, string>();
        finalKbForDisplay.discoveredLocations.forEach(location => {
            locationNameToIdMap.set(normalizeLocationName(location.name), location.id);
        });

        settings.startingNPCs.forEach(startingNpc => {
            if (startingNpc.locationName && startingNpc.locationName.trim()) {
                const discoveredNpc = finalKbForDisplay.discoveredNPCs.find(n => n.name === startingNpc.name);
                if (discoveredNpc) {
                    const normalizedLocationName = normalizeLocationName(startingNpc.locationName);
                    const locationId = locationNameToIdMap.get(normalizedLocationName);
                    if (locationId) {
                        discoveredNpc.locationId = locationId;
                    }
                }
            }
        });
      }
      
      if (settings.playerThoNguyen !== undefined) {
          finalKbForDisplay.playerStats.thoNguyen = Number(settings.playerThoNguyen);
      }
      if (settings.playerMaxThoNguyen !== undefined) {
          finalKbForDisplay.playerStats.maxThoNguyen = Number(settings.playerMaxThoNguyen);
      }

      finalKbForDisplay.playerStats.turn = 1;
      
      if (realmChangedByInitTag) {
          const reCalculatedStats = calculateRealmBaseStats(finalKbForDisplay.playerStats.realm, finalKbForDisplay.realmProgressionList, finalKbForDisplay.currentRealmBaseStats);
          finalKbForDisplay.playerStats = { ...finalKbForDisplay.playerStats, ...reCalculatedStats };
          finalKbForDisplay.playerStats.sinhLuc = finalKbForDisplay.playerStats.maxSinhLuc;
          finalKbForDisplay.playerStats.linhLuc = finalKbForDisplay.playerStats.maxLinhLuc;
      } else {
          finalKbForDisplay.playerStats.sinhLuc = initialCalculatedStats.baseMaxSinhLuc || finalKbForDisplay.playerStats.maxSinhLuc;
          finalKbForDisplay.playerStats.linhLuc = initialCalculatedStats.baseMaxLinhLuc || finalKbForDisplay.playerStats.maxLinhLuc;
      }
      
      finalKbForDisplay.playerStats = calculateEffectiveStats(finalKbForDisplay.playerStats, finalKbForDisplay.equippedItems, finalKbForDisplay.inventory);
      
      if (!finalKbForDisplay.currentLocationId) {
          const firstLocation = finalKbForDisplay.discoveredLocations?.[0];
          if (firstLocation) {
              finalKbForDisplay.currentLocationId = firstLocation.id;
          }
      }

      const newMessages: GameMessage[] = [];
      newMessages.push({
        id: Date.now().toString() + Math.random(), type: 'narration', content: response.narration, 
        timestamp: Date.now(), choices: response.choices, turnNumber: 1
      });
      if (response.systemMessage) {
        newMessages.push({
          id: Date.now().toString() + Math.random(), type: 'system', content: response.systemMessage, 
          timestamp: Date.now(), turnNumber: 1
        });
      }
      // FIX: Renamed variable 'systemMessagesFromInitialTags' to 'systemMessagesFromTags' to match the destructured variable from 'performTagProcessing'.
      newMessages.push(...systemMessagesFromTags.map(m => ({...m, turnNumber: 1})));
      
      try {
        finalKbForDisplay.ragVectorStore = await vectorizeKnowledgeBase(finalKbForDisplay);
        newMessages.push({
          id: `rag-init-${Date.now()}`,
          type: 'system',
          content: `[DEBUG] Đã tạo ${finalKbForDisplay.ragVectorStore.metadata.length} vector cho ngữ cảnh RAG.`,
          timestamp: Date.now(),
          turnNumber: 1
        });
      } catch (embeddingError) {
          console.error("Failed to vectorize initial knowledge base:", embeddingError);
          newMessages.push({
            id: `rag-init-error-${Date.now()}`,
            type: 'error',
            content: `Lỗi tạo vector ngữ cảnh: ${embeddingError instanceof Error ? embeddingError.message : 'Unknown error'}.`,
            timestamp: Date.now(),
            turnNumber: 1
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