// src/utils/ragUtils.ts
import {
    KnowledgeBase, Item, NPC, YeuThu, Skill, GameLocation, Faction,
    WorldLoreEntry, Quest, Wife, Slave, Prisoner, Master, VectorStore, VectorMetadata, PersonBase, ActivityLogEntry
} from '../types/index';
import * as GameTemplates from '../types/index';
import { generateEmbeddings } from '../services/embeddingService';

// --- HÀM TIỆN ÍCH (HELPER FUNCTIONS) ---

/**
 * Tìm tên của một địa điểm dựa vào ID.
 * @param locationId ID của địa điểm cần tìm.
 * @param kb Toàn bộ tri thức của game.
 * @returns Tên của địa điểm hoặc một chuỗi báo không xác định.
 */
const _findLocationNameById = (locationId: string | undefined, kb: KnowledgeBase): string => {
    if (!locationId) {
        return "một nơi không xác định";
    }
    const location = kb.discoveredLocations.find(loc => loc.id === locationId);
    return location ? `"${location.name}"` : "một nơi không xác định";
};

/**
 * Tìm tên của một nhân vật dựa vào ID, tìm kiếm trong tất cả các danh sách có thể chứa nhân vật.
 * @param personId ID của nhân vật cần tìm.
 * @param kb Toàn bộ tri thức của game.
 * @returns Tên của nhân vật hoặc null nếu không tìm thấy.
 */
const _findPersonNameById = (personId: string, kb: KnowledgeBase): string | null => {
    if (personId === 'player') {
        return kb.worldConfig?.playerName || 'Người chơi';
    }
    const allPeople: (NPC | Wife | Slave | Prisoner | Master)[] = [
        ...kb.discoveredNPCs,
        ...kb.wives,
        ...kb.slaves,
        ...kb.prisoners,
    ];
    if (kb.master) {
        // Đảm bảo không bị trùng lặp nếu master cũng có trong danh sách NPC (dù logic đã xóa)
        if (!allPeople.some(p => p.id === kb.master!.id)) {
            allPeople.push(kb.master);
        }
    }
    
    const foundPerson = allPeople.find(p => p.id === personId);
    return foundPerson ? foundPerson.name : null;
};


// --- CÁC HÀM ĐỊNH DẠNG CHÍNH ---

/**
 * Tạo ra một chuỗi văn xuôi mô tả một vật phẩm để cung cấp cho AI.
 * @param item Đối tượng vật phẩm.
 * @param knowledgeBase Toàn bộ tri thức của game.
 * @returns Một chuỗi văn xuôi mô tả.
 */
export const formatItemForEmbedding = (item: Item, knowledgeBase: KnowledgeBase): string => {
    const categoryMap: Record<GameTemplates.ItemCategoryValues, string> = {
        [GameTemplates.ItemCategory.EQUIPMENT]: "Trang Bị",
        [GameTemplates.ItemCategory.POTION]: "Đan Dược",
        [GameTemplates.ItemCategory.MATERIAL]: "Nguyên Liệu",
        [GameTemplates.ItemCategory.QUEST_ITEM]: "Vật Phẩm Nhiệm Vụ",
        [GameTemplates.ItemCategory.MISCELLANEOUS]: "Linh Tinh",
        [GameTemplates.ItemCategory.CONG_PHAP]: "Công Pháp",
        [GameTemplates.ItemCategory.LINH_KI]: "Linh Kĩ",
        [GameTemplates.ItemCategory.PROFESSION_SKILL_BOOK]: "Sách Kỹ Năng Nghề",
        [GameTemplates.ItemCategory.PROFESSION_TOOL]: "Dụng Cụ Nghề",
    };
    const categoryText = categoryMap[item.category] || "Không rõ";
    let prose = `[Vật phẩm: ${categoryText}] ${item.name} (ID: ${item.id})`;

    switch (item.category) {
        case GameTemplates.ItemCategory.EQUIPMENT:
            const equip = item as GameTemplates.EquipmentTemplate;
            prose += ` là một món trang bị loại ${equip.equipmentType}, độ hiếm ${equip.rarity}. ${equip.description}`;
            break;
        case GameTemplates.ItemCategory.POTION:
            const potion = item as GameTemplates.PotionTemplate;
            prose += ` là một loại đan dược ${potion.potionType}, độ hiếm ${potion.rarity}. ${potion.description}`;
            break;
        case GameTemplates.ItemCategory.MATERIAL:
            const material = item as GameTemplates.MaterialTemplate;
            prose += ` là một loại nguyên liệu ${material.materialType}, độ hiếm ${material.rarity}, thường dùng để ${material.description}`;
            break;
        default:
            prose += `, độ hiếm ${item.rarity}. ${item.description}`;
            break;
    }
    return prose;
};

/**
 * [BƯỚC 4 - HOÀN THÀNH]
 * Tạo ra một chuỗi văn xuôi mô tả một nhân vật (NPC, Vợ, Nô lệ, Tù nhân, Sư phụ) để cung cấp cho AI.
 * Đã tích hợp đầy đủ 4 tầng thông tin: Cơ bản, Nội tâm & Mục tiêu, Mối quan hệ, và Nhật ký gần đây.
 * @param person Đối tượng nhân vật.
 * @param knowledgeBase Toàn bộ tri thức của game.
 * @returns Một chuỗi văn xuôi mô tả.
 */
export const formatPersonForEmbedding = (person: NPC | Wife | Slave | Prisoner | Master, knowledgeBase: KnowledgeBase): string => {
    const getEntityType = () => {
        if ('entityType' in person && person.entityType) {
            switch(person.entityType) {
                case 'wife': return 'Đạo Lữ';
                case 'slave': return 'Nô Lệ';
                case 'prisoner': return 'Tù Nhân';
            }
        }
        if ('mood' in person && !('entityType' in person)) return 'Sư Phụ';
        return 'NPC';
    };
    const entityTypeText = getEntityType();

    const pronoun = person.gender === 'Nữ' ? 'Nàng' : (person.gender === 'Nam' ? 'Hắn' : 'Người này');
    const role = person.title || 'người';
    const genderNoun = person.gender === 'Nữ' ? 'nữ tử' : (person.gender === 'Nam' ? 'nam tử' : 'người');
    const race = person.race || 'Nhân Tộc';
    const realm = person.realm || 'Không rõ';
    const tuChat = person.tuChat || 'Không rõ';

    // === Phần 1: Mô tả cơ bản & Vị trí ===
    let baseProse = `[Nhân vật: ${entityTypeText}] ${person.name} (ID: ${person.id}) là một ${role}.`;
    baseProse += ` Đây là một ${genderNoun} thuộc chủng tộc ${race}, có tu vi ${realm} và tư chất ${tuChat}.`;
    
    const locationName = _findLocationNameById(person.locationId, knowledgeBase);
    baseProse += ` Hiện đang ở tại ${locationName}.`;
    
    // === Phần 2: Nội tâm & Mục tiêu (Chiều sâu Nội tâm) ===
    let internalStateProse = '';
    if (person.mood || person.shortTermGoal || person.longTermGoal) {
        internalStateProse = `\n\n[Nội tâm & Mục tiêu]`;
        const sentences: string[] = [];
        
        // Xử lý tâm trạng và suy luận nguyên nhân
        if (person.mood) {
            let moodSentence = `Hiện tại, tâm trạng của ${pronoun} có vẻ đang ${person.mood}`;
            
            // Logic suy luận nâng cao
            const latestActivity = person.activityLog?.slice().sort((a, b) => b.turnNumber - a.turnNumber)[0];
            if (latestActivity) {
                const negativeMoods = ['Bực Bội', 'Giận Dữ'];
                const positiveMoods = ['Vui Vẻ', 'Hài Lòng'];
                const negativeKeywords = ['tranh cãi', 'bị trừng phạt', 'thất bại', 'bị đánh bại', 'bị từ chối'];
                const positiveKeywords = ['được khen', 'thắng lợi', 'đột phá', 'thành công', 'nhận được'];
                const lowerDesc = latestActivity.description.toLowerCase();

                if (negativeMoods.includes(person.mood) && negativeKeywords.some(kw => lowerDesc.includes(kw))) {
                     moodSentence += `, có lẽ vì ${pronoun} vừa ${lowerDesc}`;
                } else if (positiveMoods.includes(person.mood) && positiveKeywords.some(kw => lowerDesc.includes(kw))) {
                     moodSentence += `, có lẽ vì ${pronoun} vừa ${lowerDesc}`;
                }
            }
            sentences.push(moodSentence + ".");
        }

        // Xử lý mục tiêu
        if (person.shortTermGoal && person.longTermGoal) {
            sentences.push(`Dường như mục tiêu ngắn hạn của ${pronoun} là "${person.shortTermGoal}", hướng tới tham vọng dài hạn là "${person.longTermGoal}".`);
        } else if (person.shortTermGoal) {
            sentences.push(`Mục tiêu trước mắt của ${pronoun} là "${person.shortTermGoal}".`);
        } else if (person.longTermGoal) {
            sentences.push(`Tham vọng dài hạn của ${pronoun} là "${person.longTermGoal}".`);
        }
        
        if(sentences.length > 0) {
            internalStateProse += '\n' + sentences.join(' ');
        }
    }

    // === Phần 3: Mối quan hệ ===
    let relationshipProse = '';
    if (person.relationships && Object.keys(person.relationships).length > 0) {
        const relationshipSentences: string[] = [];
        for (const targetId in person.relationships) {
            const relationshipData = person.relationships[targetId];
            if (relationshipData.type.toLowerCase() !== 'người lạ') {
                const targetName = _findPersonNameById(targetId, knowledgeBase);
                if (targetName) {
                    relationshipSentences.push(`${relationshipData.type} với ${targetName} (thiện cảm: ${relationshipData.affinity})`);
                }
            }
        }
        
        if (relationshipSentences.length > 0) {
            relationshipProse = `\n\n[Mối quan hệ]\n${pronoun} có các mối quan hệ sau: ${relationshipSentences.join('; ')}.`;
        }
    }
    
    // === Phần 4: Nhật ký gần đây (Trí nhớ ngắn hạn) ===
    let activityLogProse = '';
    if (person.activityLog && person.activityLog.length > 0) {
        const recentActivities = person.activityLog
            .slice() // Tạo một bản sao nông để tránh thay đổi mảng gốc
            .sort((a, b) => b.turnNumber - a.turnNumber) // Sắp xếp giảm dần theo lượt
            .slice(0, 3); // Lấy 3 hoạt động gần nhất

        if (recentActivities.length > 0) {
            const activityStrings = recentActivities.map((log, index) => {
                const prefix = index === 0 ? "Mới nhất" : "Trước đó";
                return `• ${prefix} (Lượt ${log.turnNumber}): ${log.description}`;
            });
            activityLogProse = `\n\n[Nhật ký gần đây]\n${activityStrings.join('\n')}`;
        }
    }
    
    // Ghép nối theo thứ tự cuối cùng mong muốn
    return baseProse + internalStateProse + relationshipProse + activityLogProse;
};

/**
 * Tạo ra một chuỗi văn xuôi mô tả một Yêu Thú để cung cấp cho AI.
 * @param beast Đối tượng Yêu thú.
 * @param knowledgeBase Toàn bộ tri thức của game.
 * @returns Một chuỗi văn xuôi mô tả.
 */
export const formatYeuThuForEmbedding = (beast: YeuThu, knowledgeBase: KnowledgeBase): string => {
    let prose = `[Yêu Thú] ${beast.name} (ID: ${beast.id}) là một con ${beast.species} có cảnh giới ${beast.realm || 'Không rõ'}.`;
    prose += ` Nó ${beast.isHostile ? 'là loài thù địch' : 'tương đối ôn hòa'}. ${beast.description}`;
    return prose;
};

/**
 * Tạo ra một chuỗi văn xuôi mô tả một Kỹ Năng để cung cấp cho AI.
 * @param skill Đối tượng kỹ năng.
 * @param knowledgeBase Toàn bộ tri thức của game.
 * @returns Một chuỗi văn xuôi mô tả.
 */
export const formatSkillForEmbedding = (skill: Skill, knowledgeBase: KnowledgeBase): string => {
    return `[Kỹ năng: ${skill.skillType}] ${skill.name} (ID: ${skill.id}) là một kỹ năng loại ${skill.skillType}. Mô tả: ${skill.description}. Hiệu ứng chi tiết: ${skill.detailedEffect}`;
};

/**
 * Tạo ra một chuỗi văn xuôi mô tả một Địa Điểm để cung cấp cho AI.
 * @param location Đối tượng địa điểm.
 * @param knowledgeBase Toàn bộ tri thức của game.
 * @returns Một chuỗi văn xuôi mô tả.
 */
export const formatLocationForEmbedding = (location: GameLocation, knowledgeBase: KnowledgeBase): string => {
    const locationTypeText = location.locationType || "Chung";
    const safetyText = location.isSafeZone ? 'an toàn' : 'nguy hiểm';
    return `[Địa điểm: ${locationTypeText}] ${location.name} (ID: ${location.id}) là một khu vực ${safetyText}. ${location.description}`;
};

/**
 * Tạo ra một chuỗi văn xuôi mô tả một Phe Phái để cung cấp cho AI.
 * @param faction Đối tượng phe phái.
 * @param knowledgeBase Toàn bộ tri thức của game.
 * @returns Một chuỗi văn xuôi mô tả.
 */
export const formatFactionForEmbedding = (faction: Faction, knowledgeBase: KnowledgeBase): string => {
    return `[Phe phái] ${faction.name} (ID: ${faction.id}) là một phe phái ${faction.alignment}. Uy tín của người chơi với phe này là ${faction.playerReputation}. ${faction.description}`;
};

/**
 * Tạo ra một chuỗi văn xuôi mô tả một Tri Thức Thế Giới để cung cấp cho AI.
 * @param lore Đối tượng tri thức.
 * @param knowledgeBase Toàn bộ tri thức của game.
 * @returns Một chuỗi văn xuôi mô tả.
 */
export const formatLoreForEmbedding = (lore: WorldLoreEntry, knowledgeBase: KnowledgeBase): string => {
    return `[Tri thức] ${lore.title} (ID: ${lore.id}): ${lore.content}`;
};

/**
 * Tạo ra một chuỗi văn xuôi mô tả một Nhiệm Vụ đang hoạt động để cung cấp cho AI.
 * @param quest Đối tượng nhiệm vụ.
 * @param knowledgeBase Toàn bộ tri thức của game.
 * @returns Một chuỗi văn xuôi mô tả.
 */
export const formatQuestForEmbedding = (quest: Quest, knowledgeBase: KnowledgeBase): string => {
    const objectives = quest.objectives.filter(o => !o.completed).map(o => o.text).join('; ');
    return `[Nhiệm vụ: ${quest.status}] ${quest.title} (ID: ${quest.id}). Mô tả: ${quest.description}. Các mục tiêu cần làm tiếp theo: ${objectives || 'Không có'}.`;
};

/**
 * Tạo ra một chuỗi văn xuôi mô tả một ký ức quan hệ để cung cấp cho AI.
 * @param sourceName Tên của người khởi xướng sự kiện.
 * @param targetName Tên của người bị ảnh hưởng.
 * @param reason Mô tả về những gì đã xảy ra.
 * @param turnNumber Lượt mà sự kiện xảy ra.
 * @returns Một chuỗi văn xuôi mô tả.
 */
export const formatRelationshipMemoryForEmbedding = (
    sourceName: string,
    targetName: string,
    reason: string,
    turnNumber: number
): string => {
    return `[Ký ức quan hệ - Lượt ${turnNumber}] Giữa ${sourceName} và ${targetName}: ${reason}.`;
};

// --- CÁC HÀM LIÊN QUAN ĐẾN VECTOR STORE ---

export const vectorizeKnowledgeBase = async (kb: KnowledgeBase): Promise<VectorStore> => {
    const metadataToVectorize: VectorMetadata[] = [];
    const currentTurn = kb.playerStats.turn;

    // Gather all entities
    kb.inventory.forEach(e => metadataToVectorize.push({ entityId: e.id, entityType: 'item', text: formatItemForEmbedding(e, kb), turnNumber: currentTurn }));
    kb.playerSkills.forEach(e => metadataToVectorize.push({ entityId: e.id, entityType: 'skill', text: formatSkillForEmbedding(e, kb), turnNumber: currentTurn }));
    kb.allQuests.filter(q => q.status === 'active').forEach(e => metadataToVectorize.push({ entityId: e.id, entityType: 'quest', text: formatQuestForEmbedding(e, kb), turnNumber: currentTurn }));
    kb.discoveredNPCs.forEach(e => metadataToVectorize.push({ entityId: e.id, entityType: 'npc', text: formatPersonForEmbedding(e, kb), turnNumber: currentTurn }));
    kb.discoveredYeuThu.forEach(e => metadataToVectorize.push({ entityId: e.id, entityType: 'yeuThu', text: formatYeuThuForEmbedding(e, kb), turnNumber: currentTurn }));
    kb.wives.forEach(e => metadataToVectorize.push({ entityId: e.id, entityType: 'wife', text: formatPersonForEmbedding(e, kb), turnNumber: currentTurn }));
    kb.slaves.forEach(e => metadataToVectorize.push({ entityId: e.id, entityType: 'slave', text: formatPersonForEmbedding(e, kb), turnNumber: currentTurn }));
    kb.prisoners.forEach(e => metadataToVectorize.push({ entityId: e.id, entityType: 'prisoner', text: formatPersonForEmbedding(e, kb), turnNumber: currentTurn }));
    kb.discoveredLocations.forEach(e => metadataToVectorize.push({ entityId: e.id, entityType: 'location', text: formatLocationForEmbedding(e, kb), turnNumber: currentTurn }));
    kb.worldLore.forEach(e => metadataToVectorize.push({ entityId: e.id, entityType: 'lore', text: formatLoreForEmbedding(e, kb), turnNumber: currentTurn }));
    kb.discoveredFactions.forEach(e => metadataToVectorize.push({ entityId: e.id, entityType: 'faction', text: formatFactionForEmbedding(e, kb), turnNumber: currentTurn }));
    if (kb.master) {
        metadataToVectorize.push({ entityId: kb.master.id, entityType: 'master', text: formatPersonForEmbedding(kb.master, kb), turnNumber: currentTurn });
    }

    if (metadataToVectorize.length === 0) {
        return { vectors: [], metadata: [] };
    }

    const textChunks = metadataToVectorize.map(m => m.text);
    const newVectors = await generateEmbeddings(textChunks);

    return {
        vectors: newVectors,
        metadata: metadataToVectorize
    };
};

export const extractEntityContextsFromString = (text: string, kb: KnowledgeBase): Set<string> => {
    const foundContexts = new Set<string>();
    const lowerText = text.toLowerCase();

    const checkAndAdd = (entity: { name?: string; title?: string, id: string }, type: 'item' | 'skill' | 'quest' | 'npc' | 'yeuThu' | 'wife' | 'slave' | 'prisoner' | 'location' | 'lore' | 'faction' | 'master') => {
        const name = 'name' in entity ? entity.name : ('title' in entity ? entity.title : '');
        if (name && lowerText.includes(name.toLowerCase())) {
            switch(type) {
                case 'item': foundContexts.add(formatItemForEmbedding(entity as Item, kb)); break;
                case 'skill': foundContexts.add(formatSkillForEmbedding(entity as Skill, kb)); break;
                case 'quest': foundContexts.add(formatQuestForEmbedding(entity as Quest, kb)); break;
                case 'npc': case 'wife': case 'slave': case 'prisoner': case 'master': foundContexts.add(formatPersonForEmbedding(entity as NPC | Wife | Slave | Prisoner | Master, kb)); break;
                case 'yeuThu': foundContexts.add(formatYeuThuForEmbedding(entity as YeuThu, kb)); break;
                case 'location': foundContexts.add(formatLocationForEmbedding(entity as GameLocation, kb)); break;
                case 'lore': foundContexts.add(formatLoreForEmbedding(entity as WorldLoreEntry, kb)); break;
                case 'faction': foundContexts.add(formatFactionForEmbedding(entity as Faction, kb)); break;
            }
        }
    };
    
    kb.inventory.forEach(e => checkAndAdd(e, 'item'));
    kb.playerSkills.forEach(e => checkAndAdd(e, 'skill'));
    kb.allQuests.filter(q => q.status === 'active').forEach(e => checkAndAdd(e, 'quest'));
    kb.discoveredNPCs.forEach(e => checkAndAdd(e, 'npc'));
    kb.discoveredYeuThu.forEach(e => checkAndAdd(e, 'yeuThu'));
    kb.wives.forEach(e => checkAndAdd(e, 'wife'));
    kb.slaves.forEach(e => checkAndAdd(e, 'slave'));
    kb.prisoners.forEach(e => checkAndAdd(e, 'prisoner'));
    kb.discoveredLocations.forEach(e => checkAndAdd(e, 'location'));
    kb.worldLore.forEach(e => checkAndAdd(e, 'lore'));
    kb.discoveredFactions.forEach(e => checkAndAdd(e, 'faction'));
    if (kb.master) {
        checkAndAdd(kb.master, 'master');
    }

    return foundContexts;
};