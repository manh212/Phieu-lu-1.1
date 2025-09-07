// FIX: Corrected import paths for types.
import { ParsedAiResponse, AiChoice, GeneratedWorldElements, StartingSkill, StartingItem, StartingNPC, StartingLore, StartingLocation, StartingFaction, GenreType, ViolenceLevel, StoryTone, NsfwDescriptionStyle, TuChatTier, WorldDate, CongPhapGrade, CongPhapType, LinhKiActivationType, LinhKiCategory, ProfessionGrade, ProfessionType, RaceCultivationSystem, StartingYeuThu } from '@/types/index';
import { AVAILABLE_GENRES, DEFAULT_NSFW_DESCRIPTION_STYLE, DEFAULT_VIOLENCE_LEVEL, DEFAULT_STORY_TONE } from '../constants';
import * as GameTemplates from '@/types/index';


const parseTagParams = (paramString: string): Record<string, string> => {
    const params: Record<string, string> = {};
    if (!paramString) return params;

    const parts: string[] = [];
    let quoteChar: "'" | '"' | null = null;
    let lastSplit = 0;
    let balance = 0; // for nested objects/arrays

    for (let i = 0; i < paramString.length; i++) {
        const char = paramString[i];

        if (quoteChar) {
            if (char === quoteChar && (i === 0 || paramString[i - 1] !== '\\')) {
                quoteChar = null;
            }
            continue;
        }

        if (char === "'" || char === '"') {
            quoteChar = char;
            continue;
        }

        if (char === '{' || char === '[') {
            balance++;
        } else if (char === '}' || char === ']') {
            balance--;
        }

        if (char === ',' && balance === 0) {
            parts.push(paramString.substring(lastSplit, i));
            lastSplit = i + 1;
        }
    }
    parts.push(paramString.substring(lastSplit));

    for (const part of parts) {
        if (!part.trim()) continue;
        
        const eqIndex = part.indexOf('=');
        if (eqIndex === -1) {
            console.warn(`Could not parse key-value pair from part: "${part}"`);
            continue;
        }

        const rawKey = part.substring(0, eqIndex).trim();
        // The fix is here: normalize the key by removing spaces
        const key = rawKey.replace(/\s+/g, '');
        let value = part.substring(eqIndex + 1).trim();
        
        const firstChar = value.charAt(0);
        const lastChar = value.charAt(value.length - 1);
        if ((firstChar === "'" && lastChar === "'") || (firstChar === '"' && lastChar === '"')) {
            value = value.substring(1, value.length - 1);
        }
        
        params[key] = value.replace(/\\"/g, '"').replace(/\\'/g, "'");
    }
    
    return params;
};

export const parseAiResponseText = (responseText: string | undefined): ParsedAiResponse => {
  let narration = responseText || '';
  const choices: AiChoice[] = [];
  const gameStateTags: string[] = [];
  let systemMessage: string | undefined;

  narration = narration
    .split('\n')
    .filter(line => !/^\s*`+\s*$/.test(line)) // Remove lines with only backticks
    .join('\n');

  narration = narration
    .split('\n')
    .filter(line => !/^\s*\*+\s*$/.test(line)) // Remove lines with only asterisks (often separators)
    .join('\n');

  narration = narration
    .split('\n')
    .filter(line => !/^\s*-{3,}\s*$/.test(line)) // Remove lines with only hyphens (often separators)
    .join('\n');

  const lines = narration.split('\n');
  const remainingLinesForNarration: string[] = [];

  for (const line of lines) {
    let currentLineForChoiceParsing = line.trim();
    let choiceContent: string | null = null;

    const wrapperMatch = currentLineForChoiceParsing.match(/^(?:\s*(`{1,3}|\*{2,})\s*)(.*?)(\s*\1\s*)$/);
    if (wrapperMatch && wrapperMatch[2] && wrapperMatch[2].toUpperCase().includes("[CHOICE:")) {
        currentLineForChoiceParsing = wrapperMatch[2].trim();
    }
    
    const choiceTagMatch = currentLineForChoiceParsing.match(/^(?:\[CHOICE:\s*)(.*?)(\]?)?$/i);

    if (choiceTagMatch && choiceTagMatch[1]) {
      choiceContent = choiceTagMatch[1].trim();
      choiceContent = choiceContent.replace(/(\s*(?:`{1,3}|\*{2,})\s*)$/, "").trim();
      choiceContent = choiceContent.replace(/^["']|["']$/g, '');
      choiceContent = choiceContent.replace(/\\'/g, "'");
      choiceContent = choiceContent.replace(/\\(?![btnfrv'"\\])/g, "");
      choices.push({ text: choiceContent });
    } else {
      remainingLinesForNarration.push(line);
    }
  }
  narration = remainingLinesForNarration.join('\n');
  
  const allTagsRegex = /\[(.*?)\]/g;
  const foundRawTags: {fullTag: string, content: string}[] = [];
  let tempMatch;
  
  while ((tempMatch = allTagsRegex.exec(narration)) !== null) {
      foundRawTags.push({fullTag: tempMatch[0], content: tempMatch[1].trim()});
  }

  for (const tagInfo of foundRawTags) {
    const { fullTag, content } = tagInfo; 
    
    if (narration.includes(fullTag)) {
        narration = narration.replace(fullTag, '');
    }

    const colonIndex = content.indexOf(':');
    const tagNamePart = (colonIndex === -1 ? content : content.substring(0, colonIndex)).trim().toUpperCase();
    const tagValuePart = colonIndex === -1 ? "" : content.substring(colonIndex + 1).trim();

    if (tagNamePart === 'MESSAGE') {
      try {
        systemMessage = tagValuePart.replace(/^["']|["']$/g, '');
      } catch (e) { /* silent */ }
    } else if (tagNamePart === 'CHOICE') {
      let choiceText = tagValuePart;
      choiceText = choiceText.replace(/(\s*(?:`{1,3}|\*{2,})\s*)$/, "").trim();
      choiceText = choiceText.replace(/^["']|["']$/g, '');
      choiceText = choiceText.replace(/\\'/g, "'");
      choiceText = choiceText.replace(/\\(?![btnfrv'"\\])/g, "");
      choices.push({ text: choiceText });
    } else if (!tagNamePart.startsWith('GENERATED_')) {
      gameStateTags.push(fullTag);
    }
  }

  narration = narration.replace(/\\/g, '');
  narration = narration.replace(/(?<!\w)`(?!\w)/g, '');
  narration = narration.replace(/(?<!\w)\*(?!\w)/g, '');


  narration = narration
    .split('\n')
    .filter(line => line.trim() !== '')
    .join('\n');
  narration = narration.replace(/\n\s*\n/g, '\n').trim();

  return { narration, choices, tags: gameStateTags, systemMessage };
};

export const parseGeneratedWorldDetails = (responseText: string | undefined): GeneratedWorldElements => {
  const GWD_SKILL = 'GENERATED_SKILL:';
  const GWD_ITEM = 'GENERATED_ITEM:';
  const GWD_NPC = 'GENERATED_NPC:';
  const GWD_YEUTHU = 'GENERATED_YEUTHU:';
  const GWD_LORE = 'GENERATED_LORE:';
  const GWD_LOCATION = 'GENERATED_LOCATION:';
  const GWD_FACTION = 'GENERATED_FACTION:';
  const GWD_PLAYER_NAME = 'GENERATED_PLAYER_NAME:';
  const GWD_PLAYER_GENDER = 'GENERATED_PLAYER_GENDER:';
  const GWD_PLAYER_RACE = 'GENERATED_PLAYER_RACE:';
  const GWD_PLAYER_PERSONALITY = 'GENERATED_PLAYER_PERSONALITY:';
  const GWD_PLAYER_BACKSTORY = 'GENERATED_PLAYER_BACKSTORY:';
  const GWD_PLAYER_GOAL = 'GENERATED_PLAYER_GOAL:';
  const GWD_PLAYER_STARTING_TRAITS = 'GENERATED_PLAYER_STARTING_TRAITS:';
  const GWD_PLAYER_AVATAR_URL = 'GENERATED_PLAYER_AVATAR_URL:'; 
  const GWD_WORLD_THEME = 'GENERATED_WORLD_THEME:';
  const GWD_WORLD_SETTING_DESCRIPTION = 'GENERATED_WORLD_SETTING_DESCRIPTION:';
  const GWD_WORLD_WRITING_STYLE = 'GENERATED_WORLD_WRITING_STYLE:';
  const GWD_CURRENCY_NAME = 'GENERATED_CURRENCY_NAME:';
  const GWD_ORIGINAL_STORY_SUMMARY = 'GENERATED_ORIGINAL_STORY_SUMMARY:';
  const GWD_RACE_SYSTEM = 'GENERATED_RACE_SYSTEM:'; // NEW
  const GWD_YEUTHU_SYSTEM = 'GENERATED_YEUTHU_SYSTEM:'; // NEW
  const GWD_HE_THONG_CANH_GIOI = 'GENERATED_HE_THONG_CANH_GIOI:'; // LEGACY, for backward compat if AI still sends it
  const GWD_CANH_GIOI_KHOI_DAU = 'GENERATED_CANH_GIOI_KHOI_DAU:';
  const GWD_GENRE = 'GENERATED_GENRE:';
  const GWD_CUSTOM_GENRE_NAME = 'GENERATED_CUSTOM_GENRE_NAME:'; 
  const GWD_IS_CULTIVATION_ENABLED = 'GENERATED_IS_CULTIVATION_ENABLED:';
  const GWD_NSFW_STYLE = 'GENERATED_NSFW_DESCRIPTION_STYLE:';
  const GWD_VIOLENCE_LEVEL = 'GENERATED_VIOLENCE_LEVEL:';
  const GWD_STORY_TONE = 'GENERATED_STORY_TONE:';
  const GWD_STARTING_DATE = 'GENERATED_STARTING_DATE:';
  const GWD_PLAYER_SPIRITUAL_ROOT = 'GENERATED_PLAYER_SPIRITUAL_ROOT:';
  const GWD_PLAYER_SPECIAL_PHYSIQUE = 'GENERATED_PLAYER_SPECIAL_PHYSIQUE:';
  const GWD_PLAYER_THO_NGUYEN = 'GENERATED_PLAYER_THO_NGUYEN:';
  const GWD_PLAYER_MAX_THO_NGUYEN = 'GENERATED_PLAYER_MAX_THO_NGUYEN:';
  const GWD_STARTING_CURRENCY = 'GENERATED_STARTING_CURRENCY:';


  const generated: GeneratedWorldElements = {
    startingSkills: [],
    startingItems: [],
    startingNPCs: [],
    startingLore: [],
    startingYeuThu: [],
    startingLocations: [],
    startingFactions: [],
    raceCultivationSystems: [], // NEW
    yeuThuRealmSystem: '', // NEW
    genre: AVAILABLE_GENRES[0], 
    isCultivationEnabled: true,
    nsfwDescriptionStyle: DEFAULT_NSFW_DESCRIPTION_STYLE,
    violenceLevel: DEFAULT_VIOLENCE_LEVEL, 
    storyTone: DEFAULT_STORY_TONE, 
  };

  let responseTextSafe = responseText || '';

  const originalStorySummaryRegex = /\[GENERATED_ORIGINAL_STORY_SUMMARY:\s*text\s*=\s*(?:"((?:\\.|[^"\\])*?)"|'((?:\\.|[^'\\])*?)')\s*\]/is;
  const originalStorySummaryMatch = responseTextSafe.match(originalStorySummaryRegex);

  if (originalStorySummaryMatch) {
    let summaryText = originalStorySummaryMatch[1] !== undefined ? originalStorySummaryMatch[1] : originalStorySummaryMatch[2];
    if (summaryText !== undefined) {
      generated.originalStorySummary = summaryText
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
    }
    responseTextSafe = responseTextSafe.replace(originalStorySummaryMatch[0], '');
  }


  const lines = responseTextSafe.split('\n');
  lines.forEach(line => {
    line = line.trim();
    if (line.startsWith(`[${GWD_SKILL}`)) {
        const content = line.substring(line.indexOf(GWD_SKILL) + GWD_SKILL.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        const name = params.name;
        if (!name) return;
        const description = params.description || "Kỹ năng do AI tạo, chưa có mô tả.";
        const skillType = params.skillType as GameTemplates.SkillTypeValues | undefined;
        
        const newSkill: StartingSkill = {
            name,
            description,
            skillType,
            baseDamage: params.baseDamage ? parseInt(params.baseDamage) : undefined,
            baseHealing: params.baseHealing ? parseInt(params.baseHealing) : undefined,
            damageMultiplier: params.damageMultiplier ? parseFloat(params.damageMultiplier) : undefined,
            healingMultiplier: params.healingMultiplier ? parseFloat(params.healingMultiplier) : undefined,
            manaCost: params.manaCost ? parseInt(params.manaCost) : undefined,
            cooldown: params.cooldown ? parseInt(params.cooldown) : undefined,
            specialEffects: params.otherEffects, // Map 'otherEffects' to 'specialEffects'
        };

        if (skillType === GameTemplates.SkillType.CONG_PHAP_TU_LUYEN) {
            newSkill.congPhapDetails = {
                type: params.congPhapType as CongPhapType | undefined,
                grade: params.congPhapGrade as CongPhapGrade | undefined,
                weaponFocus: params.weaponFocus,
            };
        } else if (skillType === GameTemplates.SkillType.LINH_KI) {
            newSkill.linhKiDetails = {
                category: params.linhKiCategory as LinhKiCategory | undefined,
                activation: params.linhKiActivation as LinhKiActivationType | undefined,
            };
        } else if (skillType === GameTemplates.SkillType.NGHE_NGHIEP) {
            newSkill.professionDetails = {
                type: params.professionType as ProfessionType | undefined,
                grade: params.professionGrade as ProfessionGrade | undefined,
                skillDescription: params.skillDescription,
            };
        } else if (skillType === GameTemplates.SkillType.CAM_THUAT) {
            newSkill.camThuatDetails = { sideEffects: params.sideEffects };
        }

        generated.startingSkills.push(newSkill);
    } else if (line.startsWith(`[${GWD_ITEM}`)) {
        const content = line.substring(line.indexOf(GWD_ITEM) + GWD_ITEM.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        const name = params.name;
        if (!name) return;

        const typeParts = params.type ? params.type.split(' ') : [];
        const category = (params.category || typeParts[0]) as GameTemplates.ItemCategoryValues;

        if (!Object.values(GameTemplates.ItemCategory).includes(category)) return;

        const newItem: StartingItem = {
            name: name,
            description: params.description || 'Vật phẩm do AI tạo, chưa có mô tả.',
            quantity: params.quantity ? parseInt(params.quantity) : 1,
            category: category,
            rarity: params.rarity as GameTemplates.EquipmentRarity | undefined,
            value: params.value ? parseInt(params.value) : undefined,
            itemRealm: params.itemRealm,
            aiPreliminaryType: params.type,
        };

        if (category === GameTemplates.ItemCategory.EQUIPMENT) {
            newItem.equipmentDetails = {
                type: (params.equipmentType || typeParts.slice(1).join(' ')) as GameTemplates.EquipmentTypeValues | undefined,
                slot: params.slot,
                statBonusesString: params.statBonusesJSON,
                uniqueEffectsString: params.uniqueEffectsList,
            };
        } else if (category === GameTemplates.ItemCategory.POTION) {
            newItem.potionDetails = {
                type: (params.potionType || typeParts.slice(1).join(' ')) as GameTemplates.PotionTypeValues | undefined,
                effectsString: params.effectsList,
                durationTurns: params.durationTurns ? parseInt(params.durationTurns) : undefined,
                cooldownTurns: params.cooldownTurns ? parseInt(params.cooldownTurns) : undefined,
            };
        } else if (category === GameTemplates.ItemCategory.MATERIAL) {
            newItem.materialDetails = {
                type: (params.materialType || typeParts.slice(1).join(' ')) as GameTemplates.MaterialTypeValues | undefined,
            };
        } else if (category === GameTemplates.ItemCategory.QUEST_ITEM) {
            newItem.questItemDetails = { questIdAssociated: params.questIdAssociated };
        } else if (category === GameTemplates.ItemCategory.CONG_PHAP) {
            newItem.congPhapDetails = {
                congPhapType: params.congPhapType as CongPhapType | undefined,
                expBonusPercentage: params.expBonusPercentage ? parseInt(params.expBonusPercentage) : undefined,
            };
        } else if (category === GameTemplates.ItemCategory.LINH_KI) {
            newItem.linhKiDetails = { skillToLearnJSON: params.skillToLearnJSON };
        } else if (category === GameTemplates.ItemCategory.PROFESSION_SKILL_BOOK) {
            newItem.professionSkillBookDetails = { professionToLearn: params.professionToLearn as ProfessionType | undefined };
        } else if (category === GameTemplates.ItemCategory.PROFESSION_TOOL) {
            newItem.professionToolDetails = { professionRequired: params.professionRequired as ProfessionType | undefined };
        }


        generated.startingItems.push(newItem);
    } else if (line.startsWith(`[${GWD_NPC}`)) {
        const content = line.substring(line.indexOf(GWD_NPC) + GWD_NPC.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (!params.name) return;
        
        let statsJSON: any = {};
        if (params.statsJSON) {
            try {
                // More robust parsing for potentially non-standard JSON from AI
                const jsonLikeString = params.statsJSON.replace(/(\w+)\s*:/g, '"$1":');
                statsJSON = JSON.parse(jsonLikeString);
            } catch (e) {
                console.error(`Could not parse statsJSON for NPC "${params.name}":`, params.statsJSON, e);
                statsJSON = {};
            }
        }
        
        const thoNguyenFromParams = params.thoNguyen ? parseInt(params.thoNguyen, 10) : undefined;
        const maxThoNguyenFromParams = params.maxThoNguyen ? parseInt(params.maxThoNguyen, 10) : undefined;
        
        generated.startingNPCs.push({
            name: params.name,
            personality: params.personality || '',
            initialAffinity: params.initialAffinity ? parseInt(params.initialAffinity) : 0,
            details: params.description || params.details || '',
            gender: params.gender as 'Nam' | 'Nữ' | 'Khác' | 'Không rõ' | undefined,
            race: params.race,
            // Fallback logic: check top-level param first, then check inside the parsed JSON
            realm: params.realm || statsJSON.realm,
            avatarUrl: params.avatarUrl,
            tuChat: (params.tuChat as TuChatTier | undefined) || statsJSON.tuChat,
            relationshipToPlayer: params.relationshipToPlayer,
            spiritualRoot: params.spiritualRoot || statsJSON.spiritualRoot,
            specialPhysique: params.specialPhysique || statsJSON.specialPhysique,
            thoNguyen: !isNaN(thoNguyenFromParams as number) ? thoNguyenFromParams : statsJSON.thoNguyen,
            maxThoNguyen: !isNaN(maxThoNguyenFromParams as number) ? maxThoNguyenFromParams : statsJSON.maxThoNguyen,
            longTermGoal: params.longTermGoal,
            shortTermGoal: params.shortTermGoal,
            locationName: params.locationName,
        });
    } else if (line.startsWith(`[${GWD_YEUTHU}`)) {
        const content = line.substring(line.indexOf(GWD_YEUTHU) + GWD_YEUTHU.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (!params.name) return;
        if (!generated.startingYeuThu) generated.startingYeuThu = [];
        generated.startingYeuThu.push({
            name: params.name,
            species: params.species || '',
            description: params.description || '',
            realm: params.realm,
            isHostile: params.isHostile ? params.isHostile.toLowerCase() === 'true' : true,
        });
    } else if (line.startsWith(`[${GWD_LORE}`)) {
        const content = line.substring(line.indexOf(GWD_LORE) + GWD_LORE.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (!params.title || !params.content) return;
        generated.startingLore.push({ title: params.title, content: params.content });
    } else if (line.startsWith(`[${GWD_LOCATION}`)) {
        const content = line.substring(line.indexOf(GWD_LOCATION) + GWD_LOCATION.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (!params.name) return;
        if (!generated.startingLocations) generated.startingLocations = [];
        generated.startingLocations.push({
            name: params.name,
            description: params.description || '',
            isSafeZone: params.isSafeZone ? params.isSafeZone.toLowerCase() === 'true' : false,
            regionId: params.regionId,
            mapX: params.mapX ? parseInt(params.mapX) : undefined,
            mapY: params.mapY ? parseInt(params.mapY) : undefined,
            locationType: params.locationType as GameTemplates.LocationTypeValues | undefined,
        });
    } else if (line.startsWith(`[${GWD_FACTION}`)) {
        const content = line.substring(line.indexOf(GWD_FACTION) + GWD_FACTION.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (!params.name) return;
        if (!generated.startingFactions) generated.startingFactions = [];
        generated.startingFactions.push({
            name: params.name,
            description: params.description || '',
            alignment: (params.alignment || 'Trung Lập') as GameTemplates.FactionAlignmentValues,
            initialPlayerReputation: params.initialPlayerReputation ? parseInt(params.initialPlayerReputation) : 0,
        });
    } else if (line.startsWith(`[${GWD_PLAYER_NAME}`)) {
        generated.playerName = line.substring(line.indexOf("name=") + 6, line.lastIndexOf('"'));
    } else if (line.startsWith(`[${GWD_PLAYER_GENDER}`)) {
        generated.playerGender = line.substring(line.indexOf("gender=") + 8, line.lastIndexOf('"')) as 'Nam' | 'Nữ' | 'Khác';
    } else if (line.startsWith(`[${GWD_PLAYER_RACE}`)) {
        generated.playerRace = line.substring(line.indexOf("text=") + 6, line.lastIndexOf('"'));
    } else if (line.startsWith(`[${GWD_PLAYER_PERSONALITY}`)) {
        generated.playerPersonality = line.substring(line.indexOf("text=") + 6, line.lastIndexOf('"'));
    } else if (line.startsWith(`[${GWD_PLAYER_BACKSTORY}`)) {
        generated.playerBackstory = line.substring(line.indexOf("text=") + 6, line.lastIndexOf('"'));
    } else if (line.startsWith(`[${GWD_PLAYER_GOAL}`)) {
        generated.playerGoal = line.substring(line.indexOf("text=") + 6, line.lastIndexOf('"'));
    } else if (line.startsWith(`[${GWD_PLAYER_STARTING_TRAITS}`)) {
        generated.playerStartingTraits = line.substring(line.indexOf("text=") + 6, line.lastIndexOf('"'));
    } else if (line.startsWith(`[${GWD_PLAYER_AVATAR_URL}`)) {
        generated.playerAvatarUrl = line.substring(line.indexOf("url=") + 5, line.lastIndexOf('"'));
    } else if (line.startsWith(`[${GWD_WORLD_THEME}`)) {
        generated.theme = line.substring(line.indexOf("text=") + 6, line.lastIndexOf('"'));
    } else if (line.startsWith(`[${GWD_WORLD_SETTING_DESCRIPTION}`)) {
        generated.settingDescription = line.substring(line.indexOf("text=") + 6, line.lastIndexOf('"'));
    } else if (line.startsWith(`[${GWD_WORLD_WRITING_STYLE}`)) {
        generated.writingStyle = line.substring(line.indexOf("text=") + 6, line.lastIndexOf('"'));
    } else if (line.startsWith(`[${GWD_CURRENCY_NAME}`)) {
        generated.currencyName = line.substring(line.indexOf("name=") + 6, line.lastIndexOf('"'));
    } else if (line.startsWith(`[${GWD_RACE_SYSTEM}`)) {
        const params = parseTagParams(line.substring(line.indexOf(GWD_RACE_SYSTEM) + GWD_RACE_SYSTEM.length, line.lastIndexOf(']')).trim());
        if (params.race && params.system) {
            generated.raceCultivationSystems?.push({ id: `sys-${params.race}-${Date.now()}`, raceName: params.race, realmSystem: params.system });
        }
    } else if (line.startsWith(`[${GWD_YEUTHU_SYSTEM}`)) {
        generated.yeuThuRealmSystem = line.substring(line.indexOf("system=") + 8, line.lastIndexOf('"'));
    } else if (line.startsWith(`[${GWD_HE_THONG_CANH_GIOI}`)) { // Legacy support
         const system = line.substring(line.indexOf("text=") + 6, line.lastIndexOf('"'));
         if(generated.raceCultivationSystems?.length === 0){
             generated.raceCultivationSystems.push({id: `sys-legacy-human-${Date.now()}`, raceName: 'Nhân Tộc', realmSystem: system});
         }
    } else if (line.startsWith(`[${GWD_CANH_GIOI_KHOI_DAU}`)) {
        generated.canhGioiKhoiDau = line.substring(line.indexOf("text=") + 6, line.lastIndexOf('"'));
    } else if (line.startsWith(`[${GWD_GENRE}`)) {
        generated.genre = line.substring(line.indexOf("text=") + 6, line.lastIndexOf('"')) as GenreType;
    } else if (line.startsWith(`[${GWD_CUSTOM_GENRE_NAME}`)) {
        generated.customGenreName = line.substring(line.indexOf("text=") + 6, line.lastIndexOf('"'));
    } else if (line.startsWith(`[${GWD_IS_CULTIVATION_ENABLED}`)) {
        const value = line.substring(line.indexOf("value=") + 7, line.lastIndexOf(']')).trim();
        generated.isCultivationEnabled = value.toLowerCase() === 'true';
    } else if (line.startsWith(`[${GWD_NSFW_STYLE}`)) {
        generated.nsfwDescriptionStyle = line.substring(line.indexOf("text=") + 6, line.lastIndexOf('"')) as NsfwDescriptionStyle;
    } else if (line.startsWith(`[${GWD_VIOLENCE_LEVEL}`)) {
        generated.violenceLevel = line.substring(line.indexOf("text=") + 6, line.lastIndexOf('"')) as ViolenceLevel;
    } else if (line.startsWith(`[${GWD_STORY_TONE}`)) {
        generated.storyTone = line.substring(line.indexOf("text=") + 6, line.lastIndexOf('"')) as StoryTone;
    } else if (line.startsWith(`[${GWD_STARTING_DATE}`)) {
        const params = parseTagParams(line.substring(line.indexOf(GWD_STARTING_DATE) + GWD_STARTING_DATE.length, line.lastIndexOf(']')).trim());
        const date: WorldDate = {
            day: params.day ? parseInt(params.day, 10) : 1,
            month: params.month ? parseInt(params.month, 10) : 1,
            year: params.year ? parseInt(params.year, 10) : 1,
            hour: 8, // Default to morning
            minute: 0,
        };
        if (params.hour && !isNaN(parseInt(params.hour, 10))) date.hour = parseInt(params.hour, 10);
        if (params.minute && !isNaN(parseInt(params.minute, 10))) date.minute = parseInt(params.minute, 10);

        if (params.buoi) {
            switch(params.buoi as any) { // Use 'any' as Buoi type is removed
                case 'Sáng Sớm': date.hour = 6; date.minute = 0; break;
                case 'Buổi Sáng': date.hour = 8; date.minute = 0; break;
                case 'Buổi Trưa': date.hour = 12; date.minute = 0; break;
                case 'Buổi Chiều': date.hour = 15; date.minute = 0; break;
                case 'Hoàng Hôn': date.hour = 18; date.minute = 0; break;
                case 'Buổi Tối': date.hour = 20; date.minute = 0; break;
                case 'Nửa Đêm': date.hour = 0; date.minute = 0; break;
            }
        }
        generated.startingDate = date;
    } else if (line.startsWith(`[${GWD_PLAYER_SPIRITUAL_ROOT}`)) {
        generated.playerSpiritualRoot = line.substring(line.indexOf("text=") + 6, line.lastIndexOf('"'));
    } else if (line.startsWith(`[${GWD_PLAYER_SPECIAL_PHYSIQUE}`)) {
        generated.playerSpecialPhysique = line.substring(line.indexOf("text=") + 6, line.lastIndexOf('"'));
    } else if (line.startsWith(`[${GWD_PLAYER_THO_NGUYEN}`)) {
        generated.playerThoNguyen = parseInt(line.substring(line.indexOf("value=") + 7, line.lastIndexOf(']')).trim());
    } else if (line.startsWith(`[${GWD_PLAYER_MAX_THO_NGUYEN}`)) {
        generated.playerMaxThoNguyen = parseInt(line.substring(line.indexOf("value=") + 7, line.lastIndexOf(']')).trim());
    } else if (line.startsWith(`[${GWD_STARTING_CURRENCY}`)) {
        generated.startingCurrency = parseInt(line.substring(line.indexOf("value=") + 7, line.lastIndexOf(']')).trim());
    }
  });

  return generated;
};