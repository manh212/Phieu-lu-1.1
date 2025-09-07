// types/entities/skill.ts
import type { PlayerStats } from './character';
import type { SkillTypeValues, SkillTargetType, ProficiencyTier, CongPhapType, CongPhapGrade, LinhKiCategory, LinhKiActivationType, ProfessionType, ProfessionGrade } from '../enums';

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
}

export type SkillTemplate = Skill;
