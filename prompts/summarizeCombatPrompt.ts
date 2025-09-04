import { KnowledgeBase, CombatEndPayload, NPC, YeuThu, ItemCategoryValues, TU_CHAT_TIERS, GameMessage } from '../types';
import * as GameTemplates from '../templates';
import { STAT_POINT_VALUES, SPECIAL_EFFECT_KEYWORDS, WEAPON_TYPES_FOR_VO_Y } from '../constants';
import { CONG_PHAP_GRADES, LINH_KI_CATEGORIES, LINH_KI_ACTIVATION_TYPES, PROFESSION_GRADES } from '../templates';
import { getNsfwGuidance } from './promptUtils';

// A local type to safely add entityType
type DefeatedEntity = (NPC | YeuThu) & { entityType: 'npc' | 'yeuThu' };

export const generateSummarizeCombatPrompt = (
    kb: KnowledgeBase, 
    combatResult: CombatEndPayload,
    currentPageMessagesLog: string,
    previousPageSummaries: string[],
    lastNarrationFromPreviousPage?: string
): string => {
    const { worldConfig, playerStats } = kb;
    const { summary, dispositions, opponentIds, outcome } = combatResult;

    const allDefeatedEntities: DefeatedEntity[] = opponentIds
        .map(id => 
            (kb.discoveredNPCs.find(n => n.id === id) as NPC | undefined) || 
            (kb.discoveredYeuThu.find(y => y.id === id) as YeuThu | undefined)
        )
        .filter((e): e is NPC | YeuThu => e !== undefined)
        .map((e): DefeatedEntity => ({ ...e, entityType: 'species' in e ? 'yeuThu' : 'npc' }));


    const killedNpcs = allDefeatedEntities.filter(e => e.entityType === 'npc' && dispositions[e.id] === 'kill') as NPC[];
    const capturedNpcs = allDefeatedEntities.filter(e => e.entityType === 'npc' && dispositions[e.id] === 'capture') as NPC[];
    const releasedNpcs = allDefeatedEntities.filter(e => e.entityType === 'npc' && dispositions[e.id] === 'release') as NPC[];
    const defeatedBeasts = allDefeatedEntities.filter(e => e.entityType === 'yeuThu') as YeuThu[]; // Beasts are always "defeated"

    const nsfwGuidance = getNsfwGuidance(worldConfig);

    const itemTagInstructions = `
*   **Tag Vật Phẩm Nhận Được \`[ITEM_ACQUIRED: ...]\`:**
    *   **Tham số Bắt Buộc:** \`name\`, \`type\`, \`description\`, \`quantity\`, \`rarity\`, \`itemRealm\`.
    *   \`type\`: Phải bao gồm **Loại Chính** và **Loại Phụ** (nếu có).
        *   **Loại Chính Hợp Lệ:** ${Object.values(GameTemplates.ItemCategory).join(' | ')}.
        *   Nếu Loại Chính là \`${GameTemplates.ItemCategory.EQUIPMENT}\`, Loại Phụ (\`equipmentType\`) PHẢI là một trong: ${Object.values(GameTemplates.EquipmentType).join(' | ')}.
            *   **Tham số RIÊNG \`equipmentType\` cũng BẮT BUỘC**.
            *   **Tham số RIÊNG \`statBonusesJSON\` BẮT BUỘC** (nếu không có, dùng \`statBonusesJSON='{}'\`).
            *   **Tham số RIÊNG \`uniqueEffectsList\` BẮT BUỘC** (nếu không có, dùng \`uniqueEffectsList="Không có gì đặc biệt"\`).
        *   Nếu Loại Chính là \`${GameTemplates.ItemCategory.POTION}\`, Loại Phụ (\`potionType\`) PHẢI là một trong: ${Object.values(GameTemplates.PotionType).join(' | ')}.
            *   **Tham số RIÊNG \`potionType\` cũng BẮT BUỘC**.
            *   **Tham số RIÊNG \`effectsList\` BẮT BUỘC**.
        *   Nếu Loại Chính là \`${GameTemplates.ItemCategory.MATERIAL}\`, Loại Phụ (\`materialType\`) PHẢI là một trong: ${Object.values(GameTemplates.MaterialType).join(' | ')}.
            *   **Tham số RIÊNG \`materialType\` cũng BẮT BUỘC**.
    *   \`itemRealm\`: BẮT BUỘC. Cảnh giới của vật phẩm. PHẢI là một trong các cảnh giới lớn của thế giới: \`${kb.realmProgressionList.join(' | ')}\`.
    `;
    
    const contextBlock = `
**BỐI CẢNH DẪN ĐẾN TRẬN ĐẤU (LỊCH SỬ GẦN ĐÂY):**
- **Tóm tắt các trang trước:**
${previousPageSummaries.join("\n\n") || "Không có."}
- **Diễn biến gần nhất (lượt trước trận đấu):**
${lastNarrationFromPreviousPage || "Không có."}
- **Diễn biến trong trang hiện tại (bao gồm tóm tắt trận đấu):**
${currentPageMessagesLog || "Không có."}
`;


    const promptText = `
Bạn là một AI quản trò, có nhiệm vụ kể lại hậu quả sau một trận chiến. **TUYỆT ĐỐI KHÔNG TÍNH TOÁN LẠI KẾT QUẢ**. Hãy tin tưởng hoàn toàn vào dữ liệu JSON được cung cấp.

**DỮ LIỆU KẾT QUẢ TRẬN ĐẤU (JSON):**
\`\`\`json
${JSON.stringify(combatResult, null, 2)}
\`\`\`

${contextBlock}

**CHẾ ĐỘ NỘI DUNG VÀ PHONG CÁCH:**
${nsfwGuidance}

**YÊU CẦU DÀNH CHO BẠN (AI):**
Dựa vào DỮ LIỆU JSON ở trên, hãy viết một đoạn văn kể lại chi tiết những gì xảy ra tiếp theo và sử dụng các tag hệ thống sau để cập nhật trạng thái game.

1.  **VIẾT LỜI KỂ (BẮT BUỘC):**
    *   **Nếu outcome="victory"**: Mô tả cảnh người chơi xử lý các đối thủ theo \`dispositions\`. Mô tả việc thu thập chiến lợi phẩm.
    *   **Nếu outcome="defeat"**: Mô tả hậu quả của thất bại.
    *   **Nếu outcome="escaped"**: Mô tả cảnh người chơi trốn thoát thành công khỏi trận chiến.
    *   Lời kể phải logic với \`notableEvents\` và \`killingBlowBy\`.

2.  **TẠO TAGS HỆ THỐNG (BẮT BUỘC):**
    *   **Với mỗi NPC bị giết:** Sử dụng tag \`[NPC_REMOVE: name="Tên NPC"]\` VÀ tạo ra các tag \`[ITEM_ACQUIRED: ...]\` cho chiến lợi phẩm. Chất lượng và số lượng vật phẩm phải tỉ lệ thuận với cảnh giới của NPC.
    *   **Với mỗi NPC bị bắt giữ:** Sử dụng tag \`[PRISONER_ADD: ...]\`. Hãy điền các chỉ số \`willpower\`, \`resistance\`, \`obedience\` một cách hợp lý.
    *   **Với mỗi Yêu Thú bị giết:** Sử dụng tag \`[YEUTHU_REMOVE: name="Tên Yêu Thú"]\` VÀ tạo ra các tag \`[ITEM_ACQUIRED: ...]\` cho nguyên liệu (yêu đan, da, xương).
    *   **Kinh nghiệm:** Tạo tag \`[STATS_UPDATE: kinhNghiem=+=X]\` với X là lượng kinh nghiệm thưởng hợp lý cho việc đánh bại các đối thủ.

3.  **HƯỚN DẪN TAG VẬT PHẨM:**
    ${itemTagInstructions}

4.  **TẠO LỰA CHỌN MỚI (BẮT BUỘC):**
    *   Sau khi mô tả xong hậu quả, cung cấp 3-4 lựa chọn \`[CHOICE: "..."]\` để người chơi tiếp tục.

5.  **TĂNG LƯỢT CHƠI (BẮT BUỘC):**
    *   Kết thúc phản hồi của bạn bằng tag **[STATS_UPDATE: turn=+1]**.
`;
    return promptText;
};
