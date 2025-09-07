// FIX: Correct import path for types
import { KnowledgeBase, GameMessage, WorldSettings } from '../../types/index';

export const processWorldConfigUpdate = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];

    const field = tagParams.field as keyof WorldSettings;
    const value = tagParams.value;

    if (!field || value === undefined) {
        console.warn("WORLD_CONFIG_UPDATE: Missing field or value.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }

    if (newKb.worldConfig && field in newKb.worldConfig) {
        // FIX: Explicitly cast the field to a string when using it as a computed property key to avoid potential runtime errors if the key were a symbol.
        // Type assertion to allow assignment
        (newKb.worldConfig as any)[String(field)] = value;
        
        systemMessages.push({
            id: `world-config-update-${String(field)}-${Date.now()}`,
            type: 'system',
            content: `Thiết lập thế giới đã được cập nhật: "${String(field)}" đã được đổi thành "${value}".`,
            timestamp: Date.now(),
            turnNumber: turnForSystemMessages,
        });

    } else {
        console.warn(`WORLD_CONFIG_UPDATE: Invalid field "${field}" or worldConfig not found.`);
        systemMessages.push({
            id: `world-config-update-error-${String(field)}-${Date.now()}`,
            type: 'system',
            content: `[DEBUG] Lỗi cập nhật thiết lập thế giới: không tìm thấy trường "${String(field)}".`,
            timestamp: Date.now(),
            turnNumber: turnForSystemMessages,
        });
    }

    return { updatedKb: newKb, systemMessages };
};
