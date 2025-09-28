// types/entities/skill.ts
import type { PlayerStats } from './character';
// FIX: Changed barrel file import to direct file import to break circular dependency.
import type { SkillTypeValues, SkillTargetType, CongPhapType, CongPhapGrade, LinhKiCategory, LinhKiActivationType, ProfessionType, ProfessionGrade } from '../enums/item';
import type { ProficiencyTier } from '../enums/character';

export interface Skill {
    id: string; name: string; description: string; skillType: SkillTypeValues; detailedEffect: string; icon?: string; manaCost: number; damageMultiplier: number; baseDamage: number; healingAmount: number; healingMultiplier: number;
    buffsApplied?: Array<{ stat: keyof PlayerStats | string; amount: number | string; durationTurns: number; chance?: number }>;
    debuffsApplied?: Array<{ stat: keyof PlayerStats | string; amount: number | string; durationTurns: number; chance?: number }>;
    otherEffects?: string[]; targetType?: SkillTargetType; cooldown?: number; currentCooldown?: number; levelRequirement?: number;
    requiredRealm?: string; prerequisiteSkillId?: string; isUltimate?: boolean; xpGainOnUse?: number;
    proficiency?: number;
    maxProficiency?: number;
    proficiencyTier?: ProficiencyTier;
    congPhapDetails?: { type?: CongPhapType; grade?: CongPhapGrade; weaponFocus?: string; };
    linhKiDetails?: { category?: LinhKiCategory; activation?: LinhKiActivationType; };
    professionDetails?: { type?: ProfessionType; grade?: ProfessionGrade; skillDescription?: string; };
    camThuatDetails?: { sideEffects?: string; };
    thanThongDetails?: {};
    isPinned?: boolean;
}

export type SkillTemplate = Skill;