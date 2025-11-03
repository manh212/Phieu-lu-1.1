// constants/promptStructure.ts
// FIX: Changed import to a direct path to avoid circular dependencies with the types barrel file.
import { PromptBlock } from '../types/config';

export const DEFAULT_PROMPT_STRUCTURE: PromptBlock[] = [
    // --- HEADERS AND CORE CONTEXT ---
    {
        id: 'header_context',
        label: 'PHẦN 1: BỐI CẢNH (CONTEXT)',
        description: 'Tiêu đề phân chia các khối bối cảnh.',
        type: 'header',
        enabled: true, isEditable: false, isMovable: false,
    },
    {
        id: 'ragContext',
        label: "A. Bối Cảnh Truy Xuất (RAG Context - Trí nhớ dài hạn)",
        description: "Gửi các thông tin liên quan từ lịch sử game (trí nhớ dài hạn).",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'ragContextWrapper',
    },
    {
        id: 'coreContext',
        label: "B. Bối Cảnh Cốt Lõi (Core Context - Trạng thái hiện tại)",
        description: "Gửi thông tin hiện tại của người chơi (chỉ số, nhiệm vụ, trạng thái).",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'coreContextTemplate',
    },
    {
        id: 'conversationalContext',
        label: "C. Bối Cảnh Hội Thoại (Conversational Context - Trí nhớ ngắn hạn)",
        description: "Gửi các tóm tắt trang trước và diễn biến gần đây.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'conversationalContextTemplate',
    },
    {
        id: 'stagedActionsContext',
        label: "D. Bối Cảnh Hành Động Chờ (Staged Actions)",
        description: "Gửi các sự kiện đã được Siêu Trợ Lý sắp đặt và đang chờ kích hoạt.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'stagedActionsContextWrapper',
    },

    // --- GUIDANCE SECTION ---
    {
        id: 'header_guidance',
        label: 'PHẦN 2: HƯỚNG DẪN HÀNH ĐỘNG',
        description: 'Tiêu đề phân chia các khối hướng dẫn cho AI.',
        type: 'header',
        enabled: true, isEditable: false, isMovable: false,
    },
    {
        id: 'rule_aiThinkingProcess',
        label: "Quy Tắc Về Quy Trình Suy Nghĩ Của AI",
        description: "Yêu cầu AI tách biệt phần suy nghĩ (<thinking>) và phần phản hồi (<response>).",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'aiThinkingProcessGuidance'
    },
    {
        id: 'strictModeGuidance',
        label: "Hướng Dẫn Chế Độ Nghiêm Ngặt",
        description: "Gửi quy tắc về hành động lớn/nhỏ khi chế độ này được bật.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'strictModeGuidance'
    },
    {
        id: 'userPrompts',
        label: "Lời Nhắc Từ Người Chơi",
        description: "Gửi các quy tắc tùy chỉnh mà người dùng đã thêm ở màn hình 'Lời Nhắc'.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'userPromptsWrapper',
    },
    {
        id: 'narrativeDirective',
        label: "Chỉ Dẫn Tường Thuật Bắt Buộc",
        description: "Gửi chỉ dẫn đặc biệt cho lượt này (nếu có, từ Siêu Trợ Lý).",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'narrativeDirectiveWrapper',
    },
    {
        id: 'playerActionGuidance',
        label: "Hướng Dẫn Từ Người Chơi (Cho Lượt Tiếp Theo)",
        description: "Gửi hành động/câu chuyện mà người chơi vừa nhập.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'playerActionGuidanceTemplate',
    },
    {
        id: 'worldEventGuidance',
        label: "Hướng Dẫn Về Sự Kiện Thế Giới",
        description: "Gửi thông tin về các sự kiện đang/sắp diễn ra tại địa điểm hiện tại.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'worldEventGuidanceWrapper',
    },
    {
        id: 'aiProcessingGuidance',
        label: "Hướng Dẫn Xử Lý Dành Cho AI",
        description: "Lời nhắc chung cho AI về việc viết lời kể và sử dụng tags.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'aiProcessingGuidance'
    },
    {
        id: 'writingStyleGuidance',
        label: "Hướng Dẫn Bắt Chước Văn Phong",
        description: "Gửi đoạn văn mẫu mà người dùng cung cấp để AI bắt chước.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'writingStyleGuidance'
    },
    {
        id: 'responseLengthGuidance',
        label: "Hướng Dẫn Về Độ Dài Phản Hồi",
        description: "Yêu cầu AI tuân thủ độ dài mong muốn (Ngắn/Trung bình/Dài).",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'responseLengthGuidanceTemplate',
    },
     // --- NEW REFACTORED DIFFICULTY RULES ---
    {
        id: 'header_difficulty',
        label: 'HƯỚNG DẪN VỀ ĐỘ KHÓ',
        description: 'Các quy tắc về độ khó.',
        type: 'header',
        enabled: true, isEditable: false, isMovable: false,
    },
    {
        id: 'difficultyEasy',
        label: "[Độ Khó] Dễ",
        description: "Hướng dẫn cho độ khó Dễ.",
        type: 'system',
        enabled: false, isEditable: true, isMovable: true,
        rulebookKey: 'difficultyEasy'
    },
    {
        id: 'difficultyNormal',
        label: "[Độ Khó] Thường",
        description: "Hướng dẫn cho độ khó Thường.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'difficultyNormal'
    },
    {
        id: 'difficultyHard',
        label: "[Độ Khó] Khó",
        description: "Hướng dẫn cho độ khó Khó.",
        type: 'system',
        enabled: false, isEditable: true, isMovable: true,
        rulebookKey: 'difficultyHard'
    },
    {
        id: 'difficultyNightmare',
        label: "[Độ Khó] Ác Mộng",
        description: "Hướng dẫn cho độ khó Ác Mộng.",
        type: 'system',
        enabled: false, isEditable: true, isMovable: true,
        rulebookKey: 'difficultyNightmare'
    },
    // --- NEW REFACTORED NSFW RULES ---
    {
        id: 'header_nsfw',
        label: 'PHONG CÁCH MIÊU TẢ 18+',
        description: 'Các quy tắc về phong cách miêu tả nội dung người lớn.',
        type: 'header',
        enabled: true, isEditable: false, isMovable: false,
    },
    {
        id: 'nsfwHoaMy',
        label: "[18+] Phong cách Hoa Mỹ",
        description: "Miêu tả nghệ thuật, dùng ẩn dụ, văn chương.",
        type: 'system',
        enabled: false, isEditable: true, isMovable: true,
        rulebookKey: 'nsfwHoaMy'
    },
    {
        id: 'nsfwTranTuc',
        label: "[18+] Phong cách Trần Tục",
        description: "Miêu tả thẳng thắn, trực diện, không né tránh.",
        type: 'system',
        enabled: false, isEditable: true, isMovable: true,
        rulebookKey: 'nsfwTranTuc'
    },
    {
        id: 'nsfwGoiCam',
        label: "[18+] Phong cách Gợi Cảm",
        description: "Tập trung vào cảm giác, cảm xúc và không khí.",
        type: 'system',
        enabled: false, isEditable: true, isMovable: true,
        rulebookKey: 'nsfwGoiCam'
    },
    {
        id: 'nsfwManhBao',
        label: "[18+] Phong cách Mạnh Bạo (BDSM)",
        description: "Mô tả các yếu tố thống trị, phục tùng, trói buộc.",
        type: 'system',
        enabled: false, isEditable: true, isMovable: true,
        rulebookKey: 'nsfwManhBao'
    },
    {
        id: 'nsfwTuyChinh',
        label: "[18+] Phong cách Tùy Chỉnh (Phòng Tối AI)",
        description: "Sử dụng quy tắc tùy chỉnh do người dùng định nghĩa.",
        type: 'system',
        enabled: false, isEditable: true, isMovable: true,
        rulebookKey: 'nsfwTuyChinh'
    },

    // --- RULES SECTION ---
    {
        id: 'header_rules',
        label: 'PHẦN 3: QUY TẮC VÀ HƯỚNG DẪN CHI TIẾT',
        description: 'Tiêu đề phân chia các khối quy tắc hệ thống.',
        type: 'header',
        enabled: true, isEditable: false, isMovable: false,
    },
    {
        id: 'rule_narrationAndVividness',
        label: "Quy Tắc 'Tả, đừng kể'",
        description: "Yêu cầu AI sử dụng ngũ quan, mô tả chi tiết thay vì kể chung chung.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'narrationAndVividness'
    },
    {
        id: 'rule_proactiveNpc',
        label: "Quy Tắc 'NPC chủ động'",
        description: "Yêu cầu AI để ít nhất một NPC thực hiện hành động chủ động trong mỗi cảnh.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'proactiveNpc'
    },
    {
        id: 'rule_rumorMill',
        label: "Quy Tắc 'Cối xay tin đồn'",
        description: "Yêu cầu AI tạo ra các tin đồn đa dạng qua hội thoại của NPC.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'rumorMill'
    },
    {
        id: 'rule_formattingRules',
        label: "Quy Tắc Định Dạng & Hội Thoại",
        description: "Bao gồm cấm tag trong lời kể và quy tắc đánh dấu hội thoại.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'formattingRules'
    },
    {
        id: 'rule_timeRules',
        label: "Quy Tắc Về Thời Gian ([CHANGE_TIME])",
        description: "Hướng dẫn về việc sử dụng tag thời gian và bối cảnh môi trường.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'timeRules'
    },
    {
        id: 'rule_statRules',
        label: "Quy Tắc Về Chỉ Số ([STATS_UPDATE])",
        description: "Hướng dẫn về việc cập nhật chỉ số người chơi.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'statRules'
    },
    {
        id: 'rule_itemRules',
        label: "Quy Tắc Về Vật Phẩm ([ITEM_*])",
        description: "Hướng dẫn về việc tạo, dùng, cập nhật vật phẩm.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'itemRules'
    },
    {
        id: 'rule_skillRules',
        label: "Quy Tắc Về Kỹ Năng ([SKILL_*])",
        description: "Hướng dẫn về việc học và cập nhật kỹ năng.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'skillRules'
    },
    {
        id: 'rule_questRules',
        label: "Quy Tắc Về Nhiệm Vụ ([QUEST_*])",
        description: "Hướng dẫn về việc quản lý nhiệm vụ.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'questRules'
    },
    {
        id: 'rule_creationRules',
        label: "Quy Tắc Về Tạo Mới Thế Giới",
        description: "Hướng dẫn về việc tạo NPC, địa điểm, phe phái...",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'creationRules'
    },
    {
        id: 'rule_updateRules',
        label: "Quy Tắc Về Cập Nhật Thế Giới",
        description: "Hướng dẫn về việc cập nhật NPC, địa điểm...",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'updateRules'
    },
    {
        id: 'rule_deletionRules',
        label: "Quy Tắc Về Xóa Thông Tin",
        description: "Hướng dẫn về việc xóa NPC, phe phái...",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'deletionRules'
    },
    {
        id: 'rule_specialStatusRules',
        label: "Quy Tắc Về Thân Phận Đặc Biệt",
        description: "Hướng dẫn về các tag cho Tù nhân/Nô lệ và các tag hệ thống khác.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'specialStatusRules'
    },
    {
        id: 'rule_simpleCompanionRules',
        label: "Quy Tắc Về Đồng Hành (Đơn giản)",
        description: "Hướng dẫn sử dụng tag [COMPANION_*] cho thú cưng, v.v.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'simpleCompanionRules'
    },
     {
        id: 'rule_statusEffectRules',
        label: "Quy Tắc Về Hiệu Ứng Trạng Thái",
        description: "Hướng dẫn sử dụng tag [STATUS_EFFECT_*].",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'statusEffectRules'
    },
    {
        id: 'rule_combatStartRules',
        label: "Quy Tắc Bắt Đầu Chiến Đấu",
        description: "Hướng dẫn sử dụng tag [BEGIN_COMBAT].",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'combatStartRules'
    },
     {
        id: 'rule_cultivationRules',
        label: "Quy Tắc Về Tu Luyện",
        description: "Gửi hướng dẫn về các tag đặc thù của tu luyện (vd: Bình Cảnh).",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'cultivationRules'
    },
    {
        id: 'rule_worldProgressionRules',
        label: "Quy Tắc Thế Giới Vận Động",
        description: "Cho phép AI tự tạo sự kiện phe phái, môi trường và các diễn biến ở xa.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'worldProgressionRules'
    },
    {
        id: 'rule_specialEventRules',
        label: "Quy Tắc Về Hành Động Chờ (Staged Actions)",
        description: "Gửi hướng dẫn về cách kích hoạt các hành động đã được Siêu Trợ Lý sắp đặt.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'specialEventRules'
    },

    // --- FINAL SECTION ---
     {
        id: 'header_final',
        label: 'PHẦN CUỐI: LỰA CHỌN VÀ KẾT THÚC',
        description: 'Tiêu đề phân chia các khối cuối cùng.',
        type: 'header',
        enabled: true, isEditable: false, isMovable: false,
    },
     {
        id: 'rule_choiceRules',
        label: "Mệnh Lệnh Tạo Lựa Chọn Mới ([CHOICE])",
        description: "Hướng dẫn về việc tạo các lựa chọn hành động cốt lõi và sáng tạo.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'choiceRules'
    },
    {
        id: 'rule_turnRules',
        label: "Mệnh Lệnh Tăng Lượt Chơi (turn=+1)",
        description: "Yêu cầu bắt buộc phải có tag tăng lượt chơi ở cuối mỗi phản hồi.",
        type: 'system',
        enabled: true, isEditable: true, isMovable: true,
        rulebookKey: 'turnRules'
    },
];
