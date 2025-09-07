// types/enums/world.ts
export const FactionAlignment = { CHINH_NGHIA: 'Chính Nghĩa', TRUNG_LAP: 'Trung Lập', TA_AC: 'Tà Ác', HON_LOAN: 'Hỗn Loạn' } as const;
export type FactionAlignmentValues = typeof FactionAlignment[keyof typeof FactionAlignment];

export const LocationType = { VILLAGE: 'Làng mạc', TOWN: 'Thị trấn', CITY: 'Thành thị', CAPITAL: 'Thủ đô', SECT_CLAN: 'Tông môn/Gia tộc', FOREST: 'Rừng rậm', MOUNTAIN: 'Núi non', CAVE: 'Hang động', DUNGEON: 'Hầm ngục/Bí cảnh', RUIN: 'Tàn tích', RIVER_LAKE: 'Sông/Hồ', LANDMARK: 'Địa danh Đặc biệt (Độc lập)', DEFAULT: 'Mặc định', } as const;
export type LocationTypeValues = typeof LocationType[keyof typeof LocationType];

export const SubLocationType = { PLAZA: 'Quảng trường', GOVERNMENT_BUILDING: 'Công trình công cộng (Phủ Chúa, Toà thị chính)', TOWER: 'Tháp (Canh gác, Phép thuật)', BARRACKS: 'Doanh trại', TRAINING_GROUND: 'Luyện võ trường', LIBRARY: 'Thư viện/Tàng Kinh Các', TEMPLE: 'Đền/Miếu/Nhà thờ', GARDEN: 'Công viên/Khu vườn', GATE: 'Cổng thành', WALL: 'Tường thành', INN: 'Quán trọ/Tửu điếm', HARBOR: 'Bến cảng', THEATER: 'Nhà hát/Sân khấu', ACADEMY: 'Học viện', ALTAR: 'Bàn thờ/Tế đàn', HALL: 'Sảnh chính/Đại điện', DUNGEON_ROOM: 'Phòng trong Bí cảnh', RESIDENTIAL_AREA: 'Khu dân cư', PRISON: 'Nhà tù/Ngục tối', BRIDGE: 'Cầu', FARM: 'Nông trại', MONUMENT: 'Đài tưởng niệm/Địa danh nhỏ', OTHER: 'Khác', } as const;
export type SubLocationTypeValues = typeof SubLocationType[keyof typeof SubLocationType];

export const EconomyLocationType = { 
    SHOP: 'Cửa hàng', 
    MARKETPLACE: 'Phường Thị', 
    SHOPPING_CENTER: 'Thương Thành', 
    AUCTION_HOUSE: 'Đấu Giá Hội',
    SLAVE_MARKET: 'Chợ Nô Lệ',
    SLAVE_AUCTION: 'Đấu Giá Nô Lệ',
} as const;
export type EconomyLocationTypeValues = typeof EconomyLocationType[keyof typeof EconomyLocationType];

export type AnyLocationType = LocationTypeValues | EconomyLocationTypeValues | SubLocationTypeValues;

export type NsfwDescriptionStyle = 'Hoa Mỹ' | 'Trần Tục' | 'Gợi Cảm' | 'Mạnh Bạo (BDSM)' | 'Tùy Chỉnh (Phòng Tối AI)';
export type ViolenceLevel = 'Nhẹ Nhàng' | 'Thực Tế' | 'Cực Đoan';
export type StoryTone = 'Tích Cực' | 'Trung Tính' | 'Đen Tối' | 'Dâm Dục' | 'Hoang Dâm' | 'Dâm Loạn';

export type GameEventType = 'Khám Phá / Thám Hiểm' | 'Thi Đấu / Cạnh Tranh' | 'Tuyển Chọn / Chiêu Mộ' | 'Xã Hội / Lễ Hội' | 'Chiến Tranh' | 'Đấu Giá' | 'Thiên Tai' | 'Tin Đồn';
export type GameEventStatus = 'Sắp diễn ra' | 'Đang diễn ra' | 'Đã kết thúc';

export type VectorEntityType = 'item' | 'skill' | 'quest' | 'npc' | 'yeuThu' | 'faction' | 'lore' | 'wife' | 'slave' | 'prisoner' | 'location' | 'master' | 'relationship_memory';

export const SEARCH_METHODS = [
  "Hỏi Thăm Dân Địa Phương",
  "Tra Cứu Cổ Tịch / Bản Đồ Cũ",
  "Dùng Thần Thức / Linh Cảm",
  "Đi Lang Thang Vô Định",
] as const;
export type SearchMethod = typeof SEARCH_METHODS[number];
