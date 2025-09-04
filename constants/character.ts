
import { PlayerStats, RealmBaseStatDefinition, ProficiencyTier, PROFICIENCY_TIERS, TuChatTier } from '../types';

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

const generateTieredStats = (): RealmBaseStatDefinition[] => {
  const tiers: RealmBaseStatDefinition[] = [];
  tiers.push({
    hpBase: 100, hpInc: 20,
    mpBase: 50, mpInc: 10,
    atkBase: 10, atkInc: 2,
    expBase: 100, expInc: 20,
    // NEW
    phongThuBase: 5, phongThuInc: 1,
    tocDoBase: 10, tocDoInc: 2,
    chinhXacBase: 10, chinhXacInc: 1,
    neTranhBase: 10, neTranhInc: 1,
    tiLeChiMangBase: 5, tiLeChiMangInc: 0,
    satThuongChiMangBase: 1.5, satThuongChiMangInc: 0,
  });
  tiers.push({
    hpBase: 1000, hpInc: 200,
    mpBase: 500, mpInc: 100,
    atkBase: 100, atkInc: 20,
    expBase: 1000, expInc: 200,
    // NEW
    phongThuBase: 9, phongThuInc: 2, // ~1.8x
    tocDoBase: 30, tocDoInc: 6, // ~3.0x
    chinhXacBase: 20, chinhXacInc: 2, // ~2.0x
    neTranhBase: 20, neTranhInc: 2, // ~2.0x
    tiLeChiMangBase: 5, tiLeChiMangInc: 0, // Linear/No Growth
    satThuongChiMangBase: 1.5, satThuongChiMangInc: 0, // Linear/No Growth
  });

  const hpMpAtkExpBaseMultiplier = 5.0;
  const hpMpAtkExpIncMultiplier = 2.0;

  const phongThuMultiplier = 1.8;
  const tocDoMultiplier = 3.0;
  const chinhXacNeTranhMultiplier = 2.0;
  
  for (let i = 2; i < 30; i++) {
    const prevTier = tiers[i - 1];
    tiers.push({
      hpBase: Math.floor(prevTier.hpBase * hpMpAtkExpBaseMultiplier),
      hpInc: Math.floor(prevTier.hpInc * hpMpAtkExpIncMultiplier),
      mpBase: Math.floor(prevTier.mpBase * hpMpAtkExpBaseMultiplier),
      mpInc: Math.floor(prevTier.mpInc * hpMpAtkExpIncMultiplier),
      atkBase: Math.floor(prevTier.atkBase * hpMpAtkExpBaseMultiplier),
      atkInc: Math.floor(prevTier.atkInc * hpMpAtkExpIncMultiplier),
      expBase: Math.floor(prevTier.expBase * hpMpAtkExpBaseMultiplier),
      expInc: Math.floor(prevTier.expInc * hpMpAtkExpIncMultiplier),
      // NEW
      phongThuBase: Math.floor(prevTier.phongThuBase * phongThuMultiplier),
      phongThuInc: Math.max(1, Math.floor(prevTier.phongThuInc * phongThuMultiplier)),
      tocDoBase: Math.floor(prevTier.tocDoBase * tocDoMultiplier),
      tocDoInc: Math.max(1, Math.floor(prevTier.tocDoInc * tocDoMultiplier)),
      chinhXacBase: Math.floor(prevTier.chinhXacBase * chinhXacNeTranhMultiplier),
      chinhXacInc: Math.max(1, Math.floor(prevTier.chinhXacInc * chinhXacNeTranhMultiplier)),
      neTranhBase: Math.floor(prevTier.neTranhBase * chinhXacNeTranhMultiplier),
      neTranhInc: Math.max(1, Math.floor(prevTier.neTranhInc * chinhXacNeTranhMultiplier)),
      tiLeChiMangBase: 5,
      tiLeChiMangInc: 0,
      satThuongChiMangBase: 1.5,
      satThuongChiMangInc: 0,
    });
  }
  return tiers;
};

export const DEFAULT_TIERED_STATS: RealmBaseStatDefinition[] = generateTieredStats();

export const DEFAULT_PLAYER_STATS: PlayerStats = {
  baseMaxSinhLuc: 100,
  baseMaxLinhLuc: 50,
  baseSucTanCong: 10,
  baseMaxKinhNghiem: 100,
  sinhLuc: 100,
  maxSinhLuc: 100,
  linhLuc: 50,
  maxLinhLuc: 50,
  sucTanCong: 10,
  kinhNghiem: 0,
  maxKinhNghiem: 100,
  // NEW STATS
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
  // END NEW STATS
  realm: "Phàm Nhân Nhất Trọng",
  currency: 0,
  isInCombat: false,
  turn: 0,
  hieuUngBinhCanh: false,
  activeStatusEffects: [],
  spiritualRoot: "Chưa rõ", // New
  specialPhysique: "Chưa rõ", // New
  professions: [], // New
  thoNguyen: 120, // New
  maxThoNguyen: 120, //New
  playerSpecialStatus: null, // NEW
};

export const PROFICIENCY_EXP_THRESHOLDS: Record<ProficiencyTier, number | null> = {
    "Sơ Nhập": 100,
    "Tiểu Thành": 200,
    "Đại Thành": 400,
    "Viên Mãn": 800,
    "Xuất Thần Nhập Hóa": null, // Max level
};

export const PROFICIENCY_DMG_HEAL_MULTIPLIERS: Record<ProficiencyTier, number> = {
    "Sơ Nhập": 1.0,
    "Tiểu Thành": 2.0,
    "Đại Thành": 3.0,
    "Viên Mãn": 4.0,
    "Xuất Thần Nhập Hóa": 5.0,
};

export const PROFICIENCY_COST_COOLDOWN_MULTIPLIERS: Record<ProficiencyTier, number> = {
    "Sơ Nhập": 1.0,
    "Tiểu Thành": 0.8,
    "Đại Thành": 0.6,
    "Viên Mãn": 0.4,
    "Xuất Thần Nhập Hóa": 0.2,
};

export const TU_CHAT_VALUE_MULTIPLIERS: Record<TuChatTier, number> = {
    "Phế Phẩm": 0.5,
    "Hạ Đẳng": 0.8,
    "Trung Đẳng": 1.0,
    "Thượng Đẳng": 1.5,
    "Cực Phẩm": 2.5,
    "Tiên Phẩm": 5.0,
    "Thần Phẩm": 10.0,
};


export const WEAPON_TYPES_FOR_VO_Y = ["Quyền", "Kiếm", "Đao", "Thương", "Côn", "Cung", "Trượng", "Phủ", "Chỉ", "Trảo", "Chưởng"] as const;
