// constants/knowledgeBase.ts
import type { KnowledgeBase, AIContextConfig } from '@/types/index';
import { DEFAULT_PLAYER_STATS } from './character';
import { MAX_AUTO_SAVE_SLOTS } from './game';
import { DEFAULT_AI_CONTEXT_CONFIG } from '../utils/gameLogicUtils';
import { DEFAULT_AI_RULEBOOK } from './systemRulesNormal';
import { DEFAULT_PROMPT_STRUCTURE } from './promptStructure'; // NEW IMPORT

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
  aiContextConfig: { ...DEFAULT_AI_CONTEXT_CONFIG }, // Kept for migration
  aiRulebook: { ...DEFAULT_AI_RULEBOOK }, 
  // FIX: Add missing promptStructure property to match the KnowledgeBase type.
  promptStructure: JSON.parse(JSON.stringify(DEFAULT_PROMPT_STRUCTURE)), // NEW: Initialize with default structure
  stagedActions: {}, // NEW: Initialize with empty object
  aiCopilotConfigs: [], // NEW
  activeAICopilotConfigId: null, // NEW
  // NEW: Living World State
  isWorldTicking: false,
  lastWorldTickDate: { day: 1, month: 1, year: 1, hour: 0, minute: 0 },
  previousConditionStates: {}, // NEW
  narrativeDirectiveForNextTurn: undefined,
};