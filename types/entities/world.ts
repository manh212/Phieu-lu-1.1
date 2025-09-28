// types/entities/world.ts
// FIX: Changed barrel file import to direct file import to break circular dependency.
import type { AnyLocationType, FactionAlignmentValues, GameEventType, GameEventStatus } from '../enums/world';

export interface QuestObjective {
  id: string; text: string; completed: boolean;
}

export interface Quest {
  id: string; title: string; description: string; status: 'active' | 'completed' | 'failed'; objectives: QuestObjective[];
  isPinned?: boolean;
}

export interface WorldLoreEntry {
  id: string; title: string; content: string;
  isPinned?: boolean;
}

export interface WorldDate {
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
}

export interface Region { id: string; name: string; description?: string; mapColor?: string; }
export interface LocationConnection { targetLocationId: string; isDiscovered: boolean; travelTimeTurns?: number; description?: string; }

export interface LocationTemplate { id: string; name: string; description: string; mapIcon?: string; regionId?: string; parentLocationId?: string; travelConnections?: Record<string, { locationId: string; travelTimeTurns?: number; requirements?: string }>; discoverableNPCIds?: string[]; discoverableItemIds?: string[]; resourceNodes?: Array<{ materialId: string; quantityRange: [number, number]; respawnTimeTurns?: number; toolRequired?: string }>; isSafeZone?: boolean; environmentalEffects?: string[]; ambientSound?: string; requiredLevel?: number; requiredQuestIdForEntry?: string; visited?: boolean; locationType?: AnyLocationType; }

export interface GameLocation extends LocationTemplate { 
    mapX?: number; 
    mapY?: number; 
    connections?: LocationConnection[];
    lastAuctionYear?: number;
    isPinned?: boolean;
}

export interface Faction { 
    id: string; 
    name: string; 
    description: string; 
    bannerIcon?: string; 
    leaderNPCId?: string; 
    keyNPCIds?: string[]; 
    baseLocationId?: string; 
    alliedFactionIds?: string[]; 
    enemyFactionIds?: string[]; 
    alignment: FactionAlignmentValues; 
    playerReputation: number; 
    npcReputations?: Record<string, number>;
    reputationTiers?: Record<string, { threshold: number; title: string; benefits?: string[] }>; 
    ranks?: Array<{ rankName: string; reputationRequired: number; benefits?: string[] }>;
    isPinned?: boolean;
}

export interface YeuThu {
    id: string;
    name: string;
    species: string;
    description: string;
    isHostile: boolean;
    avatarUrl?: string;
    realm?: string;
    stats?: Partial<any>;
    skills?: string[];
    lootTable?: Array<{ itemId: string, dropChance: number, minQuantity: number, maxQuantity: number }>;
    locationId?: string;
    isPinned?: boolean;
}

export interface EventDetail {
  id: string;
  text: string;
  turnDiscovered: number;
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  type: GameEventType;
  status: GameEventStatus;
  startDate: WorldDate;
  endDate: WorldDate;
  locationId: string;
  specificLocationId?: string;
  isDiscovered: boolean;
  details: EventDetail[];
  isCancelled?: boolean;
}