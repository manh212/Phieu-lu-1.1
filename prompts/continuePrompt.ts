
import type { KnowledgeBase, PlayerActionInputType, ResponseLength, GameMessage, GenreType, ViolenceLevel, StoryTone, NsfwDescriptionStyle, TuChatTier, AIContextConfig } from '@/types/index';
import { DIALOGUE_MARKER } from '@/types/index';
import { SUB_REALM_NAMES, VIETNAMESE, CUSTOM_GENRE_VALUE, DEFAULT_NSFW_DESCRIPTION_STYLE, DEFAULT_VIOLENCE_LEVEL, DEFAULT_STORY_TONE, NSFW_DESCRIPTION_STYLES, TU_CHAT_TIERS, SPECIAL_EVENT_INTERVAL_TURNS, WEAPON_TYPES_FOR_VO_Y } from '../constants';
import * as GameTemplates from '@/types/index';
import { buildRulesSection, DEFAULT_AI_RULEBOOK } from '../constants/systemRulesNormal';
import { getWorldDateDifferenceString } from '../utils/dateUtils';
import { DEFAULT_AI_CONTEXT_CONFIG } from '../utils/gameLogicUtils';
import { getNsfwGuidance, getDifficultyGuidance } from './promptUtils';

const STRICT_MODE_GUIDANCE = `
CHÚ Ý:
CHẾ ĐỘ NGHIÊM NGẶT ĐANG BẬT. CÁC QUY TẮC DƯỚI ĐÂY SẼ GHI ĐÈ LÊN MỌI HƯỚNG DẪN KỂ CHUYỆN THÔNG THƯỜNG KHÁC.

1. PHÂN BIỆT HÀNH ĐỘNG LỚN VÀ HÀNH ĐỘNG NHỎ

Hành động lớn (Chính):
Là những quyết định quan trọng, thay đổi cục diện hoặc hướng đi của câu chuyện.
(Ví dụ: mở một cánh cửa, bắt đầu một cuộc trò chuyện, chọn rời đi, đọc một bức thư…)

QUY TẮC:

TUYỆT ĐỐI KHÔNG được tự ý thực hiện hay thêm bất kỳ hành động lớn nào.

Chỉ được phép xảy ra khi có lệnh trực tiếp từ người chơi.

Hành động nhỏ (Phụ):
Là những phản ứng, động tác hoặc chi tiết phụ xoay quanh hành động lớn.
Chúng có thể:

Mở rộng, nhấn mạnh hoặc kéo dài hành động lớn.

Thêm phản xạ, thói quen, cảm giác, chi tiết môi trường.

Tạo gợi ý tinh tế (người chơi có thể chú ý hoặc bỏ qua).

QUY TẮC:

ĐƯỢC PHÉP thoải mái sáng tạo.

Có thể chuỗi nhiều hành động nhỏ liên tiếp.

Miễn là không tự biến thành một hành động lớn mới.

Nguyên tắc an toàn: hành động nhỏ không bao giờ tự ý thay đổi cốt truyện.

2. NỘI TÂM & CẢM XÚC

KHÔNG bắt buộc phải mô tả trong mọi lượt.

ĐƯỢỢC PHÉP dùng để nhấn mạnh hoặc làm rõ bối cảnh bên trong.

ƯU TIÊN thay thế bằng hành động nhỏ + phản ứng NPC/môi trường để tạo nhịp tự nhiên.

3. NPC & MÔI TRƯỜDNG

NPC và môi trường phản ứng tự nhiên, thoải mái, không hạn chế.

Có thể thêm hành động nhỏ, biểu cảm, chi tiết phụ.

Chỉ cần đảm bảo: không làm thay người chơi quyết định hành động lớn.

4. LỰA CHỌN

Các lựa chọn được đưa ra theo cú pháp [CHOICE: "..."].

Chúng PHẢI là những hành động vật lý cụ thể mà nhân vật chính có thể thực hiện tiếp theo.

Không được đưa ra lựa chọn trừu tượng (ví dụ: “cảm thấy thế nào”, “suy nghĩ gì”), mà phải gắn liền với hành động thực tế.

VÍ DỤ CỤ THỂ

Ví dụ 1: TƯƠNG TÁC VẬT THỂ

Bối cảnh: Người chơi đứng trước một cánh cửa gỗ cũ.

Hành động người chơi: "Tôi mở cánh cửa."

❌ PHẢN HỒI SAI (VI PHẠM QUY TẮC):
Bạn đẩy cánh cửa rồi bước hẳn vào trong phòng.

✅ PHẢN HỒI ĐÚNG (TUÂN THỦ QUY TẮC):
Bạn đẩy cánh cửa gỗ nặng nề, nó kêu lên kẽo kẹt và hé ra một khoảng tối mờ. Luồng gió ẩm lạnh phả ra khiến bạn hơi rùng mình. Ngón tay bạn vô thức siết chặt mép cửa, rồi khẽ giữ lại để nó không bật ngược. Bụi mịn bay lơ lửng trong khe sáng hẹp.

Ví dụ 2: GIAO TIẾP

Bối cảnh: NPC vừa nói một tin bất ngờ.

Hành động người chơi: "Tôi hỏi hắn điều đó có thật không?"

❌ PHẢN HỒI SAI (VI PHẠM QUY TẮC):
Bạn hỏi xong rồi lập tức bắt đầu thuyết phục hắn đi theo mình.

✅ PHẢN HỒI ĐÚNG (TUÂN THỦ QUY TẮC):
Bạn hỏi hắn điều đó có thật không. Giọng bạn hơi khàn, nhưng ánh mắt không rời khuôn mặt đối phương. Một thoáng im lặng trôi qua, bạn lặp lại câu hỏi, lần này chắc giọng hơn. Ngay sau đó, bạn khẽ nghiêng đầu, chờ phản ứng. Hắn nhướn mày, rồi cười nhẹ đầy ẩn ý.
`;

export const generateContinuePrompt = (
  knowledgeBase: KnowledgeBase,
  playerActionText: string,
  inputType: PlayerActionInputType,
  responseLength: ResponseLength,
  currentPageMessagesLog: string,
  previousPageSummaries: string[],
  isStrictMode: boolean, // NEW
  lastNarrationFromPreviousPage?: string,
  retrievedContext?: string,
  narrativeDirective?: string // NEW
): string => {
  // STEP 2.2: The "Safety Shield". If aiContextConfig doesn't exist (e.g., from an old save),
  // use the default configuration to prevent the game from crashing.
  const baseAiContextConfig = knowledgeBase.aiContextConfig || DEFAULT_AI_CONTEXT_CONFIG;
  const rulebook = knowledgeBase.aiRulebook || DEFAULT_AI_RULEBOOK;
  const { worldConfig, worldDate, playerStats, userPrompts, stagedActions } = knowledgeBase;
  const genre = worldConfig?.genre || "Tu Tiên (Mặc định)";
  const customGenreName = worldConfig?.customGenreName;
  const effectiveGenre = (genre === CUSTOM_GENRE_VALUE && customGenreName) ? customGenreName : genre;
  
  const currentDifficultyName = worldConfig?.difficulty || 'Thường';

  // --- START: Dynamic Rule Configuration ---
  const dynamicAiContextConfig = { ...baseAiContextConfig };
  dynamicAiContextConfig.sendCultivationRules = worldConfig?.isCultivationEnabled || false;
  // --- END: Dynamic Rule Configuration ---

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
          inventory: knowledgeBase.inventory.slice(0, 20), // Pass the full item objects
          skills: knowledgeBase.playerSkills, // Pass the full skill objects
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
  
  // --- START: Build prompt sections conditionally based on dynamicAiContextConfig ---
  
  const writingStyleGuideSection = (dynamicAiContextConfig.sendWritingStyle && worldConfig?.writingStyleGuide) ? `
**HƯỚNG DẪN BẮT CHƯỚC VĂN PHONG NGƯỜI DÙNG (CỰC KỲ QUAN TRỌNG):**
Mục tiêu hàng đầu của bạn là tái hiện một cách trung thực nhất văn phong của người dùng dựa vào đoạn văn mẫu sau. Đừng chỉ sao chép từ ngữ, mà hãy nắm bắt và áp dụng đúng **nhịp điệu**, **cách lựa chọn từ vựng**, và **thái độ/cảm xúc** đặc trưng của họ. Lời kể của bạn phải khiến người đọc tin rằng nó do chính người dùng viết ra. TUYỆT ĐỐI không pha trộn giọng văn AI hoặc làm "mềm hóa" văn phong gốc.

**VĂN BẢN MẪU CỦA NGƯỜI DÙNG ĐỂ BẠN BẮT CHƯỚC:**
"""
${worldConfig.writingStyleGuide}
"""
` : '';

  let finalPrompt = `
**YÊU CẦU CỐT LÕI:** Tiếp tục câu chuyện game nhập vai thể loại "${effectiveGenre}" bằng tiếng Việt.
**QUY TẮC QUAN TRỌNG NHẤT:** Bắt đầu phản hồi của bạn bằng cách đi thẳng vào lời kể về những gì xảy ra do hành động của người chơi. **TUYỆT ĐỐI KHÔNG** bình luận về lựa chọn của người chơi. Hãy kể trực tiếp kết quả.
${writingStyleGuideSection}
---
**PHẦN 1: BỐI CẢNH (CONTEXT)**`;

  if (dynamicAiContextConfig.sendRagContext) {
      finalPrompt += `
**A. BỐI CẢNH TRUY XUẤT (RAG CONTEXT - LONG-TERM MEMORY):**
Dưới đây là một số thông tin liên quan từ các sự kiện trong quá khứ có thể hữu ích cho lượt này. Hãy sử dụng nó để đảm bảo tính nhất quán của câu chuyện.
${retrievedContext ? `\`\`\`
${retrievedContext}
\`\`\`` : "Không có bối cảnh truy xuất nào."}`;
  }

  if (dynamicAiContextConfig.sendCoreContext) {
      finalPrompt += `
**B. BỐI CẢNH CỐT LÕI (CORE CONTEXT - PLAYER'S CURRENT STATE):**
Đây là trạng thái hiện tại của người chơi và những yếu tố trực tiếp liên quan đến họ. Thông tin này LUÔN ĐÚNG và phải được ưu tiên hàng đầu.
\`\`\`json
${JSON.stringify(coreContext, null, 2)}
\`\`\``;
  }

  if (dynamicAiContextConfig.sendConversationalContext) {
      finalPrompt += `
**C. BỐI CẢNH HỘI THOẠI (CONVERSATIONAL CONTEXT - SHORT-TERM MEMORY):**
- **Tóm tắt các diễn biến trang trước:**
${previousPageSummaries.length > 0 ? previousPageSummaries.join("\n\n") : "Không có tóm tắt từ các trang trước."}
- **Diễn biến gần nhất (lượt trước - Lượt ${playerStats.turn}):**
${lastNarrationFromPreviousPage || "Chưa có."}
- **Diễn biến chi tiết trang hiện tại (từ lượt đầu trang đến lượt ${playerStats.turn}):**
${currentPageMessagesLog || "Chưa có diễn biến nào trong trang này."}`;
  }
  
  // Staged actions are a core mechanic, not controlled by a flag.
  if (stagedActions && Object.keys(stagedActions).length > 0) {
      finalPrompt += `
**HÀNH ĐỘNG CHỜ (STAGED ACTIONS):**
Đây là những sự kiện đã được Siêu Trợ Lý sắp đặt và đang chờ điều kiện để kích hoạt.
\`\`\`json
${JSON.stringify(stagedActions, null, 2)}
\`\`\`
`;
  }
  
  finalPrompt += `
---
**PHẦN 2: HƯỚNG DẪN HÀNH ĐỘNG**`;

  if (isStrictMode) {
    finalPrompt += `
---
**HƯỚNG DẪN CHẾ ĐỘ NGHIÊM NGẶT (ƯU TIÊN TUYỆT ĐỐI)**
${STRICT_MODE_GUIDANCE}
---
`;
  }

  if (dynamicAiContextConfig.sendUserPrompts && userPrompts && userPrompts.length > 0) {
      finalPrompt += `
**LỜI NHẮC TỪ NGƯỜI CHƠI (QUY TẮC BẮT BUỘC TUÂN THỦ):**
${userPrompts.map(p => `- ${p}`).join('\n')}
`;
  }
    
  // Narrative directives are a core mechanic, not controlled by a flag.
  if (narrativeDirective) {
      finalPrompt += `
**CHỈ DẪN TƯỜNG THUẬT BẮT BUỘC CHO LƯỢT NÀY (NARRATIVE DIRECTIVE - QUAN TRỌNG):**
${narrativeDirective}

**NHIỆM VỤ CỦA BẠN (AI KỂ CHUYỆN):**
Hãy tiếp tục câu chuyện. Bạn **BẮT BUỘC** phải lồng ghép sự kiện trong "Chỉ Dẫn Tường Thuật" vào lời kể của mình một cách **tự nhiên và hợp lý nhất**. Nó có thể xảy ra ở đầu, giữa, hoặc cuối lượt kể, tùy vào cách nào khiến câu chuyện mượt mà nhất sau khi xử lý hành động của người chơi.
`;
  }

  finalPrompt += `
**HƯỚNG DẪN TỪ NGƯỜI CHƠI (CHO LƯỢT TIẾP THEO - LƯỢT ${playerStats.turn + 1}):**
- Loại hướng dẫn: ${inputType === 'action' ? 'Hành động trực tiếp' : 'Gợi ý câu chuyện'}
- Nội dung hướng dẫn: "${playerActionText}"`;
  
  if (dynamicAiContextConfig.sendSpecialEventRules && (playerStats.turn % SPECIAL_EVENT_INTERVAL_TURNS === 0 && playerStats.turn > 0)) {
      finalPrompt += `
**HƯỚNG DẪN SỰ KIỆN ĐẶC BIỆT (QUAN TRỌNG):**
Đã đến lúc cho một sự kiện lớn! Hãy tạo ra một diễn biến bất ngờ, có thể thay đổi cục diện hoặc mở ra một nhánh truyện mới. Ví dụ: một cuộc gặp gỡ định mệnh, một tai họa bất ngờ, một cơ duyên hiếm có, hoặc một kẻ thù mạnh xuất hiện. Hãy làm cho nó thật đáng nhớ!`;
  }
  
  if (dynamicAiContextConfig.sendEventGuidance) {
      const currentLocationId = knowledgeBase.currentLocationId;
      const relevantEvents = knowledgeBase.gameEvents.filter(event =>
          event.locationId === currentLocationId && (event.status === 'Sắp diễn ra' || event.status === 'Đang diễn ra' || event.status === 'Đã kết thúc')
      );

      if (relevantEvents.length > 0) {
          finalPrompt += `
**HƯỚNG DẪN VỀ SỰ KIỆN THẾ GIỚI (CỰC KỲ QUAN TRỌNG):**
`;
          relevantEvents.forEach(event => {
              const timeDiff = getWorldDateDifferenceString(event.startDate, event.endDate, knowledgeBase.worldDate);
              if (event.status === 'Sắp diễn ra') {
                  finalPrompt += `
    - **Sự kiện "${event.title}" SẮP DIỄN RA (${timeDiff}).**
      - **QUY TẮC:** **TUYỆT ĐỐI KHÔNG** bắt đầu sự kiện này.
      - **NHIỆM VỤ:** Hãy mô tả không khí chuẩn bị.
    `;
              } else if (event.status === 'Đang diễn ra') {
                  finalPrompt += `
    - **Sự kiện "${event.title}" ĐANG DIỄN RA (${timeDiff}).**
      - **QUY TẮC:** **BẮT BUỘC** phải mô tả sự kiện đang diễn ra.
      - **NHIỆM VỤ:** Cung cấp lựa chọn để tham gia.
    `;
              } else if (event.status === 'Đã kết thúc') {
                  finalPrompt += `
    - **Sự kiện "${event.title}" ĐÃ KẾT THÚC (${timeDiff}).**
      - **QUY TẮC:** **TUYỆT ĐỐI KHÔNG** mô tả sự kiện đang diễn ra.
      - **NHIỆM VỤ:** Hãy mô tả hậu quả của sự kiện.
    `;
              }
          });
      }
  }

  finalPrompt += `
**HƯỚNG DẪN XỬ LÝ DÀNH CHO AI:**
Xử lý nội dung trên như một hành động mà nhân vật chính (${worldConfig?.playerName}) đang thực hiện. Mô tả kết quả của hành động này và các diễn biến tiếp theo một cách chi tiết và hấp dẫn, dựa trên TOÀN BỘ BỐI CẢNH.
*   **VIẾT LỜI KỂ:** Phản ứng của các NPC và môi trường xung quanh phải logic. Tuân thủ nghiêm ngặt CHẾ ĐỘ NỘI DUNG VÀ PHONG CÁCH đã chọn.
*   **SỬ DỤNG TAGS HỆ THỐNG:** Tạo ra các tag để cập nhật trạng thái game.
`;

  // --- NEW: CREATIVE RULES SECTION ---
  if (dynamicAiContextConfig.sendDifficultyGuidance) {
    finalPrompt += `
---
${getDifficultyGuidance(worldConfig)}
`;
  }
  
  if (dynamicAiContextConfig.sendNsfwGuidance) {
    finalPrompt += `
---
**CHẾ ĐỘ NỘI DUNG VÀ PHONG CÁCH:**
${getNsfwGuidance(worldConfig)}
`;
  }
  // --- END: CREATIVE RULES SECTION ---
  
  finalPrompt += `
---
**PHẦN 3: QUY TẮC VÀ HƯỚNG DẪN CHI TIẾT**
`;

  // DYNAMIC TECHNICAL RULE GENERATION
  finalPrompt += buildRulesSection(dynamicAiContextConfig, rulebook, worldConfig, mainRealms, worldDate);
  
  const responseLengthText = responseLength === 'short' ? 'Ngắn (khoảng 2-3 đoạn văn súc tích)' :
    responseLength === 'medium' ? 'Trung bình (khoảng 3-6 đoạn văn vừa phải)' :
    responseLength === 'long' ? 'Dài (khoảng 8+ đoạn văn chi tiết)' :
    'Mặc định (linh hoạt theo diễn biến)';

  finalPrompt += `
---
**ĐỘ DÀI PHẢN HỒI MONG MUỐN:**
- Người chơi yêu cầu độ dài phản hồi: ${responseLengthText}. Hãy cố gắng điều chỉnh độ dài của lời kể và mô tả cho phù hợp với yêu cầu này của người chơi, nhưng vẫn đảm bảo tính tự nhiên và logic của câu chuyện.
`;

  return finalPrompt;
};
