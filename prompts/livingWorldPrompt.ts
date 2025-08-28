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
${gameEvents.filter(e => e.status === 'Đang diễn ra').map(e => `  - ${e.title} tại ${discoveredLocations.find(l => l.id === e.locationId)?.name || 'Không rõ'}`).join('\n') || '  Không có sự kiện lớn nào.'}
- **Bối cảnh chung:** ${worldConfig?.settingDescription || ''}`;

    // 3. NPC Profiles to Tick
    const npcProfiles: NpcProfile[] = npcsToTick.map(npc => ({
        id: npc.id,
        name: npc.name,
        locationId: npc.locationId,
        personalityTraits: npc.personalityTraits || [],
        needs: npc.needs || {},
        longTermGoal: npc.longTermGoal || 'Sống sót.',
        shortTermGoal: npc.shortTermGoal || 'Tìm kiếm cơ hội.',
        currentPlan: npc.currentPlan || [],
        mood: npc.mood || 'Bình Thường',
        relationships: npc.relationships || {},
        recentActivities: (npc.activityLog || []).slice(-5).map(log => log.description)
    }));
    const npcProfilesJson = JSON.stringify(npcProfiles, null, 2);

    // 4. Action Catalog (from types.ts)
    const actionCatalog = `
**DANH SÁCH HÀNH ĐỘNG KHẢ DỤNG (ACTION CATALOG):**
NPC có thể thực hiện các loại hành động sau. Hãy chọn hành động phù hợp nhất với tình huống.
- **Di chuyển:** MOVE
- **Tương tác:** INTERACT_NPC, CONVERSE, BUILD_RELATIONSHIP, FORM_GROUP, OFFER_SERVICE
- **Mục tiêu & Kế hoạch:** UPDATE_GOAL, UPDATE_PLAN
- **Vật phẩm & Kỹ năng:** ACQUIRE_ITEM, PRODUCE_ITEM, PRACTICE_SKILL, USE_SKILL, INTERACT_OBJECT
- **Hành động khác:** IDLE, RESEARCH_TOPIC, PATROL_AREA, COMMIT_CRIME, INFLUENCE_FACTION`;

    // 5. Final Task Instruction
    const taskInstruction = `
**NHIỆM VỤ CỦA BẠN:**
Với mỗi NPC trong danh sách "NPC PROFILES TO TICK" dưới đây, hãy:
1.  **Phân tích** trạng thái hiện tại của họ (tính cách, nhu cầu, mục tiêu, mối quan hệ, hoạt động gần đây).
2.  **Xem xét** bối cảnh thế giới hiện tại.
3.  **Quyết định** một chuỗi từ 1 đến 3 hành động logic mà họ sẽ thực hiện trong lượt này.
4.  Với mỗi hành động, hãy cung cấp một **lý do (reason)** ngắn gọn giải thích tại sao họ lại làm vậy. Lý do này sẽ được dùng làm lời kể trong game.
5.  **Trả về** kết quả dưới dạng một đối tượng JSON duy nhất có cấu trúc \`{"npcUpdates": [...]}\` theo đúng schema đã được cung cấp.

**NPC PROFILES TO TICK:**
\`\`\`json
${npcProfilesJson}
\`\`\`
`;

    return `${systemInstruction}\n\n${worldContext}\n\n${actionCatalog}\n\n${taskInstruction}`;
};
