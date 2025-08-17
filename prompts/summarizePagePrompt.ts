
import { GameMessage } from '../types';
import { VIETNAMESE, CUSTOM_GENRE_VALUE } from '../constants'; // Added CUSTOM_GENRE_VALUE

export const generateSummarizePagePrompt = (
    messagesToSummarize: GameMessage[], 
    worldTheme: string, 
    playerName: string, 
    genre?: string, // This is the selected GenreType
    customGenreName?: string // Added for custom genre
    ): string => {
  const effectiveGenre = (genre === CUSTOM_GENRE_VALUE && customGenreName) ? customGenreName : (genre || "Tu Tiên (Mặc định)");
  const genreContext = effectiveGenre !== "Tu Tiên (Mặc định)" ? `thể loại "${effectiveGenre}"` : "tu tiên";
  
  return `
Bạn là một AI tóm tắt viên, chuyên nghiệp trong việc chắt lọc những sự kiện chính từ một loạt các diễn biến trong một game nhập vai ${genreContext}.
Dưới đây là nhật ký các sự kiện và hành động của người chơi (${playerName}) trong một phần của cuộc phiêu lưu trong thế giới có chủ đề "${worldTheme}".

**NHẬT KÝ DIỄN BIẾN CẦN TÓM TẮT:**
${messagesToSummarize
      .filter(msg => ['narration', 'player_action', 'event_summary'].includes(msg.type))
      .map(msg => {
        let prefix = "";
        if (msg.type === 'player_action') {
            prefix = `${playerName} đã ${msg.isPlayerInput ? 'làm' : 'chọn'}: `;
        } else if (msg.type === 'narration') {
            prefix = "AI kể: ";
        } else if (msg.type === 'event_summary') {
            // Add a prefix for event summaries if they don't already have one.
            if (!msg.content.toLowerCase().startsWith('tóm tắt')) {
                prefix = "Tóm tắt sự kiện: ";
            }
        }
        return `${prefix}${msg.content}`;
      }).join("\n---\n")}

**YÊU CẦU:**
Hãy viết một đoạn văn (khoảng 400-500 chữ) tóm tắt lại những sự kiện, quyết định, và kết quả nổi bật nhất đã xảy ra trong nhật ký trên. Tập trung vào:
1.  Hành động quan trọng của người chơi và hậu quả trực tiếp.
2.  Sự kiện lớn hoặc bất ngờ.
3.  Thay đổi đáng kể về trạng thái nhiệm vụ (bắt đầu, hoàn thành mục tiêu, hoàn thành nhiệm vụ).
4.  NPC hoặc địa điểm mới quan trọng được khám phá.
5.  Thu thập vật phẩm hoặc học kỹ năng đặc biệt (nếu có ý nghĩa lớn).
6.  Thay đổi quan trọng về mối quan hệ với NPC hoặc phe phái.
7.  Nếu có hệ thống tu luyện/sức mạnh, đề cập đến những tiến triển hoặc thất bại quan trọng.

Mục tiêu là tạo ra một bản tóm tắt giúp người chơi nhanh chóng nắm bắt lại những gì đã xảy ra trước đó để tiếp tục cuộc phiêu lưu một cách mạch lạc.
Tránh đi sâu vào các chi tiết nhỏ hoặc các thay đổi chỉ số thông thường. Chỉ viết đoạn văn tóm tắt, không thêm lời dẫn hay tag nào khác.
`;
};
