// src/utils/tagProcessors/narrativeDirectiveTagProcessor.ts
import { KnowledgeBase, GameMessage } from '../../types/index';

export const processNarrativeDirective = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];

    const { text } = tagParams;

    if (!text || !text.trim()) {
        console.warn("NARRATIVE_DIRECTIVE: Missing or empty 'text' parameter.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }

    newKb.narrativeDirectiveForNextTurn = text;

    systemMessages.push({
        id: `narrative-directive-set-${Date.now()}`,
        type: 'system',
        content: `[AI Đạo Diễn] Đã ghi nhận một chỉ dẫn tường thuật cho lượt tiếp theo.`,
        timestamp: Date.now(),
        turnNumber: turnForSystemMessages,
    });

    return { updatedKb: newKb, systemMessages };
};
