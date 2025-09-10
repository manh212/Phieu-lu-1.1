// FIX: Corrected import paths for types.
import { WorldSettings } from '../types/index';
import { VIETNAMESE, DEFAULT_VIOLENCE_LEVEL, DEFAULT_STORY_TONE, DEFAULT_NSFW_DESCRIPTION_STYLE, nsfwGuidanceCustomDefault } from '../constants';

/**
 * Lấy chuỗi hướng dẫn về độ khó để chèn vào prompt.
 * @param worldConfig - Cấu hình thế giới hiện tại.
 * @returns Chuỗi văn bản hướng dẫn về độ khó cho AI.
 */
export function getDifficultyGuidance(worldConfig: WorldSettings | null): string {
  if (!worldConfig) return '';
  const difficulty = worldConfig.difficulty || 'Thường';
  
  // The guidance text is now a single block containing all levels for context,
  // with the current level highlighted.
  return `**HƯỚNG DẪN VỀ ĐỘ KHÓ (Rất quan trọng để AI tuân theo):**
- **Dễ:** ${VIETNAMESE.difficultyGuidanceEasy}
- **Thường:** ${VIETNAMESE.difficultyGuidanceNormal}
- **Khó:** ${VIETNAMESE.difficultyGuidanceHard}
- **Ác Mộng:** ${VIETNAMESE.difficultyGuidanceNightmare}
Hiện tại người chơi đã chọn độ khó: **${difficulty}**. Hãy điều chỉnh tỉ lệ thành công, lợi ích và rủi ro trong các lựa chọn [CHOICE: "..."] của bạn cho phù hợp với hướng dẫn độ khó này.`;
}


/**
 * Lấy chuỗi hướng dẫn NSFW cuối cùng để chèn vào prompt.
 * Hàm này chứa toàn bộ logic ghi đè của "Phòng Tối AI".
 * @param worldConfig - Cấu hình thế giới hiện tại.
 * @returns Chuỗi văn bản hướng dẫn NSFW cho AI.
 */
export function getNsfwGuidance(worldConfig: WorldSettings | null): string {
  if (!worldConfig?.nsfwMode) {
    return "";
  }

  // Logic Ghi Đè của "Phòng Tối AI"
  if (worldConfig.nsfwDescriptionStyle === 'Tùy Chỉnh (Phòng Tối AI)') {
    if (worldConfig.customNsfwPrompt && worldConfig.customNsfwPrompt.trim()) {
      // Nếu người dùng đã nhập prompt tùy chỉnh
      return `
HƯỚNG DẪN 18+ TÙY CHỈNH TỪ NGƯỜI CHƠI (PHÒNG TỐI AI - ƯU TIÊN TUYỆT ĐỐI):
${worldConfig.customNsfwPrompt}
`.trim();
    }
    // Nếu người dùng chọn "Tùy Chỉnh" nhưng để trống -> Dùng prompt mặc định đã được thiết kế sẵn
    return nsfwGuidanceCustomDefault;
  }

  const currentNsfwStyle = worldConfig.nsfwDescriptionStyle || DEFAULT_NSFW_DESCRIPTION_STYLE;
  const currentViolenceLevel = worldConfig.violenceLevel || DEFAULT_VIOLENCE_LEVEL;
  const currentStoryTone = worldConfig.storyTone || DEFAULT_STORY_TONE;

  // Logic cho các style mặc định
  let nsfwStyleGuidance = "";
  switch (currentNsfwStyle) {
    case 'Hoa Mỹ': nsfwStyleGuidance = VIETNAMESE.nsfwGuidanceHoaMy; break;
    // FIX: Access correct keys from VIETNAMESE object
    case 'Trần Tục': nsfwStyleGuidance = VIETNAMESE.nsfwGuidanceTranTuc; break;
    case 'Gợi Cảm': nsfwStyleGuidance = VIETNAMESE.nsfwGuidanceGoiCam; break;
    case 'Mạnh Bạo (BDSM)': nsfwStyleGuidance = VIETNAMESE.nsfwGuidanceManhBaoBDSM; break;
    default: nsfwStyleGuidance = VIETNAMESE.nsfwGuidanceHoaMy;
  }

  let violenceGuidance = "";
  switch (currentViolenceLevel) {
    // FIX: Access correct keys from VIETNAMESE object
    case 'Nhẹ Nhàng': violenceGuidance = VIETNAMESE.violenceLevelGuidanceNheNhang; break;
    case 'Thực Tế': violenceGuidance = VIETNAMESE.violenceLevelGuidanceThucTe; break;
    case 'Cực Đoan': violenceGuidance = VIETNAMESE.violenceLevelGuidanceCucDoan; break;
    default: violenceGuidance = VIETNAMESE.violenceLevelGuidanceThucTe;
  }

  let toneGuidance = "";
  switch (currentStoryTone) {
    // FIX: Access correct keys from VIETNAMESE object
    case 'Tích Cực': toneGuidance = VIETNAMESE.storyToneGuidanceTichCuc; break;
    case 'Trung Tính': toneGuidance = VIETNAMESE.storyToneGuidanceTrungTinh; break;
    case 'Đen Tối': toneGuidance = VIETNAMESE.storyToneGuidanceDenToi; break;
    case 'Dâm Dục': toneGuidance = VIETNAMESE.storyToneGuidanceDamDuc; break;
    case 'Hoang Dâm': toneGuidance = VIETNAMESE.storyToneGuidanceHoangDam; break;
    case 'Dâm Loạn': toneGuidance = VIETNAMESE.storyToneGuidanceDamLoan; break;
    default: toneGuidance = VIETNAMESE.storyToneGuidanceTrungTinh;
  }

  return `
Hướng Dẫn Nội Dung Người Lớn (18+ ĐANG BẬT):
• Phong Cách Miêu Tả Tình Dục: ${currentNsfwStyle}.
  ${nsfwStyleGuidance}
• Mức Độ Miêu Tả Bạo Lực: ${currentViolenceLevel}.
  ${violenceGuidance}
• Tông Màu Câu Chuyện: ${currentStoryTone}.
  ${toneGuidance}
LƯU Ý CHUNG KHI 18+ BẬT: Hãy kết hợp các yếu tố trên để tạo ra trải nghiệm phù hợp.
`.trim();
}