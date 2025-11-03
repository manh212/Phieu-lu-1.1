import type React from 'react';
import { useCallback } from 'react';
import {
  KnowledgeBase, GameMessage, GameScreen, SaveGameData, SaveGameMeta, TurnHistoryEntry,
} from '@/types/index';
import {
  saveGameToIndexedDB,
  loadGamesFromIndexedDB,
  loadSpecificGameFromIndexedDB,
  importGameToIndexedDB,
} from '@/services/indexedDBService';
import { VIETNAMESE } from '@/constants';
import { DEFAULT_AI_RULEBOOK } from '@/constants/systemRulesNormal';
import { DEFAULT_PROMPT_STRUCTURE } from '@/constants/promptStructure';
import { calculateTotalPages, getMessagesForPage, DEFAULT_AI_CONTEXT_CONFIG } from '@/utils/gameLogicUtils';
import { summarizeTurnHistory } from '@/services/storyService';
import * as jsonpatch from "fast-json-patch"; 
import { Operation } from 'fast-json-patch';


// Props that this hook will need from the main GameContext
export interface UseGameActionsProps {
  knowledgeBase: KnowledgeBase;
  setKnowledgeBase: React.Dispatch<React.SetStateAction<KnowledgeBase>>;
  gameMessages: GameMessage[];
  setGameMessages: React.Dispatch<React.SetStateAction<GameMessage[]>>;
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  setCurrentScreen: (screen: GameScreen) => void;
  setCurrentPageDisplay: React.Dispatch<React.SetStateAction<number>>;
  resetGameData: () => void;
  justLoadedGame: React.MutableRefObject<boolean>;
  setIsSummarizingOnLoad: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useGameActions = (props: UseGameActionsProps) => {
  const {
    knowledgeBase, setKnowledgeBase, gameMessages, setGameMessages,
    showNotification, setCurrentScreen, setCurrentPageDisplay,
    resetGameData, justLoadedGame, setIsSummarizingOnLoad,
  } = props;

  const onSaveGame = useCallback(async () => {
    if (!knowledgeBase.manualSaveName?.trim()) {
      showNotification(VIETNAMESE.manualSaveErrorNoName, 'error');
      return;
    }
    try {
      const newSaveId = await saveGameToIndexedDB(
        knowledgeBase,
        gameMessages,
        knowledgeBase.manualSaveName,
        knowledgeBase.manualSaveId
      );
      setKnowledgeBase(prev => ({ ...prev, manualSaveId: newSaveId }));
      showNotification(VIETNAMESE.gameSavedSuccess + ` ("${knowledgeBase.manualSaveName}")`, 'success');
    } catch (e) {
      const errorMsg = VIETNAMESE.errorSavingGame + (e instanceof Error ? `: ${e.message}` : '');
      showNotification(errorMsg, 'error');
    }
  }, [knowledgeBase, gameMessages, showNotification, setKnowledgeBase]);

  const onLoadGame = useCallback(async (saveId: string) => {
    try {
      const loadedData = await loadSpecificGameFromIndexedDB(saveId);
      if (loadedData) {
        
        // --- START: DATA MIGRATION ---
        if (loadedData.knowledgeBase) {
            // Migrate old aiContextConfig toggles to the new promptStructure
            if (!loadedData.knowledgeBase.promptStructure) {
                console.log("Migrating old save file: Generating new promptStructure.");
                const oldConfig = loadedData.knowledgeBase.aiContextConfig || DEFAULT_AI_CONTEXT_CONFIG;
                const newStructure = DEFAULT_PROMPT_STRUCTURE.map(block => {
                    let isEnabled = block.enabled;
                    switch(block.id) {
                        case 'ragContext': isEnabled = oldConfig.sendRagContext; break;
                        case 'coreContext': isEnabled = oldConfig.sendCoreContext; break;
                        case 'conversationalContext': isEnabled = oldConfig.sendConversationalContext; break;
                        case 'writingStyleGuidance': isEnabled = oldConfig.sendWritingStyle; break;
                        case 'userPrompts': isEnabled = oldConfig.sendUserPrompts; break;
                        case 'worldEventGuidance': isEnabled = oldConfig.sendEventGuidance; break;
                        case 'difficultyGuidance': isEnabled = oldConfig.sendDifficultyGuidance; break;
                        case 'nsfwGuidance': isEnabled = oldConfig.sendNsfwGuidance; break;
                        case 'rule_narrationAndVividness': isEnabled = oldConfig.sendShowDontTellRule; break;
                        case 'rule_proactiveNpc': isEnabled = oldConfig.sendProactiveNpcRule; break;
                        // ... map all other old config keys to the new block IDs
                    }
                    return { ...block, enabled: isEnabled };
                });
                loadedData.knowledgeBase.promptStructure = newStructure;
            }

            if (!loadedData.knowledgeBase.aiRulebook) {
                loadedData.knowledgeBase.aiRulebook = { ...DEFAULT_AI_RULEBOOK };
            }

            // NEW: Add previousConditionStates if it's missing for trigger logic
            if (!loadedData.knowledgeBase.previousConditionStates) {
                loadedData.knowledgeBase.previousConditionStates = {};
            }
        }
        // --- END: DATA MIGRATION ---


        // --- START: RECONSTRUCT TURN HISTORY SNAPSHOTS ---
        if (loadedData.knowledgeBase && loadedData.knowledgeBase.turnHistory) {
            let lastKeyframeKb: KnowledgeBase | null = null;
            let lastKeyframeMessages: GameMessage[] | null = null;
            const reconstructedHistory: TurnHistoryEntry[] = [];

            for (const entry of loadedData.knowledgeBase.turnHistory) {
                if (entry.type === 'keyframe' && entry.knowledgeBaseSnapshot && entry.gameMessagesSnapshot) {
                    lastKeyframeKb = JSON.parse(JSON.stringify(entry.knowledgeBaseSnapshot));
                    lastKeyframeMessages = JSON.parse(JSON.stringify(entry.gameMessagesSnapshot));
                    reconstructedHistory.push(entry);
                } else if (entry.type === 'delta') {
                    if (lastKeyframeKb && lastKeyframeMessages && entry.knowledgeBaseDelta && entry.gameMessagesDelta) {
                        try {
                            const newKbSnapshot = jsonpatch.applyPatch(JSON.parse(JSON.stringify(lastKeyframeKb)), entry.knowledgeBaseDelta as readonly Operation[]).newDocument as KnowledgeBase;
                            const newMessagesSnapshot = jsonpatch.applyPatch(JSON.parse(JSON.stringify(lastKeyframeMessages)), entry.gameMessagesDelta as readonly Operation[]).newDocument as GameMessage[];
                            
                            const reconstructedEntry: TurnHistoryEntry = {
                                ...entry,
                                knowledgeBaseSnapshot: newKbSnapshot,
                                gameMessagesSnapshot: newMessagesSnapshot,
                            };
                            reconstructedHistory.push(reconstructedEntry);

                            lastKeyframeKb = newKbSnapshot;
                            lastKeyframeMessages = newMessagesSnapshot;
                        } catch (patchError) {
                            console.error("Failed to reconstruct delta frame on load, history might be incomplete.", patchError, entry);
                            reconstructedHistory.push(entry);
                            lastKeyframeKb = null;
                            lastKeyframeMessages = null;
                        }
                    } else {
                        console.warn("Could not reconstruct delta frame on load due to missing base or delta. History might be incomplete.", entry);
                        reconstructedHistory.push(entry);
                        lastKeyframeKb = null;
                        lastKeyframeMessages = null;
                    }
                } else {
                     reconstructedHistory.push(entry);
                }
            }
            loadedData.knowledgeBase.turnHistory = reconstructedHistory;
        }
        // --- END: RECONSTRUCTION LOGIC ---

        const totalPages = calculateTotalPages(loadedData.knowledgeBase);
        
        setKnowledgeBase(loadedData.knowledgeBase);
        setGameMessages(loadedData.gameMessages);
        setCurrentPageDisplay(totalPages);
        justLoadedGame.current = true;
        setCurrentScreen(GameScreen.Gameplay);
        showNotification(VIETNAMESE.gameLoadedSuccess, 'success');

      } else {
        throw new Error("Không tìm thấy dữ liệu lưu hoặc dữ liệu không hợp lệ.");
      }
    } catch (e) {
      const errorMsg = VIETNAMESE.errorLoadingGame + (e instanceof Error ? `: ${e.message}` : '');
      showNotification(errorMsg, 'error');
      throw e;
    }
  }, [setKnowledgeBase, setGameMessages, setCurrentPageDisplay, setCurrentScreen, showNotification, justLoadedGame, setIsSummarizingOnLoad]);

  const onQuit = useCallback(() => {
    resetGameData();
    setCurrentScreen(GameScreen.Initial);
  }, [resetGameData, setCurrentScreen]);

  const fetchSaveGamesForImportExport = useCallback(async (): Promise<SaveGameMeta[]> => {
    return await loadGamesFromIndexedDB();
  }, []);

  const loadSpecificGameDataForExport = useCallback(async (saveId: string): Promise<SaveGameData | null> => {
    return await loadSpecificGameFromIndexedDB(saveId);
  }, []);

  const handleImportGameData = useCallback(async (gameData: Omit<SaveGameData, 'id' | 'timestamp'> & { name: string }) => {
    try {
        await importGameToIndexedDB(gameData);
        showNotification(VIETNAMESE.dataImportedSuccess, 'success');
    } catch (e) {
        const errorMsg = VIETNAMESE.errorImportingData + (e instanceof Error ? `: ${e.message}` : '');
        showNotification(errorMsg, 'error');
        throw e;
    }
  }, [showNotification]);

  return {
    onSaveGame,
    onLoadGame,
    fetchSaveGamesForImportExport,
    loadSpecificGameDataForExport,
    handleImportGameData,
  };
};