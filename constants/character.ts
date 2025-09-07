// src/constants/character.ts
// FIX: Correct import path for types
import type { PlayerStats, RealmBaseStatDefinition, ProficiencyTier, TuChatTier } from '@/types/index';
// FIX: Correct import path for types
import { PROFICIENCY_TIERS } from '@/types/index';

export const SUB_REALM_NAMES = ["Nhất Trọng", "Nhị Trọng", "Tam Trọng", "Tứ Trọng", "Ngũ Trọng", "Lục Trọng", "Thất Trọng", "Bát Trọng", "Cửu Trọng", "Đỉnh Phong"];

export const DEFAULT_MORTAL_STATS: Pick<PlayerStats, 'baseMaxSinhLuc' | 'baseMaxLinhLuc' | 'baseSucTanCong' | 'baseMaxKinhNghiem' | 'realm' | 'linhLuc' | 'maxLinhLuc' | 'kinhNghiem' | 'maxKinhNghiem' | 'hieuUngBinhCanh' | 'activeStatusEffects' | 'spiritualRoot' | 'specialPhysique' | 'professions' | 'thoNguyen' | 'maxThoNguyen'> = {
  baseMaxSinhLuc: 100,
  baseMaxLinhLuc: 0,
  baseSucTanCong: 10,
  baseMaxKinhNghiem: 100,
  realm: "Người Thường",
  linhLuc: 0,
  maxLinhLuc: 0,
  kinhNghiem: 0,
  maxKinhNghiem: 100,
  hieuUngBinhCanh: false,
  activeStatusEffects: [],
  spiritualRoot: "Phàm Căn",
  specialPhysique: "Phàm Thể",
  professions: [],
  thoNguyen: 80,
  maxThoNguyen: 80,
};

// FIX: Export DEFAULT_PLAYER_STATS
export const DEFAULT_PLAYER_STATS: PlayerStats = {
  ...DEFAULT_MORTAL_STATS,
  sinhLuc: 100,
  maxSinhLuc: 100,
  sucTanCong: 10,
  currency: 10,
  isInCombat: false,
  turn: 0,
  basePhongThu: 5,
  phongThu: 5,
  baseTocDo: 10,
  tocDo: 10,
  baseChinhXac: 10,
  chinhXac: 10,
  baseNeTranh: 10,
  neTranh: 10,
  baseTiLeChiMang: 5,
  tiLeChiMang: 5,
  baseSatThuongChiMang: 1.5,
  satThuongChiMang: 1.5,
  tuChat: "Trung Đẳng",
};


const generateTieredStats = (): RealmBaseStatDefinition[] => {
  const tiers: RealmBaseStatDefinition[] = [];
  tiers.push({
    hpBase: 100, hpInc: 20,
    mpBase: 50, mpInc: 10,
    atkBase: 10, atkInc: 2,
    expBase: 100, expInc: 20, // FIX: Added missing property
    phongThuBase: 5, phongThuInc: 1,
    tocDoBase: 10, tocDoInc: 1,
    chinhXacBase: 10, chinhXacInc: 1,
    neTranhBase: 10, neTranhInc: 1,
    tiLeChiMangBase: 5, tiLeChiMangInc: 0.1,
    satThuongChiMangBase: 1.5, satThuongChiMangInc: 0.02,
  });
  // ... Add more tiers or a generation loop here if needed.
  // This is just a minimal fix. A proper loop would be better.
  for (let i = 1; i < 20; i++) {
      const prev = tiers[i-1];
      tiers.push({
        hpBase: Math.floor(prev.hpBase * 1.8), hpInc: Math.floor(prev.hpInc * 1.5),
        mpBase: Math.floor(prev.mpBase * 1.7), mpInc: Math.floor(prev.mpInc * 1.4),
        atkBase: Math.floor(prev.atkBase * 1.6), atkInc: Math.floor(prev.atkInc * 1.5),
        expBase: Math.floor(prev.expBase * 2), expInc: Math.floor(prev.expInc * 1.8),
        phongThuBase: Math.floor(prev.phongThuBase * 1.5), phongThuInc: prev.phongThuInc + 1,
        tocDoBase: Math.floor(prev.tocDoBase * 1.2), tocDoInc: prev.tocDoInc + 0.5,
        chinhXacBase: Math.floor(prev.chinhXacBase * 1.2), chinhXacInc: prev.chinhXacInc + 0.5,
        neTranhBase: Math.floor(prev.neTranhBase * 1.2), neTranhInc: prev.neTranhInc + 0.5,
        tiLeChiMangBase: prev.tiLeChiMangBase + 1, tiLeChiMangInc: prev.tiLeChiMangInc + 0.05,
        satThuongChiMangBase: prev.satThuongChiMangBase + 0.1, satThuongChiMangInc: prev.satThuongChiMangInc + 0.01,
      });
  }
  return tiers;
};

// FIX: Export DEFAULT_TIERED_STATS
export const DEFAULT_TIERED_STATS = generateTieredStats();

// FIX: Export WEAPON_TYPES_FOR_VO_Y
export const WEAPON_TYPES_FOR_VO_Y = ["Kiếm", "Đao", "Thương", "Quyền", "Chỉ", "Trảo", "Cung", "Ám Khí"] as const;

// FIX: Export proficiency constants
export const PROFICIENCY_EXP_THRESHOLDS: Record<ProficiencyTier, number | null> = {
    "Sơ Nhập": 100,
    "Tiểu Thành": 500,
    "Đại Thành": 2000,
    "Viên Mãn": 5000,
    "Xuất Thần Nhập Hóa": null, // Max level
};
export const PROFICIENCY_DMG_HEAL_MULTIPLIERS: Record<ProficiencyTier, number> = {
    "Sơ Nhập": 1.0,
    "Tiểu Thành": 1.2,
    "Đại Thành": 1.5,
    "Viên Mãn": 2.0,
    "Xuất Thần Nhập Hóa": 3.0,
};
export const PROFICIENCY_COST_COOLDOWN_MULTIPLIERS: Record<ProficiencyTier, number> = {
    "Sơ Nhập": 1.0,
    "Tiểu Thành": 0.9,
    "Đại Thành": 0.8,
    "Viên Mãn": 0.7,
    "Xuất Thần Nhập Hóa": 0.5,
};
