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
// FIX: Moved DEFAULT_AI_CONTEXT_CONFIG import from '@//constants' to the correct module '@//utils/gameLogicUtils' where it is defined.
// FIX: Changed import for DEFAULT_AI_RULEBOOK to its correct source module to resolve export error.
import { DEFAULT_AI_RULEBOOK } from '@/constants/systemRulesNormal';
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
        
        // --- START: DATA MIGRATION (STEP 1 & 2) ---
        // Automatically update older save files by adding new data structures if they don't exist.
        // This prevents the "Cannot read properties of undefined" error.
        if (loadedData.knowledgeBase) {
            if (!loadedData.knowledgeBase.aiContextConfig) {
                loadedData.knowledgeBase.aiContextConfig = { ...DEFAULT_AI_CONTEXT_CONFIG };
            }
            if (!loadedData.knowledgeBase.aiRulebook) {
                loadedData.knowledgeBase.aiRulebook = { ...DEFAULT_AI_RULEBOOK };
            }
        }
        // --- END: DATA MIGRATION ---


        // --- START: RECONSTRUCT TURN HISTORY SNAPSHOTS ---
        // Delta entries in the DB don't have full snapshots to save space.
        // We must reconstruct them here so the rollback function has the data it needs.
        if (loadedData.knowledgeBase && loadedData.knowledgeBase.turnHistory) {
            let lastKeyframeKb: KnowledgeBase | null = null;
            let lastKeyframeMessages: GameMessage[] | null = null;
            const reconstructedHistory: TurnHistoryEntry[] = [];

            for (const entry of loadedData.knowledgeBase.turnHistory) {
                if (entry.type === 'keyframe' && entry.knowledgeBaseSnapshot && entry.gameMessagesSnapshot) {
                    // This is a full snapshot, use it as the new base
                    lastKeyframeKb = JSON.parse(JSON.stringify(entry.knowledgeBaseSnapshot));
                    lastKeyframeMessages = JSON.parse(JSON.stringify(entry.gameMessagesSnapshot));
                    reconstructedHistory.push(entry);
                } else if (entry.type === 'delta') {
                    if (lastKeyframeKb && lastKeyframeMessages && entry.knowledgeBaseDelta && entry.gameMessagesDelta) {
                        try {
                            // Apply patch to the LAST known full state to reconstruct this turn's state
                            const newKbSnapshot = jsonpatch.applyPatch(JSON.parse(JSON.stringify(lastKeyframeKb)), entry.knowledgeBaseDelta as readonly Operation[]).newDocument as KnowledgeBase;
                            const newMessagesSnapshot = jsonpatch.applyPatch(JSON.parse(JSON.stringify(lastKeyframeMessages)), entry.gameMessagesDelta as readonly Operation[]).newDocument as GameMessage[];
                            
                            const reconstructedEntry: TurnHistoryEntry = {
                                ...entry,
                                knowledgeBaseSnapshot: newKbSnapshot,
                                gameMessagesSnapshot: newMessagesSnapshot,
                            };
                            reconstructedHistory.push(reconstructedEntry);

                            // This newly reconstructed snapshot becomes the base for the next delta
                            lastKeyframeKb = newKbSnapshot;
                            lastKeyframeMessages = newMessagesSnapshot;
                        } catch (patchError) {
                            console.error("Failed to reconstruct delta frame on load, history might be incomplete.", patchError, entry);
                            reconstructedHistory.push(entry); // Push the entry without a valid snapshot
                            lastKeyframeKb = null; // Break the chain to prevent further errors
                            lastKeyframeMessages = null;
                        }
                    } else {
                        console.warn("Could not reconstruct delta frame on load due to missing base or delta. History might be incomplete.", entry);
                        reconstructedHistory.push(entry); // Push as-is
                        lastKeyframeKb = null; // Break the chain
                        lastKeyframeMessages = null;
                    }
                } else {
                     reconstructedHistory.push(entry); // Push keyframes or other types as-is
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

        // The problematic auto-summary block has been removed.
        // Summarization will now only occur naturally when a page ends during gameplay.

      } else {
        throw new Error("Không tìm thấy dữ liệu lưu hoặc dữ liệu không hợp lệ.");
      }
    } catch (e) {
      const errorMsg = VIETNAMESE.errorLoadingGame + (e instanceof Error ? `: ${e.message}` : '');
      showNotification(errorMsg, 'error');
      throw e; // re-throw for the caller if needed
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
    // onQuit is handled in GameContext to also manage isAutoPlaying state
    fetchSaveGamesForImportExport,
    loadSpecificGameDataForExport,
    handleImportGameData,
  };
};