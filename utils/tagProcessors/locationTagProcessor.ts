
import { KnowledgeBase, GameMessage, GameLocation, VectorMetadata } from '../../types';
import { handleLocationEntryEvents } from '../locationEvents';
import { formatLocationForEmbedding } from '../ragUtils';

export const processMainLocation = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[]; newVectorMetadata?: VectorMetadata } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    let newVectorMetadata: VectorMetadata | undefined = undefined;

    const name = tagParams.name;
    const description = tagParams.description;

    if (!name || !description) {
        console.warn("MAINLOCATION: Missing name or description.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }

    if (!newKb.discoveredLocations.find(l => l.name === name)) {
        const newLocation: GameLocation = {
            id: `loc-${name.replace(/\s+/g, '-')}-${Date.now()}`,
            name: name,
            description: description,
            isSafeZone: tagParams.isSafeZone?.toLowerCase() === 'true',
            visited: false,
        };
        newKb.discoveredLocations.push(newLocation);
        newVectorMetadata = {
            entityId: newLocation.id,
            entityType: 'location',
            text: formatLocationForEmbedding(newLocation, newKb),
            turnNumber: turnForSystemMessages
        };
        systemMessages.push({
            id: 'location-discovered-' + newLocation.id,
            type: 'system',
            content: `Địa điểm mới được khám phá: ${name}.`,
            timestamp: Date.now(),
            turnNumber: turnForSystemMessages
        });
    }

    return { updatedKb: newKb, systemMessages, newVectorMetadata };
};

export const processSubLocation = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[]; newVectorMetadata?: VectorMetadata } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    let newVectorMetadata: VectorMetadata | undefined = undefined;

    const name = tagParams.name;
    const description = tagParams.description;
    const parentLocationId = tagParams.parentLocationId;

    if (!name || !description || !parentLocationId) {
        console.warn("SUBLOCATION: Missing name, description, or parentLocationId.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }

    const parentLocation = newKb.discoveredLocations.find(l => l.id === parentLocationId);
    if (!parentLocation) {
        console.warn(`SUBLOCATION: Parent location with ID "${parentLocationId}" not found for sub-location "${name}".`);
        return { updatedKb: newKb, systemMessages };
    }

    if (!newKb.discoveredLocations.find(l => l.name === name && l.parentLocationId === parentLocationId)) {
        const newLocation: GameLocation = {
            id: `loc-${name.replace(/\s+/g, '-')}-${Date.now()}`,
            name: name,
            description: description,
            isSafeZone: tagParams.isSafeZone?.toLowerCase() === 'true',
            parentLocationId: parentLocationId,
        };
        newKb.discoveredLocations.push(newLocation);
        newVectorMetadata = {
            entityId: newLocation.id,
            entityType: 'location',
            text: formatLocationForEmbedding(newLocation, newKb),
            turnNumber: turnForSystemMessages
        };
        systemMessages.push({
            id: 'sublocation-discovered-' + newLocation.id,
            type: 'system',
            content: `Khu vực mới trong ${parentLocation.name} được khám phá: ${name}.`,
            timestamp: Date.now(),
            turnNumber: turnForSystemMessages
        });
    }

    return { updatedKb: newKb, systemMessages, newVectorMetadata };
};

export const processLocationUpdate = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[]; updatedVectorMetadata?: VectorMetadata } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const name = tagParams.name;
    const newName = tagParams.newName;
    const description = tagParams.description;
    const isSafeZone = tagParams.isSafeZone;
    let updatedVectorMetadata: VectorMetadata | undefined = undefined;

    if (!name) {
        console.warn("LOCATION_UPDATE: Missing name.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }

    const locIndex = newKb.discoveredLocations.findIndex(l => l.name === name);
    if (locIndex > -1) {
        const locToUpdate = newKb.discoveredLocations[locIndex];
        if (newName) locToUpdate.name = newName;
        if (description) locToUpdate.description = description;
        if (isSafeZone !== undefined) locToUpdate.isSafeZone = isSafeZone.toLowerCase() === 'true';
        systemMessages.push({
            id: 'location-updated-' + locToUpdate.id,
            type: 'system',
            content: `Thông tin về địa điểm ${name} đã được cập nhật.`,
            timestamp: Date.now(),
            turnNumber: turnForSystemMessages
        });
        updatedVectorMetadata = {
            entityId: locToUpdate.id,
            entityType: 'location',
            text: formatLocationForEmbedding(locToUpdate, newKb),
            turnNumber: turnForSystemMessages
        };
    } else {
        console.warn(`LOCATION_UPDATE: Location "${name}" not found.`);
    }

    return { updatedKb: newKb, systemMessages, updatedVectorMetadata };
};

export const processLocationChange = async (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): Promise<{ updatedKb: KnowledgeBase; systemMessages: GameMessage[] }> => {
    let newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    
    const characterName = tagParams.characterName;
    const destinationNameOrId = tagParams.destination || tagParams.name;

    if (!destinationNameOrId) {
        console.warn("LOCATION_CHANGE: Missing location name/destination.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }

    const targetLocation = newKb.discoveredLocations.find(l => l.id === destinationNameOrId || l.name === destinationNameOrId);

    if (!targetLocation) {
        console.warn(`LOCATION_CHANGE: Location "${destinationNameOrId}" not found.`);
        systemMessages.push({
            id: 'location-change-error-' + Date.now(),
            type: 'system',
            content: `[DEBUG] Lỗi di chuyển: Không tìm thấy địa điểm "${destinationNameOrId}".`,
            timestamp: Date.now(),
            turnNumber: turnForSystemMessages
        });
        return { updatedKb: newKb, systemMessages };
    }

    if (characterName) {
        // --- Handle NPC movement ---
        const npcIndex = newKb.discoveredNPCs.findIndex(n => n.name === characterName);
        if (npcIndex > -1) {
            newKb.discoveredNPCs[npcIndex].locationId = targetLocation.id;
            // No system message for player, as this is a background world event.
        } else {
            console.warn(`LOCATION_CHANGE: NPC "${characterName}" not found.`);
        }
    } else {
        // --- Handle Player movement (original functionality) ---
        const locationChanged = newKb.currentLocationId !== targetLocation.id;
        
        if (locationChanged) {
            newKb.currentLocationId = targetLocation.id;
            systemMessages.push({
                id: 'location-changed-' + targetLocation.id,
                type: 'system',
                content: `Bạn đã di chuyển đến: ${targetLocation.name}.`,
                timestamp: Date.now(),
                turnNumber: turnForSystemMessages
            });

            // Mark as visited only when player moves there
            const locationToUpdate = newKb.discoveredLocations.find(l => l.id === targetLocation.id);
            if(locationToUpdate) locationToUpdate.visited = true;


            const { updatedKb: kbAfterEvents, systemMessages: eventMessages } = await handleLocationEntryEvents(newKb, targetLocation, turnForSystemMessages);
            newKb = kbAfterEvents;
            systemMessages.push(...eventMessages);
        }
    }

    return { updatedKb: newKb, systemMessages };
};
