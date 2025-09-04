// constants/combat.ts

// Hằng số cho công thức tính toán sát thương
export const K_DEFENSE_FACTOR = 100;
export const DAMAGE_VARIANCE_MIN = 0.85;
export const DAMAGE_VARIANCE_MAX = 1.15;

// Hằng số cơ bản cho chí mạng
export const BASE_CRIT_CHANCE = 5; // 5%
export const BASE_CRIT_MULTIPLIER = 1.5; // 150% damage

// Hằng số cho công thức tính tỉ lệ đánh trúng
// HitChance = clamp(BASE_ACC_BONUS + Attacker.chinhXac - Target.neTranh, MIN_HIT_CHANCE, MAX_HIT_CHANCE)
export const BASE_ACC_BONUS = 95; // Tỉ lệ trúng gốc là 95% trước khi tính Chính Xác/Né Tránh
export const MIN_HIT_CHANCE = 5;
export const MAX_HIT_CHANCE = 95;

// Hằng số cho công thức bỏ chạy
// FleeChance = clamp(BASE_FLEE_CHANCE + (Player.tocDo - FastestOpponent.tocDo) * SPD_TO_FLEE_MOD, MIN_FLEE_CHANCE, MAX_FLEE_CHANCE)
export const BASE_FLEE_CHANCE = 50;
export const SPD_TO_FLEE_MOD = 2;
export const MIN_FLEE_CHANCE = 10;
export const MAX_FLEE_CHANCE = 90;
export const FAILED_FLEE_CHANCE_PENALTY = 10; // Giảm 10% cơ hội sau mỗi lần thất bại