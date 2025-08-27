
import { WorldSettings } from '../types';
import { VIETNAMESE, DEFAULT_VIOLENCE_LEVEL, DEFAULT_STORY_TONE, DEFAULT_NSFW_DESCRIPTION_STYLE } from '../constants';

/**
 * Lấy chuỗi hướng dẫn NSFW cuối cùng để chèn vào prompt.
 * Hàm này chứa toàn bộ logic ghi đè của "Phòng Tối AI".
 * @param worldConfig - Cấu hình thế giới hiện tại.
 * @returns Chuỗi văn bản hướng dẫn NSFW cho AI.
 */
export function getNsfwGuidance(worldConfig: WorldSettings | null): string {
  if (!worldConfig?.nsfwMode) {
    return "LƯU Ý QUAN TRỌNG: Chế độ Người Lớn đang TẮT. Vui lòng duy trì nội dung phù hợp với mọi lứa tuổi, tập trung vào phiêu lưu và phát triển nhân vật. Tránh các chủ đề nhạy cảm, bạo lực quá mức hoặc tình dục.";
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
    // Nếu người dùng chọn "Tùy Chỉnh" nhưng để trống -> Fallback an toàn
    return "LƯU Ý QUAN TRỌNG: Chế độ Người Lớn đang TẮT.";
  }

  const currentNsfwStyle = worldConfig.nsfwDescriptionStyle || DEFAULT_NSFW_DESCRIPTION_STYLE;
  const currentViolenceLevel = worldConfig.violenceLevel || DEFAULT_VIOLENCE_LEVEL;
  const currentStoryTone = worldConfig.storyTone || DEFAULT_STORY_TONE;

  // Logic cho các style mặc định
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
