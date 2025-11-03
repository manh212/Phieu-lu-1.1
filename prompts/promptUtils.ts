// FIX: Corrected import paths for types.
import { WorldSettings, KnowledgeBase } from '../types/index';
import { VIETNAMESE, DEFAULT_VIOLENCE_LEVEL, DEFAULT_STORY_TONE, DEFAULT_NSFW_DESCRIPTION_STYLE, nsfwGuidanceCustomDefault } from '../constants';
import { 
    formatItemForEmbedding, 
    formatSkillForEmbedding, 
    formatQuestForEmbedding, 
    formatPersonForEmbedding, 
    formatLocationForEmbedding, 
    formatLoreForEmbedding, 
    formatFactionForEmbedding, 
    formatYeuThuForEmbedding 
} from '../utils/ragUtils';

export const buildPinnedContext = (kb: KnowledgeBase): { pinnedContext: string; pinnedIds: string[] } => {
    const pinnedItems: any[] = [];
    const pinnedIds: string[] = [];

    const checkAndPush = (list: any[] | undefined) => {
        if (list) {
            list.forEach(item => {
                if (item.isPinned) {
                    pinnedItems.push(item);
                    pinnedIds.push(item.id);
                }
            });
        }
    };
    
    // Check all lists that can have pinned items
    checkAndPush(kb.inventory);
    checkAndPush(kb.playerSkills);
    checkAndPush(kb.allQuests?.filter(q => q.status === 'active'));
    checkAndPush(kb.discoveredNPCs);
    checkAndPush(kb.discoveredYeuThu);
    checkAndPush(kb.wives);
    checkAndPush(kb.slaves);
    checkAndPush(kb.prisoners);
    checkAndPush(kb.discoveredLocations);
    checkAndPush(kb.worldLore);
    checkAndPush(kb.discoveredFactions);
    if (kb.master && kb.master.isPinned) {
        pinnedItems.push(kb.master);
        pinnedIds.push(kb.master.id);
    }
    
    if (pinnedItems.length === 0) {
        return { pinnedContext: '', pinnedIds: [] };
    }

    const contextChunks = pinnedItems.map(entity => {
        if ('category' in entity) return formatItemForEmbedding(entity, kb);
        if ('skillType' in entity) return formatSkillForEmbedding(entity, kb);
        if ('objectives' in entity) return formatQuestForEmbedding(entity, kb);
        if ('species' in entity) return formatYeuThuForEmbedding(entity, kb);
        if ('alignment' in entity) return formatFactionForEmbedding(entity, kb);
        if ('content' in entity) return formatLoreForEmbedding(entity, kb);
        if ('locationType' in entity) return formatLocationForEmbedding(entity, kb);
        // This should cover NPC, Wife, Slave, Prisoner, Master
        if ('personalityTraits' in entity || 'entityType' in entity || 'mood' in entity) return formatPersonForEmbedding(entity, kb);
        return ''; // Fallback for unknown pinned items
    }).filter(Boolean);

    const pinnedContext = `**THÔNG TIN ĐÃ GHIM (PINNED CONTEXT - ƯU TIÊN CAO):**\nĐây là những thông tin quan trọng mà người chơi đã ghim lại. Hãy ưu tiên sử dụng chúng để đảm bảo tính nhất quán.\n\n${contextChunks.join('\n---\n')}`;

    return { pinnedContext, pinnedIds };
};

// FIX: Add missing 'getNsfwGuidance' function to resolve import errors.
export const getNsfwGuidance = (worldConfig: WorldSettings | null): string => {
    if (!worldConfig) return '';

    const { nsfwMode, nsfwDescriptionStyle, violenceLevel, storyTone, customNsfwPrompt } = worldConfig;

    if (!nsfwMode) {
        return "Chế độ Người Lớn (18+): TẮT. Mọi nội dung khiêu dâm, bạo lực cực đoan đều bị cấm.";
    }

    let guidance = "Chế độ Người Lớn (18+): BẬT.";
    let nsfwStyleText = '';

    switch (nsfwDescriptionStyle || DEFAULT_NSFW_DESCRIPTION_STYLE) {
        case 'Hoa Mỹ':
            nsfwStyleText = VIETNAMESE.nsfwGuidanceHoaMy;
            break;
        case 'Trần Tục':
            nsfwStyleText = VIETNAMESE.nsfwGuidanceTranTuc;
            break;
        case 'Gợi Cảm':
            nsfwStyleText = VIETNAMESE.nsfwGuidanceGoiCam;
            break;
        case 'Mạnh Bạo (BDSM)':
            nsfwStyleText = VIETNAMESE.nsfwGuidanceManhBaoBDSM;
            break;
        case 'Tùy Chỉnh (Phòng Tối AI)':
            nsfwStyleText = customNsfwPrompt || nsfwGuidanceCustomDefault;
            break;
    }
    guidance += `\n- **Phong cách miêu tả Tình dục:** ${nsfwDescriptionStyle || DEFAULT_NSFW_DESCRIPTION_STYLE}\n${nsfwStyleText}`;

    let violenceText = '';
    switch (violenceLevel || DEFAULT_VIOLENCE_LEVEL) {
        case 'Nhẹ Nhàng':
            violenceText = VIETNAMESE.violenceLevelGuidanceNheNhang;
            break;
        case 'Thực Tế':
            violenceText = VIETNAMESE.violenceLevelGuidanceThucTe;
            break;
        case 'Cực Đoan':
            violenceText = VIETNAMESE.violenceLevelGuidanceCucDoan;
            break;
    }
    guidance += `\n- **Mức độ Bạo lực:** ${violenceLevel || DEFAULT_VIOLENCE_LEVEL}\n${violenceText}`;

    let toneText = '';
    switch (storyTone || DEFAULT_STORY_TONE) {
        case 'Tích Cực':
            toneText = VIETNAMESE.storyToneGuidanceTichCuc;
            break;
        case 'Trung Tính':
            toneText = VIETNAMESE.storyToneGuidanceTrungTinh;
            break;
        case 'Đen Tối':
            toneText = VIETNAMESE.storyToneGuidanceDenToi;
            break;
        case 'Dâm Dục':
            toneText = VIETNAMESE.storyToneGuidanceDamDuc;
            break;
        case 'Hoang Dâm':
            toneText = VIETNAMESE.storyToneGuidanceHoangDam;
            break;
        case 'Dâm Loạn':
            toneText = VIETNAMESE.storyToneGuidanceDamLoan;
            break;
    }
    guidance += `\n- **Tông màu Câu chuyện:** ${storyTone || DEFAULT_STORY_TONE}\n${toneText}`;

    return guidance;
};
