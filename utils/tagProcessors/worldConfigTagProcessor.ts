// FIX: Correct import path for types
import { KnowledgeBase, GameMessage, WorldSettings } from '../../types/index';
import { VIOLENCE_LEVELS, STORY_TONES, NSFW_DESCRIPTION_STYLES } from '../../constants';

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

    // --- START: SAFETY VALIDATION (STEP 2.3) ---
    // A comprehensive whitelist of all primitive-type fields in WorldSettings.
    // This allows flexible AI control while protecting complex array/object fields from corruption by this tag.
    const allowedFields: (keyof WorldSettings)[] = [
        'saveGameName', 'theme', 'settingDescription', 'writingStyle', 'difficulty',
        'currencyName', 'playerName', 'playerGender', 'playerRace', 'playerPersonality',
        'playerBackstory', 'playerGoal', 'playerStartingTraits', 'playerSpiritualRoot',
        'playerSpecialPhysique', 'playerThoNguyen', 'playerMaxThoNguyen', 'startingCurrency',
        'nsfwMode', 'nsfwDescriptionStyle', 'customNsfwPrompt', 'violenceLevel', 'storyTone',
        'originalStorySummary', 'genre', 'customGenreName', 'isCultivationEnabled',
        'yeuThuRealmSystem', 'canhGioiKhoiDau', 'playerAvatarUrl', 'writingStyleGuide'
    ];

    if (!allowedFields.includes(field)) {
        console.warn(`WORLD_CONFIG_UPDATE: Attempted to update a non-whitelisted or complex field: "${field}"`);
        systemMessages.push({
            id: `world-config-update-error-disallowed-${String(field)}-${Date.now()}`,
            type: 'system',
            content: `[DEBUG] Lỗi: Siêu Trợ Lý đã cố gắng thay đổi một trường không được phép hoặc có cấu trúc phức tạp: "${String(field)}".`,
            timestamp: Date.now(),
            turnNumber: turnForSystemMessages,
        });
        return { updatedKb: newKb, systemMessages };
    }

    // Validation for specific fields with enumerated values
    if (field === 'difficulty' && !['Dễ', 'Thường', 'Khó', 'Ác Mộng'].includes(value)) {
        console.warn(`WORLD_CONFIG_UPDATE: Invalid value for difficulty: "${value}"`);
        return { updatedKb: newKb, systemMessages };
    }
    if ((field === 'nsfwMode' || field === 'isCultivationEnabled') && value !== 'true' && value !== 'false') {
        console.warn(`WORLD_CONFIG_UPDATE: Invalid boolean value for ${field}: "${value}"`);
        return { updatedKb: newKb, systemMessages };
    }
    if (field === 'nsfwDescriptionStyle' && !NSFW_DESCRIPTION_STYLES.includes(value as any)) {
        console.warn(`WORLD_CONFIG_UPDATE: Invalid value for nsfwDescriptionStyle: "${value}"`);
        return { updatedKb: newKb, systemMessages };
    }
     if (field === 'violenceLevel' && !VIOLENCE_LEVELS.includes(value as any)) {
        console.warn(`WORLD_CONFIG_UPDATE: Invalid value for violenceLevel: "${value}"`);
        return { updatedKb: newKb, systemMessages };
    }
     if (field === 'storyTone' && !STORY_TONES.includes(value as any)) {
        console.warn(`WORLD_CONFIG_UPDATE: Invalid value for storyTone: "${value}"`);
        return { updatedKb: newKb, systemMessages };
    }
    // --- END: SAFETY VALIDATION ---

    if (newKb.worldConfig && field in newKb.worldConfig) {
        let finalValue: any = value;
        const targetType = typeof (newKb.worldConfig as any)[field];

        // Convert value to the correct type based on the existing field's type
        if (targetType === 'boolean') {
            finalValue = (value.toLowerCase() === 'true');
        } else if (targetType === 'number') {
            const numVal = parseFloat(value);
            if (isNaN(numVal)) {
                 console.warn(`WORLD_CONFIG_UPDATE: Invalid number value "${value}" for field "${field}".`);
                 return { updatedKb: newKb, systemMessages }; // Abort update for this tag
            }
            finalValue = numVal;
        }

        // Type assertion to allow assignment
        (newKb.worldConfig as any)[String(field)] = finalValue;
        
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