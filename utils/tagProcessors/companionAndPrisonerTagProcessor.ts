import { KnowledgeBase, GameMessage, NPC, Prisoner, Wife, Slave, Skill, PersonBase, VectorMetadata, ActivityLogEntry } from '../../types/index';
// FIX: Corrected import to use the new centralized type export instead of the empty templates file.
import * as GameTemplates from '../../types/index';
import { diceCoefficient, normalizeStringForComparison } from '../questUtils'; // Import similarity utils
import { formatPersonForEmbedding } from '../ragUtils';

const SIMILARITY_THRESHOLD = 0.8;

// FIX: Added generic constraint to ensure T has a 'name' property.
const findPersonByName = <T extends { name: string }>(list: T[], name: string): { person: T, index: number } | null => {
    if (!name) return null;
    let bestMatch = { person: null as T | null, index: -1, score: 0 };
    const normalizedName = normalizeStringForComparison(name);

    list.forEach((person, index) => {
        const score = diceCoefficient(normalizedName, normalizeStringForComparison(person.name));
        if (score > bestMatch.score) {
            bestMatch = { person, index, score };
        }
    });

    if (bestMatch.person && bestMatch.score >= SIMILARITY_THRESHOLD) {
        return bestMatch;
    }

    if(bestMatch.person) {
        console.warn(`[PERSON_FIND]: Person matching "${name}" found, but similarity score ${bestMatch.score.toFixed(2)} is below threshold ${SIMILARITY_THRESHOLD}. Best match: "${bestMatch.person.name}"`);
    } else {
        console.warn(`[PERSON_FIND]: Person matching "${name}" not found.`);
    }

    return null;
}


const createBasePerson = (params: Record<string, string>, existingNpc?: NPC): PersonBase => {
    return {
        id: existingNpc?.id || `person-${params.name.replace(/\s+/g, '-')}-${Date.now()}`,
        name: params.name || existingNpc?.name || 'Không rõ',
        description: params.description || existingNpc?.description || 'Không có mô tả.',
        affinity: params.affinity ? parseInt(params.affinity, 10) : (existingNpc?.affinity || 0),
        gender: params.gender as any || existingNpc?.gender || 'Không rõ',
        race: params.race || existingNpc?.race || 'Nhân Tộc',
        realm: params.realm || existingNpc?.realm || 'Không rõ',
        avatarUrl: params.avatarUrl || existingNpc?.avatarUrl,
        tuChat: (params.tuChat as any) || existingNpc?.tuChat || 'Trung Đẳng',
        specialPhysique: params.specialPhysique || existingNpc?.specialPhysique,
        spiritualRoot: params.spiritualRoot || existingNpc?.spiritualRoot,
        stats: existingNpc?.stats,
        title: params.title || existingNpc?.title,
        // FIX: Propagate locationId from tag parameters or the existing NPC.
        locationId: params.locationId || existingNpc?.locationId,
    };
};


export const processPrisonerAdd = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[]; newVectorMetadata?: VectorMetadata; } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    let newVectorMetadata: VectorMetadata | undefined = undefined;

    const npcName = tagParams.name;

    if (!npcName) {
        console.warn("PRISONER_ADD: Missing name.", tagParams);
        return { updatedKb: newKb, systemMessages, newVectorMetadata: undefined };
    }

    const existingNpcIndex = newKb.discoveredNPCs.findIndex(n => n.name === npcName);
    const existingNpc = existingNpcIndex !== -1 ? newKb.discoveredNPCs[existingNpcIndex] : undefined;

    if (existingNpc) {
        newKb.discoveredNPCs.splice(existingNpcIndex, 1);
    } else {
        console.warn(`PRISONER_ADD: NPC with name "${npcName}" not found to be converted into a prisoner.`);
        // Allow creating a prisoner from scratch if no NPC is found
    }

    const basePerson = createBasePerson(tagParams, existingNpc);
    const newPrisoner: Prisoner = {
        ...basePerson,
        entityType: 'prisoner',
        willpower: parseInt(tagParams.willpower || '80', 10),
        resistance: parseInt(tagParams.resistance || '90', 10),
        obedience: parseInt(tagParams.obedience || '10', 10),
        activityLog: [{
            turnNumber: turnForSystemMessages,
            description: `Bị ${currentKb.worldConfig?.playerName || 'người chơi'} đánh bại và bắt giữ.`,
            locationId: basePerson.locationId || currentKb.currentLocationId || 'unknown'
        }]
    };

    newKb.prisoners.push(newPrisoner);
    newVectorMetadata = { entityId: newPrisoner.id, entityType: 'prisoner', text: formatPersonForEmbedding(newPrisoner, newKb), turnNumber: turnForSystemMessages };

    systemMessages.push({
        id: `prisoner-added-${Date.now()}`,
        type: 'system',
        content: `Một tù nhân mới đã được thêm vào: ${newPrisoner.name}.`,
        timestamp: Date.now(),
        turnNumber: turnForSystemMessages
    });

    return { updatedKb: newKb, systemMessages, newVectorMetadata };
};


export const processWifeAdd = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[]; newVectorMetadata?: VectorMetadata; } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    let newVectorMetadata: VectorMetadata | undefined = undefined;

    const npcName = tagParams.name;
    if (!npcName) {
        console.warn("WIFE_ADD: Missing name.", tagParams);
        return { updatedKb: newKb, systemMessages, newVectorMetadata: undefined };
    }

    const existingNpcIndex = newKb.discoveredNPCs.findIndex(n => n.name === npcName);
    const existingNpc = existingNpcIndex !== -1 ? newKb.discoveredNPCs[existingNpcIndex] : undefined;
    if (existingNpc) newKb.discoveredNPCs.splice(existingNpcIndex, 1);

    const basePerson = createBasePerson(tagParams, existingNpc);
    const newWife: Wife = {
        ...basePerson,
        entityType: 'wife',
        willpower: parseInt(tagParams.willpower || '100', 10),
        obedience: parseInt(tagParams.obedience || '100', 10),
        skills: existingNpc?.skills?.map(id => currentKb.playerSkills.find(s => s.id === id)).filter(Boolean) as Skill[] || [],
        equippedItems: { mainWeapon: null, offHandWeapon: null, head: null, body: null, hands: null, legs: null, artifact: null, pet: null, accessory1: null, accessory2: null },
        activityLog: [{
            turnNumber: turnForSystemMessages,
            description: `Trở thành đạo lữ của ${currentKb.worldConfig?.playerName || 'người chơi'}.`,
            locationId: basePerson.locationId || currentKb.currentLocationId || 'unknown'
        }]
    };
    newKb.wives.push(newWife);
    newVectorMetadata = { entityId: newWife.id, entityType: 'wife', text: formatPersonForEmbedding(newWife, newKb), turnNumber: turnForSystemMessages };

    systemMessages.push({ id: `wife-added-${Date.now()}`, type: 'system', content: `Bạn đã có một đạo lữ mới: ${newWife.name}.`, timestamp: Date.now(), turnNumber: turnForSystemMessages });
    return { updatedKb: newKb, systemMessages, newVectorMetadata };
};

export const processSlaveAdd = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[]; newVectorMetadata?: VectorMetadata; } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    let newVectorMetadata: VectorMetadata | undefined = undefined;

    const npcName = tagParams.name;
    const existingNpcIndex = newKb.discoveredNPCs.findIndex(n => n.name === npcName);
    const existingNpc = existingNpcIndex !== -1 ? newKb.discoveredNPCs[existingNpcIndex] : undefined;
    if (existingNpc) newKb.discoveredNPCs.splice(existingNpcIndex, 1);

    const basePerson = createBasePerson(tagParams, existingNpc);
    const newSlave: Slave = {
        ...basePerson,
        entityType: 'slave',
        willpower: parseInt(tagParams.willpower || '50', 10),
        obedience: parseInt(tagParams.obedience || '100', 10),
        skills: existingNpc?.skills?.map(id => currentKb.playerSkills.find(s => s.id === id)).filter(Boolean) as Skill[] || [],
        equippedItems: { mainWeapon: null, offHandWeapon: null, head: null, body: null, hands: null, legs: null, artifact: null, pet: null, accessory1: null, accessory2: null },
        activityLog: [{
            turnNumber: turnForSystemMessages,
            description: `Trở thành nô lệ của ${currentKb.worldConfig?.playerName || 'người chơi'}.`,
            locationId: basePerson.locationId || currentKb.currentLocationId || 'unknown'
        }]
    };
    newKb.slaves.push(newSlave);
    newVectorMetadata = { entityId: newSlave.id, entityType: 'slave', text: formatPersonForEmbedding(newSlave, newKb), turnNumber: turnForSystemMessages };

    systemMessages.push({ id: `slave-added-${Date.now()}`, type: 'system', content: `Bạn đã có một nữ nô mới: ${newSlave.name}.`, timestamp: Date.now(), turnNumber: turnForSystemMessages });
    return { updatedKb: newKb, systemMessages, newVectorMetadata };
};

const processPersonUpdate = <T extends { id: string; name: string }>(
    // FIX: Add 'name' property to the generic constraint for T.
    personList: T[],
    tagParams: Record<string, string>,
    personType: 'prisoner' | 'wife' | 'slave'
): { updatedList: T[] | null; updatedPerson: T | null; updatedFieldsCount: number } => {
    const personName = tagParams.name;
    if (!personName) {
        console.warn(`[${personType.toUpperCase()}_UPDATE]: Missing name.`);
        return { updatedList: null, updatedPerson: null, updatedFieldsCount: 0 };
    }

    const foundMatch = findPersonByName(personList, personName);
    if (!foundMatch) {
        console.warn(`[${personType.toUpperCase()}_UPDATE]: ${personType} "${personName}" not found.`);
        return { updatedList: null, updatedPerson: null, updatedFieldsCount: 0 };
    }
    
    const { index: personIndex } = foundMatch;
    const updatedList = JSON.parse(JSON.stringify(personList)) as T[];
    const personToUpdate = updatedList[personIndex];
    let updatedFieldsCount = 0;
    
    // Handle newName first
    if (tagParams.newName) {
        const newTrimmedName = tagParams.newName.trim();
        // FIX: Ensure personToUpdate has a name property before comparing.
        if (newTrimmedName && newTrimmedName.toLowerCase() !== personToUpdate.name.trim().toLowerCase()) {
            const collisionExists = updatedList.some((p, idx) => 
                // FIX: Ensure p has a name property before comparing.
                idx !== personIndex && p.name.trim().toLowerCase() === newTrimmedName.toLowerCase()
            );
            if (!collisionExists) {
                // FIX: Ensure personToUpdate has a name property before assigning.
                personToUpdate.name = newTrimmedName;
                updatedFieldsCount++;
            } else {
                 console.warn(`[${personType.toUpperCase()}_UPDATE]: New name "${newTrimmedName}" for person "${personName}" collides with an existing person. Name not updated.`);
            }
        }
    }


    const updateNumericField = (field: keyof T) => {
        const paramValue = tagParams[field as string];
        if (paramValue) {
            const changeStr = paramValue.trim();
            const currentValue = (personToUpdate[field] as number) || 0;
            let newValue: number | null = null;

            if (changeStr.startsWith('+=')) {
                const change = parseInt(changeStr.substring(2), 10);
                if (!isNaN(change)) newValue = currentValue + change;
            } else if (changeStr.startsWith('-=')) {
                const change = parseInt(changeStr.substring(2), 10);
                if (!isNaN(change)) newValue = currentValue - change;
            } else if (changeStr.startsWith('=')) {
                const value = parseInt(changeStr.substring(1), 10);
                if (!isNaN(value)) newValue = value;
            } else { // Fallback for simple values like "+10" or "-5"
                const change = parseInt(changeStr, 10);
                if (!isNaN(change)) newValue = currentValue + change;
            }
            
            if (newValue !== null && !isNaN(newValue)) {
                // Clamping values
                // FIX: Cast field to string to check against string literals.
                if (['willpower', 'resistance', 'obedience'].includes(String(field))) {
                    newValue = Math.max(0, Math.min(100, newValue));
                }
                if (String(field) === 'affinity') {
                    newValue = Math.max(-100, Math.min(100, newValue));
                }
                (personToUpdate as any)[field] = newValue; // use any to avoid type issues with generics
                updatedFieldsCount++;
            }
        }
    };

    updateNumericField('affinity' as keyof T);
    updateNumericField('willpower' as keyof T);
    updateNumericField('obedience' as keyof T);
    if (personType === 'prisoner') {
        updateNumericField('resistance' as keyof T);
    }
    
    // FIX: Ensure personToUpdate has a description property before assigning.
    if (tagParams.description) {
        (personToUpdate as any).description = tagParams.description;
        updatedFieldsCount++;
    }

    return { updatedList, updatedPerson: personToUpdate, updatedFieldsCount };
};


export const processWifeUpdate = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[]; updatedVectorMetadata?: VectorMetadata; } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const { updatedList, updatedPerson, updatedFieldsCount } = processPersonUpdate(newKb.wives, tagParams, 'wife');
    let updatedVectorMetadata: VectorMetadata | undefined = undefined;

    if (updatedList && updatedFieldsCount > 0) {
        newKb.wives = updatedList;
        if (updatedPerson) {
            updatedVectorMetadata = {
                // FIX: Ensure updatedPerson has an 'id' property.
                entityId: updatedPerson.id,
                entityType: 'wife',
                text: formatPersonForEmbedding(updatedPerson, newKb),
                turnNumber: turnForSystemMessages
            };
        }
    }
    return { updatedKb: newKb, systemMessages: [], updatedVectorMetadata };
};

export const processSlaveUpdate = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[]; updatedVectorMetadata?: VectorMetadata; } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const { updatedList, updatedPerson, updatedFieldsCount } = processPersonUpdate(newKb.slaves, tagParams, 'slave');
    let updatedVectorMetadata: VectorMetadata | undefined = undefined;

    if (updatedList && updatedFieldsCount > 0) {
        newKb.slaves = updatedList;
        if (updatedPerson) {
            updatedVectorMetadata = {
                // FIX: Ensure updatedPerson has an 'id' property.
                entityId: updatedPerson.id,
                entityType: 'slave',
                text: formatPersonForEmbedding(updatedPerson, newKb),
                turnNumber: turnForSystemMessages
            };
        }
    }
    return { updatedKb: newKb, systemMessages: [], updatedVectorMetadata };
};

export const processPrisonerUpdate = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[]; updatedVectorMetadata?: VectorMetadata; } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const { updatedList, updatedPerson, updatedFieldsCount } = processPersonUpdate(newKb.prisoners, tagParams, 'prisoner');
    let updatedVectorMetadata: VectorMetadata | undefined = undefined;

    if (updatedList && updatedFieldsCount > 0) {
        newKb.prisoners = updatedList;
        if (updatedPerson) {
            updatedVectorMetadata = {
                // FIX: Ensure updatedPerson has an 'id' property.
                entityId: updatedPerson.id,
                entityType: 'prisoner',
                text: formatPersonForEmbedding(updatedPerson, newKb),
                turnNumber: turnForSystemMessages
            };
        }
    }
    return { updatedKb: newKb, systemMessages: [], updatedVectorMetadata };
};


// Generic remove function
// FIX: Add 'id' property to the generic constraint for T.
const processPersonRemove = <T extends { name: string; id: string; }>(
    list: T[],
    name: string,
    listName: string,
    turn: number
): { newList: T[]; systemMessages: GameMessage[] } => {
    const systemMessages: GameMessage[] = [];
    const foundMatch = findPersonByName(list, name);
    if (foundMatch) {
        const { person: personToRemove } = foundMatch;
        const newList = list.filter(p => p.id !== personToRemove.id);
        systemMessages.push({
            id: `${listName}-removed-${Date.now()}`,
            type: 'system',
            content: `${personToRemove.name} đã không còn là ${listName} của bạn.`,
            timestamp: Date.now(),
            turnNumber: turn
        });
        return { newList, systemMessages };
    } else {
        console.warn(`[${listName.toUpperCase()}_REMOVE]: Person "${name}" not found.`);
        return { newList: list, systemMessages };
    }
};

export const processWifeRemove = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const { newList, systemMessages } = processPersonRemove(newKb.wives, tagParams.name, 'đạo lữ', turnForSystemMessages);
    newKb.wives = newList;
    return { updatedKb: newKb, systemMessages };
};

export const processSlaveRemove = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const { newList, systemMessages } = processPersonRemove(newKb.slaves, tagParams.name, 'nô lệ', turnForSystemMessages);
    newKb.slaves = newList;
    return { updatedKb: newKb, systemMessages };
};

export const processPrisonerRemove = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const { newList, systemMessages } = processPersonRemove(newKb.prisoners, tagParams.name, 'tù nhân', turnForSystemMessages);
    newKb.prisoners = newList;
    return { updatedKb: newKb, systemMessages };
};
