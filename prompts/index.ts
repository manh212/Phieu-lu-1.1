import { generateInitialPrompt } from './initialPrompt';
import { generateContinuePrompt } from './continuePrompt';
import { generateWorldDetailsPrompt } from './generateWorldDetailsPrompt';
import { generateFanfictionWorldDetailsPrompt } from './generateFanfictionWorldDetailsPrompt';
import { generateSummarizePagePrompt } from './summarizePagePrompt';
import { generateCraftItemPrompt } from './craftItemPrompt';
import { generateSummarizeCombatPrompt } from './summarizeCombatPrompt';
import { generateNonCombatDefeatConsequencePrompt } from './nonCombatDefeatConsequencePrompt';
import { generateAuctionDataPrompt } from './generateAuctionDataPrompt';
import { runAuctionTurnPrompt } from './runAuctionTurnPrompt';
import { generateEconomyLocationsPrompt } from './generateEconomyLocationsPrompt';
import { generateGeneralSubLocationsPrompt } from './generateGeneralSubLocationsPrompt';
import { runAuctioneerCallPrompt } from './runAuctioneerCallPrompt';
import { generateFindLocationPrompt } from './findLocationPrompt';
import { generateCultivationSessionPrompt } from './cultivationPrompt';
import { generateSummarizeCultivationPrompt } from './summarizeCultivationPrompt';
import { generateCompanionInteractionPrompt } from './companionInteractionPrompt';
import { generatePrisonerInteractionPrompt } from './prisonerInteractionPrompt';
import { generateSummarizeCompanionInteractionPrompt } from './summarizeCompanionInteractionPrompt';
import { generateSummarizePrisonerInteractionPrompt } from './summarizePrisonerInteractionPrompt';
import { generateRestockVendorPrompt } from './restockVendorPrompt';
import { generateContinuePrisonPrompt } from './continueprisonPrompt';
import { generateSlaveAuctionDataPrompt } from './generateSlaveAuctionDataPrompt';
import { runSlaveAuctionTurnPrompt } from './runSlaveAuctionTurnPrompt';
import { runSlaveAuctioneerCallPrompt } from './runSlaveAuctioneerCallPrompt';
import { generateCompletionPrompt } from './completeWorldDetailsPrompt'; // NEW IMPORT
import { generateAnalyzeStylePrompt } from './analyzeStylePrompt';
import { generateRefreshChoicesPrompt } from './refreshChoicesPrompt';
import { generateAICopilotPrompt } from './copilotPrompt'; // NEW IMPORT
import { buildWorldTickPrompt } from './livingWorldPrompt'; // NEW: For Living World
import { generateArchitectPrompt } from './architectPrompt'; // NEW IMPORT


export const PROMPT_FUNCTIONS = {
  initial: generateInitialPrompt,
  continue: generateContinuePrompt,
  generateWorldDetails: generateWorldDetailsPrompt,
  generateFanfictionWorldDetails: generateFanfictionWorldDetailsPrompt,
  summarizePage: generateSummarizePagePrompt,
  craftItem: generateCraftItemPrompt,
  summarizeCombat: generateSummarizeCombatPrompt,
  generateNonCombatDefeatConsequence: generateNonCombatDefeatConsequencePrompt,
  generateAuctionData: generateAuctionDataPrompt,
  runAuctionTurn: runAuctionTurnPrompt,
  runAuctioneerCall: runAuctioneerCallPrompt,
  generateEconomyLocations: generateEconomyLocationsPrompt,
  generateGeneralSubLocations: generateGeneralSubLocationsPrompt,
  findLocation: generateFindLocationPrompt,
  cultivationSession: generateCultivationSessionPrompt,
  summarizeCultivation: generateSummarizeCultivationPrompt,
  companionInteraction: generateCompanionInteractionPrompt,
  prisonerInteraction: generatePrisonerInteractionPrompt,
  summarizeCompanionInteraction: generateSummarizeCompanionInteractionPrompt,
  summarizePrisonerInteraction: generateSummarizePrisonerInteractionPrompt,
  restockVendor: generateRestockVendorPrompt,
  continuePrison: generateContinuePrisonPrompt,
  generateSlaveAuctionData: generateSlaveAuctionDataPrompt, // NEW
  runSlaveAuctionTurn: runSlaveAuctionTurnPrompt, // NEW
  runSlaveAuctioneerCall: runSlaveAuctioneerCallPrompt, // NEW
  completeWorldDetails: generateCompletionPrompt, // NEW
  analyzeStyle: generateAnalyzeStylePrompt, // NEW
  refreshChoices: generateRefreshChoicesPrompt, // NEW
  copilot: generateAICopilotPrompt, // NEW
  livingWorldTick: buildWorldTickPrompt, // NEW
  architect: generateArchitectPrompt, // NEW
};

// It's good practice to also export the type if other modules might need to know the shape of PROMPT_FUNCTIONS
export type PromptFunctionsType = typeof PROMPT_FUNCTIONS;