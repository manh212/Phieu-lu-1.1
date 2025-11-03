// types/setup.ts
// FIX: Changed barrel file imports to direct file imports to break circular dependency.
// FIX: Corrected import path for GenreType and CustomGenreType.
import type { NsfwDescriptionStyle, ViolenceLevel, StoryTone, LocationTypeValues, FactionAlignmentValues } from './enums/world';
import type { GenreType, CustomGenreType, ItemCategoryValues, EquipmentRarity, EquipmentTypeValues, PotionTypeValues, MaterialTypeValues, CongPhapType, ProfessionType, SkillTypeValues, CongPhapGrade, LinhKiCategory, LinhKiActivationType, ProfessionGrade } from './enums/item';
import type { TuChatTier } from './enums/character';
import type { PlayerStats } from './entities/character';
import type { WorldDate } from './entities/world';

export interface LivingWorldSettings {
  isEnabled: boolean;
  npcAutoDevelopment: {
    enabled: boolean;
    speed: 'Rất Chậm' | 'Chậm' | 'Bình Thường' | 'Nhanh' | 'Rất Nhanh';
  };
  npcAutonomy: {
    enabled: boolean;
    frequency: 'Thấp' | 'Vừa' | 'Cao';
    scope: 'Khu vực hiện tại' | 'Toàn bộ thế giới';
  };
  dynamicEvents: {
    enabled: boolean;
  };
}

export interface StartingSkill {
  id?: string;
  name: string;
  description: string;
  skillType?: SkillTypeValues;
  baseDamage?: number;
  baseHealing?: number;
  damageMultiplier?: number;
  healingMultiplier?: number;
  manaCost?: number;
  cooldown?: number;
  specialEffects?: string;
  congPhapDetails?: { type?: CongPhapType; grade?: CongPhapGrade; weaponFocus?: string; };
  linhKiDetails?: { category?: LinhKiCategory; activation?: LinhKiActivationType; };
  professionDetails?: { type?: ProfessionType; grade?: ProfessionGrade; skillDescription?: string; };
  camThuatDetails?: { sideEffects?: string; };
  thanThongDetails?: {};
  isPinned?: boolean;
}

export interface StartingItem {
  id?: string;
  name: string; description: string; quantity: number; category: ItemCategoryValues;
  rarity?: EquipmentRarity; value?: number; itemRealm?: string;
  equipmentDetails?: { type?: EquipmentTypeValues; slot?: string; statBonuses?: Partial<Omit<PlayerStats, 'realm' | 'currency' | 'isInCombat' | 'turn' | 'hieuUngBinhCanh' | 'baseMaxKinhNghiem' | 'baseMaxLinhLuc' | 'baseMaxSinhLuc' | 'baseSucTanCong' | 'activeStatusEffects'| 'sinhLuc' | 'linhLuc' | 'kinhNghiem' | 'spiritualRoot' | 'specialPhysique' | 'professions' | 'tuChat' | 'playerSpecialStatus' | 'basePhongThu' | 'baseTocDo' | 'baseChinhXac' | 'baseNeTranh' | 'baseTiLeChiMang' | 'baseSatThuongChiMang'>>; statBonusesString?: string; uniqueEffects?: string[]; uniqueEffectsString?: string; };
  potionDetails?: { type?: PotionTypeValues; effects?: string[]; effectsString?: string; durationTurns?: number; cooldownTurns?: number; };
  materialDetails?: { type?: MaterialTypeValues; };
  questItemDetails?: { questIdAssociated?: string; };
  miscDetails?: { usable?: boolean; consumable?: boolean; };
  congPhapDetails?: { congPhapType?: CongPhapType; expBonusPercentage?: number; };
  linhKiDetails?: { skillToLearnJSON?: string; };
  professionSkillBookDetails?: { professionToLearn?: ProfessionType; };
  professionToolDetails?: { professionRequired?: ProfessionType; };
  aiPreliminaryType?: string;
  isPinned?: boolean;
}

export interface StartingNPC {
  id?: string;
  name: string; personality: string; initialAffinity: number; details: string; gender?: 'Nam' | 'Nữ' | 'Khác' | 'Không rõ';
  race?: string;
  realm?: string; avatarUrl?: string; tuChat?: TuChatTier; relationshipToPlayer?: string;
  spiritualRoot?: string;
  specialPhysique?: string;
  thoNguyen?: number;
  maxThoNguyen?: number;
  longTermGoal?: string;
  shortTermGoal?: string;
  locationName?: string;
  isPinned?: boolean;
}

export interface StartingYeuThu {
    id?: string;
    name: string;
    species: string;
    description: string;
    realm?: string;
    isHostile: boolean;
    isPinned?: boolean;
}

export interface StartingLore { id?: string; title: string; content: string; isPinned?: boolean; }
export interface StartingLocation { id?: string; name: string; description: string; isSafeZone?: boolean; regionId?: string; mapX?: number; mapY?: number; locationType?: LocationTypeValues; isPinned?: boolean; }
export interface StartingFaction { id?: string; name: string; description: string; alignment: FactionAlignmentValues; initialPlayerReputation: number; isPinned?: boolean; }

export interface RaceCultivationSystem {
  id: string;
  raceName: string;
  realmSystem: string;
}

export interface WorldSettings {
  saveGameName: string; theme: string; settingDescription: string; writingStyle: string; difficulty: 'Dễ' | 'Thường' | 'Khó' | 'Ác Mộng';
  currencyName: string; playerName: string; playerGender: 'Nam' | 'Nữ' | 'Khác'; playerRace: string; playerPersonality: string; playerBackstory: string;
  playerGoal: string; playerStartingTraits: string;
  playerSpiritualRoot?: string;
  playerSpecialPhysique?: string;
  playerThoNguyen?: number;
  playerMaxThoNguyen?: number;
  startingCurrency: number;
  startingSkills: StartingSkill[]; startingItems: StartingItem[]; startingNPCs: StartingNPC[]; startingLore: StartingLore[];
  startingYeuThu: StartingYeuThu[];
  startingLocations: StartingLocation[]; startingFactions: StartingFaction[]; 
  nsfwMode?: boolean; 
  nsfwDescriptionStyle?: NsfwDescriptionStyle;
  customNsfwPrompt?: string;
  violenceLevel?: ViolenceLevel; storyTone?: StoryTone; originalStorySummary?: string; genre: GenreType; customGenreName?: string;
  isCultivationEnabled: boolean;
  raceCultivationSystems: RaceCultivationSystem[];
  yeuThuRealmSystem: string;
  canhGioiKhoiDau: string; startingDate: WorldDate; playerAvatarUrl?: string;
  writingStyleGuide?: string;
  livingWorldSettings?: LivingWorldSettings;
}

export interface GeneratedWorldElements {
    startingSkills: StartingSkill[];
    startingItems: StartingItem[];
    startingNPCs: StartingNPC[];
    startingYeuThu: StartingYeuThu[];
    startingLore: StartingLore[];
    startingLocations: StartingLocation[];
    startingFactions: StartingFaction[];
    playerName?: string;
    playerGender?: 'Nam' | 'Nữ' | 'Khác';
    playerRace?: string;
    playerPersonality?: string;
    playerBackstory?: string;
    playerGoal?: string;
    playerStartingTraits?: string;
    playerAvatarUrl?: string; 
    theme?: string;
    settingDescription?: string;
    writingStyle?: string;
    currencyName?: string;
    originalStorySummary?: string;
    raceCultivationSystems: RaceCultivationSystem[];
    yeuThuRealmSystem: string;
    canhGioiKhoiDau?: string;
    genre: GenreType;
    customGenreName?: string; 
    isCultivationEnabled: boolean;
    nsfwDescriptionStyle: NsfwDescriptionStyle;
    violenceLevel: ViolenceLevel;
    storyTone: StoryTone;
    startingDate?: WorldDate;
    playerSpiritualRoot?: string;
    playerSpecialPhysique?: string;
    playerThoNguyen?: number;
    playerMaxThoNguyen?: number;
    startingCurrency?: number;
}