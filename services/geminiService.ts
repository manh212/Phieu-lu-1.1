

import { GoogleGenAI, GenerateContentResponse, HarmCategory, HarmBlockThreshold, CountTokensResponse, Type } from "@google/genai";
import { KnowledgeBase, ParsedAiResponse, AiChoice, WorldSettings, ApiConfig, SafetySetting, PlayerActionInputType, ResponseLength, StartingSkill, StartingItem, StartingNPC, StartingLore, GameMessage, GeneratedWorldElements, StartingLocation, StartingFaction, PlayerStats, Item as ItemType, GenreType, ViolenceLevel, StoryTone, NsfwDescriptionStyle, TuChatTier, TU_CHAT_TIERS, AuctionItem, GameLocation, AuctionState, WorldDate, CongPhapGrade, CongPhapType, LinhKiActivationType, LinhKiCategory, ProfessionGrade, ProfessionType, FindLocationParams, NPC, Skill, Prisoner, Wife, Slave, CombatEndPayload, RaceCultivationSystem, StartingYeuThu, AuctionSlave, WorldTickUpdate } from '../types'; 
import { PROMPT_FUNCTIONS } from '../prompts';
import { VIETNAMESE, API_SETTINGS_STORAGE_KEY, DEFAULT_MODEL_ID, HARM_CATEGORIES, DEFAULT_API_CONFIG, MAX_TOKENS_FANFIC, ALL_FACTION_ALIGNMENTS, AVAILABLE_GENRES, CUSTOM_GENRE_VALUE, AVAILABLE_MODELS, DEFAULT_VIOLENCE_LEVEL, DEFAULT_STORY_TONE, DEFAULT_NSFW_DESCRIPTION_STYLE, AVAILABLE_AVATAR_ENGINES, DEFAULT_AVATAR_GENERATION_ENGINE } from '../constants';
import * as GameTemplates from '../templates';
import { incrementApiCallCount } from '../utils/apiUsageTracker';

// Rate Limiting constants and state
const RATE_LIMIT_MODEL_ID = 'gemini-2.5-flash';
const MAX_REQUESTS_PER_MINUTE = 5;
const TIME_WINDOW_MS = 60 * 1000; // 1 minute
let requestTimestamps: number[] = [];

let ai: GoogleGenAI | null = null;
let lastUsedEffectiveApiKey: string | null = null;
let lastUsedApiKeySource: 'system' | 'user' | null = null;
let lastUsedModelForClient: string | null = null;
let currentApiKeyIndex = 0; // for round-robin

// New type for parsed combat response
export interface ParsedCombatResponse {
  narration: string;
  choices: AiChoice[];
  statUpdates: Array<{ targetId: string; stat: keyof PlayerStats; change: number }>;
  combatEnd: 'victory' | 'defeat' | 'escaped' | 'surrendered' | null;
  tags: string[]; // Added tags for post-combat processing
}


export const getApiSettings = (): ApiConfig => {
  const storedSettings = localStorage.getItem(API_SETTINGS_STORAGE_KEY);
  if (storedSettings) {
    try {
      const parsed = JSON.parse(storedSettings);

      const validSafetySettings =
        parsed.safetySettings &&
        Array.isArray(parsed.safetySettings) &&
        parsed.safetySettings.length === HARM_CATEGORIES.length &&
        parsed.safetySettings.every((setting: any) =>
          typeof setting.category === 'string' &&
          typeof setting.threshold === 'string' &&
          HARM_CATEGORIES.some(cat => cat.id === setting.category)
        );
      
      const modelExists = AVAILABLE_MODELS.some(m => m.id === parsed.model);
      const avatarEngineExists = AVAILABLE_AVATAR_ENGINES.some(e => e.id === parsed.avatarGenerationEngine);
      const ragTopKIsValid = typeof parsed.ragTopK === 'number' && parsed.ragTopK >= 0 && parsed.ragTopK <= 100;

      // Handle user API keys with backward compatibility
      let userApiKeys: string[] = [''];
      if (parsed.userApiKeys && Array.isArray(parsed.userApiKeys) && parsed.userApiKeys.length > 0) {
        userApiKeys = parsed.userApiKeys;
      } else if (parsed.userApiKey && typeof parsed.userApiKey === 'string' && parsed.userApiKey.trim() !== '') {
        // Legacy support for old string-based userApiKey
        userApiKeys = [parsed.userApiKey];
      }

      return {
        apiKeySource: parsed.apiKeySource || DEFAULT_API_CONFIG.apiKeySource,
        userApiKeys: userApiKeys,
        model: modelExists ? parsed.model : DEFAULT_API_CONFIG.model,
        economyModel: parsed.economyModel || (modelExists ? parsed.model : DEFAULT_API_CONFIG.model),
        safetySettings: validSafetySettings ? parsed.safetySettings : DEFAULT_API_CONFIG.safetySettings,
        autoGenerateNpcAvatars: parsed.autoGenerateNpcAvatars === undefined ? DEFAULT_API_CONFIG.autoGenerateNpcAvatars : parsed.autoGenerateNpcAvatars,
        avatarGenerationEngine: avatarEngineExists ? parsed.avatarGenerationEngine : DEFAULT_API_CONFIG.avatarGenerationEngine,
        ragTopK: ragTopKIsValid ? parsed.ragTopK : DEFAULT_API_CONFIG.ragTopK,
      };
    } catch (e) {
      console.error("Failed to parse API settings from localStorage, using defaults:", e);
    }
  }
  return { ...DEFAULT_API_CONFIG }; 
};

const getAiClient = (): GoogleGenAI => {
  const settings = getApiSettings();
  let effectiveApiKey: string;

  if (settings.apiKeySource === 'system') {
    const systemApiKey = process.env.API_KEY; 

    if (typeof systemApiKey !== 'string' || systemApiKey.trim() === '') {
        throw new Error(VIETNAMESE.apiKeySystemUnavailable + " (API_KEY not found in environment)");
    }
    effectiveApiKey = systemApiKey;
  } else {
    const validKeys = settings.userApiKeys.filter(k => k && k.trim() !== '');
    if (validKeys.length === 0) {
      throw new Error(VIETNAMESE.apiKeyMissing);
    }
    // Round-robin key selection
    if (currentApiKeyIndex >= validKeys.length) {
        currentApiKeyIndex = 0; // Wrap around
    }
    effectiveApiKey = validKeys[currentApiKeyIndex];
    currentApiKeyIndex = (currentApiKeyIndex + 1) % validKeys.length;
  }

  if (!ai || lastUsedApiKeySource !== settings.apiKeySource || lastUsedEffectiveApiKey !== effectiveApiKey || lastUsedModelForClient !== settings.model) {
    try {
      ai = new GoogleGenAI({ apiKey: effectiveApiKey });
      lastUsedEffectiveApiKey = effectiveApiKey;
      lastUsedApiKeySource = settings.apiKeySource;
      lastUsedModelForClient = settings.model; 
    } catch (initError) {
        console.error("Failed to initialize GoogleGenAI client:", initError);
        if (settings.apiKeySource === 'system') {
            throw new Error(`${VIETNAMESE.apiKeySystemUnavailable} Details: ${initError instanceof Error ? initError.message : String(initError)} (Using system key: API_KEY)`);
        } else {
            throw new Error(`Lỗi khởi tạo API Key người dùng: ${initError instanceof Error ? initError.message : String(initError)}`);
        }
    }
  }
  return ai;
};

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
        generated.worldTheme = line.substring(line.indexOf("text=") + 6, line.lastIndexOf('"'));
    } else if (line.startsWith(`[${GWD_WORLD_SETTING_DESCRIPTION}`)) {
        generated.worldSettingDescription = line.substring(line.indexOf("text=") + 6, line.lastIndexOf('"'));
    } else if (line.startsWith(`[${GWD_WORLD_WRITING_STYLE}`)) {
        generated.worldWritingStyle = line.substring(line.indexOf("text=") + 6, line.lastIndexOf('"'));
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

// --- Re-implemented Functions ---

// New helper function to wrap content generation and add a check for empty responses.
async function generateContentAndCheck(
    params: { model: string, contents: any, config?: any }
): Promise<GenerateContentResponse> {
    const ai = getAiClient(); // getAiClient is already defined in the file
    const response = await ai.models.generateContent(params);
    
    // The core check for empty/undefined/whitespace-only responses.
    // This is often due to safety filters blocking the response without throwing an error.
    if (!response.text || response.text.trim() === '') {
        throw new Error("Phản hồi từ AI trống. Điều này có thể do bộ lọc nội dung. Vui lòng thử một hành động khác hoặc lùi lượt.");
    }
    
    return response;
}

async function generateContentWithRateLimit(
    prompt: string, 
    modelId: string, 
    onPromptConstructed?: (prompt: string) => void
): Promise<{response: ParsedAiResponse, rawText: string, constructedPrompt: string}> {
    const { safetySettings } = getApiSettings();

    if (onPromptConstructed) {
        onPromptConstructed(prompt);
    }
    
    const response = await generateContentAndCheck({
        model: modelId,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            safetySettings: safetySettings,
        },
    });
    const rawText = response.text;
    const parsedResponse = parseAiResponseText(rawText);
    return { response: parsedResponse, rawText, constructedPrompt: prompt };
}

export async function generateInitialStory(
    knowledgeBase: KnowledgeBase,
    onPromptConstructed?: (prompt: string) => void
): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.initial(knowledgeBase.worldConfig!, knowledgeBase.aiContextConfig);
    incrementApiCallCount('STORY_GENERATION');
    const { response, rawText } = await generateContentWithRateLimit(prompt, model, onPromptConstructed);
    return { response, rawText };
}

export async function generateNextTurn(
    knowledgeBase: KnowledgeBase,
    playerActionText: string,
    inputType: PlayerActionInputType,
    responseLength: ResponseLength,
    currentPageMessagesLog: string,
    previousPageSummaries: string[],
    isStrictMode: boolean, // NEW
    lastNarrationFromPreviousPage: string | undefined,
    retrievedContext: string | undefined,
    onPromptConstructed?: (prompt: string) => void
): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.continue(
        knowledgeBase,
        playerActionText,
        inputType,
        responseLength,
        currentPageMessagesLog,
        previousPageSummaries,
        isStrictMode, // NEW
        lastNarrationFromPreviousPage,
        retrievedContext
    );
    incrementApiCallCount('STORY_GENERATION');
    const { response, rawText } = await generateContentWithRateLimit(prompt, model, onPromptConstructed);
    return { response, rawText };
}

export async function countTokens(text: string): Promise<number> {
    const ai = getAiClient();
    const { model } = getApiSettings();
    incrementApiCallCount('TOKEN_COUNT');
    const response: CountTokensResponse = await ai.models.countTokens({
        model,
        contents: [{ parts: [{ text }] }],
    });
    return response.totalTokens;
}

export async function generateWorldDetailsFromStory(
    storyIdea: string, 
    nsfwMode: boolean, 
    genre: GenreType, 
    isCultivationEnabled: boolean, 
    violenceLevel: ViolenceLevel, 
    storyTone: StoryTone, 
    customGenreName: string | undefined, 
    nsfwDescriptionStyle: NsfwDescriptionStyle,
    onPromptConstructed?: (prompt: string) => void
): Promise<{response: GeneratedWorldElements, rawText: string, constructedPrompt: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.generateWorldDetails(storyIdea, nsfwMode, genre, isCultivationEnabled, violenceLevel, storyTone, customGenreName, nsfwDescriptionStyle);
    if (onPromptConstructed) onPromptConstructed(prompt);
    incrementApiCallCount('WORLD_GENERATION');
    const response = await generateContentAndCheck({ model, contents: [{ parts: [{ text: prompt }] }] });
    const rawText = response.text;
    const parsed = parseGeneratedWorldDetails(rawText);
    return { response: parsed, rawText, constructedPrompt: prompt };
}

export async function generateFanfictionWorldDetails(
    sourceMaterial: string, 
    isContentProvided: boolean, 
    playerInputDescription: string, 
    nsfwMode: boolean, 
    genre: GenreType, 
    isCultivationEnabled: boolean, 
    violenceLevel: ViolenceLevel, 
    storyTone: StoryTone, 
    customGenreName: string | undefined, 
    nsfwDescriptionStyle: NsfwDescriptionStyle,
    onPromptConstructed?: (prompt: string) => void
): Promise<{response: GeneratedWorldElements, rawText: string, constructedPrompt: string}> {
     const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.generateFanfictionWorldDetails(sourceMaterial, isContentProvided, playerInputDescription, nsfwMode, genre, isCultivationEnabled, violenceLevel, storyTone, customGenreName, nsfwDescriptionStyle);
    if (onPromptConstructed) onPromptConstructed(prompt);
    incrementApiCallCount('FANFIC_GENERATION');
    const response = await generateContentAndCheck({ model, contents: [{ parts: [{ text: prompt }] }] });
    const rawText = response.text;
    const parsed = parseGeneratedWorldDetails(rawText);
    return { response: parsed, rawText, constructedPrompt: prompt };
}

export async function generateCompletionForWorldDetails(
    settings: WorldSettings,
    onPromptConstructed?: (prompt: string) => void
): Promise<{response: GeneratedWorldElements, rawText: string, constructedPrompt: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.completeWorldDetails(settings, settings.nsfwMode || false, settings.genre, settings.isCultivationEnabled, settings.violenceLevel || DEFAULT_VIOLENCE_LEVEL, settings.storyTone || DEFAULT_STORY_TONE, settings.customGenreName, settings.nsfwDescriptionStyle || DEFAULT_NSFW_DESCRIPTION_STYLE);
    if (onPromptConstructed) onPromptConstructed(prompt);
    incrementApiCallCount('WORLD_COMPLETION');
    const response = await generateContentAndCheck({ model, contents: [{ parts: [{ text: prompt }] }] });
    const rawText = response.text;
    const parsed = parseGeneratedWorldDetails(rawText);
    return { response: parsed, rawText, constructedPrompt: prompt };
}

export async function analyzeWritingStyle(textToAnalyze: string): Promise<string> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.analyzeStyle(textToAnalyze);
    incrementApiCallCount('STYLE_ANALYSIS');
    const response = await generateContentAndCheck({ model, contents: [{ parts: [{ text: prompt }] }] });
    return response.text;
}

export async function generateImageWithImagen3(prompt: string): Promise<string> {
  const geminiAi = getAiClient();
  incrementApiCallCount('IMAGE_GENERATION');
  try {
    const response = await geminiAi.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: prompt,
      config: { numberOfImages: 1, outputMimeType: 'image/png' },
    });

    if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image?.imageBytes) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return base64ImageBytes;
    } else {
      console.error("No image data found in API response. Response:", response);
      throw new Error("Không tìm thấy dữ liệu ảnh trong phản hồi từ API. Vui lòng thử lại hoặc kiểm tra mô tả của bạn.");
    }

  } catch (error) {
    console.error("Lỗi khi tạo ảnh bằng Gemini API (generateImages):", error);
    const errorContext = error as any;
    let userMessage = "Lỗi không xác định khi tạo ảnh.";

    if (errorContext?.message) {
        userMessage = errorContext.message;
        if (userMessage.includes("API key not valid") || userMessage.includes("PERMISSION_DENIED") || userMessage.includes("API_KEY_INVALID")) {
            userMessage = `Lỗi API: API key không hợp lệ hoặc không có quyền truy cập. Vui lòng kiểm tra lại API_KEY. Chi tiết: ${userMessage}`;
        } else if (userMessage.includes("Model not found") || userMessage.includes("does not exist") || userMessage.includes("model is not supported")) {
            userMessage = `Lỗi API: 'imagen-3.0-generate-002' không được tìm thấy hoặc không được hỗ trợ. Chi tiết: ${userMessage}`;
        } else if (userMessage.toLowerCase().includes("quota") || errorContext?.status === 429) {
            userMessage = `Lỗi API: Đã vượt quá hạn ngạch sử dụng. Vui lòng thử lại sau. Chi tiết: ${userMessage}`;
        } else if (userMessage.includes("prompt was blocked")) {
            userMessage = `Lỗi API: Mô tả của bạn có thể đã vi phạm chính sách nội dung. Vui lòng thử mô tả khác. Chi tiết: ${userMessage}`;
        } else {
            userMessage = `Lỗi tạo ảnh: ${userMessage}`;
        }
    }
    throw new Error(userMessage);
  }
}

export async function generateImageUnified(prompt: string): Promise<string> {
    const { avatarGenerationEngine } = getApiSettings();
    if (avatarGenerationEngine === 'imagen-3.0') {
        return generateImageWithImagen3(prompt);
    }
    // Fallback or other engines can be added here
    return generateImageWithImagen3(prompt);
}

export async function summarizeTurnHistory(messagesToSummarize: GameMessage[], worldTheme: string, playerName: string, genre: GenreType | undefined, customGenreName: string | undefined, onPromptConstructed?: (prompt: string) => void, onResponseReceived?: (response: string) => void): Promise<{ rawSummary: string, processedSummary: string }> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.summarizePage(messagesToSummarize, worldTheme, playerName, genre, customGenreName);
    if (onPromptConstructed) onPromptConstructed(prompt);
    incrementApiCallCount('PAGE_SUMMARY');
    const response = await generateContentAndCheck({ model, contents: [{ parts: [{ text: prompt }] }] });
    const rawText = response.text;
    if(onResponseReceived) onResponseReceived(rawText);
    return { rawSummary: rawText, processedSummary: rawText.trim() };
}

export const generateCombatTurn = async (
    knowledgeBase: KnowledgeBase,
    playerAction: string,
    combatLog: string[],
    currentPageMessagesLog: string,
    previousPageSummaries: string[],
    lastNarrationFromPreviousPage: string | undefined,
    onPromptConstructed?: (prompt: string) => void
): Promise<{response: ParsedCombatResponse, rawText: string}> => {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.combatTurn(knowledgeBase, playerAction, combatLog, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage);
    if (onPromptConstructed) onPromptConstructed(prompt);
    incrementApiCallCount('COMBAT_TURN');
    const response = await generateContentAndCheck({ model, contents: [{ parts: [{ text: prompt }] }] });
    const rawText = response.text;
    
    // Parse combat-specific response
    const { narration, choices, tags } = parseAiResponseText(rawText);
    const statUpdates: ParsedCombatResponse['statUpdates'] = [];
    let combatEnd: ParsedCombatResponse['combatEnd'] = null;
    const postCombatTags: string[] = [];
    
    tags.forEach(tag => {
        const match = tag.match(/\[(.*?):(.*)\]/s);
        if(!match) return;
        const tagName = match[1].trim().toUpperCase();
        const tagParams = parseTagParams(match[2].trim());

        if (tagName === 'COMBAT_STAT_UPDATE') {
            statUpdates.push({
                targetId: tagParams.targetId,
                stat: tagParams.stat as keyof PlayerStats,
                change: parseInt(tagParams.change),
            });
        } else if (tagName === 'COMBAT_END') {
            combatEnd = tagParams.outcome as ParsedCombatResponse['combatEnd'];
        } else {
            postCombatTags.push(tag);
        }
    });

    return { response: { narration, choices, statUpdates, combatEnd, tags: postCombatTags }, rawText };
}

export async function generateDefeatConsequence(kb: KnowledgeBase, combatResult: CombatEndPayload, currentPageMessagesLog: string, previousPageSummaries: string[], lastNarrationFromPreviousPage: string | undefined, onPromptConstructed?: (prompt: string) => void): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.generateDefeatConsequence(kb, combatResult, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage);
    incrementApiCallCount('COMBAT_SUMMARY');
    return generateContentWithRateLimit(prompt, model, onPromptConstructed);
}
export async function generateNonCombatDefeatConsequence(kb: KnowledgeBase, currentPageMessagesLog: string, previousPageSummaries: string[], fatalNarration: string, lastNarrationFromPreviousPage: string | undefined, onPromptConstructed?: (prompt: string) => void): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.generateNonCombatDefeatConsequence(kb, currentPageMessagesLog, previousPageSummaries, fatalNarration, lastNarrationFromPreviousPage);
    incrementApiCallCount('COMBAT_SUMMARY');
    return generateContentWithRateLimit(prompt, model, onPromptConstructed);
}

export async function generateVictoryConsequence(kb: KnowledgeBase, combatResult: CombatEndPayload, currentPageMessagesLog: string, previousPageSummaries: string[], lastNarrationFromPreviousPage: string | undefined, onPromptConstructed?: (prompt: string) => void): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.generateVictoryConsequence(kb, combatResult, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage);
    incrementApiCallCount('COMBAT_SUMMARY');
    return generateContentWithRateLimit(prompt, model, onPromptConstructed);
}

export async function summarizeCombat(combatLog: string[], outcome: 'victory' | 'defeat' | 'escaped' | 'surrendered', onPromptConstructed?: (prompt: string) => void): Promise<string> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.summarizeCombat(combatLog, outcome);
    incrementApiCallCount('COMBAT_SUMMARY');
    const response = await generateContentAndCheck({ model, contents: [{ parts: [{ text: prompt }] }] });
    return response.text.trim();
}

export async function generateCraftedItemViaAI(desiredCategory: GameTemplates.ItemCategoryValues, requirements: string, materials: ItemType[], playerStats: PlayerStats, worldConfig: WorldSettings | null, currentPageMessagesLog: string, previousPageSummaries: string[], lastNarrationFromPreviousPage: string | undefined, onPromptConstructed?: (prompt: string) => void): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.craftItem(desiredCategory, requirements, materials, playerStats, worldConfig, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage);
    incrementApiCallCount('CRAFTING');
    return generateContentWithRateLimit(prompt, model, onPromptConstructed);
}

export async function findLocationWithAI(kb: KnowledgeBase, params: FindLocationParams, currentPageMessagesLog: string, previousPageSummaries: string[], lastNarrationFromPreviousPage: string | undefined, onPromptConstructed?: (prompt: string) => void): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.findLocation(kb, params, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage);
    incrementApiCallCount('ECONOMY_LOCATION');
    return generateContentWithRateLimit(prompt, model, onPromptConstructed);
}

export async function handleCompanionInteraction(kb: KnowledgeBase, companion: Wife | Slave, action: string, currentPageMessagesLog: string, previousPageSummaries: string[], lastNarrationFromPreviousPage: string | undefined, onPromptConstructed?: (prompt: string) => void): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.companionInteraction(kb, companion, action, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage);
    incrementApiCallCount('CHARACTER_INTERACTION');
    return generateContentWithRateLimit(prompt, model, onPromptConstructed);
}
export async function handlePrisonerInteraction(kb: KnowledgeBase, prisoner: Prisoner, action: string, currentPageMessagesLog: string, previousPageSummaries: string[], lastNarrationFromPreviousPage: string | undefined, onPromptConstructed?: (prompt: string) => void): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.prisonerInteraction(kb, prisoner, action, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage);
    incrementApiCallCount('CHARACTER_INTERACTION');
    return generateContentWithRateLimit(prompt, model, onPromptConstructed);
}
export async function summarizeCompanionInteraction(log: string[]): Promise<string> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.summarizeCompanionInteraction(log);
    incrementApiCallCount('CHARACTER_INTERACTION');
    const response = await generateContentAndCheck({ model, contents: [{ parts: [{ text: prompt }] }] });
    return response.text.trim();
}
export async function summarizePrisonerInteraction(log: string[]): Promise<string> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.summarizePrisonerInteraction(log);
    incrementApiCallCount('CHARACTER_INTERACTION');
    const response = await generateContentAndCheck({ model, contents: [{ parts: [{ text: prompt }] }] });
    return response.text.trim();
}

export async function generateSlaveAuctionData(kb: KnowledgeBase, onPromptConstructed?: (prompt: string) => void): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { economyModel } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.generateSlaveAuctionData(kb);
    incrementApiCallCount('ECONOMY_LOCATION');
    return generateContentWithRateLimit(prompt, economyModel || DEFAULT_MODEL_ID, onPromptConstructed);
}

export async function runSlaveAuctionTurn(kb: KnowledgeBase, item: AuctionSlave, playerBid: number, onPromptConstructed?: (prompt: string) => void): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { economyModel } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.runSlaveAuctionTurn(kb, item, playerBid);
    incrementApiCallCount('ECONOMY_LOCATION');
    return generateContentWithRateLimit(prompt, economyModel || DEFAULT_MODEL_ID, onPromptConstructed);
}

export async function runSlaveAuctioneerCall(kb: KnowledgeBase, item: AuctionSlave, callCount: number, onPromptConstructed?: (prompt: string) => void): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { economyModel } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.runSlaveAuctioneerCall(kb, item, callCount);
    incrementApiCallCount('ECONOMY_LOCATION');
    return generateContentWithRateLimit(prompt, economyModel || DEFAULT_MODEL_ID, onPromptConstructed);
}

export async function generateAuctionData(kb: KnowledgeBase, onPromptConstructed?: (prompt: string) => void): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { economyModel } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.generateAuctionData(kb);
    incrementApiCallCount('ECONOMY_LOCATION');
    return generateContentWithRateLimit(prompt, economyModel || DEFAULT_MODEL_ID, onPromptConstructed);
}

export async function runAuctionTurn(kb: KnowledgeBase, item: AuctionItem, playerBid: number, onPromptConstructed?: (prompt: string) => void): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { economyModel } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.runAuctionTurn(kb, item, playerBid);
    incrementApiCallCount('ECONOMY_LOCATION');
    return generateContentWithRateLimit(prompt, economyModel || DEFAULT_MODEL_ID, onPromptConstructed);
}

export async function runAuctioneerCall(kb: KnowledgeBase, item: AuctionItem, callCount: number, onPromptConstructed?: (prompt: string) => void): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { economyModel } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.runAuctioneerCall(kb, item, callCount);
    incrementApiCallCount('ECONOMY_LOCATION');
    return generateContentWithRateLimit(prompt, economyModel || DEFAULT_MODEL_ID, onPromptConstructed);
}

export async function generateCityEconomy(city: GameLocation, kb: KnowledgeBase, onPromptConstructed?: (prompt: string) => void, onResponseReceived?: (response: string) => void): Promise<ParsedAiResponse> {
    const { economyModel } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.generateEconomyLocations(city, kb);
    if(onPromptConstructed) onPromptConstructed(prompt);
    incrementApiCallCount('ECONOMY_LOCATION');
    const response = await generateContentAndCheck({ model: economyModel || DEFAULT_MODEL_ID, contents: [{ parts: [{ text: prompt }] }] });
    const rawText = response.text;
    if(onResponseReceived) onResponseReceived(rawText);
    return parseAiResponseText(rawText);
}

export async function generateGeneralSubLocations(mainLocation: GameLocation, kb: KnowledgeBase, onPromptConstructed?: (prompt: string) => void, onResponseReceived?: (response: string) => void): Promise<ParsedAiResponse> {
    const { economyModel } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.generateGeneralSubLocations(mainLocation, kb);
    if(onPromptConstructed) onPromptConstructed(prompt);
    incrementApiCallCount('ECONOMY_LOCATION');
    const response = await generateContentAndCheck({ model: economyModel || DEFAULT_MODEL_ID, contents: [{ parts: [{ text: prompt }] }] });
    const rawText = response.text;
    if(onResponseReceived) onResponseReceived(rawText);
    return parseAiResponseText(rawText);
}
export async function generateCultivationSession(kb: KnowledgeBase, type: 'skill' | 'method', duration: number, currentPageMessagesLog: string, previousPageSummaries: string[], lastNarrationFromPreviousPage: string | undefined, skill?: Skill, method?: Skill, partner?: NPC | Wife | Slave, onPromptConstructed?: (prompt: string) => void): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.cultivationSession(kb, type, duration, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage, skill, method, partner);
    incrementApiCallCount('CULTIVATION');
    return generateContentWithRateLimit(prompt, model, onPromptConstructed);
}

export async function summarizeCultivationSession(log: string[]): Promise<string> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.summarizeCultivation(log);
    incrementApiCallCount('CULTIVATION');
    const response = await generateContentAndCheck({ model, contents: [{ parts: [{ text: prompt }] }] });
    return response.text.trim();
}

export async function generateVendorRestock(vendor: NPC, kb: KnowledgeBase): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { economyModel } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.restockVendor(vendor, kb);
    incrementApiCallCount('ECONOMY_LOCATION');
    return generateContentWithRateLimit(prompt, economyModel || DEFAULT_MODEL_ID);
}

export async function generateRefreshedChoices(
    lastNarration: string,
    currentChoices: AiChoice[],
    playerHint: string,
    knowledgeBase: KnowledgeBase,
    onPromptConstructed?: (prompt: string) => void
): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { model } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.refreshChoices(
        lastNarration,
        currentChoices,
        playerHint,
        knowledgeBase
    );
    incrementApiCallCount('STORY_GENERATION');
    return generateContentWithRateLimit(prompt, model, onPromptConstructed);
}

export async function generateCopilotResponse(
    knowledgeBaseSnapshot: Omit<KnowledgeBase, 'turnHistory' | 'ragVectorStore' | 'userPrompts'>,
    last20Messages: string,
    copilotChatHistory: string,
    userQuestionAndTask: string,
    latestGameplayPrompt: string,
    userPrompts: string[],
    onPromptConstructed?: (prompt: string) => void,
    copilotModelOverride?: string
): Promise<{response: ParsedAiResponse, rawText: string, constructedPrompt: string}> {
    const { model } = getApiSettings();
    const modelToUse = copilotModelOverride || model;
    const prompt = PROMPT_FUNCTIONS.copilot(knowledgeBaseSnapshot, last20Messages, copilotChatHistory, userQuestionAndTask, latestGameplayPrompt, userPrompts);
    incrementApiCallCount('AI_COPILOT');
    return generateContentWithRateLimit(prompt, modelToUse, onPromptConstructed);
}

// --- NEW: Living World Functions ---

// The JSON schema definition for the AI's response
const worldTickUpdateSchema = {
  type: Type.OBJECT,
  properties: {
    npcUpdates: {
      type: Type.ARRAY,
      description: "Một mảng các kế hoạch hành động cho từng NPC.",
      items: { // NpcActionPlan
        type: Type.OBJECT,
        properties: {
          npcId: { 
            type: Type.STRING,
            description: "ID của NPC thực hiện hành động."
          },
          actions: {
            type: Type.ARRAY,
            description: "Một chuỗi các hành động mà NPC sẽ thực hiện.",
            items: { // NpcAction
              type: Type.OBJECT,
              properties: {
                type: { 
                  type: Type.STRING,
                  description: "Loại hành động (ví dụ: MOVE, INTERACT_NPC, ACQUIRE_ITEM)."
                },
                parameters: { 
                  type: Type.OBJECT,
                  description: "Các tham số cần thiết cho hành động, cấu trúc phụ thuộc vào 'type'.",
                  // A comprehensive list of all possible parameters for all actions
                  properties: {
                    // Base Actions
                    destinationLocationId: { type: Type.STRING },
                    targetNpcId: { type: Type.STRING },
                    intent: { type: Type.STRING },
                    newShortTermGoal: { type: Type.STRING },
                    newLongTermGoal: { type: Type.STRING },
                    newPlanSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
                    itemName: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    skillName: { type: Type.STRING },
                    targetId: { type: Type.STRING },
                    objectName: { type: Type.STRING },
                    locationId: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    // Multi-genre Actions
                    relationshipType: { type: Type.STRING },
                    memberIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                    groupGoal: { type: Type.STRING },
                    durationTurns: { type: Type.NUMBER },
                    factionId: { type: Type.STRING },
                    influenceType: { type: Type.STRING },
                    magnitude: { type: Type.NUMBER },
                    materialsUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
                    serviceName: { type: Type.STRING },
                    price: { type: Type.NUMBER },
                    crimeType: { type: Type.STRING },
                    target: { type: Type.STRING },
                  }
                },
                reason: { 
                  type: Type.STRING,
                  description: "Lý do tại sao NPC thực hiện hành động này."
                }
              },
              required: ['type', 'parameters', 'reason']
            }
          }
        },
        required: ['npcId', 'actions']
      }
    }
  },
  required: ['npcUpdates']
};

/**
 * Calls the Gemini API to get the next set of actions for NPCs in the world.
 * Uses JSON mode with a strict schema to ensure reliable output.
 * @param prompt The fully constructed prompt from buildWorldTickPrompt.
 * @param onPromptConstructed Optional callback to log the constructed prompt.
 * @returns A Promise that resolves to the raw JSON string from the AI.
 */
export async function generateWorldTickUpdate(
    prompt: string,
    onPromptConstructed?: (prompt: string) => void
): Promise<string> {
    const { safetySettings } = getApiSettings();
    const modelId = 'gemini-2.5-flash'; // Optimized for speed and cost

    if (onPromptConstructed) {
        onPromptConstructed(prompt);
    }
    
    const response = await generateContentAndCheck({
        model: modelId,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            safetySettings: safetySettings,
            responseMimeType: "application/json",
            responseSchema: worldTickUpdateSchema,
        },
    });

    // In JSON mode, response.text is the JSON string
    return response.text;
}