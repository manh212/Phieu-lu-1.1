// src/utils/setupTagProcessor.ts
import { WorldSettings, StartingNPC, StartingItem, StartingSkill, StartingLore, StartingLocation, StartingFaction, StartingYeuThu, RaceCultivationSystem, TuChatTier } from '../types';
import { parseTagValue } from './parseTagValue';
import { TU_CHAT_TIERS } from '../constants';

/**
 * Processes a batch of AI-generated SETUP tags to modify the WorldSettings object.
 * @param currentSettings The current WorldSettings state.
 * @param tags An array of tag strings (e.g., "[SETUP_ADD_NPC: ...]").
 * @returns A new, updated WorldSettings object.
 */
export const processSetupTags = (currentSettings: WorldSettings, tags: string[]): WorldSettings => {
    // 1. Create a deep copy to avoid mutating the original state.
    let newSettings = JSON.parse(JSON.stringify(currentSettings));

    // A whitelist of fields that can be updated by SETUP_UPDATE_SETTING for security.
    const allowedFieldsToUpdate: (keyof WorldSettings)[] = [
        'theme', 'settingDescription', 'writingStyle', 'difficulty', 'currencyName',
        'playerName', 'playerGender', 'playerRace', 'playerPersonality', 'playerBackstory',
        'playerGoal', 'playerStartingTraits', 'playerSpiritualRoot', 'playerSpecialPhysique',
        'playerThoNguyen', 'playerMaxThoNguyen', 'startingCurrency', 'nsfwMode',
        'nsfwDescriptionStyle', 'customNsfwPrompt', 'violenceLevel', 'storyTone',
        'genre', 'customGenreName', 'isCultivationEnabled', 'yeuThuRealmSystem',
        'canhGioiKhoiDau', 'playerAvatarUrl', 'writingStyleGuide'
    ];

    // 2. Loop through each tag.
    for (const tag of tags) {
        const match = tag.match(/\[(.*?):(.*)\]/s);
        if (!match) continue;

        const tagName = match[1].trim().toUpperCase();
        const params = parseTagValue(match[2].trim());
        
        try {
            // 3. Process based on the tag name.
            switch (tagName) {
                // --- NPC HANDLING ---
                case 'SETUP_ADD_NPC':
                    const newNpc: StartingNPC = {
                        id: `npc-${Date.now()}-${Math.random()}`,
                        name: params.name || 'NPC Mới',
                        personality: params.personality || '',
                        initialAffinity: parseInt(params.initialAffinity, 10) || 0,
                        details: params.details || '',
                        gender: params.gender as any || 'Không rõ',
                        race: params.race || 'Nhân Tộc',
                        realm: params.realm,
                        tuChat: params.tuChat as any,
                        relationshipToPlayer: params.relationshipToPlayer,
                        spiritualRoot: params.spiritualRoot,
                        specialPhysique: params.specialPhysique,
                        thoNguyen: params.thoNguyen ? parseInt(params.thoNguyen, 10) : undefined,
                        maxThoNguyen: params.maxThoNguyen ? parseInt(params.maxThoNguyen, 10) : undefined,
                        longTermGoal: params.longTermGoal,
                        shortTermGoal: params.shortTermGoal,
                        locationName: params.locationName,
                    };
                    if (!newSettings.startingNPCs) newSettings.startingNPCs = [];
                    newSettings.startingNPCs.push(newNpc);
                    break;
                case 'SETUP_EDIT_NPC':
                    if (!params.id) break;
                    const npcIndex = newSettings.startingNPCs.findIndex((npc: StartingNPC) => npc.id === params.id);
                    if (npcIndex > -1) {
                         const npcToUpdate = newSettings.startingNPCs[npcIndex];
                        Object.keys(params).forEach(key => {
                            if (key === 'id') return; // Skip the id field itself

                            const valueStr = params[key];
                            const typedKey = key as keyof StartingNPC;
                            
                            if (typedKey === 'initialAffinity' || typedKey === 'thoNguyen' || typedKey === 'maxThoNguyen') {
                                const numValue = parseInt(valueStr, 10);
                                if (!isNaN(numValue)) {
                                    (npcToUpdate as any)[typedKey] = numValue;
                                }
                            } else {
                                (npcToUpdate as any)[typedKey] = valueStr;
                            }
                        });
                    }
                    break;
                case 'SETUP_DELETE_NPC':
                    if (!params.id) break;
                    newSettings.startingNPCs = newSettings.startingNPCs.filter((npc: StartingNPC) => npc.id !== params.id);
                    break;

                // --- ITEM, SKILL, etc. HANDLING (can be added similarly) ---
                case 'SETUP_ADD_ITEM':
                    const newItem: StartingItem = {
                        id: `item-${Date.now()}-${Math.random()}`,
                        name: params.name || 'Vật phẩm mới',
                        description: params.description || '',
                        quantity: parseInt(params.quantity, 10) || 1,
                        category: params.category as any,
                        value: params.value ? parseInt(params.value, 10) : undefined,
                    };
                    if (!newSettings.startingItems) newSettings.startingItems = [];
                    newSettings.startingItems.push(newItem);
                    break;
                case 'SETUP_EDIT_ITEM':
                    if (!params.id) break;
                    const itemIndex = newSettings.startingItems.findIndex((item: StartingItem) => item.id === params.id);
                    if (itemIndex > -1) {
                        const itemToUpdate = newSettings.startingItems[itemIndex];
                        Object.keys(params).forEach(key => {
                            if (key === 'id') return;

                            const valueStr = params[key];
                            const typedKey = key as keyof StartingItem;

                            if (typedKey === 'quantity' || typedKey === 'value') {
                                const numValue = parseInt(valueStr, 10);
                                if (!isNaN(numValue)) {
                                    (itemToUpdate as any)[typedKey] = numValue;
                                }
                            } else {
                                 (itemToUpdate as any)[typedKey] = valueStr;
                            }
                        });
                    }
                    break;
                case 'SETUP_DELETE_ITEM':
                    if (!params.id) break;
                    newSettings.startingItems = newSettings.startingItems.filter((item: StartingItem) => item.id !== params.id);
                    break;

                // --- SINGLE SETTING HANDLING ---
                case 'SETUP_UPDATE_SETTING':
                    const field = params.field as keyof WorldSettings;
                    let value: any = params.value;
                    
                    if (field && value !== undefined && allowedFieldsToUpdate.includes(field)) {
                        // Coerce boolean values from strings
                        if (typeof (newSettings as any)[field] === 'boolean') {
                            value = (value.toLowerCase() === 'true');
                        }
                        // Coerce numeric values from strings
                        else if (typeof (newSettings as any)[field] === 'number') {
                            const num = Number(value);
                            if (!isNaN(num)) {
                                value = num;
                            } else {
                                console.warn(`SETUP_UPDATE_SETTING: Invalid number value "${value}" for field "${field}". Skipping.`);
                                break; // Skip this update if number conversion fails
                            }
                        }
                        
                        (newSettings as any)[field] = value;
                    } else {
                        console.warn(`SETUP_UPDATE_SETTING: Attempted to update a non-whitelisted or invalid field: "${field}" value="${value}". Skipping.`);
                    }
                    break;
                
                // Add other ADD/EDIT/DELETE cases for skills, lore, etc. as needed.
            }
        } catch (error) {
            console.error(`Error processing tag: ${tag}. Error:`, error);
            // Continue to the next tag even if one fails.
        }
    }
    
    // 4. Return the newly modified settings object.
    return newSettings;
};
