
import { KnowledgeBase, PlayerActionInputType, ResponseLength, GameMessage, GenreType, ViolenceLevel, StoryTone, NsfwDescriptionStyle, DIALOGUE_MARKER, TuChatTier, AIContextConfig } from '../types';
import { SUB_REALM_NAMES, VIETNAMESE, CUSTOM_GENRE_VALUE, DEFAULT_NSFW_DESCRIPTION_STYLE, DEFAULT_VIOLENCE_LEVEL, DEFAULT_STORY_TONE, NSFW_DESCRIPTION_STYLES, TU_CHAT_TIERS, SPECIAL_EVENT_INTERVAL_TURNS, WEAPON_TYPES_FOR_VO_Y } from '../constants';
import * as GameTemplates from '../templates';
import { continuePromptSystemRules } from '../constants/systemRulesNormal';
import { getWorldDateDifferenceString, getTimeOfDayContext, getSeason } from '../utils/dateUtils';
import { DEFAULT_AI_CONTEXT_CONFIG } from '../utils/gameLogicUtils';

export const generateContinuePrompt = (
  knowledgeBase: KnowledgeBase,
  playerActionText: string,
  inputType: PlayerActionInputType,
  responseLength: ResponseLength,
  currentPageMessagesLog: string,
  previousPageSummaries: string[],
  isStrictMode: boolean, // NEW
  lastNarrationFromPreviousPage?: string,
  retrievedContext?: string // NEW: For RAG
): string => {
  const aiContextConfig = knowledgeBase.aiContextConfig || DEFAULT_AI_CONTEXT_CONFIG;
  const { worldConfig, worldDate, playerStats, userPrompts } = knowledgeBase;
  const genre = worldConfig?.genre || "Tu Tiên (Mặc định)";
  const customGenreName = worldConfig?.customGenreName;
  const isCultivationEnabled = worldConfig?.isCultivationEnabled !== undefined ? worldConfig.isCultivationEnabled : true;
  const effectiveGenre = (genre === CUSTOM_GENRE_VALUE && customGenreName) ? customGenreName : genre;
  const nsfwMode = worldConfig?.nsfwMode || false;
  const currentNsfwStyle = worldConfig?.nsfwDescriptionStyle || DEFAULT_NSFW_DESCRIPTION_STYLE;
  const currentViolenceLevel = worldConfig?.violenceLevel || DEFAULT_VIOLENCE_LEVEL;
  const currentStoryTone = worldConfig?.storyTone || DEFAULT_STORY_TONE;
  const currentDifficultyName = worldConfig?.difficulty || 'Thường';
  const writingStyleGuide = worldConfig?.writingStyleGuide; // NEW

  // --- START: CONSTRUCT CORE CONTEXT ---
  // This object contains only the essential, player-centric information that must be in every prompt.
  // Information about the wider world (other NPCs, locations, etc.) should be provided via RAG in `retrievedContext`.
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
          inventory: knowledgeBase.inventory,
          equippedItems: knowledgeBase.equippedItems,
          skills: knowledgeBase.playerSkills,
      },
      playerRelationshipsAndState: {
          quests: knowledgeBase.allQuests.filter(q => q.status === 'active'),
          companions: {
              wives: knowledgeBase.wives,
              slaves: knowledgeBase.slaves,
              prisoners: knowledgeBase.prisoners,
          },
          master: knowledgeBase.master,
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

  let difficultyGuidanceText = "";
  if (aiContextConfig.sendDifficultyGuidance) {
      switch (currentDifficultyName) {
        case 'Dễ': difficultyGuidanceText = VIETNAMESE.difficultyGuidanceEasy; break;
        case 'Thường': difficultyGuidanceText = VIETNAMESE.difficultyGuidanceNormal; break;
        case 'Khó': difficultyGuidanceText = VIETNAMESE.difficultyGuidanceHard; break;
        case 'Ác Mộng': difficultyGuidanceText = VIETNAMESE.difficultyGuidanceNightmare; break;
        default: difficultyGuidanceText = VIETNAMESE.difficultyGuidanceNormal;
      }
  }

  let nsfwGuidanceCombined = "";
  if (aiContextConfig.sendNsfwGuidance) {
      if (nsfwMode) {
        let nsfwStyleGuidance = "";
        switch (currentNsfwStyle) {
          case 'Hoa Mỹ': nsfwStyleGuidance = VIETNAMESE.nsfwGuidanceHoaMy; break;
          case 'Trần Tục': nsfwStyleGuidance = VIETNAMESE.nsfwGuidanceTranTuc; break;
          case 'Gợi Cảm': nsfwStyleGuidance = VIETNAMESE.nsfwGuidanceGoiCam; break;
          case 'Mạnh Bạo (BDSM)': nsfwStyleGuidance = VIETNAMESE.nsfwGuidanceManhBaoBDSM; break;
          default: nsfwStyleGuidance = VIETNAMESE.nsfwGuidanceHoaMy; 
        }

        let violenceGuidance = "";
        switch (currentViolenceLevel) {
            case 'Nhẹ Nhàng': violenceGuidance = VIETNAMESE.violenceLevelGuidanceNheNhang; break;
            case 'Thực Tế': violenceGuidance = VIETNAMESE.violenceLevelGuidanceThucTe; break;
            case 'Cực Đoan': violenceGuidance = VIETNAMESE.violenceLevelGuidanceCucDoan; break;
            default: violenceGuidance = VIETNAMESE.violenceLevelGuidanceThucTe;
        }

        let toneGuidance = "";
        switch (currentStoryTone) {
            case 'Tích Cực': toneGuidance = VIETNAMESE.storyToneGuidanceTichCuc; break;
            case 'Trung Tính': toneGuidance = VIETNAMESE.storyToneGuidanceTrungTinh; break;
            case 'Đen Tối': toneGuidance = VIETNAMESE.storyToneGuidanceDenToi; break;
            case 'Dâm Dục': toneGuidance = VIETNAMESE.storyToneGuidanceDamDuc; break;
            case 'Hoang Dâm': toneGuidance = VIETNAMESE.storyToneGuidanceHoangDam; break;
            case 'Dâm Loạn': toneGuidance = VIETNAMESE.storyToneGuidanceDamLoan; break;
            default: toneGuidance = VIETNAMESE.storyToneGuidanceTrungTinh;
        }
        nsfwGuidanceCombined = `
    **Hướng Dẫn Nội Dung Người Lớn (18+ ĐANG BẬT):**
    - **Phong Cách Miêu Tả Tình Dục:** ${currentNsfwStyle}.
      ${nsfwStyleGuidance}
    - **Mức Độ Miêu Tả Bạo Lực:** ${currentViolenceLevel}.
      ${violenceGuidance}
    - **Tông Màu Câu Chuyện:** ${currentStoryTone}.
      ${toneGuidance}
    **LƯU Ý CHUNG KHI 18+ BẬT:** Hãy kết hợp các yếu tố trên để tạo ra trải nghiệm phù hợp.
    **YÊU CẦU ĐẶC BIỆT VỀ CẢNH TÌNH DỤC (QUAN TRỌNG):** Khi miêu tả các cảnh quan hệ tình dục, hãy viết một cách **CHI TIẾT, DÀI và MẠNH BẠO** hơn. Đừng ngần ngại đi sâu vào các hành vi thể xác, mô tả cường độ, sự thô bạo (nếu phù hợp với bối cảnh và tông màu), và những cảm xúc mãnh liệt của nhân vật. Tập trung vào sự tương tác vật lý, những âm thanh, và sức mạnh trong từng hành động. Hãy để các cảnh này kéo dài và có sự leo thang về cường độ.`;

      } else {
        nsfwGuidanceCombined = "LƯU Ý QUAN TRỌNG: Chế độ Người Lớn đang TẮT. Tiếp tục duy trì nội dung phù hợp với mọi lứa tuổi, tập trung vào phiêu lưu và phát triển nhân vật. Tránh các chủ đề nhạy cảm, bạo lực quá mức hoặc tình dục.";
      }
  }
  
  let specialEventInstruction = "";
  if (aiContextConfig.sendSpecialEventRules) {
    if (playerStats.turn > 0 && playerStats.turn % SPECIAL_EVENT_INTERVAL_TURNS === 0) {
        specialEventInstruction = `
**SỰ KIỆN CỐT TRUYỆN ĐẶC BIỆT:**
Lượt chơi hiện tại là ${playerStats.turn}, đây là một mốc quan trọng! Hãy tạo ra một sự kiện bất ngờ hoặc một bước ngoặt lớn liên quan đến mục tiêu chính của nhân vật (${knowledgeBase.worldConfig?.playerGoal || 'không rõ'}) hoặc xung đột trung tâm của thế giới. Sự kiện này nên thay đổi cục diện hiện tại và tạo ra những cơ hội hoặc thách thức mới cho người chơi.
`;
    }
  }

  // NEW: World Event Guidance Logic - Updated for multi-genre
  let eventGuidance = "";
  if (aiContextConfig.sendEventGuidance) {
      const currentLocationId = knowledgeBase.currentLocationId;
      const relevantEvents = knowledgeBase.gameEvents.filter(event =>
          event.locationId === currentLocationId && (event.status === 'Sắp diễn ra' || event.status === 'Đang diễn ra' || event.status === 'Đã kết thúc')
      );

      if (relevantEvents.length > 0) {
          eventGuidance = `\n**HƯỚNG DẪN VỀ SỰ KIỆN THẾ GIỚI (CỰC KỲ QUAN TRỌNG):**\nBạn đang ở một địa điểm có sự kiện. Hãy tuân thủ nghiêm ngặt các quy tắc sau, diễn tả cho phù hợp với thể loại game ("${effectiveGenre}"):\n`;
          relevantEvents.forEach(event => {
              const timeDiff = getWorldDateDifferenceString(event.startDate, event.endDate, knowledgeBase.worldDate);
              if (event.status === 'Sắp diễn ra') {
                  eventGuidance += `
    - **Sự kiện "${event.title}" (Loại: ${event.type}) SẮP DIỄN RA (${timeDiff}).**
      - **QUY TẮC:** **TUYỆT ĐỐI KHÔNG** bắt đầu sự kiện này.
      - **NHIỆM VỤ:** Mô tả không khí chuẩn bị cho sự kiện.
        - *Ví dụ (Võ Hiệp - Thi Đấu):* Các cao thủ từ khắp nơi đổ về thành, các tửu điếm chật ních người bàn tán về giải đấu.
        - *Ví dụ (Khoa Huyễn - Khám Phá):* Các phi thuyền đang được nâng cấp, các đội thám hiểm đang phân tích bản đồ tín hiệu.
        - *Ví dụ (Cung Đấu - Lễ Hội):* Cung nữ bận rộn trang hoàng Ngự Hoa Viên, các phi tần đang chọn lựa trang phục lộng lẫy nhất.
      - **Lựa chọn:** Cung cấp lựa chọn để người chơi chuẩn bị hoặc chờ đợi (ví dụ: "Tìm hiểu về các đối thủ", "Nâng cấp trang bị", "Đặt cược cho một bên tham gia").
    `;
              } else if (event.status === 'Đang diễn ra') {
                  eventGuidance += `
    - **Sự kiện "${event.title}" (Loại: ${event.type}) ĐANG DIỄN RA (${timeDiff}).**
      - **QUY TẮC:** **BẮT BUỘC** phải mô tả sự kiện đang diễn ra.
      - **NHIỆM VỤ:** Mô tả sự kiện đang diễn ra một cách sống động.
        - *Ví dụ (Tu Tiên - Khám Phá):* Linh khí từ cửa vào Bí Cảnh tỏa ra nồng đậm, các tu sĩ đang lần lượt tiến vào.
        - *Ví dụ (Tây Phương Fantasy - Thi Đấu):* Tiếng reo hò vang dội từ đấu trường, hai hiệp sĩ đang giao tranh quyết liệt trên lưng ngựa.
      - **Lựa chọn:** Cung cấp lựa chọn để người chơi có thể tham gia hoặc tương tác trực tiếp (ví dụ: "Ghi danh tham gia", "Bước vào hầm ngục", "Chen vào đám đông để xem").
    `;
              } else if (event.status === 'Đã kết thúc') {
                  eventGuidance += `
    - **Sự kiện "${event.title}" (Loại: ${event.type}) ĐÃ KẾT THÚC (${timeDiff}).**
      - **QUY TẮC:** **TUYỆT ĐỐI KHÔNG** mô tả sự kiện này đang diễn ra. **KHÔNG** cung cấp lựa chọn để tham gia.
      - **NHIỆM VỤ:** Mô tả tàn dư hoặc hậu quả của sự kiện.
        - *Ví dụ (Chiến Tranh):* Tàn tích của thành trì vẫn còn bốc khói, người dân đang thu dọn đống đổ nát.
        - *Ví dụ (Đấu Giá):* Dân chúng vẫn đang bàn tán sôi nổi về món bảo vật cuối cùng đã được bán với giá trên trời.
      - **Lựa chọn:** Cung cấp các lựa chọn không liên quan trực tiếp đến việc tham gia sự kiện.
    `;
              }
          });
      }
  }
  // END NEW LOGIC
  
  const strictModeInstruction = isStrictMode ? `
**CHẾ ĐỘ NGHIÊM NGẶT ĐANG BẬT (QUY TẮC CỰC KỲ QUAN TRỌNG):**
Sau khi mô tả kết quả trực tiếp của hành động từ người chơi, bạn phải tuân thủ các quy tắc sau:
1.  **NHÂN VẬT CHÍNH:** TUYỆT ĐỐI KHÔNG được thực hiện bất kỳ **hành động vật lý** nào tiếp theo. Nhân vật chính phải dừng lại và chờ lệnh.
2.  **NỘI TÂM & CẢM XÚC:** Bạn **ĐƯỢỢC PHÉP** và **ĐƯỢỢC KHUYẾN KHÍCH** mô tả suy nghĩ, cảm xúc, hoặc ký ức của nhân vật chính khi họ dừng lại.
3.  **NPC & MÔI TRƯỜNG:** Các NPC khác và môi trường xung quanh **ĐƯỢỢC PHÉP** và **NÊN** tiếp tục hành động và phản ứng một cách tự nhiên.
4.  **LỰA CHỌN:** Các lựa chọn [CHOICE: "..."] bạn đưa ra PHẢI là những hành động vật lý mà nhân vật chính có thể thực hiện tiếp theo.
**Mục tiêu của chế độ này là trao toàn quyền kiểm soát hành động vật lý cho người chơi.**` : '';

  const playerRaceSystem = worldConfig?.raceCultivationSystems.find(s => s.raceName === (worldConfig?.playerRace || 'Nhân Tộc'));
  const mainRealms = (playerRaceSystem?.realmSystem || '').split(' - ').map(s => s.trim()).filter(Boolean);

  const writingStyleGuideSection = (aiContextConfig.sendWritingStyle && writingStyleGuide) ? `
**HƯỚNG DẪN BẮT CHƯỚC VĂN PHONG NGƯỜI DÙNG (CỰC KỲ QUAN TRỌNG):**
Mục tiêu hàng đầu của bạn là tái hiện một cách trung thực nhất văn phong của người dùng dựa vào đoạn văn mẫu sau. Đừng chỉ sao chép từ ngữ, mà hãy nắm bắt và áp dụng đúng **nhịp điệu**, **cách lựa chọn từ vựng**, và **thái độ/cảm xúc** đặc trưng của họ. Lời kể của bạn phải khiến người đọc tin rằng nó do chính người dùng viết ra. TUYỆT ĐỐI không pha trộn giọng văn AI hoặc làm "mềm hóa" văn phong gốc.

**VĂN BẢN MẪU CỦA NGƯỜI DÙNG ĐỂ BẠN BẮT CHƯỚC:**
"""
${writingStyleGuide}
"""
` : '';

  const userPromptsSection = (aiContextConfig.sendUserPrompts && userPrompts && userPrompts.length > 0)
    ? `
**LỜI NHẮC TỪ NGƯỜI CHƠI (QUY TẮC BẮT BUỘC TUÂN THỦ):**
Đây là những quy tắc do người chơi đặt ra. Bạn **BẮT BUỘC PHẢI** tuân theo những lời nhắc này một cách nghiêm ngặt trong mọi phản hồi.
${userPrompts.map(p => `- ${p}`).join('\n')}
`
    : '';

  const ragContextSection = aiContextConfig.sendRagContext ? `
**A. BỐI CẢNH TRUY XUẤT (RAG CONTEXT - LONG-TERM MEMORY):**
Dưới đây là một số thông tin liên quan từ các sự kiện trong quá khứ có thể hữu ích cho lượt này. Hãy sử dụng nó để đảm bảo tính nhất quán của câu chuyện.
${retrievedContext ? `\`\`\`\n${retrievedContext}\n\`\`\`` : "Không có bối cảnh truy xuất nào."}` : '';
  
  const coreContextSection = aiContextConfig.sendCoreContext ? `
**B. BỐI CẢNH CỐT LÕI (CORE CONTEXT - PLAYER'S CURRENT STATE):**
Đây là trạng thái hiện tại của người chơi và những yếu tố trực tiếp liên quan đến họ. Thông tin này LUÔN ĐÚNG và phải được ưu tiên hàng đầu.
\`\`\`json
${JSON.stringify(coreContext, null, 2)}
\`\`\`` : '';

  const conversationalContextSection = aiContextConfig.sendConversationalContext ? `
**C. BỐI CẢNH HỘI THOẠI (CONVERSATIONAL CONTEXT - SHORT-TERM MEMORY):**
- **Tóm tắt các diễn biến trang trước:**
${previousPageSummaries.length > 0 ? previousPageSummaries.map((summary, index) => {
    const pageNumberForSummary = index + 1;
    const startTurnOfSummaryPage = knowledgeBase.currentPageHistory?.[pageNumberForSummary - 1];
    const endTurnOfSummaryPage = (knowledgeBase.currentPageHistory?.[pageNumberForSummary] || playerStats.turn + 1) - 1;
    return `Tóm tắt Trang ${pageNumberForSummary} (Lượt ${startTurnOfSummaryPage}-${endTurnOfSummaryPage}):\n${summary}`;
  }).join("\n\n") : "Không có tóm tắt từ các trang trước."}
- **Diễn biến gần nhất (lượt trước - Lượt ${playerStats.turn}):**
${lastNarrationFromPreviousPage || "Chưa có."}
- **Diễn biến chi tiết trang hiện tại (từ lượt đầu trang đến lượt ${playerStats.turn}):**
${currentPageMessagesLog || "Chưa có diễn biến nào trong trang này."}` : '';

  const narrationAndVividnessRules = aiContextConfig.sendShowDontTellRule ? `
*   **A.1. MỆNH LỆNH TỐI THƯỢỢNG: PHONG CÁCH KỂ CHUYỆN ("Tả, đừng kể")**
    *   **Sử dụng Ngũ quan:** Mô tả những gì nhân vật chính **nhìn thấy**, **nghe thấy**, **ngửi thấy**, **cảm nhận**, và **nếm**.
    *   **"Tả", không "Kể":** Thay vì dùng những từ ngữ chung chung, hãy mô tả chi tiết để người chơi tự cảm nhận.
    *   **Nội tâm nhân vật:** Mô tả những suy nghĩ, cảm xúc, ký ức thoáng qua của nhân vật chính.` : '';

  const livingWorldRules = aiContextConfig.sendLivingWorldRule ? `
*   **A.2. MỆNH LỆNH "THẾ GIỚI SỐNG ĐỘNG"**
    *   Làm cho thế giới cảm thấy đang "sống" và tự vận hành.
    *   **QUY TRÌNH:** Trong mỗi phản hồi, hãy **luôn mô tả ngắn gọn một sự kiện nền** đang diễn ra xung quanh không liên quan trực tiếp đến người chơi.` : '';
  
  const proactiveNpcRule = aiContextConfig.sendProactiveNpcRule ? `
*   **A.3. GIAO THỨC "NPC CHỦ ĐỘNG"**
    *   Trong mỗi cảnh, **BẮT BUỘC có ít nhất MỘT NPC thực hiện một hành động chủ động**.` : '';

  const rumorMillRule = aiContextConfig.sendRumorMillRule ? `
*   **A.4. CHỈ THỊ "CỐI XAY TIN ĐỒN"**
    *   Nội dung hội thoại của NPC phải đa dạng.
    *   **ĐỘ TIN CẬY:** Tin đồn có thể là **chính xác**, **bị phóng đại**, hoặc **hoàn toàn sai lệch**.` : '';

  const storytellingRulesSection = (narrationAndVividnessRules || livingWorldRules || proactiveNpcRule || rumorMillRule) ? `
**A. QUY TẮC VỀ LỜI KỂ & SỰ SỐNG ĐỘNG (ƯU TIÊN CAO NHẤT)**
${narrationAndVividnessRules}
${livingWorldRules}
${proactiveNpcRule}
${rumorMillRule}` : '';

  const timeOfDayContext = getTimeOfDayContext(worldDate);
  const seasonContext = getSeason(worldDate);
  const timeContextBlock = `
**BỐI CẢNH THỜI GIAN & MÔI TRƯỜI (CỰC KỲ QUAN TRỌNG):**
- **Mùa:** ${seasonContext}.
- **Buổi trong ngày:**
${timeOfDayContext}
`;


  return `
**YÊU CẦU CỐT LÕI:** Nhiệm vụ của bạn là tiếp tục câu chuyện game nhập vai thể loại "${effectiveGenre}" bằng tiếng Việt.
**QUY TẮC QUAN TRỌNG NHẤT:** Bắt đầu phản hồi của bạn bằng cách đi thẳng vào lời kể về những gì xảy ra do hành động của người chơi. **TUYỆT ĐỐI KHÔNG** bình luận về lựa chọn của người chơi. Hãy kể trực tiếp kết quả.

${timeContextBlock}

---
**PHẦN 1: BỐI CẢNH (CONTEXT)**
Đây là thông tin nền để bạn hiểu câu chuyện.

${ragContextSection}
${coreContextSection}
${conversationalContextSection}

---
**PHẦN 2: HƯỚNG DẪN HÀNH ĐỘNG**
${writingStyleGuideSection}
${userPromptsSection}

**HƯỚNG DẪN TỪ NGƯỜI CHƠI (CHO LƯỢT TIẾP THEO - LƯỢT ${playerStats.turn + 1}):**
- Loại hướng dẫn: ${inputType === 'action' ? 'Hành động trực tiếp của nhân vật' : 'Gợi ý/Mô tả câu chuyện (do người chơi cung cấp)'}
- Nội dung hướng dẫn: "${playerActionText}"
${strictModeInstruction}

${specialEventInstruction}
${eventGuidance}

**HƯỚNG DẪN XỬ LÝ DÀNH CHO AI:**
${inputType === 'action'
    ? `Xử lý nội dung trên như một hành động mà nhân vật chính (${worldConfig?.playerName}) đang thực hiện. Mô tả kết quả của hành động này và các diễn biến tiếp theo một cách chi tiết và hấp dẫn, dựa trên TOÀN BỘ BỐI CẢNH.`
    : `Nội dung trên là một gợi ý, mô tả, hoặc mong muốn của người chơi để định hướng hoặc làm phong phú thêm câu chuyện. Đây KHÔNG phải là hành động trực tiếp của nhân vật chính (${worldConfig?.playerName}). **NHIỆM VỤ CỦA BẠN LÀ BẮT BUỘC PHẢI LÀM CHO DIỄN BIẾN NÀY XẢY RA TRONG LƯỢT TIẾP THEO.** Hãy tìm một cách tự nhiên và hợp lý nhất để hợp thức hóa sự kiện này trong bối cảnh hiện tại. Sau khi mô tả sự kiện này đã xảy ra, hãy cung cấp các lựa chọn [CHOICE: "..."] để người chơi phản ứng với tình huống mới.`
  }
*   **VIẾT LỜI KỂ:** Mô tả chi tiết và hợp lý kết quả của hành động. Phản ứng của các NPC và môi trường xung quanh phải logic. Tuân thủ nghiêm ngặt **CHẾ ĐỘ NỘI DUNG VÀ PHONG CÁCH** đã chọn.
*   **SỬ DỤNG TAGS HỆ THỐNG:** Tạo ra các tag để cập nhật trạng thái game. Mỗi tag trên một dòng riêng.

---
**PHẦN 3: QUY TẮC VÀ HƯỚNG DẪN CHI TIẾT**
Đây là các quy tắc bạn phải tuân theo để tạo ra phản hồi hợp lệ.

${storytellingRulesSection}

**B. HƯỚNG DẪN VỀ ĐỘ KHÓ:**
${aiContextConfig.sendDifficultyGuidance ? `- **Dễ:** ${VIETNAMESE.difficultyGuidanceEasy}
- **Thường:** ${VIETNAMESE.difficultyGuidanceNormal}
- **Khó:** ${VIETNAMESE.difficultyGuidanceHard}
- **Ác Mộng:** ${VIETNAMESE.difficultyGuidanceNightmare}
Hiện tại người chơi đang ở độ khó: **${currentDifficultyName}**. Hãy điều chỉnh tỉ lệ thành công, lợi ích và rủi ro trong các lựa chọn [CHOICE: "..."] của bạn cho phù hợp với hướng dẫn độ khó này.` : ''}

**C. CHẾ ĐỘ NỘI DUNG VÀ PHONG CÁCH:**
${nsfwGuidanceCombined}

**D. ĐỘ DÀI PHẢN HỒI MONG MUỐN:**
- Người chơi yêu cầu độ dài phản hồi: ${responseLength === 'short' ? 'Ngắn (khoảng 2-3 đoạn văn súc tích)' :
    responseLength === 'medium' ? 'Trung bình (khoảng 3-6 đoạn văn vừa phải)' :
      responseLength === 'long' ? 'Dài (khoảng 8+ đoạn văn chi tiết)' :
        'Mặc định (linh hoạt theo diễn biến)'
  }.
Hãy cố gắng điều chỉnh độ dài của lời kể và mô tả cho phù hợp với yêu cầu này của người chơi, nhưng vẫn đảm bảo tính tự nhiên và logic của câu chuyện.

**E. CÁC QUY TẮC SỬ DỤNG TAG (CỰC KỲ QUAN TRỌNG):**
${continuePromptSystemRules(worldConfig, mainRealms, aiContextConfig)}
`;
};
