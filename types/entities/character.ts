// types/entities/character.ts
// FIX: Changed barrel file import to direct file imports to break circular dependency.
import type { ProfessionType } from '../enums/item';
import type { TuChatTier, ProficiencyTier } from '../enums/character';
import type { Skill } from './skill';
import type { Item, EquipmentSlotId } from './item';
// FIX: Removed import of ActivityLogEntry from './npc' as it will be defined here.

// FIX: Define and export RealmBaseStatDefinition here to break a circular dependency.
export interface RealmBaseStatDefinition {
  hpBase: number; hpInc: number; mpBase: number; mpInc: number; atkBase: number; atkInc: number; expBase: number; expInc: number;
  phongThuBase: number; phongThuInc: number;
  tocDoBase: number; tocDoInc: number;
  chinhXacBase: number; chinhXacInc: number;
  neTranhBase: number; neTranhInc: number;
  tiLeChiMangBase: number; tiLeChiMangInc: number;
  satThuongChiMangBase: number; satThuongChiMangInc: number;
}

// FIX: Define and export ActivityLogEntry here to break a circular dependency.
export interface ActivityLogEntry {
  turnNumber: number;
  description: string;
  locationId: string;
}

export type StatusEffectType = 'buff' | 'debuff' | 'neutral';

export interface StatusEffect {
  id: string; name: string; description: string; type: StatusEffectType; durationTurns: number;
  statModifiers: Partial<Record<keyof Omit<PlayerStats, 'realm' | 'currency' | 'isInCombat' | 'turn' | 'hieuUngBinhCanh' | 'activeStatusEffects' | 'sinhLuc' | 'linhLuc' | 'kinhNghiem' | 'baseMaxKinhNghiem' | 'baseMaxLinhLuc' | 'baseMaxSinhLuc' | 'baseSucTanCong' | 'spiritualRoot' | 'specialPhysique' | 'professions' | 'tuChat' | 'playerSpecialStatus' | 'basePhongThu' | 'baseTocDo' | 'baseChinhXac' | 'baseNeTranh' | 'baseTiLeChiMang' | 'baseSatThuongChiMang'>, string | number>>;
  specialEffects: string[]; icon?: string; source?: string;
}

export interface Profession {
  type: ProfessionType;
  level: number;
  exp: number;
  maxExp: number;
}

export interface PlayerSpecialStatus {
    type: 'prisoner' | 'slave';
    ownerName: string;
    willpower: number;
    resistance: number;
    obedience: number;
    fear?: number;
    trust?: number;
}

export interface PlayerStats {
  baseMaxSinhLuc: number; baseMaxLinhLuc: number; baseSucTanCong: number; baseMaxKinhNghiem: number;
  sinhLuc: number; maxSinhLuc: number; linhLuc: number; maxLinhLuc: number; sucTanCong: number; kinhNghiem: number; maxKinhNghiem: number;
  basePhongThu: number; phongThu: number;
  baseTocDo: number; tocDo: number;
  baseChinhXac: number; chinhXac: number;
  baseNeTranh: number; neTranh: number;
  baseTiLeChiMang: number; tiLeChiMang: number;
  baseSatThuongChiMang: number; satThuongChiMang: number;
  realm: string; currency: number; isInCombat: boolean; turn: number; hieuUngBinhCanh: boolean;
  activeStatusEffects: StatusEffect[];
  spiritualRoot: string;
  specialPhysique: string;
  tuChat?: TuChatTier;
  professions: Profession[];
  thoNguyen: number;
  maxThoNguyen: number;
  playerSpecialStatus?: PlayerSpecialStatus | null;
}

export interface PersonBase {
    id: string;
    name: string;
    title?: string;
    gender?: 'Nam' | 'Nữ' | 'Khác' | 'Không rõ';
    race?: string;
    description: string;
    affinity: number;
    avatarUrl?: string;
    realm?: string;
    tuChat?: TuChatTier;
    spiritualRoot?: string;
    specialPhysique?: string;
    stats: Partial<PlayerStats>;
    locationId?: string;
}

export interface ComplexCompanionBase extends PersonBase {
    willpower: number;
    obedience: number;
    skills: Skill[];
    equippedItems: Record<EquipmentSlotId, Item['id'] | null>;
    isBinhCanh?: boolean;
    binhCanhCounter?: number;
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