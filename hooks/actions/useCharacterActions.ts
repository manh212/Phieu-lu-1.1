
import { useCallback } from 'react';
import {
    KnowledgeBase, GameMessage, GameScreen, Prisoner, Wife, Slave, NPC
} from '../../types';
import {
    handleCompanionInteraction,
    handlePrisonerInteraction,
    summarizeCompanionInteraction,
    summarizePrisonerInteraction
} from '../../services/geminiService';
import { performTagProcessing, calculateSlaveValue } from '../../utils/gameLogicUtils';
import { VIETNAMESE } from '../../constants';

// Define the props interface for the hook
export interface UseCharacterActionsProps {
    knowledgeBase: KnowledgeBase;
    setKnowledgeBase: React.Dispatch<React.SetStateAction<KnowledgeBase>>;
    isLoadingApi: boolean;
    setIsLoadingApi: React.Dispatch<React.SetStateAction<boolean>>;
    resetApiError: () => void;
    setApiErrorWithTimeout: (message: string | null) => void;
    showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
    addMessageAndUpdateState: (newMessages: GameMessage[], newKnowledgeBase: KnowledgeBase, callback?: () => void) => void;
    setCurrentScreen: (screen: GameScreen) => void;
    logNpcAvatarPromptCallback: (prompt: string) => void;
    
    // Prisoner logs
    prisonerInteractionLog: string[];
    setPrisonerInteractionLog: React.Dispatch<React.SetStateAction<string[]>>;
    sentPrisonerPromptsLog: string[];
    setSentPrisonerPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
    receivedPrisonerResponsesLog: string[];
    setReceivedPrisonerResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;

    // Companion logs
    companionInteractionLog: string[];
    setCompanionInteractionLog: React.Dispatch<React.SetStateAction<string[]>>;
    sentCompanionPromptsLog: string[];
    setSentCompanionPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
    receivedCompanionResponsesLog: string[];
    setReceivedCompanionResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
    
    // Context for prompts
    currentPageMessagesLog: string;
    previousPageSummaries: string[];
    lastNarrationFromPreviousPage?: string;

    // Actions from other hooks/contexts
    handleProcessDebugTags: (narration: string, tags: string) => Promise<void>;
}


export const useCharacterActions = (props: UseCharacterActionsProps) => {
    const {
        knowledgeBase, setKnowledgeBase,
        isLoadingApi, setIsLoadingApi,
        resetApiError, setApiErrorWithTimeout,
        showNotification, addMessageAndUpdateState, setCurrentScreen,
        logNpcAvatarPromptCallback,
        setPrisonerInteractionLog, setSentPrisonerPromptsLog, setReceivedPrisonerResponsesLog,
        setCompanionInteractionLog, setSentCompanionPromptsLog, setReceivedCompanionResponsesLog,
        currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage,
        handleProcessDebugTags
    } = props;

    // --- COPIED FROM useGameActions.ts ---
    const handlePrisonerAction = useCallback(async (prisoner: Prisoner, action: string) => {
        if (isLoadingApi) return;
        setIsLoadingApi(true);
        resetApiError();
        try {
            const { response, rawText } = await handlePrisonerInteraction(
                knowledgeBase, prisoner, action, currentPageMessagesLog,
                previousPageSummaries, lastNarrationFromPreviousPage,
                (prompt) => setSentPrisonerPromptsLog(prev => [prompt, ...prev].slice(0, 20))
            );
            setReceivedPrisonerResponsesLog(prev => [rawText, ...prev].slice(0, 20));
            const { newKb } = await performTagProcessing(knowledgeBase, response.tags, knowledgeBase.playerStats.turn, setKnowledgeBase, logNpcAvatarPromptCallback);
            setKnowledgeBase(newKb);
            setPrisonerInteractionLog(prev => [...prev, response.narration]);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Lỗi khi tương tác với tù nhân.";
            setApiErrorWithTimeout(errorMsg);
        } finally {
            setIsLoadingApi(false);
        }
    }, [knowledgeBase, isLoadingApi, setIsLoadingApi, resetApiError, setApiErrorWithTimeout, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage, setSentPrisonerPromptsLog, setReceivedPrisonerResponsesLog, performTagProcessing, setKnowledgeBase, logNpcAvatarPromptCallback, setPrisonerInteractionLog]);

    const handleCompanionAction = useCallback(async (companion: Wife | Slave, action: string) => {
        if (isLoadingApi) return;
        setIsLoadingApi(true);
        resetApiError();
        try {
            const { response, rawText } = await handleCompanionInteraction(
                knowledgeBase, companion, action, currentPageMessagesLog,
                previousPageSummaries, lastNarrationFromPreviousPage,
                (prompt) => setSentCompanionPromptsLog(prev => [prompt, ...prev].slice(0, 20))
            );
            setReceivedCompanionResponsesLog(prev => [rawText, ...prev].slice(0, 20));
            const { newKb } = await performTagProcessing(knowledgeBase, response.tags, knowledgeBase.playerStats.turn, setKnowledgeBase, logNpcAvatarPromptCallback);
            setKnowledgeBase(newKb);
            setCompanionInteractionLog(prev => [...prev, response.narration]);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Lỗi khi tương tác với bạn đồng hành.";
            setApiErrorWithTimeout(errorMsg);
        } finally {
            setIsLoadingApi(false);
        }
    }, [knowledgeBase, isLoadingApi, setIsLoadingApi, resetApiError, setApiErrorWithTimeout, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage, setSentCompanionPromptsLog, setReceivedCompanionResponsesLog, performTagProcessing, setKnowledgeBase, logNpcAvatarPromptCallback, setCompanionInteractionLog]);

    const handleExitPrisonerScreen = useCallback(async (log: string[]) => {
        if (log.length > 0) {
            try {
              const summary = await summarizePrisonerInteraction(log);
              const summaryMessage: GameMessage = {
                  id: 'prisoner-summary-' + Date.now(), type: 'event_summary',
                  content: summary, timestamp: Date.now(),
                  turnNumber: knowledgeBase.playerStats.turn,
              };
              addMessageAndUpdateState([summaryMessage], knowledgeBase);
            } catch(err) {
                console.error("Failed to summarize prisoner interactions:", err);
                showNotification("Lỗi tóm tắt tương tác với tù nhân.", 'error');
            }
        }
        setPrisonerInteractionLog([]);
        setSentPrisonerPromptsLog([]);
        setReceivedPrisonerResponsesLog([]);
        setCurrentScreen(GameScreen.Gameplay);
    }, [knowledgeBase, addMessageAndUpdateState, showNotification, setCurrentScreen, setPrisonerInteractionLog, setSentPrisonerPromptsLog, setReceivedPrisonerResponsesLog]);
  
    const handleExitCompanionScreen = useCallback(async (log: string[]) => {
      if (log.length > 0) {
          try {
            const summary = await summarizeCompanionInteraction(log);
            const summaryMessage: GameMessage = {
                id: 'companion-summary-' + Date.now(), type: 'event_summary',
                content: summary, timestamp: Date.now(),
                turnNumber: knowledgeBase.playerStats.turn,
            };
            addMessageAndUpdateState([summaryMessage], knowledgeBase);
          } catch(err) {
              console.error("Failed to summarize companion interactions:", err);
              showNotification("Lỗi tóm tắt tương tác với bạn đồng hành.", 'error');
          }
      }
      setCompanionInteractionLog([]);
      setSentCompanionPromptsLog([]);
      setReceivedCompanionResponsesLog([]);
      setCurrentScreen(GameScreen.Gameplay);
    }, [knowledgeBase, addMessageAndUpdateState, showNotification, setCurrentScreen, setCompanionInteractionLog, setSentCompanionPromptsLog, setReceivedCompanionResponsesLog]);

    const handleBuySlave = useCallback((slave: Slave, vendorId: string) => {
        setKnowledgeBase(prevKb => {
            const newKb = JSON.parse(JSON.stringify(prevKb)) as KnowledgeBase;
            const vendor = newKb.discoveredNPCs.find((n: NPC) => n.id === vendorId);
            if (!vendor) return prevKb;
            const price = slave.value || 0;
            if (newKb.playerStats.currency < price) {
                showNotification(VIETNAMESE.notEnoughMoney, 'error');
                return prevKb;
            }
            newKb.playerStats.currency -= price;
            const { value, ...newSlaveForCollection } = slave;
            newKb.slaves.push(newSlaveForCollection as Slave);
            if (vendor.slavesForSale) {
                vendor.slavesForSale = vendor.slavesForSale.filter((s: Slave) => s.id !== slave.id);
            }
            showNotification(`Bạn đã mua nô lệ ${slave.name} với giá ${price.toLocaleString()}.`, 'success');
            return newKb;
        });
    }, [setKnowledgeBase, showNotification]);
    
    const handleSellSlave = useCallback((slaveId: string, vendorId: string) => {
        setKnowledgeBase(prevKb => {
            const newKb = JSON.parse(JSON.stringify(prevKb)) as KnowledgeBase;
            const slaveIndex = newKb.slaves.findIndex(s => s.id === slaveId);
            if (slaveIndex === -1) {
                showNotification("Không tìm thấy nô lệ để bán.", "error");
                return prevKb;
            }
            const slaveToSell = newKb.slaves[slaveIndex];
            const slaveRaceSystem = newKb.worldConfig?.raceCultivationSystems.find(rs => rs.raceName === slaveToSell.race)?.realmSystem || newKb.realmProgressionList.join(' - ');
            const slaveRealmProgression = slaveRaceSystem.split(' - ').map(s => s.trim());
            const calculatedValue = calculateSlaveValue(slaveToSell, slaveRealmProgression);
            const sellPrice = Math.floor(calculatedValue * 0.8);
            const vendor = newKb.discoveredNPCs.find(n => n.id === vendorId);
            if (!vendor) {
                showNotification(`Không tìm thấy thương nhân với ID ${vendorId}.`, "error");
                return prevKb;
            }
            newKb.slaves.splice(slaveIndex, 1);
            newKb.playerStats.currency += sellPrice;
            if (!vendor.slavesForSale) vendor.slavesForSale = [];
            const slaveForResale = {...slaveToSell, value: calculatedValue};
            vendor.slavesForSale.push(slaveForResale);
            showNotification(`Bạn đã bán nô lệ ${slaveToSell.name} với giá ${sellPrice.toLocaleString()}.`, 'success');
            return newKb;
        });
    }, [setKnowledgeBase, showNotification]);

    // --- COPIED FROM GameContext.tsx ---
    const renameSlave = useCallback((slaveId: string, newName: string) => {
        const trimmedName = newName.trim();
        if (!trimmedName) {
            showNotification("Tên không được để trống.", "error");
            return;
        }
    
        const slaveToRename = knowledgeBase.slaves.find(s => s.id === slaveId);
        if (!slaveToRename) {
            showNotification("Không tìm thấy nô lệ.", "error");
            return;
        }
    
        const allNames = [
            knowledgeBase.worldConfig?.playerName,
            ...knowledgeBase.discoveredNPCs.map(n => n.name),
            ...knowledgeBase.wives.map(w => w.name),
            ...knowledgeBase.slaves.filter(s => s.id !== slaveId).map(s => s.name),
            ...knowledgeBase.prisoners.map(p => p.name)
        ].filter(Boolean).map(n => (n || '').toLowerCase());
        
        if (allNames.includes(trimmedName.toLowerCase())) {
            showNotification(`Tên "${trimmedName}" đã tồn tại. Vui lòng chọn tên khác.`, "error");
            return;
        }
    
        const oldNameForTag = slaveToRename.name.replace(/"/g, '\\"');
        const newNameForTag = trimmedName.replace(/"/g, '\\"');
        const tag = `[SLAVE_UPDATE: name="${oldNameForTag}", newName="${newNameForTag}"]`;
        
        handleProcessDebugTags('', tag);
    
    }, [knowledgeBase, handleProcessDebugTags, showNotification]);

    const convertPrisoner = useCallback((prisonerId: string, targetType: 'wife' | 'slave') => {
        setKnowledgeBase(prevKb => {
            const newKb = JSON.parse(JSON.stringify(prevKb)) as KnowledgeBase;
            const prisonerIndex = newKb.prisoners.findIndex(p => p.id === prisonerId);
            if (prisonerIndex === -1) {
                showNotification(VIETNAMESE.prisonerConversionError, 'error');
                return prevKb;
            }

            const prisoner = newKb.prisoners[prisonerIndex];
            const { entityType, resistance, ...baseData } = prisoner;

            if (targetType === 'wife') {
                const newWife: Wife = {
                    ...baseData,
                    entityType: 'wife',
                    skills: [],
                    equippedItems: { mainWeapon: null, offHandWeapon: null, head: null, body: null, hands: null, legs: null, artifact: null, pet: null, accessory1: null, accessory2: null },
                };
                newKb.wives.push(newWife);
            } else { // 'slave'
                const newSlave: Slave = {
                    ...baseData,
                    entityType: 'slave',
                    skills: [],
                    equippedItems: { mainWeapon: null, offHandWeapon: null, head: null, body: null, hands: null, legs: null, artifact: null, pet: null, accessory1: null, accessory2: null },
                };
                newKb.slaves.push(newSlave);
            }

            newKb.prisoners.splice(prisonerIndex, 1);
            showNotification(VIETNAMESE.prisonerConverted(prisoner.name, targetType), 'success');
            return newKb;
        });
    }, [setKnowledgeBase, showNotification]);

    return {
        handlePrisonerAction,
        handleCompanionAction,
        handleExitPrisonerScreen,
        handleExitCompanionScreen,
        handleBuySlave,
        handleSellSlave,
        renameSlave,
        convertPrisoner
    };
};
