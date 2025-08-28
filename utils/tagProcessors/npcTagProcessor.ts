

import { KnowledgeBase, GameMessage, NPC, PlayerStats, ApiConfig, TuChatTier, ItemCategoryValues, VectorMetadata, GameLocation, ActivityLogEntry } from '../../types';
import { NPCTemplate } from '../../templates';
import { ALL_FACTION_ALIGNMENTS, VIETNAMESE, DEFAULT_MORTAL_STATS, FEMALE_AVATAR_BASE_URL, MAX_FEMALE_AVATAR_INDEX, MALE_AVATAR_PLACEHOLDER_URL, TU_CHAT_TIERS } from '../../constants';
import * as GameTemplates from '../../templates';
import { calculateRealmBaseStats } from '../statsCalculationUtils';
import { getApiSettings, generateImageUnified } from '../../services/geminiService';
import { uploadImageToCloudinary } from '../../services/cloudinaryService';
import { diceCoefficient, normalizeStringForComparison, normalizeLocationName } from '../questUtils';
import { formatPersonForEmbedding } from '../ragUtils';
import { getDeterministicAvatarSrc } from '../avatarUtils';

const SIMILARITY_THRESHOLD = 0.8;

const findNpcByName = (npcs: NPC[], name: string): { npc: NPC, index: number } | null => {
    if (!name) return null;
    let bestMatch = { npc: null as NPC | null, index: -1, score: 0 };
    const normalizedName = normalizeStringForComparison(name);

    npcs.forEach((npc, index) => {
        const score = diceCoefficient(normalizedName, normalizeStringForComparison(npc.name));
        if (score > bestMatch.score) {
            bestMatch = { npc, index, score };
        }
    });

    if (bestMatch.npc && bestMatch.score >= SIMILARITY_THRESHOLD) {
        return bestMatch;
    }

    if(bestMatch.npc) {
        console.warn(`NPC_FIND: NPC matching "${name}" found, but similarity score ${bestMatch.score.toFixed(2)} is below threshold ${SIMILARITY_THRESHOLD}. Best match: "${bestMatch.npc.name}"`);
    } else {
        console.warn(`NPC_FIND: NPC matching "${name}" not found.`);
    }

    return null;
}

const resolveNpcLocationId = (
    locationNameOrIdFromTag: string | undefined,
    currentKb: KnowledgeBase,
    turnForSystemMessages: number
): { resolvedLocationId: string | undefined; newKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    if (!locationNameOrIdFromTag || !locationNameOrIdFromTag.trim()) {
        return { resolvedLocationId: undefined, newKb: currentKb, systemMessages: [] };
    }

    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];

    // 1. Direct ID Match
    const directMatch = newKb.discoveredLocations.find(l => l.id === locationNameOrIdFromTag);
    if (directMatch) {
        return { resolvedLocationId: directMatch.id, newKb, systemMessages };
    }

    // 2. Exact Name Match (case-insensitive, normalized)
    const normalizedNameFromTag = normalizeLocationName(locationNameOrIdFromTag);
    const exactNameMatch = newKb.discoveredLocations.find(l => normalizeLocationName(l.name) === normalizedNameFromTag);
    if (exactNameMatch) {
        return { resolvedLocationId: exactNameMatch.id, newKb, systemMessages };
    }

    // 3. Fuzzy Name Match
    let bestFuzzyMatch = { location: null as GameLocation | null, score: 0 };
    newKb.discoveredLocations.forEach(location => {
        const score = diceCoefficient(normalizedNameFromTag, normalizeStringForComparison(location.name));
        if (score > bestFuzzyMatch.score) {
            bestFuzzyMatch = { location, score };
        }
    });

    if (bestFuzzyMatch.location && bestFuzzyMatch.score >= 0.9) { // High threshold to be sure
        systemMessages.push({
            id: `npc-location-fuzzy-match-${Date.now()}`,
            type: 'system',
            content: `[DEBUG] Vị trí "${locationNameOrIdFromTag}" được AI cung cấp đã được khớp với vị trí đã biết "${bestFuzzyMatch.location.name}" (độ tương đồng: ${(bestFuzzyMatch.score * 100).toFixed(0)}%).`,
            timestamp: Date.now(),
            turnNumber: turnForSystemMessages
        });
        return { resolvedLocationId: bestFuzzyMatch.location.id, newKb, systemMessages };
    }

    // 4. Create new placeholder location
    const newLocationName = locationNameOrIdFromTag.trim();
    
    if (bestFuzzyMatch.location && bestFuzzyMatch.score > 0.8) {
         console.warn(`Creating new location "${newLocationName}" despite a close fuzzy match "${bestFuzzyMatch.location.name}" with score ${bestFuzzyMatch.score}. This might create a duplicate.`);
    }

    const newLocation: GameLocation = {
        id: `loc-${newLocationName.replace(/\s+/g, '-')}-${Date.now()}`,
        name: newLocationName,
        description: `Một địa điểm bạn vừa nghe nói đến, có liên quan đến một nhân vật. Chi tiết về nơi này vẫn còn là một bí ẩn.`,
        isSafeZone: false,
        visited: false,
        locationType: GameTemplates.LocationType.LANDMARK,
    };
    
    newKb.discoveredLocations.push(newLocation);
    
    systemMessages.push({
        id: `location-discovered-via-npc-${newLocation.id}`,
        type: 'system',
        content: `Bạn vừa nghe nói về một địa điểm mới: ${newLocation.name}.`,
        timestamp: Date.now(),
        turnNumber: turnForSystemMessages
    });

    return { resolvedLocationId: newLocation.id, newKb, systemMessages };
};


export const processNpc = async (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number,
    setKnowledgeBaseDirectly: React.Dispatch<React.SetStateAction<KnowledgeBase>>,
    logNpcAvatarPromptCallback?: (prompt: string) => void
): Promise<{ updatedKb: KnowledgeBase; systemMessages: GameMessage[]; newVectorMetadata?: VectorMetadata; }> => {
    let newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    let newVectorMetadata: VectorMetadata | undefined = undefined;

    const npcName = tagParams.name;
    const gender = tagParams.gender as NPC['gender'] || 'Không rõ';
    const race = tagParams.race;
    const description = tagParams.description;
    const personality = tagParams.personality;
    const affinity = parseInt(tagParams.affinity || "0", 10);
    const factionId = tagParams.factionId;
    let npcRealm = tagParams.realm;

    if (npcRealm && race && newKb.worldConfig?.isCultivationEnabled) {
        const raceSystem = newKb.worldConfig.raceCultivationSystems.find(rs => rs.raceName === race);
        const progressionSystem = raceSystem?.realmSystem;

        if (progressionSystem) {
            const characterRealmProgression = progressionSystem.split(' - ').map(s => s.trim()).filter(Boolean);
            if (characterRealmProgression.length > 0) {
                const sortedRealms = [...characterRealmProgression].sort((a, b) => b.length - a.length);
                const lowerNpcRealm = npcRealm.toLowerCase();

                for (const majorRealm of sortedRealms) {
                    const index = lowerNpcRealm.indexOf(majorRealm.toLowerCase());
                    if (index !== -1) {
                        const cleanedRealm = npcRealm.substring(index);
                        if (cleanedRealm) {
                            console.log(`[NPC REALM NORMALIZE] Cleaned realm from "${npcRealm}" to "${cleanedRealm}" based on major realm "${majorRealm}".`);
                            npcRealm = cleanedRealm;
                        }
                        break;
                    }
                }
            }
        }
    }
    
    const tuChat = tagParams.tuChat as TuChatTier;
    const relationshipToPlayer = tagParams.relationshipToPlayer;
    const statsJSON = tagParams.statsJSON;
    const baseStatOverridesJSON = tagParams.baseStatOverridesJSON;
    let aiSuggestedAvatarUrl = tagParams.avatarUrl; 
    const spiritualRoot = tagParams.spiritualRoot;
    const specialPhysique = tagParams.specialPhysique;
    const vendorType = tagParams.vendorType as NPCTemplate['vendorType'];
    const vendorSlogan = tagParams.vendorSlogan;
    const vendorBuysCategoriesStr = tagParams.vendorBuysCategories;
    const legacyHp = parseInt(tagParams.hp || "0", 10);
    const legacyAtk = parseInt(tagParams.atk || "0", 10);

    if (!npcName) {
        console.warn("NPC: Missing NPC name.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }

    let finalLocationId: string | undefined;

    if (tagParams.locationId) {
        const directMatch = newKb.discoveredLocations.find(l => l.id === tagParams.locationId);
        if (directMatch) {
            finalLocationId = directMatch.id;
        } else {
            console.warn(`NPC tag specified locationId "${tagParams.locationId}" but it was not found.`);
        }
    } else if (tagParams.locationName) {
        const { resolvedLocationId, newKb: kbAfterLocationResolve, systemMessages: locationSystemMessages } = resolveNpcLocationId(
            tagParams.locationName,
            newKb,
            turnForSystemMessages
        );
        newKb = kbAfterLocationResolve;
        systemMessages.push(...locationSystemMessages);
        finalLocationId = resolvedLocationId;
    }

    if (!finalLocationId) {
        finalLocationId = newKb.currentLocationId;
    }


    const existingNpcIndex = newKb.discoveredNPCs.findIndex(n => n.name === npcName);
    let npcToProcess: NPC;
    let isNewNpc = false;

    if (existingNpcIndex > -1) {
        isNewNpc = false;
        npcToProcess = newKb.discoveredNPCs[existingNpcIndex];
        if (description) npcToProcess.description = description;
        if (personality) npcToProcess.personalityTraits = personality.split(',').map(p => p.trim());
        if (!isNaN(affinity)) npcToProcess.affinity = affinity;
        if (factionId) npcToProcess.factionId = factionId;
        if (gender) npcToProcess.gender = gender;
        if (race) npcToProcess.race = race;
        if (npcRealm) npcToProcess.realm = npcRealm;
        if (relationshipToPlayer) npcToProcess.relationshipToPlayer = relationshipToPlayer;
        if (aiSuggestedAvatarUrl) npcToProcess.avatarUrl = aiSuggestedAvatarUrl;
        if (tuChat && TU_CHAT_TIERS.includes(tuChat)) npcToProcess.tuChat = tuChat;
        if (spiritualRoot) npcToProcess.spiritualRoot = spiritualRoot;
        if (specialPhysique) npcToProcess.specialPhysique = specialPhysique;
        if (finalLocationId) npcToProcess.locationId = finalLocationId;

        if (vendorType) npcToProcess.vendorType = vendorType;
        if (vendorSlogan) npcToProcess.vendorSlogan = vendorSlogan;
        if (vendorBuysCategoriesStr) {
            const categoriesArray = vendorBuysCategoriesStr.split(',').map(c => c.trim());
            npcToProcess.vendorBuysCategories = categoriesArray.filter(c => Object.values(GameTemplates.ItemCategory).includes(c as any)) as ItemCategoryValues[];
        }

        systemMessages.push({
            id: 'npc-info-updated-' + Date.now(), type: 'system',
            content: `Thông tin NPC ${npcName} đã được cập nhật.`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
    } else {
        isNewNpc = true;

        let vendorBuysCategories: ItemCategoryValues[] | undefined = undefined;
        if (vendorBuysCategoriesStr) {
            const categoriesArray = vendorBuysCategoriesStr.split(',').map(c => c.trim());
            vendorBuysCategories = categoriesArray.filter(c => Object.values(GameTemplates.ItemCategory).includes(c as any)) as ItemCategoryValues[];
        }
        
        npcToProcess = {
            id: `npc-${npcName.replace(/\s+/g, '-')}-${Date.now()}`,
            name: npcName,
            gender: gender,
            race: race || 'Nhân Tộc',
            description: description || "Không có mô tả.",
            personalityTraits: personality ? personality.split(',').map(p => p.trim()) : [],
            affinity: isNaN(affinity) ? 0 : affinity,
            factionId: factionId || undefined,
            relationshipToPlayer: relationshipToPlayer || undefined,
            realm: npcRealm || (newKb.worldConfig?.isCultivationEnabled ? (newKb.playerStats.realm || VIETNAMESE.mortalRealmName) : VIETNAMESE.mortalRealmName),
            tuChat: TU_CHAT_TIERS.includes(tuChat) ? tuChat : undefined,
            spiritualRoot: spiritualRoot || "Không rõ",
            specialPhysique: specialPhysique || "Không rõ",
            stats: {}, 
            baseStatOverrides: {},
            avatarUrl: aiSuggestedAvatarUrl || undefined,
            locationId: finalLocationId || undefined,
            vendorType: vendorType || undefined,
            vendorSlogan: vendorSlogan || undefined,
            vendorBuysCategories: vendorBuysCategories,
            mood: 'Bình Thường',
            needs: {},
            longTermGoal: tagParams.longTermGoal || "Sống một cuộc đời bình an.",
            shortTermGoal: tagParams.shortTermGoal || "Hoàn thành công việc trong ngày.",
            currentPlan: [],
            relationships: {},
            lastTickTurn: 0,
            tickPriorityScore: 0,
            activityLog: [],
        };
        
        if (npcToProcess.vendorType) {
            npcToProcess.lastRestockYear = newKb.worldDate.year;
        }

        newKb.discoveredNPCs.push(npcToProcess);
        newVectorMetadata = { entityId: npcToProcess.id, entityType: 'npc', text: formatPersonForEmbedding(npcToProcess, newKb), turnNumber: turnForSystemMessages };

        systemMessages.push({
            id: 'npc-discovered-' + Date.now(), type: 'system',
            content: `Bạn đã gặp NPC mới: ${npcName}.`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
    }
    
    // First, ensure there's always a placeholder if no URL is provided by AI or user
    if (!npcToProcess.avatarUrl) { 
         npcToProcess.avatarUrl = getDeterministicAvatarSrc(npcToProcess);
    }
   
    const isPlaceholderAvatar = npcToProcess.avatarUrl.startsWith(MALE_AVATAR_PLACEHOLDER_URL) || npcToProcess.avatarUrl.startsWith(FEMALE_AVATAR_BASE_URL);
    const apiSettings = getApiSettings();
    const npcIdToUpdate = npcToProcess.id; 

    // Now, check if we should trigger AI generation
    if (apiSettings.autoGenerateNpcAvatars && (isNewNpc || isPlaceholderAvatar)) {
        systemMessages.push({
            id: `npc-avatar-generating-${npcIdToUpdate}`, type: 'system',
            content: `Đang tạo ảnh đại diện AI cho NPC ${npcName}...`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
        
        (async () => {
          let cloudinaryUrl: string | undefined;
          let avatarError: Error | undefined;
          let avatarPromptForGeneration = "";
          try {
            avatarPromptForGeneration = `Một bức chân dung chi tiết của NPC tên ${npcToProcess.name}, `;
            if (npcToProcess.gender && npcToProcess.gender !== 'Không rõ') avatarPromptForGeneration += `giới tính ${npcToProcess.gender}, `;
            if (npcToProcess.personalityTraits && npcToProcess.personalityTraits.length > 0) avatarPromptForGeneration += `tính cách ${npcToProcess.personalityTraits.join(', ')}, `;
            avatarPromptForGeneration += `trong thế giới ${newKb.worldConfig?.theme || 'fantasy'}. ${npcToProcess.description || ''} Phong cách: cinematic portrait, fantasy art, high detail.`;
            
            if(logNpcAvatarPromptCallback) {
                logNpcAvatarPromptCallback(avatarPromptForGeneration);
            }
            const rawBase64ImageData = await generateImageUnified(avatarPromptForGeneration); 
            
            if (rawBase64ImageData) {
                let cloudinaryUploadType: 'npc_male' | 'npc_female';
                if (npcToProcess.gender === 'Nữ') {
                    cloudinaryUploadType = 'npc_female';
                } else { 
                    cloudinaryUploadType = 'npc_male';
                }
                cloudinaryUrl = await uploadImageToCloudinary(rawBase64ImageData, cloudinaryUploadType, `npc_${npcIdToUpdate}`);
            }
          } catch (err) {
            avatarError = err instanceof Error ? err : new Error(String(err));
            console.error(`Async avatar generation for NPC ${npcIdToUpdate} failed:`, avatarError);
          } finally {
            setKnowledgeBaseDirectly(prevKb => {
                const newKbState = JSON.parse(JSON.stringify(prevKb));
                const targetNpc = newKbState.discoveredNPCs.find((n: NPC) => n.id === npcIdToUpdate);
                if (targetNpc) {
                    targetNpc.avatarUrl = cloudinaryUrl || getDeterministicAvatarSrc(targetNpc);
                }
                return newKbState;
            });
          }
        })();
    }

    let calculatedBaseStats: Partial<PlayerStats> = {};
    if (npcToProcess.realm && newKb.worldConfig?.isCultivationEnabled) {
        const npcRace = npcToProcess.race || 'Nhân Tộc';
        const raceSystemForNpc = newKb.worldConfig.raceCultivationSystems.find(rs => rs.raceName === npcRace) 
                                 || newKb.worldConfig.raceCultivationSystems[0];
        
        const npcRealmProgression = raceSystemForNpc?.realmSystem.split(' - ').map(s => s.trim()).filter(Boolean) || newKb.realmProgressionList;

        calculatedBaseStats = calculateRealmBaseStats(
            npcToProcess.realm,
            npcRealmProgression, 
            newKb.currentRealmBaseStats 
        );
    } else { 
        calculatedBaseStats = {
            baseMaxSinhLuc: DEFAULT_MORTAL_STATS.baseMaxSinhLuc,
            baseMaxLinhLuc: DEFAULT_MORTAL_STATS.baseMaxLinhLuc,
            baseSucTanCong: DEFAULT_MORTAL_STATS.baseSucTanCong,
            baseMaxKinhNghiem: DEFAULT_MORTAL_STATS.baseMaxKinhNghiem,
        };
    }
    
    if (baseStatOverridesJSON) {
        try {
            const overrides = JSON.parse(baseStatOverridesJSON) as NPCTemplate['baseStatOverrides'];
            if (overrides) {
                npcToProcess.baseStatOverrides = overrides; 
                calculatedBaseStats = { ...calculatedBaseStats, ...overrides };
            }
        } catch (e) {
            console.warn(`NPC (${npcName}): Could not parse baseStatOverridesJSON: ${baseStatOverridesJSON}`, e);
        }
    }
    
    if (!npcToProcess.stats) npcToProcess.stats = {};
    npcToProcess.stats.baseMaxSinhLuc = calculatedBaseStats.baseMaxSinhLuc;
    npcToProcess.stats.baseMaxLinhLuc = calculatedBaseStats.baseMaxLinhLuc;
    npcToProcess.stats.baseSucTanCong = calculatedBaseStats.baseSucTanCong;
    npcToProcess.stats.baseMaxKinhNghiem = calculatedBaseStats.baseMaxKinhNghiem;

    npcToProcess.stats.maxSinhLuc = calculatedBaseStats.baseMaxSinhLuc;
    npcToProcess.stats.maxLinhLuc = calculatedBaseStats.baseMaxLinhLuc;
    npcToProcess.stats.sucTanCong = calculatedBaseStats.baseSucTanCong;
    npcToProcess.stats.maxKinhNghiem = calculatedBaseStats.baseMaxKinhNghiem;
    
    npcToProcess.stats.sinhLuc = calculatedBaseStats.baseMaxSinhLuc; 
    npcToProcess.stats.linhLuc = calculatedBaseStats.baseMaxLinhLuc; 
    npcToProcess.stats.kinhNghiem = 0;

    if (npcToProcess.realm && npcToProcess.realm !== VIETNAMESE.mortalRealmName) {
        if (npcToProcess.stats.maxThoNguyen === undefined) npcToProcess.stats.maxThoNguyen = 120;
        if (npcToProcess.stats.thoNguyen === undefined) npcToProcess.stats.thoNguyen = npcToProcess.stats.maxThoNguyen;
    } else {
        if (npcToProcess.stats.maxThoNguyen === undefined) npcToProcess.stats.maxThoNguyen = 80;
        if (npcToProcess.stats.thoNguyen === undefined) npcToProcess.stats.thoNguyen = npcToProcess.stats.maxThoNguyen;
    }


    if (statsJSON) {
        try {
            const specificStats = JSON.parse(statsJSON) as Partial<PlayerStats>;
            npcToProcess.stats = { ...npcToProcess.stats, ...specificStats };
        } catch (e) {
            console.warn(`NPC (${npcName}): Could not parse statsJSON: ${statsJSON}`, e);
        }
    } else if (!npcToProcess.realm && (legacyHp > 0 || legacyAtk > 0)) {
        if (legacyHp > 0) {
            npcToProcess.stats.maxSinhLuc = legacyHp;
            npcToProcess.stats.sinhLuc = legacyHp;
        }
        if (legacyAtk > 0) {
            npcToProcess.stats.sucTanCong = legacyAtk;
        }
    }
    
    if (npcToProcess.stats.sinhLuc !== undefined && npcToProcess.stats.maxSinhLuc !== undefined) {
        npcToProcess.stats.sinhLuc = Math.max(0, Math.min(npcToProcess.stats.sinhLuc, npcToProcess.stats.maxSinhLuc));
    }
    if (npcToProcess.stats.linhLuc !== undefined && npcToProcess.stats.maxLinhLuc !== undefined) {
        npcToProcess.stats.linhLuc = Math.max(0, Math.min(npcToProcess.stats.linhLuc, npcToProcess.stats.maxLinhLuc));
    }

    return { updatedKb: newKb, systemMessages, newVectorMetadata };
};

export const processNpcUpdate = async (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number,
    setKnowledgeBaseDirectly: React.Dispatch<React.SetStateAction<KnowledgeBase>>,
    logNpcAvatarPromptCallback?: (prompt: string) => void 
): Promise<{ updatedKb: KnowledgeBase; systemMessages: GameMessage[]; updatedVectorMetadata?: VectorMetadata }> => {
    let newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const npcName = tagParams.name;
    let updatedVectorMetadata: VectorMetadata | undefined = undefined;

    if (!npcName) {
        console.warn("NPC_UPDATE: Missing NPC name.", tagParams);
        return { updatedKb: newKb, systemMessages, updatedVectorMetadata: undefined };
    }

    const foundMatch = findNpcByName(newKb.discoveredNPCs, npcName);
    if (foundMatch) {
        const { index: npcIndex } = foundMatch;
        const npcToUpdate = newKb.discoveredNPCs[npcIndex];
        const npcIdToUpdate = npcToUpdate.id; 
        if (!npcToUpdate.stats) npcToUpdate.stats = {}; 
        let updatedFieldsCount = 0;
        let realmUpdated = false;
        let detailsChangedForAvatar = false;
        
        const effectiveRace = tagParams.race || npcToUpdate.race;
        if (tagParams.race && npcToUpdate.race !== tagParams.race) {
            npcToUpdate.race = tagParams.race;
            updatedFieldsCount++;
            detailsChangedForAvatar = true;
        }

        if (tagParams.realm !== undefined) {
            let newRealm = tagParams.realm.trim();
            if (newRealm) {
                if (effectiveRace && newKb.worldConfig?.isCultivationEnabled) {
                    const raceSystem = newKb.worldConfig.raceCultivationSystems.find(rs => rs.raceName === effectiveRace);
                    const progressionSystem = raceSystem?.realmSystem;
                    
                    if (progressionSystem) {
                        const characterRealmProgression = progressionSystem.split(' - ').map(s => s.trim()).filter(Boolean);
                        if (characterRealmProgression.length > 0) {
                            const sortedRealms = [...characterRealmProgression].sort((a, b) => b.length - a.length);
                            const lowerNewRealm = newRealm.toLowerCase();
                            
                            for (const majorRealm of sortedRealms) {
                                const index = lowerNewRealm.indexOf(majorRealm.toLowerCase());
                                if (index !== -1) {
                                    const cleanedRealm = newRealm.substring(index);
                                    if (cleanedRealm) {
                                        newRealm = cleanedRealm;
                                    }
                                    break; 
                                }
                            }
                        }
                    }
                }
        
                if (newRealm && npcToUpdate.realm !== newRealm) {
                    npcToUpdate.realm = newRealm;
                    realmUpdated = true;
                    updatedFieldsCount++;
                    detailsChangedForAvatar = true;
                }
            } else {
                console.warn(`NPC_UPDATE: Received empty realm for NPC "${npcName}". Ignoring update.`);
            }
        }
        if (tagParams.newName && tagParams.newName !== npcName) {
            npcToUpdate.name = tagParams.newName;
            updatedFieldsCount++;
            detailsChangedForAvatar = true;
        }
        if (tagParams.gender && npcToUpdate.gender !== tagParams.gender) {
            npcToUpdate.gender = tagParams.gender as NPC['gender'];
            updatedFieldsCount++;
            detailsChangedForAvatar = true;
        }
        if (tagParams.description && npcToUpdate.description !== tagParams.description) {
            npcToUpdate.description = tagParams.description;
            updatedFieldsCount++;
            detailsChangedForAvatar = true;
        }
        if (tagParams.personality) {
            const newPersonality = tagParams.personality.split(',').map(p => p.trim());
            if (JSON.stringify(npcToUpdate.personalityTraits) !== JSON.stringify(newPersonality)) {
                npcToUpdate.personalityTraits = newPersonality;
                updatedFieldsCount++;
                detailsChangedForAvatar = true;
            }
        }
        if (tagParams.affinity) {
            const affinityStr = tagParams.affinity.trim();
            const currentAffinity = npcToUpdate.affinity || 0;
            let newAffinity: number | null = null;
        
            if (affinityStr.startsWith('=')) {
                const value = parseInt(affinityStr.substring(1), 10);
                if (!isNaN(value)) newAffinity = value;
            } else {
                let valueToParse = affinityStr;
                if (valueToParse.includes('=')) valueToParse = valueToParse.replace('=', '');
                const change = parseInt(valueToParse, 10);
                if (!isNaN(change)) newAffinity = currentAffinity + change;
            }
        
            if (newAffinity !== null && newAffinity !== currentAffinity) {
                npcToUpdate.affinity = Math.max(-100, Math.min(100, newAffinity));
                updatedFieldsCount++;
                if (!npcToUpdate.activityLog) npcToUpdate.activityLog = [];
                const logEntry: ActivityLogEntry = {
                    turnNumber: turnForSystemMessages,
                    description: `Đã có tương tác với ${newKb.worldConfig?.playerName || 'người chơi'} khiến thiện cảm thay đổi.`,
                    locationId: npcToUpdate.locationId || newKb.currentLocationId || 'unknown'
                };
                npcToUpdate.activityLog.push(logEntry);
                if (npcToUpdate.activityLog.length > 30) npcToUpdate.activityLog.shift();
            } else if (newAffinity === null) {
                 console.warn(`NPC_UPDATE: Invalid affinity value "${affinityStr}" for NPC "${npcName}".`);
            }
        }
        if (tagParams.currency) { // NEW: Handle currency update
            const currencyStr = tagParams.currency.trim();
            const currentCurrency = npcToUpdate.stats?.currency || 0;
            let newCurrency: number | null = null;
            if (currencyStr.startsWith('+=')) {
                const change = parseInt(currencyStr.substring(2), 10);
                if (!isNaN(change)) newCurrency = currentCurrency + change;
            } else if (currencyStr.startsWith('-=')) {
                const change = parseInt(currencyStr.substring(2), 10);
                if (!isNaN(change)) newCurrency = currentCurrency - change;
            }
             if (newCurrency !== null && newCurrency !== currentCurrency) {
                if (!npcToUpdate.stats) npcToUpdate.stats = {};
                npcToUpdate.stats.currency = Math.max(0, newCurrency);
                updatedFieldsCount++;
            }
        }
        if (tagParams.factionId) {
            npcToUpdate.factionId = tagParams.factionId;
            updatedFieldsCount++;
        }
        if (tagParams.locationId) {
            const { resolvedLocationId, newKb: kbAfterLocationResolve, systemMessages: locationSystemMessages } = resolveNpcLocationId(
                tagParams.locationId,
                newKb,
                turnForSystemMessages
            );
            newKb = kbAfterLocationResolve;
            systemMessages.push(...locationSystemMessages);
            npcToUpdate.locationId = resolvedLocationId;
            updatedFieldsCount++;
        }
        if (tagParams.relationshipToPlayer) {
            npcToUpdate.relationshipToPlayer = tagParams.relationshipToPlayer;
            updatedFieldsCount++;
        }
        if (tagParams.tuChat) {
            const newTuChat = tagParams.tuChat as TuChatTier;
            if (TU_CHAT_TIERS.includes(newTuChat) && npcToUpdate.tuChat !== newTuChat) {
                npcToUpdate.tuChat = newTuChat;
                updatedFieldsCount++;
                detailsChangedForAvatar = true; 
            }
        }
        if (tagParams.spiritualRoot && npcToUpdate.spiritualRoot !== tagParams.spiritualRoot) {
            npcToUpdate.spiritualRoot = tagParams.spiritualRoot;
            updatedFieldsCount++;
            detailsChangedForAvatar = true;
        }
        if (tagParams.specialPhysique && npcToUpdate.specialPhysique !== tagParams.specialPhysique) {
            npcToUpdate.specialPhysique = tagParams.specialPhysique;
            updatedFieldsCount++;
            detailsChangedForAvatar = true;
        }
        if (tagParams.avatarUrl && npcToUpdate.avatarUrl !== tagParams.avatarUrl) { 
            npcToUpdate.avatarUrl = tagParams.avatarUrl; 
            updatedFieldsCount++;
        }
        if (tagParams.statsJSON) {
            try {
                const specificStats = JSON.parse(tagParams.statsJSON) as Partial<PlayerStats>;
                npcToUpdate.stats = { ...npcToUpdate.stats, ...specificStats };
                updatedFieldsCount++;
            } catch (e) { console.warn(`NPC_UPDATE (${npcName}): Could not parse statsJSON: ${tagParams.statsJSON}`, e); }
        }
        if (tagParams.baseStatOverridesJSON) {
            try {
                const overrides = JSON.parse(tagParams.baseStatOverridesJSON) as NPCTemplate['baseStatOverrides'];
                if (overrides) {
                    npcToUpdate.baseStatOverrides = overrides;
                    realmUpdated = true; 
                    updatedFieldsCount++;
                }
            } catch (e) { console.warn(`NPC_UPDATE (${npcName}): Could not parse baseStatOverridesJSON: ${tagParams.baseStatOverridesJSON}`, e); }
        }
        if (tagParams.vendorType) {
            npcToUpdate.vendorType = tagParams.vendorType as any;
            updatedFieldsCount++;
        }
        if (tagParams.vendorSlogan) {
            npcToUpdate.vendorSlogan = tagParams.vendorSlogan;
            updatedFieldsCount++;
        }
        if (tagParams.vendorBuysCategories) {
            const categoriesArray = tagParams.vendorBuysCategories.split(',').map(c => c.trim());
            npcToUpdate.vendorBuysCategories = categoriesArray.filter(c => Object.values(GameTemplates.ItemCategory).includes(c as any)) as ItemCategoryValues[];
            updatedFieldsCount++;
        }
        if (tagParams.mood) { npcToUpdate.mood = tagParams.mood as NPC['mood']; updatedFieldsCount++; }
        if (tagParams.shortTermGoal) { npcToUpdate.shortTermGoal = tagParams.shortTermGoal; updatedFieldsCount++; }
        if (tagParams.longTermGoal) { npcToUpdate.longTermGoal = tagParams.longTermGoal; updatedFieldsCount++; }
        if (tagParams.currentPlan) { npcToUpdate.currentPlan = tagParams.currentPlan.split(';').map(s => s.trim()).filter(Boolean); updatedFieldsCount++; }
        
        if(realmUpdated && npcToUpdate.realm && newKb.worldConfig?.isCultivationEnabled){
            const npcRace = npcToUpdate.race || 'Nhân Tộc';
            const raceSystemForNpc = newKb.worldConfig.raceCultivationSystems.find(rs => rs.raceName === npcRace) 
                                     || newKb.worldConfig.raceCultivationSystems[0];
            
            const npcRealmProgression = raceSystemForNpc?.realmSystem.split(' - ').map(s => s.trim()).filter(Boolean) || newKb.realmProgressionList;
    
            const baseStats = calculateRealmBaseStats(npcToUpdate.realm, npcRealmProgression, newKb.currentRealmBaseStats);
            npcToUpdate.stats = { ...npcToUpdate.stats, ...baseStats, ...(npcToUpdate.baseStatOverrides || {}) };
            npcToUpdate.stats.sinhLuc = npcToUpdate.stats.maxSinhLuc; 
            npcToUpdate.stats.linhLuc = npcToUpdate.stats.maxLinhLuc;
        }
        
        if (npcToUpdate.stats!.sinhLuc !== undefined && npcToUpdate.stats!.maxSinhLuc !== undefined) {
            npcToUpdate.stats!.sinhLuc = Math.max(0, Math.min(npcToUpdate.stats!.sinhLuc, npcToUpdate.stats!.maxSinhLuc));
        }
        if (npcToUpdate.stats!.linhLuc !== undefined && npcToUpdate.stats!.maxLinhLuc !== undefined) {
            npcToUpdate.stats!.linhLuc = Math.max(0, Math.min(npcToUpdate.stats!.linhLuc, npcToUpdate.stats!.maxLinhLuc));
        }

        const isPlaceholderAvatar = !npcToUpdate.avatarUrl || npcToUpdate.avatarUrl.startsWith(MALE_AVATAR_PLACEHOLDER_URL) || npcToUpdate.avatarUrl.startsWith(FEMALE_AVATAR_BASE_URL);
        const apiSettings = getApiSettings();

        if (apiSettings.autoGenerateNpcAvatars && detailsChangedForAvatar && isPlaceholderAvatar) {
            systemMessages.push({
                id: `npc-avatar-regenerating-${npcIdToUpdate}`, type: 'system',
                content: `Đang tạo lại ảnh đại diện AI cho NPC ${npcToUpdate.name} do thông tin thay đổi...`,
                timestamp: Date.now(), turnNumber: turnForSystemMessages
            });

            (async () => {
              let cloudinaryUrl: string | undefined;
              let avatarError: Error | undefined;
              let avatarPromptForGeneration = "";
              try {
                avatarPromptForGeneration = `Một bức chân dung chi tiết của NPC tên ${npcToUpdate.name}, `;
                if (npcToUpdate.gender && npcToUpdate.gender !== 'Không rõ') avatarPromptForGeneration += `giới tính ${npcToUpdate.gender}, `;
                if (npcToUpdate.personalityTraits && npcToUpdate.personalityTraits.length > 0) avatarPromptForGeneration += `tính cách ${npcToUpdate.personalityTraits.join(', ')}, `;
                avatarPromptForGeneration += `trong thế giới ${newKb.worldConfig?.theme || 'fantasy'}. ${npcToUpdate.description || ''} Phong cách: cinematic portrait, fantasy art, high detail.`;
                
                if(logNpcAvatarPromptCallback) {
                    logNpcAvatarPromptCallback(avatarPromptForGeneration);
                }
                const rawBase64ImageData = await generateImageUnified(avatarPromptForGeneration); 
                if (rawBase64ImageData) {
                    let cloudinaryUploadType: 'npc_male' | 'npc_female';
                    if (npcToUpdate.gender === 'Nữ') {
                        cloudinaryUploadType = 'npc_female';
                    } else { 
                        cloudinaryUploadType = 'npc_male';
                    }
                    cloudinaryUrl = await uploadImageToCloudinary(rawBase64ImageData, cloudinaryUploadType, `npc_${npcIdToUpdate}_updated`);
                }
              } catch (err) {
                 avatarError = err instanceof Error ? err : new Error(String(err));
                 console.error(`Async avatar regeneration for NPC ${npcIdToUpdate} failed:`, avatarError);
              } finally {
                  setKnowledgeBaseDirectly(prevKb => {
                    const newKbState = JSON.parse(JSON.stringify(prevKb));
                    const targetNpc = newKbState.discoveredNPCs.find((n: NPC) => n.id === npcIdToUpdate);
                    if (targetNpc) {
                        targetNpc.avatarUrl = cloudinaryUrl || getDeterministicAvatarSrc(targetNpc);
                    }
                    return newKbState;
                });
              }
            })();
        }
        
        if (updatedFieldsCount > 0) {
            systemMessages.push({
                id: 'npc-updated-' + npcToUpdate.id,
                type: 'system',
                content: `Thông tin về NPC ${npcName} đã được cập nhật.`,
                timestamp: Date.now(),
                turnNumber: turnForSystemMessages
            });
             updatedVectorMetadata = {
                entityId: npcToUpdate.id,
                entityType: 'npc',
                text: formatPersonForEmbedding(npcToUpdate, newKb),
                turnNumber: turnForSystemMessages
            };
        }
    } else {
        console.warn(`NPC_UPDATE: NPC "${npcName}" not found.`);
    }

    return { updatedKb: newKb, systemMessages, updatedVectorMetadata };
};

export const processNpcRemove = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const name = tagParams.name;

    if (!name) {
        console.warn("NPC_REMOVE: Missing name.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }

    const foundMatch = findNpcByName(newKb.discoveredNPCs, name);
    if (foundMatch) {
        newKb.discoveredNPCs.splice(foundMatch.index, 1);
        systemMessages.push({
            id: `npc-removed-${foundMatch.npc.name.replace(/\s+/g, '-')}`,
            type: 'system',
            content: `NPC ${foundMatch.npc.name} đã chết hoặc biến mất vĩnh viễn.`,
            timestamp: Date.now(),
            turnNumber: turnForSystemMessages
        });
    } else {
        console.warn(`NPC_REMOVE: NPC "${name}" not found.`);
    }

    return { updatedKb: newKb, systemMessages };
};