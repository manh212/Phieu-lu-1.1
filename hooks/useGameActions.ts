import { useCallback } from 'react';
import {
  KnowledgeBase, GameMessage, GameScreen, SaveGameData, SaveGameMeta,
} from '@/types/index';
import {
  saveGameToIndexedDB,
  loadGamesFromIndexedDB,
  loadSpecificGameFromIndexedDB,
  importGameToIndexedDB,
} from '@/services/indexedDBService';
import { VIETNAMESE } from '@/constants';
import { calculateTotalPages, getMessagesForPage } from '@/utils/gameLogicUtils';
import { summarizeTurnHistory } from '@/services/storyService';


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