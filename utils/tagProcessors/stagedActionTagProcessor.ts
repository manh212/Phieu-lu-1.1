// src/utils/tagProcessors/stagedActionTagProcessor.ts
import { KnowledgeBase, GameMessage, StagedAction } from '../../types/index';

export const processStagedActionSet = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];

    const { trigger, description, actionTags } = tagParams;

    if (!trigger || !description || !actionTags) {
        console.warn("STAGED_ACTION_SET: Missing required parameters (trigger, description, actionTags).", tagParams);
        return { updatedKb: newKb, systemMessages };
    }

    if (!newKb.stagedActions) {
        newKb.stagedActions = {};
    }

    const newAction: StagedAction = {
        description,
        actionTags,
    };

    newKb.stagedActions[trigger] = newAction;

    systemMessages.push({
        id: `staged-action-set-${trigger}`,
        type: 'system',
        content: `[AI Đạo Diễn] Đã sắp đặt một hành động chờ: ${description}`,
        timestamp: Date.now(),
        turnNumber: turnForSystemMessages,
    });

    return { updatedKb: newKb, systemMessages };
};

export const processStagedActionClear = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const { trigger } = tagParams;

    if (!trigger) {
        console.warn("STAGED_ACTION_CLEAR: Missing trigger parameter.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }

    if (newKb.stagedActions && newKb.stagedActions[trigger]) {
        delete newKb.stagedActions[trigger];
        systemMessages.push({
            id: `staged-action-cleared-${trigger}`,
            type: 'system',
            content: `[AI Đạo Diễn] Hành động chờ "${trigger}" đã được kích hoạt và gỡ bỏ.`,
            timestamp: Date.now(),
            turnNumber: turnForSystemMessages,
        });
    } else {
        console.warn(`STAGED_ACTION_CLEAR: Trigger "${trigger}" not found in staged actions.`);
    }

    return { updatedKb: newKb, systemMessages };
};
