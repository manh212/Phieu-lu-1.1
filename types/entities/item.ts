// types/entities/item.ts
import type { PlayerStats } from './character';
// FIX: Changed barrel file import to direct file import to break circular dependency.
import type { ItemCategoryValues, EquipmentRarity, EquipmentTypeValues, PotionTypeValues, MaterialTypeValues, CongPhapType, ProfessionType } from '../enums/item';

export type EquipmentSlotId = | 'mainWeapon' | 'offHandWeapon' | 'head' | 'body' | 'hands' | 'legs' | 'artifact' | 'pet' | 'accessory1' | 'accessory2';

export interface EquipmentSlotConfig {
  id: EquipmentSlotId; 
  labelKey: any;
  accepts: EquipmentTypeValues[]; 
  icon?: string;
}

export interface BaseItemTemplate { id: string; name: string; description: string; category: ItemCategoryValues; rarity: EquipmentRarity; value?: number; icon?: string; stackable?: boolean; maxStack?: number; quantity: number; itemRealm?: string; }
export interface EquipmentTemplate extends BaseItemTemplate { category: "Equipment"; equipmentType: EquipmentTypeValues; slot?: string; statBonuses: Partial<Omit<PlayerStats, 'realm' | 'currency' | 'isInCombat' | 'turn' | 'hieuUngBinhCanh' | 'baseMaxKinhNghiem' | 'baseMaxLinhLuc' | 'baseMaxSinhLuc' | 'baseSucTanCong' | 'activeStatusEffects' | 'sinhLuc' | 'linhLuc' | 'kinhNghiem' | 'spiritualRoot' | 'specialPhysique' | 'professions' | 'tuChat' | 'playerSpecialStatus' | 'basePhongThu' | 'baseTocDo' | 'baseChinhXac' | 'baseNeTranh' | 'baseTiLeChiMang' | 'baseSatThuongChiMang'>>; uniqueEffects: string[]; durability?: number; maxDurability?: number; levelRequirement?: number; usable?: boolean; consumable?: boolean; }
export interface PotionTemplate extends BaseItemTemplate { category: "Potion"; potionType: PotionTypeValues; effects: string[]; durationTurns?: number; isConsumedOnUse: true; cooldownTurns?: number; usable: true; consumable: true; }
export interface MaterialTemplate extends BaseItemTemplate { category: "Material"; materialType: MaterialTypeValues; usable: false; consumable: false; }
export interface QuestItemTemplate extends BaseItemTemplate { category: "QuestItem"; questIdAssociated: string; isConsumedOnQuestCompletion?: boolean; usable: false; consumable: false; }
export interface MiscellaneousItemTemplate extends BaseItemTemplate { category: "Miscellaneous"; usable: boolean; consumable: boolean; }
export interface CongPhapTemplate extends BaseItemTemplate { category: "CongPhap"; congPhapType: CongPhapType; expBonusPercentage: number; }
export interface LinhKiTemplate extends BaseItemTemplate { category: "LinhKi"; skillToLearnJSON: string; }
export interface ProfessionSkillBookTemplate extends BaseItemTemplate { category: "ProfessionSkillBook"; professionToLearn: ProfessionType; }
export interface ProfessionToolTemplate extends BaseItemTemplate { category: "ProfessionTool"; professionRequired: ProfessionType; }

export type Item = EquipmentTemplate | PotionTemplate | MaterialTemplate | QuestItemTemplate | MiscellaneousItemTemplate | CongPhapTemplate | LinhKiTemplate | ProfessionSkillBookTemplate | ProfessionToolTemplate;
export type InventoryItem = Item;
