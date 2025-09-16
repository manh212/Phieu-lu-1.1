// src/utils/tagProcessors/relationshipEventTagProcessor.ts

import { KnowledgeBase, GameMessage, VectorMetadata, NPC, Wife, Slave, Prisoner, Master, ActivityLogEntry } from '../../types/index';
import { formatRelationshipMemoryForEmbedding } from '../ragUtils';
import { findPersonByIdOrName } from '../questUtils';

export const processRelationshipEvent = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[]; newVectorMetadata?: VectorMetadata } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    let newVectorMetadata: VectorMetadata | undefined = undefined;

    const { source, target, reason, affinity_change } = tagParams;
    
    if (!source || !target || !reason || affinity_change === undefined) {
        console.warn("RELATIONSHIP_EVENT: Missing required parameters (source, target, reason, affinity_change).", tagParams);
        return { updatedKb: newKb, systemMessages, newVectorMetadata: undefined };
    }
    const affinityChange = parseInt(affinity_change, 10);
    if (isNaN(affinityChange)) {
         console.warn("RELATIONSHIP_EVENT: Invalid affinity_change value.", tagParams);
         return { updatedKb: newKb, systemMessages, newVectorMetadata: undefined };
    }
    
    const sourceEntity = findPersonByIdOrName(newKb, source);
    const targetEntity = findPersonByIdOrName(newKb, target);
    const playerName = newKb.worldConfig?.playerName || 'Người chơi';

    const sourceName = sourceEntity ? sourceEntity.name : (source === 'player' ? playerName : source);
    const targetName = targetEntity ? targetEntity.name : (target === 'player' ? playerName : target);

    if (!sourceEntity && source !== 'player') {
        console.warn(`RELATIONSHIP_EVENT: Source entity "${source}" not found.`);
        return { updatedKb: newKb, systemMessages, newVectorMetadata: undefined };
    }
     if (!targetEntity && target !== 'player') {
        console.warn(`RELATIONSHIP_EVENT: Target entity "${target}" not found.`);
        return { updatedKb: newKb, systemMessages, newVectorMetadata: undefined };
    }
    
    // 1. Update affinity
    if (sourceEntity && target === 'player') {
        sourceEntity.affinity = Math.max(-100, Math.min(100, (sourceEntity.affinity || 0) + affinityChange));
    } else if (targetEntity && source === 'player') {
        targetEntity.affinity = Math.max(-100, Math.min(100, (targetEntity.affinity || 0) + affinityChange));
    } else if (sourceEntity && targetEntity) {
        if (!sourceEntity.relationships) sourceEntity.relationships = {};
        if (!sourceEntity.relationships[targetEntity.id]) {
            sourceEntity.relationships[targetEntity.id] = { type: 'Người quen', affinity: 0 };
        }
        sourceEntity.relationships[targetEntity.id].affinity = Math.max(-100, Math.min(100, sourceEntity.relationships[targetEntity.id].affinity + affinityChange));

        // Symmetrical update
        if (!targetEntity.relationships) targetEntity.relationships = {};
        if (!targetEntity.relationships[sourceEntity.id]) {
            targetEntity.relationships[sourceEntity.id] = { type: 'Người quen', affinity: 0 };
        }
        targetEntity.relationships[sourceEntity.id].affinity = Math.max(-100, Math.min(100, targetEntity.relationships[sourceEntity.id].affinity + affinityChange));
    }
    
    // 2. Add to Activity Logs
    if (sourceEntity) {
        if (!sourceEntity.activityLog) sourceEntity.activityLog = [];
        const sourceLog: ActivityLogEntry = {
            turnNumber: turnForSystemMessages,
            description: `Đã ${reason} với ${targetName}.`,
            locationId: sourceEntity.locationId || 'unknown'
        };
        sourceEntity.activityLog.push(sourceLog);
        if (sourceEntity.activityLog.length > 30) sourceEntity.activityLog.shift();
    }
    if (targetEntity) {
        if (!targetEntity.activityLog) targetEntity.activityLog = [];
        const targetLog: ActivityLogEntry = {
            turnNumber: turnForSystemMessages,
            description: `Bị ${sourceName} ${reason}.`,
            locationId: targetEntity.locationId || 'unknown'
        };
        targetEntity.activityLog.push(targetLog);
        if (targetEntity.activityLog.length > 30) targetEntity.activityLog.shift();
    }
    
    // 3. Create relationship memory for RAG
    const memoryId = `rel-mem-${sourceEntity?.id || 'player'}-${targetEntity?.id || 'player'}-${Date.now()}`;
    const memoryText = formatRelationshipMemoryForEmbedding(sourceName, targetName, reason, turnForSystemMessages);

    newVectorMetadata = {
        entityId: memoryId,
        entityType: 'relationship_memory',
        text: memoryText,
        turnNumber: turnForSystemMessages,
        sourceId: sourceEntity?.id || 'player',
        targetId: targetEntity?.id || 'player',
    };
    
    // 4. Create user-facing message
    systemMessages.push({
        id: `relationship-update-${memoryId}`,
        type: 'system',
        content: `[Thế giới sống] Dường như đã có chuyện gì đó xảy ra giữa ${sourceName} và ${targetName}...`,
        timestamp: Date.now(),
        turnNumber: turnForSystemMessages
    });

    return { updatedKb: newKb, systemMessages, newVectorMetadata };
};
