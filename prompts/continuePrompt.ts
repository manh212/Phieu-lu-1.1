import type { KnowledgeBase, PlayerActionInputType, ResponseLength, GameMessage, GenreType, ViolenceLevel, StoryTone, NsfwDescriptionStyle, TuChatTier, AIContextConfig } from '@/types/index';
import { DIALOGUE_MARKER } from '@/types/index';
import { SUB_REALM_NAMES, VIETNAMESE, CUSTOM_GENRE_VALUE, DEFAULT_NSFW_DESCRIPTION_STYLE, DEFAULT_VIOLENCE_LEVEL, DEFAULT_STORY_TONE, NSFW_DESCRIPTION_STYLES, TU_CHAT_TIERS, SPECIAL_EVENT_INTERVAL_TURNS, WEAPON_TYPES_FOR_VO_Y } from '../constants';
import * as GameTemplates from '@/types/index';
import { continuePromptSystemRules, storytellingRulesSection } from '../constants/systemRulesNormal';
import { getWorldDateDifferenceString } from '../utils/dateUtils';
import { DEFAULT_AI_CONTEXT_CONFIG } from '../utils/gameLogicUtils';
import { getNsfwGuidance } from './promptUtils';

export const generateContinuePrompt = (
  knowledgeBase: KnowledgeBase,
  playerActionText: string,
  inputType: PlayerActionInputType,
  responseLength: ResponseLength,
  currentPageMessagesLog: string,
  previousPageSummaries: string[],
  isStrictMode: boolean, // NEW
  lastNarrationFromPreviousPage?: string,
  retrievedContext?: string
): string => {
  const aiContextConfig = knowledgeBase.aiContextConfig || DEFAULT_AI_CONTEXT_CONFIG;
  const { worldConfig, worldDate, playerStats, userPrompts } = knowledgeBase;
  const genre = worldConfig?.genre || "Tu Tiên (Mặc định)";
  const customGenreName = worldConfig?.customGenreName;
  const effectiveGenre = (genre === CUSTOM_GENRE_VALUE && customGenreName) ? customGenreName : genre;
  
  const currentDifficultyName = worldConfig?.difficulty || 'Thường';

  // --- START: CONSTRUCT CORE CONTEXT ---
  const coreContext = {
      playerInfo: {
          name: worldConfig?.playerName,
          gender: worldConfig?.playerGender,
          race: worldConfig?.playerRace,
          personality: worldConfig?.playerPersonality,
          backstory: worldConfig?.playerBackstory,
          goal: worldConfig?.playerGoal,
          status: playerStats
      },
      playerAssets: {
          inventory: knowledgeBase.inventory.slice(0, 20).map(i => `${i.name} (x${i.quantity})`), // Truncate for brevity & simplify
          skills: knowledgeBase.playerSkills.map(s => s.name),
      },
      worldState: {
          theme: worldConfig?.theme,
          worldDate: worldDate,
          currentLocation: knowledgeBase.discoveredLocations.find(l => l.id === knowledgeBase.currentLocationId) || null,
          isCultivationEnabled: worldConfig?.isCultivationEnabled,
          realmProgressionSystemForPlayerRace: worldConfig?.raceCultivationSystems.find(s => s.raceName === (worldConfig.playerRace || 'Nhân Tộc'))?.realmSystem,
      }
  };
  // --- END: CONSTRUCT CORE CONTEXT ---

  const mainRealms = (knowledgeBase.realmProgressionList || []);

  const ragContextSection = aiContextConfig.sendRagContext ? `
**A. BỐI CẢNH TRUY XUẤT (RAG CONTEXT - LONG-TERM MEMORY):**
Dưới đây là một số thông tin liên quan từ các sự kiện trong quá khứ có thể hữu ích cho lượt này. Hãy sử dụng nó để đảm bảo tính nhất quán của câu chuyện.
${retrievedContext ? `\`\`\`
${retrievedContext}
\`\`\`` : "Không có bối cảnh truy xuất nào."}` : '';
  
  const coreContextSection = aiContextConfig.sendCoreContext ? `
**B. BỐI CẢNH CỐT LÕI (CORE CONTEXT - PLAYER'S CURRENT STATE):**
Đây là trạng thái hiện tại của người chơi và những yếu tố trực tiếp liên quan đến họ. Thông tin này LUÔN ĐÚNG và phải được ưu tiên hàng đầu.
\`\`\`json
${JSON.stringify(coreContext, null, 2)}
\`\`\`` : '';

  const conversationalContextSection = aiContextConfig.sendConversationalContext ? `
**C. BỐI CẢNH HỘI THOẠI (CONVERSATIONAL CONTEXT - SHORT-TERM MEMORY):**
- **Tóm tắt các diễn biến trang trước:**
${previousPageSummaries.length > 0 ? previousPageSummaries.join("\n\n") : "Không có tóm tắt từ các trang trước."}
- **Diễn biến gần nhất (lượt trước - Lượt ${playerStats.turn}):**
${lastNarrationFromPreviousPage || "Chưa có."}
- **Diễn biến chi tiết trang hiện tại (từ lượt đầu trang đến lượt ${playerStats.turn}):**
${currentPageMessagesLog || "Chưa có diễn biến nào trong trang này."}` : '';

  const userPromptsSection = (aiContextConfig.sendUserPrompts && userPrompts && userPrompts.length > 0)
    ? `
**LỜI NHẮC TỪ NGƯỜI CHƠI (QUY TẮC BẮT BUỘC TUÂN THỦ):**
${userPrompts.map(p => `- ${p}`).join('\n')}
`
    : '';
    
  let eventGuidance = "";
  if (aiContextConfig.sendEventGuidance) {
      const currentLocationId = knowledgeBase.currentLocationId;
      const relevantEvents = knowledgeBase.gameEvents.filter(event =>
          event.locationId === currentLocationId && (event.status === 'Sắp diễn ra' || event.status === 'Đang diễn ra' || event.status === 'Đã kết thúc')
      );

      if (relevantEvents.length > 0) {
          eventGuidance = `
**HƯỚNG DẪN VỀ SỰ KIỆN THẾ GIỚI (CỰC KỲ QUAN TRỌNG):**
`;
          relevantEvents.forEach(event => {
              const timeDiff = getWorldDateDifferenceString(event.startDate, event.endDate, knowledgeBase.worldDate);
              if (event.status === 'Sắp diễn ra') {
                  eventGuidance += `
    - **Sự kiện "${event.title}" SẮP DIỄN RA (${timeDiff}).**
      - **QUY TẮC:** **TUYỆT ĐỐI KHÔNG** bắt đầu sự kiện này.
      - **NHIỆM VỤ:** Hãy mô tả không khí chuẩn bị.
    `;
              } else if (event.status === 'Đang diễn ra') {
                  eventGuidance += `
    - **Sự kiện "${event.title}" ĐANG DIỄN RA (${timeDiff}).**
      - **QUY TẮC:** **BẮT BUỘC** phải mô tả sự kiện đang diễn ra.
      - **NHIỆM VỤ:** Cung cấp lựa chọn để tham gia.
    `;
              } else if (event.status === 'Đã kết thúc') {
                  eventGuidance += `
    - **Sự kiện "${event.title}" ĐÃ KẾT THÚC (${timeDiff}).**
      - **QUY TẮC:** **TUYỆT ĐỐI KHÔNG** mô tả sự kiện đang diễn ra.
      - **NHIỆM VỤ:** Hãy mô tả hậu quả của sự kiện.
    `;
              }
          });
      }
  }

  let nsfwGuidanceCombined = "";
  if (aiContextConfig.sendNsfwGuidance) {
      nsfwGuidanceCombined = getNsfwGuidance(worldConfig);
  }

    let specialEventGuidance = "";
    if (aiContextConfig.sendSpecialEventRules && (playerStats.turn % SPECIAL_EVENT_INTERVAL_TURNS === 0 && playerStats.turn > 0)) {
        specialEventGuidance = `
**HƯỚNG DẪN SỰ KIỆN ĐẶC BIỆT (QUAN TRỌNG):**
Đã đến lúc cho một sự kiện lớn! Hãy tạo ra một diễn biến bất ngờ, có thể thay đổi cục diện hoặc mở ra một nhánh truyện mới. Ví dụ: một cuộc gặp gỡ định mệnh, một tai họa bất ngờ, một cơ duyên hiếm có, hoặc một kẻ thù mạnh xuất hiện. Hãy làm cho nó thật đáng nhớ!`;
    }

  return `
**YÊU CẦU CỐT LÕI:** Tiếp tục câu chuyện game nhập vai thể loại "${effectiveGenre}" bằng tiếng Việt.
**QUY TẮC QUAN TRỌNG NHẤT:** Bắt đầu phản hồi bằng cách đi thẳng vào lời kể. **TUYỆT ĐỐI KHÔNG** bình luận về lựa chọn của người chơi.

---
**PHẦN 1: BỐI CẢNH (CONTEXT)**

${ragContextSection}
${coreContextSection}
${conversationalContextSection}

---
**PHẦN 2: HƯỚNG DẪN HÀNH ĐỘNG**
${userPromptsSection}

**HƯỚNG DẪN TỪ NGƯỜI CHƠI (CHO LƯỢT TIẾP THEO - LƯỢT ${playerStats.turn + 1}):**
- Loại hướng dẫn: ${inputType === 'action' ? 'Hành động trực tiếp' : 'Gợi ý câu chuyện'}
- Nội dung hướng dẫn: "${playerActionText}"
${specialEventGuidance}
${eventGuidance}

**HƯỚNG DẪN XỬ LÝ DÀNH CHO AI:**
${inputType === 'action'
    ? `Xử lý nội dung trên như một hành động mà nhân vật chính (${worldConfig?.playerName}) đang thực hiện.`
    : `Nội dung trên là một gợi ý của người chơi. **NHIỆM VỤ CỦA BẠN LÀ BẮT BUỘC PHẢI LÀM CHO DIỄN BIẾN NÀY XẢY RA.**`
  }
*   **VIẾT LỜI KỂ:** Mô tả kết quả của hành động.
*   **SỬ DỤNG TAGS HỆ THỐNG:** Tạo ra các tag để cập nhật trạng thái game.

---
**PHẦN 3: QUY TẮC VÀ HƯỚNG DẪN CHI TIẾT**

${storytellingRulesSection(aiContextConfig)}

**B. HƯỚNG DẪN VỀ ĐỘ KHÓ:**
${aiContextConfig.sendDifficultyGuidance ? `- **Dễ:** ${VIETNAMESE.difficultyGuidanceEasy}
- **Thường:** ${VIETNAMESE.difficultyGuidanceNormal}
- **Khó:** ${VIETNAMESE.difficultyGuidanceHard}
- **Ác Mộng:** ${VIETNAMESE.difficultyGuidanceNightmare}
Hiện tại người chơi đang ở độ khó: **${currentDifficultyName}**.` : ''}

**C. CHẾ ĐỘ NỘI DUNG VÀ PHONG CÁCH:**
${nsfwGuidanceCombined}

**D. ĐỘ DÀI PHẢN HỒI MONG MUỐN:**
- Độ dài yêu cầu: ${responseLength}

**E. CÁC QUY TẮC SỬ DỤNG TAG (CỰC KỲ QUAN TRỌNG):**
${continuePromptSystemRules(worldConfig, mainRealms, aiContextConfig, worldDate)}
`;
};
