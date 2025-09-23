// types/game.ts
import { Operation as JsonPatchOperation } from 'fast-json-patch';
// FIX: Changed barrel file imports to direct file imports to break circular dependencies.
// FIX: Removed 'ActivityLogEntry' from this import as it will be moved to 'character.ts'.
import type { NPC, Wife, Slave, Prisoner, Master, Companion } from './entities/npc';
import type { PlayerStats, ComplexCompanionBase, RealmBaseStatDefinition, ActivityLogEntry } from './entities/character';
import type { Item, EquipmentSlotId } from './entities/item';
import type { Skill } from './entities/skill';
import type { Quest, GameLocation, Faction, WorldLoreEntry, Region, GameEvent, WorldDate, YeuThu } from './entities/world';
import type { CombatEndPayload, StagedAction } from './features';
import type { AuctionState, SlaveAuctionState } from './features';
import type { WorldSettings } from './setup';
import type { AIContextConfig, AICopilotConfig, AIRulebook } from './config';

export interface TurnHistoryEntry {
  turnNumber: number;
  type: 'keyframe' | 'delta';
  knowledgeBaseSnapshot: KnowledgeBase;
  knowledgeBaseDelta?: JsonPatchOperation[];
  gameMessagesSnapshot: GameMessage[];
  gameMessagesDelta?: JsonPatchOperation[];
}

export interface AiChoice {
  text: string;
  actionTag?: string;
}

export interface ParsedAiResponse {
  narration: string;
  choices: AiChoice[];
  tags: string[];
  systemMessage?: string;
  groundingMetadata?: any;
}

export interface CombatLogContent {
    type: 'action' | 'info';
    actorId?: string;
    actorName?: string;
    targetId?: string;
    targetName?: string;
    actionName?: string;
    damage?: number;
    healing?: number;
    didCrit?: boolean;
    didEvade?: boolean;
    finalTargetHp?: number;
    maxTargetHp?: number;
    isPlayerActor?: boolean;
    isPlayerTarget?: boolean;
    effect?: string;
    message: string;
    turnNumber?: number;
}

export type GameMessageContent = string | CombatLogContent;

export interface GameMessage {
  id: string;
  type: 'narration' | 'player_action' | 'system' | 'error' | 'page_summary' | 'event_summary' | 'combat_log';
  content: GameMessageContent;
  timestamp: number;
  choices?: AiChoice[];
  isPlayerInput?: boolean; 
  turnNumber: number; 
  actionTags?: string[];
  groundingMetadata?: { web?: { uri: string; title: string; } }[];
}

export interface SaveGameMeta {
  id: string;
  name: string;
  timestamp: Date;
  size?: number;
}

export interface SaveGameData {
  id?: string | number; 
  name: string;
  timestamp: Date | string;
  knowledgeBase: KnowledgeBase;
  gameMessages: GameMessage[];
  appVersion?: string;
  userId?: string;
}

export interface VectorMetadata {
  entityId: string;
  entityType: import('../enums').VectorEntityType;
  text: string;
  turnNumber: number;
  sourceId?: string;
  targetId?: string;
}

export interface VectorStore {
  vectors: number[][];
  metadata: VectorMetadata[];
}

export interface KnowledgeBase {
  playerStats: PlayerStats; 
  inventory: Item[]; 
  equippedItems: Record<EquipmentSlotId, Item['id'] | null>;
  playerSkills: Skill[]; 
  allQuests: Quest[]; 
  discoveredNPCs: NPC[]; 
  discoveredLocations: GameLocation[];
  discoveredYeuThu: YeuThu[];
  discoveredFactions: Faction[]; 
  realmProgressionList: string[]; 
  currentRealmBaseStats: Record<string, RealmBaseStatDefinition>;
  worldConfig: WorldSettings | null; 
  companions: Companion[]; 
  worldLore: WorldLoreEntry[]; 
  worldDate: WorldDate; 
  appVersion?: string;
  pageSummaries?: Record<number, string>; 
  currentPageHistory?: number[]; 
  lastSummarizedTurn?: number; 
  turnHistory?: TurnHistoryEntry[];
  autoSaveTurnCounter: number; 
  currentAutoSaveSlotIndex: number; 
  autoSaveSlotIds: (string | null)[]; 
  manualSaveId: string | null; 
  manualSaveName: string | null;
  playerAvatarData?: string; 
  discoveredRegions: Region[]; 
  currentMapId?: string; 
  currentLocationId?: string;
  auctionState?: AuctionState | null; 
  slaveAuctionState?: SlaveAuctionState | null;
  postCombatState?: CombatEndPayload | null;
  pendingOpponentIdsForCombat?: string[] | null;
  userPrompts?: string[];
  prisoners: Prisoner[];
  wives: Wife[];
  slaves: Slave[];
  master?: Master | null;
  gameEvents: GameEvent[];
  ragVectorStore?: VectorStore;
  aiContextConfig: AIContextConfig;
  aiRulebook: AIRulebook; // NEW: The rulebook for editable rules
  aiCopilotConfigs: AICopilotConfig[];
  activeAICopilotConfigId: string | null;
  stagedActions: Record<string, StagedAction>;
  isWorldTicking: boolean;
  lastWorldTickDate: WorldDate;
  narrativeDirectiveForNextTurn?: string; // NEW: For Narrative Directive & Rewrite Turn feature
}

export interface FindLocationParams {
  locationTypes: import('../enums').LocationTypeValues[];
  isSafeZone: boolean | null;
  keywords: string;
  searchMethod: import('../enums').SearchMethod;
}