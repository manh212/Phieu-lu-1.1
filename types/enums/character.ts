// types/enums/character.ts
// FIX: Corrected import to use a direct path, breaking a circular dependency.
import type { PlayerStats, RealmBaseStatDefinition } from '../entities/character';

export const TU_CHAT_TIERS = ["Phế Phẩm", "Hạ Đẳng", "Trung Đẳng", "Thượng Đẳng", "Cực Phẩm", "Tiên Phẩm", "Thần Phẩm"] as const;
export type TuChatTier = typeof TU_CHAT_TIERS[number];

export const PROFICIENCY_TIERS = ["Sơ Nhập", "Tiểu Thành", "Đại Thành", "Viên Mãn", "Xuất Thần Nhập Hóa"] as const;
export type ProficiencyTier = typeof PROFICIENCY_TIERS[number];