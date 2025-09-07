// types/enums/item.ts
export const GENRE_VALUES_FOR_TYPE = [
  "Tu Tiên (Mặc định)", "Võ Hiệp", "Tiên Hiệp", "Huyền Huyễn", "Cung Đấu", "Linh Dị", "Khoa Huyễn", "Tây Phương Fantasy", "Ngôn Tình", "Đô Thị", "Mạt Thế", "Võng Du", "Thể Thao", "Kinh Dị", "Khác (Tự định nghĩa)"
] as const;
export type GenreType = typeof GENRE_VALUES_FOR_TYPE[number];
export type CustomGenreType = "Khác (Tự định nghĩa)";

export const ItemRarity = {
    PHO_THONG: "Phổ Thông", HIEM: "Hiếm", QUY_BAU: "Quý Báu", CUC_PHAM: "Cực Phẩm", THAN_THOAI: "Thần Thoại", CHI_TON: "Chí Tôn"
} as const;
export type EquipmentRarity = typeof ItemRarity[keyof typeof ItemRarity];

export const ItemCategory = {
    EQUIPMENT: "Equipment", POTION: "Potion", MATERIAL: "Material", QUEST_ITEM: "QuestItem", MISCELLANEOUS: "Miscellaneous",
    CONG_PHAP: "CongPhap",
    LINH_KI: "LinhKi",
    PROFESSION_SKILL_BOOK: "ProfessionSkillBook",
    PROFESSION_TOOL: "ProfessionTool",
} as const;
export type ItemCategoryValues = typeof ItemCategory[keyof typeof ItemCategory];

export const EquipmentType = { VU_KHI: "Vũ Khí", GIAP_DAU: "Giáp Đầu", GIAP_THAN: "Giáp Thân", GIAP_TAY: "Giáp Tay", GIAP_CHAN: "Giáp Chân", TRANG_SUC: "Trang Sức", PHAP_BAO: "Pháp Bảo", THU_CUNG: "Thú Cưng" } as const;
export type EquipmentTypeValues = typeof EquipmentType[keyof typeof EquipmentType];

export const PotionType = { HOI_PHUC: "Hồi Phục", TANG_CUONG: "Tăng Cường", GIAI_DOC: "Giải Độc", DAC_BIET: "Đặc Biệt" } as const;
export type PotionTypeValues = typeof PotionType[keyof typeof PotionType];

export const MaterialType = { LINH_THAO: "Linh Thảo", KHOANG_THACH: "Khoáng Thạch", YEU_DAN: "Yêu Đan", DA_XUONG_YEU_THU: "Da/Xương Yêu Thú", LINH_HON: "Linh Hồn", VAT_LIEU_CHE_TAO_CHUNG: "Vật Liệu Chế Tạo Chung", KHAC: "Khác" } as const;
export type MaterialTypeValues = typeof MaterialType[keyof typeof MaterialType];

export const ProfessionType = {
    LUYEN_DAN_SU: "Luyện Đan Sư", LUYEN_KHI_SU: "Luyện Khí Sư", LUYEN_PHU_SU: "Luyện Phù Sư",
    TRAN_PHAP_SU: "Trận Pháp Sư", KHOI_LOI_SU: "Khôi Lỗi Sư", NGU_THU_SU: "Ngự Thú Sư",
    LINH_THAO_SU: "Linh Thảo Sư", THIEN_CO_SU: "Thiên Cơ Sư", DOC_SU: "Độc Sư", LINH_TRU: "Linh Trù",
    HOA_SU:"Họa Sư",
} as const;
export type ProfessionType = typeof ProfessionType[keyof typeof ProfessionType];

export const CongPhapType = {
    KHI_TU: "Khí Tu", THE_TU: "Thể Tu", VO_Y: "Võ Ý", HON_TU: "Hồn Tu",
    THON_PHE: "Thôn Phệ", SONG_TU: "Song Tu", CO_TU: "Cổ Tu", AM_LUAT_TU: "Âm Tu",
} as const;
export type CongPhapType = typeof CongPhapType[keyof typeof CongPhapType];

export const CONG_PHAP_GRADES = ['Phàm Phẩm', 'Hoàng Phẩm', 'Huyền Phẩm', 'Địa Phẩm', 'Thiên Phẩm'] as const;
export type CongPhapGrade = typeof CONG_PHAP_GRADES[number];

export const LINH_KI_CATEGORIES = ['Tấn công', 'Phòng thủ', 'Hồi phục', 'Thân pháp', 'Khác'] as const;
export type LinhKiCategory = typeof LINH_KI_CATEGORIES[number];

export const LINH_KI_ACTIVATION_TYPES = ['Chủ động', 'Bị động'] as const;
export type LinhKiActivationType = typeof LINH_KI_ACTIVATION_TYPES[number];

export const PROFESSION_GRADES = ['Nhất phẩm', 'Nhị phẩm', 'Tam phẩm', 'Tứ phẩm', 'Ngũ phẩm', 'Lục phẩm', 'Thất phẩm', 'Bát phẩm', 'Cửu phẩm'] as const;
export type ProfessionGrade = typeof PROFESSION_GRADES[number];

export const SkillType = {
    CONG_PHAP_TU_LUYEN: "Công Pháp Tu Luyện", LINH_KI: "Linh Kĩ", NGHE_NGHIEP: "Nghề Nghiệp",
    THAN_THONG: "Thần Thông", CAM_THUAT: "Cấm Thuật", KHAC: "Khác",
} as const;
export type SkillTypeValues = typeof SkillType[keyof typeof SkillType];

export type SkillTargetType = 'Tự Thân' | 'Đồng Minh Đơn Lẻ' | 'Đồng Minh Toàn Bộ' | 'Kẻ Địch Đơn Lẻ' | 'Kẻ Địch Toàn Bộ' | 'Khu Vực';
