// types/features/combat.ts
// FIX: Changed barrel file imports to direct file imports to break circular dependency.
import type { PlayerStats, StatusEffect } from '../entities/character';
import type { AiChoice } from '../game';
import type { CombatDisposition } from '../enums/combat';

export type CombatDispositionMap = Record<string, CombatDisposition>;

export interface Combatant {
    id: string;
    name: string;
    entityType: 'player' | 'npc' | 'yeuThu' | 'wife' | 'slave';
    isPlayer: boolean;
    currentStats: PlayerStats;
    avatarUrl?: string;
    gender?: 'Nam' | 'Nữ' | 'Khác' | 'Không rõ';
    disposition?: CombatDisposition;
}

export interface CombatState {
    isInCombat: boolean;
    combatants: Combatant[];
    turnOrder: string[];
    currentTurnIndex: number;
    totalTurns: number;
    playerActionChoices: AiChoice[];
    damageDealtByPlayer: number;
    damageTakenByPlayer: number;
    notableEvents: string[];
    fleeAttempts: number;
}

export interface CombatActionOutcome {
    damage: number;
    healing?: number;
    didCrit: boolean;
    didEvade: boolean;
    description: string;
    statusEffectsToApply?: StatusEffect[];
}

export interface CombatEndPayload {
  outcome: 'victory' | 'defeat' | 'escaped' | 'surrendered';
  summary?: string;
  totalTurns: number;
  damageDealtByPlayer: number;
  damageTakenByPlayer: number;
  killingBlowBy: string;
  notableEvents: string[];
  finalPlayerState: PlayerStats;
  finalCombatantStates: Array<{ id: string; finalStats: PlayerStats }>;
  opponentIds: string[];
  dispositions: CombatDispositionMap;
}
