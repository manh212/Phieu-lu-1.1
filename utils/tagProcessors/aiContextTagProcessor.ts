import { KnowledgeBase, GameMessage, AIContextConfig } from '../../types/index';
import { DEFAULT_AI_CONTEXT_CONFIG } from '../gameLogicUtils';

export const processAiContextConfigUpdate = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];

    const key = tagParams.key as keyof AIContextConfig;
    const value = tagParams.value?.toLowerCase();

    if (!key || (value !== 'true' && value !== 'false')) {
        console.warn("AI_CONTEXT_CONFIG_UPDATE: Missing or invalid key/value.", tagParams);
        systemMessages.push({
            id: `aiconfig-update-error-${Date.now()}`,
            type: 'system',
            content: `[DEBUG] Lỗi cập nhật Cấu Hình AI: Thiếu hoặc sai tham số.`,
            timestamp: Date.now(),
            turnNumber: newKb.playerStats.turn
        });
        return { updatedKb: newKb, systemMessages };
    }
    
    if (!newKb.aiContextConfig) {
        // This should not happen due to the migration logic in useGameActions, but it's a safe fallback.
        newKb.aiContextConfig = { ...DEFAULT_AI_CONTEXT_CONFIG }; 
    }

    if (key in newKb.aiContextConfig) {
        const booleanValue = (value === 'true');
        (newKb.aiContextConfig as any)[key] = booleanValue;
        systemMessages.push({
            id: `aiconfig-updated-${key}-${Date.now()}`,
            type: 'system',
            content: `Cấu Hình AI: Quy tắc "${key}" đã được ${booleanValue ? 'BẬT' : 'TẮT'}.`,
            timestamp: Date.now(),
            turnNumber: newKb.playerStats.turn
        });
    } else {
        console.warn(`AI_CONTEXT_CONFIG_UPDATE: Invalid key "${key}".`);
        systemMessages.push({
            id: `aiconfig-update-error-key-${Date.now()}`,
            type: 'system',
            content: `[DEBUG] Lỗi cập nhật Cấu Hình AI: Không tìm thấy quy tắc "${key}".`,
            timestamp: Date.now(),
            turnNumber: newKb.playerStats.turn
        });
    }

    return { updatedKb: newKb, systemMessages };
};
