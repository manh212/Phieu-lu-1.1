
export const generateSummarizeCultivationPrompt = (cultivationLog: string[]): string => {
    const logString = cultivationLog.join('\n---\n');

    return `
Bạn là một AI tóm tắt viên, chuyên nghiệp trong việc chắt lọc những sự kiện chính từ một quá trình tu luyện dài.
Dưới đây là nhật ký chi tiết về một phiên tu luyện của người chơi.

**NHẬT KÝ CHI TIẾT:**
${logString}

**YÊU CẦU:**
Dựa vào nhật ký trên, hãy viết một đoạn văn **ngắn gọn** (khoảng 2-3 câu) tóm tắt lại kết quả chính của phiên tương tác. Tập trung vào:
1.  Kết quả chính (lượng kinh nghiệm/thuần thục nhận được).
2.  Những sự kiện bất ngờ hoặc quan trọng đã xảy ra.

Mục tiêu là tạo ra một bản tóm tắt súc tích để ghi vào nhật ký chính của người chơi.
**QUAN TRỌNG:** Chỉ viết đoạn văn tóm tắt, không thêm lời dẫn, tag, hay tiêu đề nào khác.

**VÍ DỤ:**
Sau một hồi khuyên giải và chăm sóc, thái độ của tù nhân đã có chút thay đổi, sự phản kháng của hắn đã giảm đi và thiện cảm với bạn cũng tăng lên một chút, nhưng hắn vẫn chưa tiết lộ bí mật nào.
`;
};
