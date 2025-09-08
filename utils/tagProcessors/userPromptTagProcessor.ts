// src/utils/tagProcessors/userPromptTagProcessor.ts
import { KnowledgeBase, GameMessage } from '../../types/index';

export const processUserPromptAdd = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const textToAdd = tagParams.text;

    if (!textToAdd || !textToAdd.trim()) {
        console.warn("USER_PROMPT_ADD: Missing or empty 'text' parameter.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }

    if (!newKb.userPrompts) {
        newKb.userPrompts = [];
    }

    // Avoid adding duplicate prompts
    if (!newKb.userPrompts.includes(textToAdd.trim())) {
        newKb.userPrompts.push(textToAdd.trim());
        systemMessages.push({
            id: `user-prompt-added-${Date.now()}`,
            type: 'system',
            content: `Lời nhắc mới cho AI đã được thêm: "${textToAdd.trim()}"`,
            timestamp: Date.now(),
            turnNumber: turnForSystemMessages,
        });
    } else {
        systemMessages.push({
            id: `user-prompt-duplicate-${Date.now()}`,
            type: 'system',
            content: `Lời nhắc "${textToAdd.trim()}" đã tồn tại.`,
            timestamp: Date.now(),
            turnNumber: turnForSystemMessages,
        });
    }

    return { updatedKb: newKb, systemMessages };
};

export const processUserPromptRemove = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const indexToRemove = parseInt(tagParams.index, 10);

    if (isNaN(indexToRemove) || !newKb.userPrompts || indexToRemove < 0 || indexToRemove >= newKb.userPrompts.length) {
        console.warn("USER_PROMPT_REMOVE: Invalid or out-of-bounds index.", tagParams);
        systemMessages.push({
            id: `user-prompt-remove-error-${Date.now()}`,
            type: 'system',
            content: `[DEBUG] Lỗi xóa lời nhắc: Chỉ số không hợp lệ "${tagParams.index}".`,
            timestamp: Date.now(),
            turnNumber: turnForSystemMessages,
        });
        return { updatedKb: newKb, systemMessages };
    }

    const removedPrompt = newKb.userPrompts[indexToRemove];
    newKb.userPrompts.splice(indexToRemove, 1);

    systemMessages.push({
        id: `user-prompt-removed-${Date.now()}`,
        type: 'system',
        content: `Đã xóa lời nhắc: "${removedPrompt}"`,
        timestamp: Date.now(),
        turnNumber: turnForSystemMessages
    });

    return { updatedKb: newKb, systemMessages };
};
