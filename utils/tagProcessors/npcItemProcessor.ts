// src/utils/tagProcessors/npcItemProcessor.ts
import { KnowledgeBase, GameMessage, NPC, Item } from '../../types/index';
import { createItemFromParams } from './itemTagProcessor';
import { diceCoefficient, normalizeStringForComparison } from '../questUtils';

const SIMILARITY_THRESHOLD = 0.8;

const findNpcByIdOrName = (kb: KnowledgeBase, identifier: string): NPC | null => {
    if (!identifier) return null;
    
    const allNpcs = kb.discoveredNPCs;

    // 1. Direct ID match first
    const byId = allNpcs.find(p => p.id === identifier);
    if (byId) return byId;

    // 2. Fuzzy name match
    let bestMatch = { npc: null as NPC | null, score: 0 };
    const normalizedIdentifier = normalizeStringForComparison(identifier);

    allNpcs.forEach(npc => {
        const score = diceCoefficient(normalizedIdentifier, normalizeStringForComparison(npc.name));
        if (score > bestMatch.score) {
            bestMatch = { npc, score };
        }
    });

    if (bestMatch.npc && bestMatch.score >= SIMILARITY_THRESHOLD) {
        return bestMatch.npc;
    }
    
    console.warn(`[findNpcByIdOrName] Could not find a definitive match for NPC identifier: "${identifier}".`);
    return null;
};


export const processNpcProduceItem = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const { npcId } = tagParams;

    if (!npcId) {
        console.warn("NPC_PRODUCE_ITEM: Missing npcId parameter.", tagParams);
        return { updatedKb: newKb, systemMessages: [] };
    }
    
    const npc = findNpcByIdOrName(newKb, npcId);
    if (!npc) {
        console.warn(`NPC_PRODUCE_ITEM: NPC with ID/Name "${npcId}" not found.`);
        return { updatedKb: newKb, systemMessages: [] };
    }

    const newItem = createItemFromParams(tagParams, currentKb);
    if (newItem) {
        if (!npc.personalInventory) {
            npc.personalInventory = [];
        }
        
        const existingItemIndex = npc.personalInventory.findIndex(i => i.name === newItem.name);
        if (existingItemIndex > -1) {
            npc.personalInventory[existingItemIndex].quantity += newItem.quantity;
        } else {
            npc.personalInventory.push(newItem);
        }
    }
    // This is a background action, so no system message is sent to the player.
    return { updatedKb: newKb, systemMessages: [] };
};

export const processNpcInventoryTransfer = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const { fromNpcId, toNpcId, itemName, quantity } = tagParams;
    const transferQuantity = parseInt(quantity, 10);

    if (!fromNpcId || !toNpcId || !itemName || isNaN(transferQuantity)) {
        console.warn("NPC_INVENTORY_TRANSFER: Missing required parameters.", tagParams);
        return { updatedKb: newKb, systemMessages: [] };
    }

    const fromNpc = findNpcByIdOrName(newKb, fromNpcId);
    const toNpc = findNpcByIdOrName(newKb, toNpcId);

    if (!fromNpc || !toNpc) {
        console.warn(`NPC_INVENTORY_TRANSFER: Could not find one or both NPCs: from "${fromNpcId}", to "${toNpcId}".`);
        return { updatedKb: newKb, systemMessages: [] };
    }
    
    if (!fromNpc.personalInventory) {
        console.warn(`NPC_INVENTORY_TRANSFER: Source NPC "${fromNpc.name}" has no personal inventory.`);
        return { updatedKb: newKb, systemMessages: [] };
    }

    const itemIndex = fromNpc.personalInventory.findIndex(i => normalizeStringForComparison(i.name) === normalizeStringForComparison(itemName));

    if (itemIndex === -1) {
         console.warn(`NPC_INVENTORY_TRANSFER: Item "${itemName}" not found in ${fromNpc.name}'s inventory.`);
         return { updatedKb: newKb, systemMessages: [] };
    }
    
    const itemToTransfer = fromNpc.personalInventory[itemIndex];

    if (itemToTransfer.quantity < transferQuantity) {
        console.warn(`NPC_INVENTORY_TRANSFER: Not enough quantity of "${itemName}" to transfer. Available: ${itemToTransfer.quantity}, Requested: ${transferQuantity}`);
        return { updatedKb: newKb, systemMessages: [] };
    }
    
    // Perform transfer
    itemToTransfer.quantity -= transferQuantity;

    if (!toNpc.personalInventory) {
        toNpc.personalInventory = [];
    }

    const existingItemInTargetIndex = toNpc.personalInventory.findIndex(i => i.name === itemToTransfer.name);
    if (existingItemInTargetIndex > -1) {
        toNpc.personalInventory[existingItemInTargetIndex].quantity += transferQuantity;
    } else {
        toNpc.personalInventory.push({ ...itemToTransfer, quantity: transferQuantity });
    }

    // Remove item from source if quantity is zero
    if (itemToTransfer.quantity <= 0) {
        fromNpc.personalInventory.splice(itemIndex, 1);
    }
    
    // No direct system message to player for this background action.
    return { updatedKb: newKb, systemMessages: [] };
};
