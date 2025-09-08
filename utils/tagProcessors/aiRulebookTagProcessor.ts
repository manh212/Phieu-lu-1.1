// src/utils/tagProcessors/aiRulebookTagProcessor.ts
import { KnowledgeBase, GameMessage, AIRulebook } from '../../types/index';
import { DEFAULT_AI_RULEBOOK } from '../../constants/systemRulesNormal';

export const processAiRuleUpdate = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];

    const key = tagParams.key as keyof AIRulebook;
    const content = tagParams.content;

    if (!key || content === undefined) {
        console.warn("AI_RULE_UPDATE: Missing or invalid key/content.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }

    if (!newKb.aiRulebook) {
        newKb.aiRulebook = { ...DEFAULT_AI_RULEBOOK };
    }
    
    if (key in newKb.aiRulebook) {
        (newKb.aiRulebook as any)[key] = content;
        systemMessages.push({
            id: `airule-update-${key}-${Date.now()}`,
            type: 'system',
            content: `Nội dung quy tắc AI "${key}" đã được cập nhật.`,
            timestamp: Date.now(),
            turnNumber: turnForSystemMessages
        });
    } else {
        console.warn(`AI_RULE_UPDATE: Invalid rule key "${key}".`);
    }

    return { updatedKb: newKb, systemMessages };
};

export const processAiRuleReset = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    
    const key = tagParams.key as keyof AIRulebook;

    if (!key) {
        console.warn("AI_RULE_RESET: Missing key.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }

    if (!newKb.aiRulebook) {
        newKb.aiRulebook = { ...DEFAULT_AI_RULEBOOK };
    }

    if (key in newKb.aiRulebook && key in DEFAULT_AI_RULEBOOK) {
        (newKb.aiRulebook as any)[key] = DEFAULT_AI_RULEBOOK[key];
        systemMessages.push({
            id: `airule-reset-${key}-${Date.now()}`,
            type: 'system',
            content: `Nội dung quy tắc AI "${key}" đã được khôi phục về mặc định.`,
            timestamp: Date.now(),
            turnNumber: turnForSystemMessages
        });
    } else {
         console.warn(`AI_RULE_RESET: Invalid or non-resettable rule key "${key}".`);
    }

    return { updatedKb: newKb, systemMessages };
};
