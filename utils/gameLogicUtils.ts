import { AIContextConfig, KnowledgeBase, GameMessage, TurnHistoryEntry } from '../types/index';
import { filterRegistry } from './daoScriptFilters';

// NEW: AI Context Settings Logic
export const DEFAULT_AI_CONTEXT_CONFIG: AIContextConfig = {
    sendRagContext: true,
    sendCoreContext: true,
    sendConversationalContext: true,
    sendWritingStyle: true,
    sendUserPrompts: true,
    sendEventGuidance: true,
    sendDifficultyGuidance: true,
    sendNsfwGuidance: true,
    sendFormattingRules: true,
    sendShowDontTellRule: true,
    sendProactiveNpcRule: true,
    sendRumorMillRule: true,
    sendWorldProgressionRules: true,
    sendTimeRules: true,
    sendStatRules: true,
    sendItemRules: true,
    sendSkillRules: true,
    sendQuestRules: true,
    sendCreationRules: true,
    sendUpdateRules: true,
    sendDeletionRules: true,
    sendSpecialStatusRules: true,
    sendChoiceRules: true,
    sendTurnRules: true,
    // New defaults
    sendStatusEffectRules: true,
    sendCombatStartRules: true,
    sendSpecialEventRules: true,
    sendSimpleCompanionRules: true,
    sendCultivationRules: false, // NEW: Changed default to false
};

// --- START: Interpolation Logic for Dao-Script (Step 4) ---

const getValueByPath = (context: any, path: string): any => {
    const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let result = context;
    for (const key of keys) {
        if (result === null || result === undefined) return undefined;
        result = result[key];
    }
    return result;
};

const evaluateExpression = (expression: string, context: any): any => {
    expression = expression.trim();

    // --- NEW: Query Function Handling ---
    if (expression.startsWith('query.')) {
        const queryRegex = /query\.(\w+)\((.*)\)/s;
        const match = expression.match(queryRegex);
        if (match) {
            const functionName = match[1];
            const argsStr = match[2].trim();
            const kb: KnowledgeBase = context.knowledgeBase;

            try {
                const arg = JSON.parse(argsStr.replace(/'/g, '"'));
                let entityList: any[] = [];
                switch (arg.entityType) {
                    case 'npc': entityList = kb.discoveredNPCs; break;
                    case 'item': entityList = kb.inventory; break;
                    case 'quest': entityList = kb.allQuests; break;
                    case 'location': entityList = kb.discoveredLocations; break;
                    case 'faction': entityList = kb.discoveredFactions; break;
                    case 'yeuThu': entityList = kb.discoveredYeuThu; break;
                    case 'wife': entityList = kb.wives; break;
                    case 'slave': entityList = kb.slaves; break;
                    case 'prisoner': entityList = kb.prisoners; break;
                }

                if (functionName === 'find') {
                    return entityList.find(entity => 
                        Object.keys(arg.conditions).every(key => 
                            entity[key] === arg.conditions[key]
                        )
                    );
                } else if (functionName === 'filter') {
                    return entityList.filter(entity => 
                        Object.keys(arg.conditions).every(key => 
                            entity[key] === arg.conditions[key]
                        )
                    );
                } else if (functionName === 'current') {
                    switch(arg.entityType) {
                        case 'location': return kb.discoveredLocations.find(l => l.id === kb.currentLocationId);
                        // Add more 'current' entities later if needed
                        default: return null;
                    }
                }
            } catch (e) {
                 console.error(`Dao-Script Error: Could not parse query arguments for "${expression}". Error: ${e}`);
                 return `[Lỗi Query: Sai cú pháp]`;
            }
        }
        return `[Lỗi Query: Hàm không hợp lệ]`;
    }
    // --- END: Query Function Handling ---

    if (expression.startsWith('"') && expression.endsWith('"')) return expression.slice(1, -1);
    if (expression.startsWith("'") && expression.endsWith("'")) return expression.slice(1, -1);
    if (!isNaN(Number(expression))) return Number(expression);
    if (expression === 'true') return true;
    if (expression === 'false') return false;
    return getValueByPath(context, expression);
};

const evaluateCondition = (conditionStr: string, context: any): boolean => {
    const operators = ['==', '!=', '>', '<', '>=', '<='];
    for (const op of operators) {
        if (conditionStr.includes(op)) {
            const [left, right] = conditionStr.split(op).map(s => s.trim());
            const leftVal = evaluateExpression(left, context);
            const rightVal = evaluateExpression(right, context);
            switch (op) {
                case '==': return leftVal == rightVal;
                case '!=': return leftVal != rightVal;
                case '>': return leftVal > rightVal;
                case '<': return leftVal < rightVal;
                case '>=': return leftVal >= rightVal;
                case '<=': return leftVal <= rightVal;
            }
        }
    }
    return !!evaluateExpression(conditionStr, context);
};

const processTemplate = (template: string, context: any): string => {
    let output = '';
    const regex = /(.*?){?({{|{%)(.*?)(%}|}})}?/s;
    let remaining = template;

    while (remaining.length > 0) {
        const match = remaining.match(regex);
        if (!match) {
            output += remaining;
            break;
        }

        output += match[1]; // Text before tag
        const tagType = match[2];
        const tagContent = match[3].trim();
        remaining = remaining.substring(match[0].length);

        if (tagType === '{{') { // Expression: {{ ... }}
            try {
                const parts = tagContent.split('|').map((p: string) => p.trim());
                const path = parts[0];
                let value = evaluateExpression(path, context);

                for (let i = 1; i < parts.length; i++) {
                    const filterStr = parts[i];
                    const [filterName, ...argsStr] = filterStr.split(':');
                    const args = argsStr.join(':').split(',').map(s => s.trim());
                    const filterFunc = filterRegistry[filterName.trim()];
                    if (filterFunc) {
                        value = filterFunc(value, ...args);
                    } else {
                         output += `[Lỗi: Bộ lọc '${filterName}' không tồn tại]`;
                         continue;
                    }
                }
                 if (value === undefined) output += `[Lỗi: '${path}' không tồn tại]`;
                 else if (value === null) output += 'null';
                 else if (typeof value === 'object') output += `[Đối tượng: ${Array.isArray(value) ? `Mảng(${value.length})` : 'Object'}]`;
                 else output += String(value);

            } catch (e) {
                output += `[Lỗi: ${tagContent}]`;
            }
        } else if (tagType === '{%') { // Statement: {% ... %}
            const [command, ...args] = tagContent.split(/\s+/);
            
            if (command === 'if') {
                const condition = args.join(' ');
                const endifRegex = /{%-?\s*endif\s*-?%}/s;
                const elseRegex = /{%-?\s*else\s*-?%}/s;
                
                let contentToEndif = remaining;
                const endifMatch = contentToEndif.match(endifRegex);
                if (endifMatch && endifMatch.index !== undefined) {
                    contentToEndif = remaining.substring(0, endifMatch.index);
                    remaining = remaining.substring(endifMatch.index + endifMatch[0].length);
                }

                const elseMatch = contentToEndif.match(elseRegex);
                if (evaluateCondition(condition, context)) {
                    const ifContent = elseMatch ? contentToEndif.substring(0, elseMatch.index) : contentToEndif;
                    output += processTemplate(ifContent, context);
                } else if (elseMatch) {
                    const elseContent = contentToEndif.substring(elseMatch.index + elseMatch[0].length);
                    output += processTemplate(elseContent, context);
                }
            } else if (command === 'for') {
                const loopVar = args[0];
                const arrayPath = args[2];
                const array = evaluateExpression(arrayPath, context);

                const endforRegex = /{%-?\s*endfor\s*-?%}/s;
                const forMatch = remaining.match(endforRegex);
                if (forMatch && forMatch.index !== undefined && Array.isArray(array)) {
                    const loopContent = remaining.substring(0, forMatch.index);
                    remaining = remaining.substring(forMatch.index + forMatch[0].length);

                    for (const item of array) {
                        const loopContext = { ...context, [loopVar]: item };
                        output += processTemplate(loopContent, loopContext);
                    }
                }
            }
        }
    }
    return output;
};


export const interpolate = (text: string, knowledgeBase: KnowledgeBase): string => {
    if (!text || typeof text !== 'string') return '';
    try {
        const context = { knowledgeBase };
        return processTemplate(text, context);
    } catch (error) {
        console.error("Lỗi nghiêm trọng khi thực thi Đạo-Script:", error);
        return `[LỖI HỆ THỐNG ĐẠO-SCRIPT: ${error instanceof Error ? error.message : 'Unknown'}]`;
    }
};

// --- END: Interpolation Logic ---


export * from './questUtils';
export * from './statsCalculationUtils';
export * from './tagProcessingUtils';
export * from './turnHistoryUtils'; // Will export addTurnHistoryEntryRaw
export * from './paginationUtils';
export * from './parseTagValue';
export * from './vectorStore';
export * from './ragUtils';
export * from './dateUtils'; // NEW: Export date utilities
export * from './eventUtils'; // NEW: Export event utilities
export * from './apiUsageTracker'; // NEW: Export API usage tracker
export * from './livingWorldUtils'; // NEW: Export Living World utilities
export * from './setupTagProcessor'; // NEW: Export Setup Tag Processor
export * from './audioUtils'; // NEW: Export audio utilities
export * from './conditionClipboard'; // NEW

// NPC, YeuThu, and World Info Tag Processors
export * from './tagProcessors/npcTagProcessor';
export * from './tagProcessors/yeuThuTagProcessor';
export * from './tagProcessors/locationTagProcessor';
export * from './tagProcessors/factionTagProcessor';
export * from './tagProcessors/worldLoreTagProcessor';
export * from './tagProcessors/eventTagProcessor'; // NEW
export * from './tagProcessors/worldConfigTagProcessor'; // NEW
export * from './tagProcessors/relationshipEventTagProcessor'; // NEW
export * from './tagProcessors/npcActionLogTagProcessor'; // NEW
export * from './tagProcessors/npcItemProcessor'; // NEW
export * from './tagProcessors/stagedActionTagProcessor'; // NEW
export * from './tagProcessors/userPromptTagProcessor'; // NEW
export * from './tagProcessors/narrativeDirectiveTagProcessor'; // NEW
export * from './tagProcessors/aiContextTagProcessor'; // NEW
export * from './tagProcessors/aiRulebookTagProcessor'; // NEW
export * from './tagProcessors/rewriteTurnTagProcessor'; // NEW

// Other Tag Processors
export * from './tagProcessors/statusEffectTagProcessor'; 
export * from './tagProcessors/professionTagProcessor';
export * from './npcProgressionUtils';
export * from './tagProcessors/auctionTagProcessor';
export * from './tagProcessors/timeTagProcessor';
export * from './locationEvents';
export * from './tagProcessors/slaveTagProcessor';
export * from './avatarUtils';
export { PROMPT_FUNCTIONS } from '../prompts';