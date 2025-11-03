// FIX: Correct import path for types
import { KnowledgeBase, AIContextConfig } from './types/index';
import { DEFAULT_PLAYER_STATS } from './constants';
import { MAX_AUTO_SAVE_SLOTS } from './constants';
import { DEFAULT_AI_CONTEXT_CONFIG } from './utils/gameLogicUtils';
import { DEFAULT_AI_RULEBOOK } from './constants/systemRulesNormal';
// FIX: Import the default prompt structure to initialize the missing property.
import { DEFAULT_PROMPT_STRUCTURE } from './constants/promptStructure';

export const INITIAL_KNOWLEDGE_BASE: KnowledgeBase = {
  playerStats: { ...DEFAULT_PLAYER_STATS },
  inventory: [],
  equippedItems: {
    mainWeapon: null,
    offHandWeapon: null,
    head: null,
    body: null,
    hands: null,
    legs: null,
    artifact: null,
    pet: null,
    accessory1: null,
    accessory2: null,
  },
  playerSkills: [],
  allQuests: [],
  discoveredNPCs: [],
  discoveredYeuThu: [], // New
  discoveredLocations: [],
  discoveredFactions: [],
  realmProgressionList: [],
  currentRealmBaseStats: {},
  worldConfig: null,
  companions: [],
  worldLore: [],
  worldDate: { day: 1, month: 1, year: 1, hour: 8, minute: 0 }, 
  pageSummaries: {},
  currentPageHistory: [1],
  lastSummarizedTurn: 0,
  turnHistory: [],
  autoSaveTurnCounter: 0,
  currentAutoSaveSlotIndex: 0,
  autoSaveSlotIds: Array(MAX_AUTO_SAVE_SLOTS).fill(null),
  manualSaveId: null,
  manualSaveName: null,
  playerAvatarData: undefined,
  discoveredRegions: [],
  currentLocationId: undefined,
  auctionState: null,
  slaveAuctionState: null, // New
  postCombatState: null, // NEW
  pendingOpponentIdsForCombat: null, // NEW for combat init
  userPrompts: [], // NEW
  // New Entities
  prisoners: [],
  wives: [],
  slaves: [],
  master: null,
  gameEvents: [], // NEW: For event system
  ragVectorStore: { vectors: [], metadata: [] }, // UPDATED: Use metadata instead of texts
  aiContextConfig: { ...DEFAULT_AI_CONTEXT_CONFIG }, // NEW: Initialize with default values
  // FIX: Added missing properties to match the KnowledgeBase type.
  aiRulebook: { ...DEFAULT_AI_RULEBOOK }, // NEW: Initialize with default rule content
  // FIX: Added missing 'promptStructure' property to satisfy the KnowledgeBase type.
  promptStructure: JSON.parse(JSON.stringify(DEFAULT_PROMPT_STRUCTURE)),
  stagedActions: {}, // NEW: Initialize with empty object
  aiCopilotConfigs: [], // NEW
  activeAICopilotConfigId: null, // NEW
  // NEW: Living World State
  isWorldTicking: false,
  lastWorldTickDate: { day: 1, month: 1, year: 1, hour: 0, minute: 0 },
  narrativeDirectiveForNextTurn: undefined,
};