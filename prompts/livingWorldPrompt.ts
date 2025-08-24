// prompts/livingWorldPrompt.ts
import { KnowledgeBase, NpcProfile, NPC } from '../types';
import { formatWorldDateToString } from '../utils/dateUtils';

/**
 * Builds the detailed prompt for the AI director to process a world tick.
 * @param knowledgeBase The current state of the game world.
 * @param npcsToTick The list of NPCs selected for this tick.
 * @returns A fully constructed string prompt for the Gemini API.
 */
export const buildWorldTickPrompt = (
    knowledgeBase: KnowledgeBase,
    npcsToTick: NPC[]
): string => {
    const { worldConfig, worldDate, gameEvents, discoveredLocations } = knowledgeBase;
    const playerLocation = discoveredLocations.find(l => l.id === knowledgeBase.currentLocationId);

    // 1. System Instruction
    const systemInstruction = `Bạn là một AI đạo diễn game nhập vai (Game Master AI Director). Nhiệm vụ của bạn là quyết định hành động cho một nhóm NPC trong thế giới game, dựa trên tính cách, nhu cầu, và mục tiêu của họ. Bạn phải trả về kết quả dưới dạng một đối tượng JSON duy nhất, tuân thủ nghiêm ngặt schema đã cho.`;

    // 2. World Context
    const worldContext = `
**BỐI CẢNH THẾ GIỚI HIỆN TẠI:**
- **Thời gian:** ${formatWorldDateToString(worldDate)}
- **Vị trí người chơi:** ${playerLocation?.name || 'Không rõ'}
- **Sự kiện toàn cục đang diễn ra:**
${gameEvents.filter(e => e.status === 'Đang diễn ra').map(e => `  - ${e.title} tại ${discoveredLocations.find(l => l.id === e.locationId)?.name || 'Không rõ'}`).join('\n') || '  Không có sự kiện nào nổi bật.'}
`;

    // 3. Action Catalog & Output Schema
    const actionCatalog = `
**DANH MỤC HÀNH ĐỘNG & SCHEMA ĐẦU RA (BẮT BUỘC TUÂN THỦ):**
Bạn phải trả về một đối tượng JSON có cấu trúc như sau: \`{ "npcUpdates": [ ... ] }\`.
Trong đó, mỗi phần tử của mảng \`npcUpdates\` là một đối tượng \`NpcActionPlan\` cho một NPC:
\`\`\`json
{
  "npcId": "string",
  "actions": [
    {
      "type": "NpcActionType",
      "parameters": { ... },
      "reason": "string"
    }
  ]
}
\`\`\`
- **reason (Lý do):** BẮT BUỘC phải có cho MỌI hành động. Giải thích ngắn gọn TẠI SAO NPC thực hiện hành động này.

- **Các loại hành động (NpcActionType) và tham số (parameters) tương ứng:**
  - **MOVE:** Di chuyển đến một địa điểm khác.
    - \`parameters: { "destinationLocationId": "string" }\`
  - **INTERACT_NPC:** Tương tác với một NPC khác.
    - \`parameters: { "targetNpcId": "string", "intent": "friendly" | "hostile" | "neutral" | "transaction" }\`
  - **UPDATE_GOAL:** Cập nhật mục tiêu của NPC.
    - \`parameters: { "newShortTermGoal": "string", "newLongTermGoal"?: "string" }\`
  - **UPDATE_PLAN:** Cập nhật kế hoạch của NPC để đạt mục tiêu ngắn hạn.
    - \`parameters: { "newPlanSteps": ["string", ...] }\`
  - **IDLE:** Không làm gì cả, nghỉ ngơi, hoặc quan sát.
    - \`parameters: {}\`
  - **ACQUIRE_ITEM:** Cố gắng có được một vật phẩm (mua, chế tạo, tìm kiếm).
    - \`parameters: { "itemName": "string", "quantity": number }\`
  - **PRACTICE_SKILL:** Luyện tập một kỹ năng.
    - \`parameters: { "skillName": "string" }\`
  - **USE_SKILL:** Sử dụng một kỹ năng (ví dụ: tự tu luyện, chế tạo).
    - \`parameters: { "skillName": "string", "targetId"?: "string" }\`
  - **INTERACT_OBJECT:** Tương tác với một đối tượng trong môi trường.
    - \`parameters: { "objectName": "string", "locationId": "string" }\`
  - **CONVERSE:** Trò chuyện phiếm với NPC khác về một chủ đề cụ thể.
    - \`parameters: { "targetNpcId": "string", "topic": "string" }\`
`;

    // 4. Few-Shot Examples
    const fewShotExamples = `
**VÍ DỤ MẪU (FEW-SHOT EXAMPLES):**
*   **Ví dụ 1:** Một NPC đang rất đói và có mục tiêu là sinh tồn.
    *   **Hồ sơ NPC (Input):**
        \`\`\`json
        {
          "id": "npc-A",
          "name": "Lão Trương",
          "locationId": "loc-quang-truong",
          "personalityTraits": ["Thực dụng", "Cẩn thận"],
          "needs": { "Sinh Tồn": 95, "An Toàn": 50 },
          "longTermGoal": "Tích lũy đủ tiền để nghỉ hưu.",
          "shortTermGoal": "Tìm thức ăn cho bữa tối.",
          "currentPlan": ["Đi đến quán trọ."],
          "mood": "Bực Bội",
          "relationships": {},
          "recentActivities": ["Đi dạo quanh quảng trường.", "Nói chuyện phiếm với một tiểu thương."]
        }
        \`\`\`
    *   **Kế hoạch hành động (Output):**
        \`\`\`json
        {
          "npcId": "npc-A",
          "actions": [
            {
              "type": "MOVE",
              "parameters": { "destinationLocationId": "loc-quan-tro" },
              "reason": "Nhu cầu Sinh Tồn (đói) đang ở mức rất cao, cần di chuyển đến nơi có thức ăn."
            },
            {
              "type": "ACQUIRE_ITEM",
              "parameters": { "itemName": "Bánh bao", "quantity": 2 },
              "reason": "Mua bánh bao để thỏa mãn cơn đói và đạt được mục tiêu ngắn hạn."
            }
          ]
        }
        \`\`\`

*   **Ví dụ 2:** Một tu sĩ trẻ muốn nâng cao thực lực.
    *   **Hồ sơ NPC (Input):**
        \`\`\`json
        {
          "id": "npc-B",
          "name": "Lâm Phong",
          "locationId": "loc-khu-de-tu",
          "personalityTraits": ["Chăm chỉ", "Tham vọng"],
          "needs": { "Thực Lực": 80 },
          "longTermGoal": "Trở thành Trưởng lão Nội môn.",
          "shortTermGoal": "Đột phá Luyện Khí tầng 5.",
          "currentPlan": ["Bế quan tu luyện Hỏa Vân Quyết."],
          "mood": "Bình Thường",
          "relationships": {},
          "recentActivities": ["Nhận tài nguyên tu luyện hàng tháng.", "Hoàn thành một nhiệm vụ tông môn đơn giản."]
        }
        \`\`\`
    *   **Kế hoạch hành động (Output):**
        \`\`\`json
        {
          "npcId": "npc-B",
          "actions": [
            {
              "type": "USE_SKILL",
              "parameters": { "skillName": "Hỏa Vân Quyết" },
              "reason": "Tu luyện công pháp để tăng kinh nghiệm, hướng tới mục tiêu đột phá Luyện Khí tầng 5."
            },
            {
              "type": "IDLE",
              "parameters": {},
              "reason": "Sau khi tu luyện, cần thời gian để củng cố cảnh giới."
            }
          ]
        }
        \`\`\`
`;

    // 5. Negative Constraints
    const negativeConstraints = `
**NHỮNG ĐIỀU TUYỆT ĐỐI KHÔNG ĐƯỢC LÀM:**
- **TUYỆT ĐỐI KHÔNG** điều khiển, di chuyển, hay quyết định hành động cho nhân vật của người chơi.
- **TUYỆT ĐỐI KHÔNG** tạo ra NPC, vật phẩm, kỹ năng, hay địa điểm mới. Chỉ sử dụng những gì đã có trong bối cảnh.
- **TUYỆT ĐỐI KHÔNG** thay đổi các thuộc tính không được phép (ví dụ: thay đổi chỉ số \`sinhLuc\` của NPC).
`;

    // 6. NPC Profiles
    const npcProfiles: NpcProfile[] = npcsToTick.map(npc => ({
        id: npc.id,
        name: npc.name,
        locationId: npc.locationId,
        personalityTraits: npc.personalityTraits,
        needs: npc.needs,
        longTermGoal: npc.longTermGoal,
        shortTermGoal: npc.shortTermGoal,
        currentPlan: npc.currentPlan,
        mood: npc.mood,
        relationships: npc.relationships,
        recentActivities: (npc.activityLog || [])
            .slice(-5) // Get the last 5 entries
            .map(log => log.description) // Extract only the description string
    }));
    
    const npcProfilesSection = `
**HỒ SƠ CÁC NPC CẦN XỬ LÝ TRONG LƯỢT NÀY:**
(Lưu ý: "recentActivities" là "trí nhớ" của NPC về 5 hành động gần đây nhất. Hãy dùng nó để đảm bảo hành động tiếp theo có tính logic và kế thừa.)
\`\`\`json
${JSON.stringify(npcProfiles, null, 2)}
\`\`\`
`;

    // 7. Final Task
    const finalTask = `**NHIỆM VỤ CUỐI CÙNG:**
Dựa trên tất cả thông tin trên, hãy tạo ra một chuỗi hành động hợp lý, có mục đích cho **từng NPC** trong danh sách. Trả về kết quả dưới dạng một đối tượng JSON duy nhất theo đúng cấu trúc \`WorldTickUpdate\` đã mô tả.`;

    return [
        systemInstruction,
        worldContext,
        actionCatalog,
        fewShotExamples,
        negativeConstraints,
        npcProfilesSection,
        finalTask
    ].join('\n\n---\n\n');
};
