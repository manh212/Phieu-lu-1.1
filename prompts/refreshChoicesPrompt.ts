// FIX: Correct import path for types
import { KnowledgeBase, AiChoice } from '@/types/index';

export const generateRefreshChoicesPrompt = (
    lastNarration: string,
    currentChoices: AiChoice[],
    playerHint: string,
    knowledgeBase: KnowledgeBase
): string => {
    const worldContext = `Bối cảnh thế giới: ${knowledgeBase.worldConfig?.theme}. Lời kể cuối cùng của AI: "${lastNarration}"`;

    if (playerHint.trim()) {
        // Case 1: Player provides a hint
        return `
Bạn là một AI kể chuyện trong một game nhập vai. Người chơi không hài lòng với các lựa chọn hiện tại và đưa ra một gợi ý.
${worldContext}

**YÊU CẦU:**
Người chơi không hài lòng với các lựa chọn hành động hiện tại. Họ đang cố gắng tìm ra những khả năng khác.

**Gợi ý từ người chơi:** "${playerHint}"

**NHIỆM VỤ CỦA BẠN:**
1.  **TUYỆT ĐỐI KHÔNG** được coi gợi ý của người chơi là một hành động và không được viết tiếp câu chuyện.
2.  Dựa trên **lời kể cuối cùng** và **gợi ý của người chơi**, hãy tạo ra một bộ 3-4 lựa chọn hành động **HOÀN TOÀN MỚI** có liên quan mật thiết đến gợi ý đó.
3.  Chỉ trả về các lựa chọn theo định dạng \`[CHOICE: "Nội dung lựa chọn"]\`.
`;
    } else {
        // Case 2: Player provides no hint (simple refresh)
        const currentChoicesText = currentChoices.map(c => `- "${c.text}"`).join('\n');
        return `
Bạn là một AI kể chuyện trong một game nhập vai. Người chơi không hài lòng với các lựa chọn hiện tại và muốn làm mới chúng.
${worldContext}
Các lựa chọn hiện tại cần thay thế:
${currentChoicesText}

**YÊU CẦU:**
Người chơi không hài lòng với các lựa chọn hành động hiện tại. Họ muốn xem các khả năng hoàn toàn khác.

**NHIỆM VỤ CỦA BẠN:**
1.  **TUYỆT ĐỐI KHÔNG** được viết tiếp câu chuyện.
2.  Dựa trên **lời kể cuối cùng**, hãy tạo ra một bộ 3-4 lựa chọn hành động **HOÀN TOÀN MỚI** và **KHÁC BIỆT** so với các lựa chọn hiện tại đã được liệt kê ở trên.
3.  Chỉ trả về các lựa chọn theo định dạng \`[CHOICE: "Nội dung lựa chọn"]\`.
`;
    }
};