import { useCallback } from 'react';
import {
    KnowledgeBase, GameMessage, GameScreen, CombatEndPayload
} from '../../types';
import {
    generateVictoryConsequence,
    summarizeCombat,
    generateDefeatConsequence,
    generateNonCombatDefeatConsequence
} from '../../services/geminiService';
import { performTagProcessing } from '../../utils/tagProcessingUtils';
import { VIETNAMESE } from '../../constants';

export interface UsePostCombatActionsProps {
    knowledgeBase: KnowledgeBase;
    setKnowledgeBase: React.Dispatch<React.SetStateAction<KnowledgeBase>>;
    isLoadingApi: boolean;
    setIsLoadingApi: React.Dispatch<React.SetStateAction<boolean>>;
    resetApiError: () => void;
    setApiErrorWithTimeout: (message: string | null) => void;
    showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
    addMessageAndUpdateState: (newMessages: GameMessage[], newKnowledgeBase: KnowledgeBase, callback?: () => void) => void;
    setCurrentScreen: (screen: GameScreen) => void;
    onQuit: () => void;
    logNpcAvatarPromptCallback: (prompt: string) => void;

    // Log setters
    setRawAiResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
    setSentPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
    setSentCombatSummaryPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
    setReceivedCombatSummaryResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
    setSentVictoryConsequencePromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
    setReceivedVictoryConsequenceResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;

    // Context for prompts
    currentPageMessagesLog: string;
    previousPageSummaries: string[];
    lastNarrationFromPreviousPage?: string;
}

export const usePostCombatActions = (props: UsePostCombatActionsProps) => {
    const {
        knowledgeBase, setKnowledgeBase,
        isLoadingApi, setIsLoadingApi,
        resetApiError, setApiErrorWithTimeout,
        showNotification, addMessageAndUpdateState, setCurrentScreen,
        onQuit, logNpcAvatarPromptCallback,
        setRawAiResponsesLog, setSentPromptsLog,
        setSentCombatSummaryPromptsLog, setReceivedCombatSummaryResponsesLog,
        setSentVictoryConsequencePromptsLog, setReceivedVictoryConsequenceResponsesLog,
        currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage
    } = props;

    const handleCombatEnd = useCallback(async (result: CombatEndPayload) => {
        setIsLoadingApi(true);
        resetApiError();
        const kbAfterCombat = { ...knowledgeBase, playerStats: result.finalPlayerState, pendingCombat: null, postCombatState: null };
        setKnowledgeBase(kbAfterCombat);

        try {
            const summary = await summarizeCombat(
                result.summary.split('\n'), result.outcome,
                (prompt) => setSentCombatSummaryPromptsLog(prev => [prompt, ...prev].slice(0, 10))
            );
            setReceivedCombatSummaryResponsesLog(prev => [summary, ...prev].slice(0, 10));
            const updatedResultWithSummary = { ...result, summary };
            
            const summaryMessage: GameMessage = {
                id: 'combat-summary-' + Date.now(), type: 'event_summary',
                content: `Tóm tắt trận chiến: ${summary}`,
                timestamp: Date.now(), turnNumber: kbAfterCombat.playerStats.turn
            };
            addMessageAndUpdateState([summaryMessage], kbAfterCombat);

            if (result.outcome === 'victory' || result.outcome === 'surrendered') {
                const { response: consequenceResponse, rawText } = await generateVictoryConsequence(
                    kbAfterCombat, updatedResultWithSummary, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage,
                    (prompt) => setSentVictoryConsequencePromptsLog(prev => [prompt, ...prev].slice(0, 10))
                );
                setReceivedVictoryConsequenceResponsesLog(prev => [rawText, ...prev].slice(0, 10));
                const { newKb: kbAfterTags, systemMessagesFromTags } = await performTagProcessing(
                    kbAfterCombat, consequenceResponse.tags, kbAfterCombat.playerStats.turn + 1, setKnowledgeBase, logNpcAvatarPromptCallback
                );
                const finalMessages: GameMessage[] = [ ...systemMessagesFromTags, {
                    id: 'victory-consequence-' + Date.now(), type: 'narration', content: consequenceResponse.narration,
                    timestamp: Date.now(), choices: consequenceResponse.choices, turnNumber: kbAfterTags.playerStats.turn
                }];
                addMessageAndUpdateState(finalMessages, kbAfterTags);
            } else if (result.outcome === 'defeat') {
                const { response: consequenceResponse, rawText } = await generateDefeatConsequence(
                    kbAfterCombat, updatedResultWithSummary, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage,
                    (prompt) => setSentVictoryConsequencePromptsLog(prev => [prompt, ...prev].slice(0, 10))
                );
                setReceivedVictoryConsequenceResponsesLog(prev => [rawText, ...prev].slice(0, 10));
                const { newKb: kbAfterTags, systemMessagesFromTags } = await performTagProcessing(
                    kbAfterCombat, consequenceResponse.tags, kbAfterCombat.playerStats.turn + 1, setKnowledgeBase, logNpcAvatarPromptCallback
                );
                const finalMessages: GameMessage[] = [ ...systemMessagesFromTags, {
                    id: 'defeat-consequence-' + Date.now(), type: 'narration', content: consequenceResponse.narration,
                    timestamp: Date.now(), choices: consequenceResponse.choices, turnNumber: kbAfterTags.playerStats.turn
                }];
                addMessageAndUpdateState(finalMessages, kbAfterTags);
            }
            setCurrentScreen(GameScreen.Gameplay);
        } catch (error) {
            const errorMsg = `Lỗi tạo hậu quả sau trận chiến: ${error instanceof Error ? error.message : String(error)}`;
            setApiErrorWithTimeout(errorMsg);
            setCurrentScreen(GameScreen.Gameplay);
        } finally {
            setIsLoadingApi(false);
        }
    }, [
        knowledgeBase, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage,
        addMessageAndUpdateState, setIsLoadingApi, resetApiError,
        setSentCombatSummaryPromptsLog, setReceivedCombatSummaryResponsesLog,
        setSentVictoryConsequencePromptsLog, setReceivedVictoryConsequenceResponsesLog,
        setKnowledgeBase, logNpcAvatarPromptCallback, setCurrentScreen, setApiErrorWithTimeout
    ]);

    const handleNonCombatDefeat = useCallback(async (kbStateAtDefeat: KnowledgeBase, fatalNarration?: string) => {
        if (kbStateAtDefeat.playerStats.playerSpecialStatus) {
            showNotification("Bạn đã gục ngã nhưng số phận của bạn nằm trong tay chủ nhân.", "warning");
            const newKb = JSON.parse(JSON.stringify(kbStateAtDefeat));
            if (newKb.playerStats.sinhLuc <= 0) newKb.playerStats.sinhLuc = 1;
            const systemMessage: GameMessage = {
                id: `non-combat-defeat-prevented-${Date.now()}`, type: 'system',
                content: `Bạn đã gục ngã, nhưng vì đang là ${newKb.playerStats.playerSpecialStatus.type === 'prisoner' ? 'tù nhân' : 'nô lệ'}, bạn không thể chết. Số phận của bạn sẽ do ${newKb.playerStats.playerSpecialStatus.ownerName} quyết định.`,
                timestamp: Date.now(), turnNumber: newKb.playerStats.turn
            };
            addMessageAndUpdateState([systemMessage], newKb);
            setIsLoadingApi(false);
            return;
        }

        setIsLoadingApi(true);
        resetApiError();
        showNotification("Bạn đã gục ngã! AI đang quyết định số phận của bạn...", 'warning');

        try {
            const { response, rawText } = await generateNonCombatDefeatConsequence(
                kbStateAtDefeat, currentPageMessagesLog, previousPageSummaries,
                fatalNarration || 'Bạn đã gục ngã do một sự kiện không rõ.',
                lastNarrationFromPreviousPage,
                (prompt) => setSentPromptsLog(prev => [prompt, ...prev].slice(0, 10))
            );
            setRawAiResponsesLog(prev => [rawText, ...prev].slice(0, 50));

            const { newKb: kbAfterTags, systemMessagesFromTags } = await performTagProcessing(
                kbStateAtDefeat, response.tags, kbStateAtDefeat.playerStats.turn + 1,
                setKnowledgeBase, logNpcAvatarPromptCallback
            );
            kbAfterTags.pendingCombat = null;

            const narrationMessage: GameMessage = {
                id: 'non-combat-defeat-narration-' + Date.now(), type: 'narration',
                content: response.narration, timestamp: Date.now(),
                choices: response.choices, turnNumber: kbAfterTags.playerStats.turn,
            };
            addMessageAndUpdateState([narrationMessage, ...systemMessagesFromTags], kbAfterTags);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Lỗi khi xử lý hậu quả.";
            setApiErrorWithTimeout(errorMsg);
            onQuit();
        } finally {
            setIsLoadingApi(false);
        }
    }, [addMessageAndUpdateState, showNotification, setIsLoadingApi, setApiErrorWithTimeout, setRawAiResponsesLog, setSentPromptsLog, resetApiError, onQuit, setKnowledgeBase, logNpcAvatarPromptCallback, currentPageMessagesLog, lastNarrationFromPreviousPage, previousPageSummaries]);


    return {
        handleCombatEnd,
        handleNonCombatDefeat,
    };
};
