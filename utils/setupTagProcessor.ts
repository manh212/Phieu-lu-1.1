// src/utils/setupTagProcessor.ts
import { WorldSettings, StartingNPC, StartingItem, StartingSkill, StartingLore, StartingLocation, StartingFaction, StartingYeuThu, RaceCultivationSystem, TuChatTier } from '../types';
import { parseTagValue } from './parseTagValue';
import { TU_CHAT_TIERS } from '../constants';
import * as GameTemplates from '../templates';

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

                // --- ITEM HANDLING ---
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
                
                // --- SKILL HANDLING ---
                case 'SETUP_ADD_SKILL':
                    const newSkill: StartingSkill = {
                        id: `skill-${Date.now()}-${Math.random()}`,
                        name: params.name || 'Kỹ năng mới',
                        description: params.description || '',
                        skillType: Object.values(GameTemplates.SkillType).includes(params.skillType as any) 
                            ? params.skillType as GameTemplates.SkillTypeValues 
                            : GameTemplates.SkillType.LINH_KI, // Default for combat-like skills
                        baseDamage: params.baseDamage ? parseInt(params.baseDamage, 10) : undefined,
                        baseHealing: params.healingAmount ? parseInt(params.healingAmount, 10) : undefined,
                        damageMultiplier: params.damageMultiplier ? parseFloat(params.damageMultiplier) : undefined,
                        manaCost: params.manaCost ? parseInt(params.manaCost, 10) : undefined,
                        cooldown: params.cooldown ? parseInt(params.cooldown, 10) : undefined,
                        specialEffects: params.uniqueEffectsList || params.specialEffects,
                    };
                    if (!newSettings.startingSkills) newSettings.startingSkills = [];
                    newSettings.startingSkills.push(newSkill);
                    break;
                case 'SETUP_EDIT_SKILL':
                    if (!params.id) break;
                    const skillIndex = newSettings.startingSkills.findIndex((skill: StartingSkill) => skill.id === params.id);
                    if (skillIndex > -1) {
                        const skillToUpdate = newSettings.startingSkills[skillIndex];
                        Object.keys(params).forEach(key => {
                            if (key === 'id') return;

                            const valueStr = params[key];
                            const typedKey = key as keyof StartingSkill;
                            
                            if (['baseDamage', 'baseHealing', 'damageMultiplier', 'healingMultiplier', 'manaCost', 'cooldown'].includes(key)) {
                                const numValue = parseFloat(valueStr);
                                if (!isNaN(numValue)) {
                                    (skillToUpdate as any)[typedKey] = numValue;
                                }
                            } else if (key === 'uniqueEffectsList') { // Map AI's potential name to the correct field
                                skillToUpdate.specialEffects = valueStr;
                            }
                            else {
                                (skillToUpdate as any)[typedKey] = valueStr;
                            }
                        });
                    }
                    break;
                case 'SETUP_DELETE_SKILL':
                    if (!params.id) break;
                    newSettings.startingSkills = newSettings.startingSkills.filter((skill: StartingSkill) => skill.id !== params.id);
                    break;

                // --- YEU THU HANDLING ---
                case 'SETUP_ADD_YEUTHU':
                    const newYeuThu: StartingYeuThu = {
                        id: `yeuthu-${Date.now()}-${Math.random()}`,
                        name: params.name || 'Yêu Thú Mới',
                        species: params.species || 'Chưa rõ loài',
                        description: params.description || '',
                        realm: params.realm,
                        isHostile: params.isHostile ? params.isHostile.toLowerCase() === 'true' : true,
                    };
                    if (!newSettings.startingYeuThu) newSettings.startingYeuThu = [];
                    newSettings.startingYeuThu.push(newYeuThu);
                    break;
                case 'SETUP_EDIT_YEUTHU':
                    if (!params.id) break;
                    const yeuThuIndex = newSettings.startingYeuThu.findIndex((yt: StartingYeuThu) => yt.id === params.id);
                    if (yeuThuIndex > -1) {
                        const yeuThuToUpdate = newSettings.startingYeuThu[yeuThuIndex];
                        Object.keys(params).forEach(key => {
                            if (key === 'id') return;
                            const valueStr = params[key];
                            if (key === 'isHostile') {
                                yeuThuToUpdate.isHostile = valueStr.toLowerCase() === 'true';
                            } else {
                                (yeuThuToUpdate as any)[key] = valueStr;
                            }
                        });
                    }
                    break;
                case 'SETUP_DELETE_YEUTHU':
                    if (!params.id) break;
                    newSettings.startingYeuThu = newSettings.startingYeuThu.filter((yt: StartingYeuThu) => yt.id !== params.id);
                    break;

                // --- LORE HANDLING ---
                case 'SETUP_ADD_LORE':
                    const newLore: StartingLore = {
                        id: `lore-${Date.now()}-${Math.random()}`,
                        title: params.title || 'Tri Thức Mới',
                        content: params.content || '',
                    };
                    if (!newSettings.startingLore) newSettings.startingLore = [];
                    newSettings.startingLore.push(newLore);
                    break;
                case 'SETUP_EDIT_LORE':
                    if (!params.id) break;
                    const loreIndex = newSettings.startingLore.findIndex((l: StartingLore) => l.id === params.id);
                    if (loreIndex > -1) {
                        const loreToUpdate = newSettings.startingLore[loreIndex];
                        if (params.title) loreToUpdate.title = params.title;
                        if (params.content) loreToUpdate.content = params.content;
                    }
                    break;
                case 'SETUP_DELETE_LORE':
                    if (!params.id) break;
                    newSettings.startingLore = newSettings.startingLore.filter((l: StartingLore) => l.id !== params.id);
                    break;
                
                // --- LOCATION HANDLING ---
                case 'SETUP_ADD_LOCATION':
                    const newLocation: StartingLocation = {
                        id: `location-${Date.now()}-${Math.random()}`,
                        name: params.name || 'Địa Điểm Mới',
                        description: params.description || '',
                        isSafeZone: params.isSafeZone ? params.isSafeZone.toLowerCase() === 'true' : false,
                        regionId: params.regionId,
                        mapX: params.mapX ? parseInt(params.mapX, 10) : undefined,
                        mapY: params.mapY ? parseInt(params.mapY, 10) : undefined,
                        locationType: params.locationType as any,
                    };
                    if (!newSettings.startingLocations) newSettings.startingLocations = [];
                    newSettings.startingLocations.push(newLocation);
                    break;
                case 'SETUP_EDIT_LOCATION':
                    if (!params.id) break;
                    const locIndex = newSettings.startingLocations.findIndex((l: StartingLocation) => l.id === params.id);
                    if (locIndex > -1) {
                         const locToUpdate = newSettings.startingLocations[locIndex];
                        Object.keys(params).forEach(key => {
                            if (key === 'id') return;
                            const valueStr = params[key];
                             if (key === 'isSafeZone') {
                                (locToUpdate as any)[key] = valueStr.toLowerCase() === 'true';
                            } else if (key === 'mapX' || key === 'mapY') {
                                const numValue = parseInt(valueStr, 10);
                                if (!isNaN(numValue)) (locToUpdate as any)[key] = numValue;
                            } else {
                                (locToUpdate as any)[key] = valueStr;
                            }
                        });
                    }
                    break;
                case 'SETUP_DELETE_LOCATION':
                    if (!params.id) break;
                    newSettings.startingLocations = newSettings.startingLocations.filter((l: StartingLocation) => l.id !== params.id);
                    break;
                
                // --- FACTION HANDLING ---
                case 'SETUP_ADD_FACTION':
                    const newFaction: StartingFaction = {
                        id: `faction-${Date.now()}-${Math.random()}`,
                        name: params.name || 'Phe Phái Mới',
                        description: params.description || '',
                        alignment: params.alignment as any || 'Trung Lập',
                        initialPlayerReputation: parseInt(params.initialPlayerReputation, 10) || 0,
                    };
                    if (!newSettings.startingFactions) newSettings.startingFactions = [];
                    newSettings.startingFactions.push(newFaction);
                    break;
                case 'SETUP_EDIT_FACTION':
                     if (!params.id) break;
                    const factionIndex = newSettings.startingFactions.findIndex((f: StartingFaction) => f.id === params.id);
                    if (factionIndex > -1) {
                         const factionToUpdate = newSettings.startingFactions[factionIndex];
                        Object.keys(params).forEach(key => {
                            if (key === 'id') return;
                            const valueStr = params[key];
                            if (key === 'initialPlayerReputation') {
                                const numValue = parseInt(valueStr, 10);
                                if (!isNaN(numValue)) factionToUpdate.initialPlayerReputation = numValue;
                            } else {
                                (factionToUpdate as any)[key] = valueStr;
                            }
                        });
                    }
                    break;
                case 'SETUP_DELETE_FACTION':
                    if (!params.id) break;
                    newSettings.startingFactions = newSettings.startingFactions.filter((f: StartingFaction) => f.id !== params.id);
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
                
                // Add other ADD/EDIT/DELETE cases for lore, etc. as needed.
            }
        } catch (error) {
            console.error(`Error processing tag: ${tag}. Error:`, error);
            // Continue to the next tag even if one fails.
        }
    }
    
    // 4. Return the newly modified settings object.
    return newSettings;
};
