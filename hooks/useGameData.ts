import { useState, useCallback } from 'react';
import { KnowledgeBase, GameMessage, CombatEndPayload, NPC, AIPresetCollection } from '@/types/index';
import { INITIAL_KNOWLEDGE_BASE } from '../constants';
import { calculateTotalPages, getMessagesForPage } from '../utils/gameLogicUtils';


export const useGameData = () => {
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>(
    JSON.parse(JSON.stringify(INITIAL_KNOWLEDGE_BASE))
  );
  const [gameMessages, setGameMessages] = useState<GameMessage[]>([]);
  const [aiCopilotMessages, setAiCopilotMessages] = useState<GameMessage[]>([]); // For voice chat
  const [aiArchitectMessages, setAiArchitectMessages] = useState<GameMessage[]>([]); // NEW: For text chat
  const [sentCopilotPromptsLog, setSentCopilotPromptsLog] = useState<string[]>([]);
  const [rawAiResponsesLog, setRawAiResponsesLog] = useState<string[]>([]);
  const [aiThinkingLog, setAiThinkingLog] = useState<string[]>([]); // NEW: For AI thinking process
  const [sentPromptsLog, setSentPromptsLog] = useState<string[]>([]);
  const [sentEconomyPromptsLog, setSentEconomyPromptsLog] = useState<string[]>([]);
  const [receivedEconomyResponsesLog, setReceivedEconomyResponsesLog] = useState<string[]>([]);
  const [sentGeneralSubLocationPromptsLog, setSentGeneralSubLocationPromptsLog] = useState<string[]>([]);
  const [receivedGeneralSubLocationResponsesLog, setReceivedGeneralSubLocationResponsesLog] = useState<string[]>([]);
  const [latestPromptTokenCount, setLatestPromptTokenCount] = useState<number | null | string>(null);
  const [summarizationResponsesLog, setSummarizationResponsesLog] = useState<string[]>([]);
  const [sentCraftingPromptsLog, setSentCraftingPromptsLog] = useState<string[]>([]);
  const [receivedCraftingResponsesLog, setReceivedCraftingResponsesLog] = useState<string[]>([]);
  const [sentCultivationPromptsLog, setSentCultivationPromptsLog] = useState<string[]>([]);
  const [receivedCultivationResponsesLog, setReceivedCultivationResponsesLog] = useState<string[]>([]);
  const [companionInteractionLog, setCompanionInteractionLog] = useState<string[]>([]);
  const [prisonerInteractionLog, setPrisonerInteractionLog] = useState<string[]>([]);
  const [sentPrisonerPromptsLog, setSentPrisonerPromptsLog] = useState<string[]>([]);
  const [receivedPrisonerResponsesLog, setReceivedPrisonerResponsesLog] = useState<string[]>([]);
  const [sentCompanionPromptsLog, setSentCompanionPromptsLog] = useState<string[]>([]);
  const [receivedCompanionResponsesLog, setReceivedCompanionResponsesLog] = useState<string[]>([]);
  const [retrievedRagContextLog, setRetrievedRagContextLog] = useState<string[]>([]); // NEW
  const [aiPresets, setAiPresets] = useState<AIPresetCollection>({}); // NEW: State for AI Presets
  
  // New logs for post-combat AI interactions
  const [sentCombatSummaryPromptsLog, setSentCombatSummaryPromptsLog] = useState<string[]>([]);
  const [receivedCombatSummaryResponsesLog, setReceivedCombatSummaryResponsesLog] = useState<string[]>([]);
  const [sentVictoryConsequencePromptsLog, setSentVictoryConsequencePromptsLog] = useState<string[]>([]);
  const [receivedVictoryConsequenceResponsesLog, setReceivedVictoryConsequenceResponsesLog] = useState<string[]>([]);

  // NEW: State for Living World Debugging (Phase 4)
  const [sentLivingWorldPromptsLog, setSentLivingWorldPromptsLog] = useState<string[]>([]);
  const [rawLivingWorldResponsesLog, setRawLivingWorldResponsesLog] = useState<string[]>([]);
  const [lastScoredNpcsForTick, setLastScoredNpcsForTick] = useState<{ npc: NPC, score: number }[]>([]);
  
  const [currentPageDisplay, setCurrentPageDisplay] = useState<number>(1);
  const [messageIdBeingEdited, setMessageIdBeingEdited] = useState<string | null>(null);

  const totalPages = calculateTotalPages(knowledgeBase);
  
  const getMessagesForPageCallback = useCallback((pageNumber: number) => {
    return getMessagesForPage(pageNumber, knowledgeBase, gameMessages);
  }, [knowledgeBase, gameMessages]);

  const addMessageAndUpdateState = useCallback((
    newMessages: GameMessage[],
    newKnowledgeBase: KnowledgeBase,
    callback?: () => void
  ) => {
    setGameMessages(prev => [...prev, ...newMessages]);
    setKnowledgeBase(newKnowledgeBase);
    if (callback) callback();
  }, [setGameMessages, setKnowledgeBase]);
  
  const resetGameData = useCallback(() => {
    setKnowledgeBase(JSON.parse(JSON.stringify(INITIAL_KNOWLEDGE_BASE)));
    setGameMessages([]);
    setAiCopilotMessages([]);
    setAiArchitectMessages([]); // NEW
    setSentCopilotPromptsLog([]);
    setRawAiResponsesLog([]);
    setAiThinkingLog([]); // NEW
    setSentPromptsLog([]);
    setSentEconomyPromptsLog([]);
    setReceivedEconomyResponsesLog([]);
    setSentGeneralSubLocationPromptsLog([]);
    setReceivedGeneralSubLocationResponsesLog([]);
    setLatestPromptTokenCount(null);
    setSummarizationResponsesLog([]);
    setSentCraftingPromptsLog([]);
    setReceivedCraftingResponsesLog([]);
    setSentCultivationPromptsLog([]);
    setReceivedCultivationResponsesLog([]);
    setCompanionInteractionLog([]);
    setPrisonerInteractionLog([]);
    setSentPrisonerPromptsLog([]);
    setReceivedPrisonerResponsesLog([]);
    setSentCompanionPromptsLog([]);
    setReceivedCompanionResponsesLog([]);
    setRetrievedRagContextLog([]); // NEW
    // Reset new logs
    setSentCombatSummaryPromptsLog([]);
    setReceivedCombatSummaryResponsesLog([]);
    setSentVictoryConsequencePromptsLog([]);
    setReceivedVictoryConsequenceResponsesLog([]);
    // Reset Living World Debug Logs
    setSentLivingWorldPromptsLog([]);
    setRawLivingWorldResponsesLog([]);
    setLastScoredNpcsForTick([]);
    setCurrentPageDisplay(1);
    setMessageIdBeingEdited(null);
  }, []);


  return {
    knowledgeBase,
    setKnowledgeBase,
    gameMessages,
    setGameMessages,
    aiCopilotMessages, 
    setAiCopilotMessages, 
    aiArchitectMessages, // NEW
    setAiArchitectMessages, // NEW
    sentCopilotPromptsLog, 
    setSentCopilotPromptsLog, 
    rawAiResponsesLog,
    setRawAiResponsesLog,
    aiThinkingLog, // NEW
    setAiThinkingLog, // NEW
    sentPromptsLog,
    setSentPromptsLog,
    sentEconomyPromptsLog,
    setSentEconomyPromptsLog,
    receivedEconomyResponsesLog,
    setReceivedEconomyResponsesLog,
    sentGeneralSubLocationPromptsLog,
    setSentGeneralSubLocationPromptsLog,
    receivedGeneralSubLocationResponsesLog,
    setReceivedGeneralSubLocationResponsesLog,
    latestPromptTokenCount,
    setLatestPromptTokenCount,
    summarizationResponsesLog,
    setSummarizationResponsesLog,
    sentCraftingPromptsLog,
    setSentCraftingPromptsLog,
    receivedCraftingResponsesLog,
    setReceivedCraftingResponsesLog,
    sentCultivationPromptsLog,
    setSentCultivationPromptsLog,
    receivedCultivationResponsesLog,
    setReceivedCultivationResponsesLog,
    companionInteractionLog,
    setCompanionInteractionLog,
    prisonerInteractionLog,
    setPrisonerInteractionLog,
    sentPrisonerPromptsLog,
    setSentPrisonerPromptsLog,
    receivedPrisonerResponsesLog,
    setReceivedPrisonerResponsesLog,
    sentCompanionPromptsLog,
    setSentCompanionPromptsLog,
    receivedCompanionResponsesLog,
    setReceivedCompanionResponsesLog,
    retrievedRagContextLog, // NEW
    setRetrievedRagContextLog, // NEW
    aiPresets, // NEW
    setAiPresets, // NEW
    // New states for post-combat logs
    sentCombatSummaryPromptsLog,
    setSentCombatSummaryPromptsLog,
    receivedCombatSummaryResponsesLog,
    setReceivedCombatSummaryResponsesLog,
    sentVictoryConsequencePromptsLog,
    setSentVictoryConsequencePromptsLog,
    receivedVictoryConsequenceResponsesLog,
    setReceivedVictoryConsequenceResponsesLog,
    // Living World Debug States
    sentLivingWorldPromptsLog,
    setSentLivingWorldPromptsLog,
    rawLivingWorldResponsesLog,
    setRawLivingWorldResponsesLog,
    lastScoredNpcsForTick,
    setLastScoredNpcsForTick,
    currentPageDisplay,
    setCurrentPageDisplay,
    totalPages,
    messageIdBeingEdited,
    setMessageIdBeingEdited,
    getMessagesForPage: getMessagesForPageCallback,
    addMessageAndUpdateState,
    resetGameData
  };
};
