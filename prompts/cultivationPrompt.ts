// FIX: Corrected import paths for types.
import { KnowledgeBase, Skill, NPC, Wife, Slave } from '../types/index';
import * as GameTemplates from '../types/index';
import { VIETNAMESE, DEFAULT_NSFW_DESCRIPTION_STYLE, DEFAULT_VIOLENCE_LEVEL, DEFAULT_STORY_TONE } from '../constants';
import { getNsfwGuidance } from './promptUtils';

export const generateCultivationSessionPrompt = (
    kb: KnowledgeBase,
    cultivationType: 'skill' | 'method',
    duration: number, // in turns
    currentPageMessagesLog: string,
    previousPageSummaries: string[],
    lastNarrationFromPreviousPage?: string,
    skill?: Skill, // for skill cultivation
    method?: Skill, // for method cultivation. It's also of type Skill
    partner?: NPC | Wife | Slave // for dual cultivation
): string => {
    const { playerStats, worldConfig } = kb;
    const isNsfw = worldConfig?.nsfwMode || false;
    const nsfwStyle = worldConfig?.nsfwDescriptionStyle || DEFAULT_NSFW_DESCRIPTION_STYLE;
    const currentDifficultyName = worldConfig?.difficulty || 'Thường';
    const currentLocation = kb.discoveredLocations.find(l => l.id === kb.currentLocationId);

    let difficultyGuidanceText = "";
    switch (currentDifficultyName) {
        case 'Dễ': difficultyGuidanceText = VIETNAMESE.difficultyGuidanceEasy; break;
        case 'Thường': difficultyGuidanceText = VIETNAMESE.difficultyGuidanceNormal; break;
        case 'Khó': difficultyGuidanceText = VIETNAMESE.difficultyGuidanceHard; break;
        case 'Ác Mộng': difficultyGuidanceText = VIETNAMESE.difficultyGuidanceNightmare; break;
        default: difficultyGuidanceText = VIETNAMESE.difficultyGuidanceNormal;
    }

    let nsfwGuidance = getNsfwGuidance(worldConfig);

    // Thêm hướng dẫn đặc biệt cho Song Tu khi chế độ 18+ đang bật
    if (worldConfig?.nsfwMode && partner && method?.congPhapDetails?.type === GameTemplates.CongPhapType.SONG_TU) {
        nsfwGuidance += `
**YÊU CẦU ĐẶC BIỆT VỀ CẢNH TÌNH DỤC (QUAN TRỌNG):** Khi miêu tả các cảnh quan hệ tình dục, hãy viết một cách **CHI TIẾT, DÀI và MẠNH BẠO** hơn. Đừng ngần ngại đi sâu vào các hành vi thể xác, mô tả cường độ, sự thô bạo (nếu phù hợp với bối cảnh và tông màu), và những cảm xúc mãnh liệt của nhân vật. Tập trung vào sự tương tác vật lý, những âm thanh, và sức mạnh trong từng hành động. Hãy để các cảnh này kéo dài và có sự leo thang về cường độ.`;
    }


    let header = `Bạn là một AI kể chuyện, chuyên mô tả lại quá trình tu luyện của nhân vật trong một thế giới tu tiên.`;
    let mainRequest = '';
    let successFactors = `- Cảnh giới của người chơi (${playerStats.realm})\n- Linh căn của người chơi (${playerStats.spiritualRoot})\n- Thể chất của người chơi (${playerStats.specialPhysique})\n- May mắn`;
    let failureFactors = `- Tâm ma quấy nhiễu\n- Vận rủi`;
    let partnerUpdateTag = '';

    if (cultivationType === 'skill') {
        header += ` Người chơi đang cố gắng tu luyện để tăng độ thuần thục của một Linh Kĩ.`;
        mainRequest = `**YÊU CẦU:**
- **Mục tiêu:** Tăng độ thuần thục cho Linh Kĩ: **${skill?.name || 'Không rõ'}**.
- **Mô tả kỹ năng:** ${skill?.description || 'Không rõ'}.
- **Độ thuần thục hiện tại:** ${skill?.proficiencyTier || 'Sơ Nhập'} (${skill?.proficiency || 0} / ${skill?.maxProficiency || 100}).
- **Thời gian tu luyện:** ${duration} ngày. Thời gian trong game được tính theo lịch: 1 năm có 12 tháng, 1 tháng có 30 ngày. Khi ngày vượt quá 30, nó sẽ quay về 1 và tháng tăng lên. Khi tháng vượt quá 12, nó sẽ quay về 1 và năm tăng lên.
`;
        successFactors += `\n- Ngộ tính của nhân vật\n- Sự phù hợp của kỹ năng với thuộc tính của nhân vật`;
        failureFactors += `\n- Kỹ năng quá cao thâm, khó lĩnh ngộ`;
    } else { // 'method'
        if (partner && method?.congPhapDetails?.type === GameTemplates.CongPhapType.SONG_TU) {
            header += ` Người chơi đang tiến hành Song Tu với một đạo hữu để cùng nhau nâng cao tu vi.`;
            mainRequest = `**YÊU CẦU:**
- **Mục tiêu:** Tăng tiến tu vi (Kinh nghiệm) thông qua Song Tu.
- **Công pháp sử dụng:** ${method.name} (Phẩm chất: ${method.congPhapDetails?.grade || 'Không rõ'}).
- **Thời gian song tu:** ${duration} ngày.
- **Bạn đồng tu:**
  - Tên: ${partner.name}
  - Thân phận: ${('entityType' in partner && partner.entityType) ? (partner.entityType === 'wife' ? 'Đạo lữ' : 'Nô lệ') : 'NPC'}
  - Cảnh giới: ${partner.realm}
  - Tư chất: ${partner.tuChat || 'Không rõ'}
  - Thiện cảm: ${partner.affinity}
  - Ý chí: ${('willpower' in partner) ? partner.willpower : 'Không rõ'}
  - Phục tùng: ${('obedience' in partner) ? partner.obedience : 'Không rõ'}
  - Mô tả: ${partner.description}
`;
            successFactors += `\n- Phẩm chất công pháp (${method.congPhapDetails?.grade || 'Không rõ'})\n- Mức độ thiện cảm với bạn đồng tu (${partner.affinity})\n- Sự tương hợp trong công pháp và cảnh giới giữa hai người\n- Tư chất của bạn đồng tu (${partner.tuChat || 'Không rõ'})`;
            failureFactors += `\n- Mâu thuẫn, thiếu tin tưởng với bạn đồng tu.\n- Công pháp vận hành sai lệch.`;
            
            if ('entityType' in partner && partner.entityType) {
                if (partner.entityType === 'wife') {
                    partnerUpdateTag = 'WIFE_UPDATE';
                } else if (partner.entityType === 'slave') {
                    partnerUpdateTag = 'SLAVE_UPDATE';
                }
            } else {
                partnerUpdateTag = 'NPC_UPDATE';
            }
        } else {
            header += ` Người chơi đang bế quan để đột phá cảnh giới.`;
            mainRequest = `**YÊU CẦU:**
- **Mục tiêu:** Tăng tiến tu vi (Kinh nghiệm) thông qua Bế Quan Tu Luyện.
- **Công pháp sử dụng:** ${method?.name || 'Không có công pháp chính'} (Phẩm chất: ${method?.congPhapDetails?.grade || 'Không rõ'}).
- **Thời gian bế quan:** ${duration} ngày.
`;
            successFactors += `\n- Phẩm chất của công pháp tu luyện (${method?.congPhapDetails?.grade || 'Không rõ'})\n- Nơi bế quan có linh khí dồi dào`;
            failureFactors += `\n- Nơi bế quan linh khí mỏng manh, bị quấy nhiễu`;
        }
    }
    
    const contextBlock = `
**BỐI CẢNH HỘI THOẠI (LỊCH SỬ GẦN ĐÂY):**
- **Tóm tắt các trang trước:**
${previousPageSummaries.length > 0 ? previousPageSummaries.join("\n\n") : "Không có."}
- **Diễn biến gần nhất (lượt trước):**
${lastNarrationFromPreviousPage || "Không có."}
- **Diễn biến chi tiết trang hiện tại:**
${currentPageMessagesLog || "Không có."}
`;


    return `
${header}

**BỐI CẢNH TOÀN DIỆN:**
- **Thế Giới:** Chủ đề "${worldConfig?.theme}", thể loại "${worldConfig?.genre}".
- **Người chơi:**
    - Tên: ${worldConfig?.playerName || 'Người chơi'}
    - Cảnh giới: ${playerStats.realm}
    - Chỉ số: Sinh lực ${playerStats.sinhLuc}/${playerStats.maxSinhLuc}, Linh lực ${playerStats.linhLuc}/${playerStats.maxLinhLuc}
- **Địa điểm hiện tại:** "${currentLocation?.name || 'Không rõ'}" (An toàn: ${currentLocation?.isSafeZone ? 'Có' : 'Không'})

${contextBlock}

${mainRequest}

**CHẾ ĐỘ NỘI DUNG VÀ PHONG CÁCH:**
${nsfwGuidance}

**HƯỚNG DẪN VỀ ĐỘ KHÓ (Rất quan trọng để AI tuân theo):**
- **Dễ:** ${VIETNAMESE.difficultyGuidanceEasy}
- **Thường:** ${VIETNAMESE.difficultyGuidanceNormal}
- **Khó:** ${VIETNAMESE.difficultyGuidanceHard}
- **Ác Mộng:** ${VIETNAMESE.difficultyGuidanceNightmare}
Hiện tại người chơi đang ở độ khó: **${currentDifficultyName}**. Hãy điều chỉnh kết quả tu luyện (lượng kinh nghiệm, độ thuần thục nhận được, khả năng gặp sự cố) một cách hợp lý với độ khó này.

**NHIỆM VỤ CỦA BẠN (AI):**
1.  **VIẾT LỜI KỂ:**
    *   Mô tả chi tiết và hợp lý quá trình tu luyện trong ${duration} ngày.
    *   Lời kể phải dựa trên các yếu tố thành công/thất bại đã nêu.
    *   Hãy sáng tạo! Có thể có những sự kiện bất ngờ xảy ra trong quá trình tu luyện (ngộ ra chân lý, tâm ma xâm nhập, linh khí bạo động, bạn đồng tu có hành động bất ngờ...).
    *   Nếu là Song Tu và 18+ BẬT, hãy mô tả cảnh đó theo phong cách đã chỉ định.

2.  **TẠO TAGS CẬP NHẬT (QUAN TRỌNG):**
    *   **Tăng thời gian:** Dùng tag **[CHANGE_TIME: ngay=${duration}]**.
    *   **Cập nhật chỉ số người chơi:**
        - Nếu là tu luyện công pháp, dùng **[STATS_UPDATE: kinhNghiem=+=X]**. Lượng X phải hợp lý với thời gian, độ khó, và các yếu tố khác.
        - Nếu là tu luyện kỹ năng, dùng **[SKILL_UPDATE: name="${skill?.name}", proficiency=+=Y]**. Lượng Y phải hợp lý.
    *   **Cập nhật chỉ số bạn đồng tu (nếu có):**
        - Nếu là song tu, bạn đồng tu cũng nhận được kinh nghiệm. Dùng tag **[${partnerUpdateTag}: name="${partner?.name}", ... (cập nhật chỉ số)]**. Đồng thời, cập nhật các chỉ số quan hệ như \`affinity\`, \`obedience\`.
    *   **QUAN TRỌNG:** KHÔNG tạo các tag [CHOICE].

**VÍ DỤ (Song Tu thành công):**
(Lời kể)
... Dưới sự dẫn dắt của bạn, cả hai nhanh chóng tiến vào trạng thái tu luyện sâu. Âm dương giao hòa, linh lực của cả hai lưu chuyển thành một chu thiên hoàn mỹ, bổ sung và khuếch đại cho nhau. Sau ${duration} ngày, bạn cảm thấy tu vi của mình tăng tiến một cách rõ rệt, mối liên kết với ${partner?.name} cũng trở nên sâu đậm hơn.
[CHANGE_TIME: ngay=${duration}]
[STATS_UPDATE: kinhNghiem=+=5000]
[${partnerUpdateTag}: name="${partner?.name}", affinity=+=10]
`;
};