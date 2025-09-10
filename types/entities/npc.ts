// types/entities/npc.ts
import type { PersonBase, ComplexCompanionBase, PlayerStats } from './character';
import type { ItemCategoryValues } from '../enums/item';
import type { Skill } from './skill';
import type { TuChatTier } from '../enums';

export interface ActivityLogEntry {
  turnNumber: number;
  description: string;
  locationId: string;
}

export interface Prisoner extends PersonBase {
    entityType: 'prisoner';
    willpower: number;
    resistance: number;
    obedience: number;
    mood?: 'Vui Vẻ' | 'Hài Lòng' | 'Bình Thường' | 'Bực Bội' | 'Giận Dữ' | 'Nghi Ngờ';
    needs?: Record<string, number>;
    longTermGoal?: string;
    shortTermGoal?: string;
    currentPlan?: string[];
    relationships?: Record<string, { type: string; affinity: number; }>;
    lastTickTurn?: number;
    tickPriorityScore?: number;
    activityLog?: ActivityLogEntry[];
}

export interface Wife extends ComplexCompanionBase {
    entityType: 'wife';
}

export interface Slave extends ComplexCompanionBase {
    entityType: 'slave';
    value?: number;
}

export interface Master extends PersonBase {
    mood: 'Vui Vẻ' | 'Hài Lòng' | 'Bình Thường' | 'Bực Bội' | 'Giận Dữ' | 'Nghi Ngờ';
    needs: Partial<Record<'Tham Vọng' | 'Dục Vọng' | 'An Toàn' | 'Giải Trí', number>>;
    longTermGoal?: string;
    shortTermGoal?: string;
    favor?: number;
    relationships?: Record<string, { type: string; affinity: number; }>;
    activityLog?: ActivityLogEntry[];
}

export interface Companion {
  id: string; name: string; description: string; hp: number; maxHp: number; mana: number; maxMana: number; atk: number;
}

export interface NPC {
    id: string; name: string; title?: string; gender?: 'Nam' | 'Nữ' | 'Khác' | 'Không rõ'; race?: string; description: string; personalityTraits: string[]; affinity: number; factionId?: string; avatarUrl?: string; relationshipToPlayer?: string; realm?: string; tuChat?: TuChatTier;
    spiritualRoot?: string;
    specialPhysique?: string;
    isBinhCanh?: boolean; binhCanhCounter?: number; baseStatOverrides?: Partial<Pick<PlayerStats, 'baseMaxSinhLuc' | 'baseMaxLinhLuc' | 'baseSucTanCong' | 'baseMaxKinhNghiem'>>; stats?: Partial<PlayerStats>; skills?: string[]; 
    personalInventory?: import('./item').Item[];
    vendorType?: 'MarketStall' | 'SpecializedShop' | 'Auctioneer' | 'SlaveTrader'; vendorSlogan?: string; vendorBuysCategories?: ItemCategoryValues[]; 
    shopInventory?: import('./item').Item[];
    slavesForSale?: Slave[];
    lastRestockYear?: number;
    isEssential?: boolean; locationId?: string; level?: number;
    mood: 'Vui Vẻ' | 'Hài Lòng' | 'Bình Thường' | 'Bực Bội' | 'Giận Dữ' | 'Nghi Ngờ';
    needs: Record<string, number>;
    longTermGoal: string;
    shortTermGoal: string;
    currentPlan: string[];
    relationships: Record<string, { type: string; affinity: number; }>;
    lastTickTurn: number;
    tickPriorityScore: number;
    activityLog: ActivityLogEntry[];
}