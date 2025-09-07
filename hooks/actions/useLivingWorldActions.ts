// src/utils/actions/useLivingWorldActions.ts
// FIX: Correct import path for types
import { KnowledgeBase, GameMessage, NPC, ActivityLogEntry } from '@/types/index';
import { generateWorldTickUpdate } from '../../services';
// FIX: Added PROMPT_FUNCTIONS to imports
import {
    scheduleWorldTick,
    parseAndValidateResponse,
    convertNpcActionToTag,
    performTagProcessing,
} from '../../utils/gameLogicUtils';
import { PROMPT_FUNCTIONS } from '../../prompts';
import { useCallback } from 'react';

export interface UseLivingWorldActionsProps {
    knowledgeBase: KnowledgeBase;
    setKnowledgeBase: React.Dispatch<React.SetStateAction<KnowledgeBase>>;
    addMessageAndUpdateState: (newMessages: GameMessage[], newKnowledgeBase: KnowledgeBase, callback?: () => void) => void;
    showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
    logNpcAvatarPromptCallback: (prompt: string) => void;

    // Log setters
    setSentLivingWorldPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
    setRawLivingWorldResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
    setLastScoredNpcsForTick: React.Dispatch<React.SetStateAction<{ npc: NPC, score: number }[]>>;
}

export const useLivingWorldActions = (props: UseLivingWorldActionsProps) => {
    const {
        knowledgeBase, setKnowledgeBase,
        addMessageAndUpdateState, showNotification,
        logNpcAvatarPromptCallback,
        setSentLivingWorldPromptsLog, setRawLivingWorldResponsesLog,
        setLastScoredNpcsForTick
    } = props;

    const executeWorldTick = useCallback(async (kbForTick: KnowledgeBase): Promise<{ updatedKb: KnowledgeBase; worldEventMessages: GameMessage[] }> => {
        setKnowledgeBase(prev => ({...prev, isWorldTicking: true}));
        try {
            const npcsToTick = scheduleWorldTick(kbForTick);
            setLastScoredNpcsForTick(npcsToTick.map(npc => ({ npc, score: npc.tickPriorityScore! })));

            if (npcsToTick.length === 0) {
                const updatedKb = JSON.parse(JSON.stringify(kbForTick));
                updatedKb.lastWorldTickDate = updatedKb.worldDate;
                return { updatedKb, worldEventMessages: [] };
            }

            const prompt = PROMPT_FUNCTIONS.livingWorldTick(kbForTick, npcsToTick);
            setSentLivingWorldPromptsLog(prev => [prompt, ...prev].slice(0, 10));

            const jsonResponse = await generateWorldTickUpdate(prompt);
            setRawLivingWorldResponsesLog(prev => [jsonResponse, ...prev].slice(0, 10));

            const worldUpdate = parseAndValidateResponse(jsonResponse, kbForTick);
            if (!worldUpdate) {
                console.warn("World tick update was null after parsing/validation. Skipping this tick.");
                showNotification("AI phản hồi không hợp lệ cho thế giới sống.", "warning");
                 const updatedKb = JSON.parse(JSON.stringify(kbForTick));
                 updatedKb.lastWorldTickDate = updatedKb.worldDate;
                return { updatedKb, worldEventMessages: [] };
            }

            let workingKb = JSON.parse(JSON.stringify(kbForTick));
            const turnForMessages = workingKb.playerStats.turn;
            const worldEventMessages: GameMessage[] = [];
            
            for (const plan of worldUpdate.npcUpdates) {
                const npcIndex = workingKb.discoveredNPCs.findIndex((n: NPC) => n.id === plan.npcId);
                if (npcIndex === -1) continue;

                const npc = workingKb.discoveredNPCs[npcIndex];

                if (!npc.activityLog) npc.activityLog = [];
                
                npc.lastTickTurn = turnForMessages;
                
                let tagsToProcess: string[] = [];

                for (const action of plan.actions) {
                    const tag = convertNpcActionToTag(action, npc);
                    if (tag) {
                        if (Array.isArray(tag)) {
                            tagsToProcess.push(...tag);
                        } else {
                            tagsToProcess.push(tag);
                        }
                    }
                    
                    const logEntry: ActivityLogEntry = {
                        turnNumber: turnForMessages,
                        locationId: npc.locationId || 'unknown',
                        description: action.reason,
                    };
                    npc.activityLog.push(logEntry);

                    if (npc.activityLog.length > 30) npc.activityLog = npc.activityLog.slice(-30);

                    worldEventMessages.push({
                        id: `world-event-${npc.id}-${Date.now()}-${Math.random()}`,
                        type: 'system',
                        content: `[Thế giới sống] ${action.reason}`,
                        timestamp: Date.now(),
                        turnNumber: turnForMessages
                    });
                }
                
                if (tagsToProcess.length > 0) {
                    const { newKb } = await performTagProcessing(workingKb, tagsToProcess, turnForMessages, setKnowledgeBase, logNpcAvatarPromptCallback);
                    workingKb = newKb;
                }
            }
            
            workingKb.lastWorldTickDate = workingKb.worldDate;
            
            return { updatedKb: workingKb, worldEventMessages };

        } catch (error) {
            console.error("An error occurred during executeWorldTick:", error);
            const errorMsg = error instanceof Error ? error.message : "Lỗi không xác định trong quá trình thế giới vận động.";
            showNotification(`Lỗi World Tick: ${errorMsg}`, "error");
            const updatedKb = JSON.parse(JSON.stringify(kbForTick));
            updatedKb.lastWorldTickDate = updatedKb.worldDate;
            return { updatedKb, worldEventMessages: [] };
        } finally {
          setKnowledgeBase(prev => ({...prev, isWorldTicking: false}));
        }
    }, [setKnowledgeBase, logNpcAvatarPromptCallback, showNotification, setLastScoredNpcsForTick, setRawLivingWorldResponsesLog, setSentLivingWorldPromptsLog]);

    const handleManualTick = useCallback(async () => {
        if (knowledgeBase.isWorldTicking) {
            showNotification("Thế giới đang vận động, vui lòng chờ.", "info");
            return;
        }
        const { updatedKb, worldEventMessages } = await executeWorldTick(knowledgeBase);
        addMessageAndUpdateState(worldEventMessages, updatedKb);
    }, [knowledgeBase, executeWorldTick, showNotification, addMessageAndUpdateState]);
    
    return {
        executeWorldTick,
        handleManualTick,
    };
};
