// types/features/livingWorld.ts
export interface NpcProfile {
    id: string;
    name: string;
    locationId?: string;
    personalityTraits: string[];
    needs: Record<string, number>;
    longTermGoal: string;
    shortTermGoal: string;
    currentPlan: string[];
    mood: 'Vui Vẻ' | 'Hài Lòng' | 'Bình Thường' | 'Bực Bội' | 'Giận Dữ' | 'Nghi Ngờ';
    relationships: Record<string, { type: string; affinity: number; }>;
    recentActivities?: string[];
}

export type NpcActionType =
    | 'MOVE' | 'INTERACT_NPC' | 'UPDATE_GOAL' | 'UPDATE_PLAN' | 'IDLE'
    | 'ACQUIRE_ITEM' | 'PRACTICE_SKILL' | 'USE_SKILL' | 'INTERACT_OBJECT' | 'CONVERSE'
    | 'BUILD_RELATIONSHIP' | 'FORM_GROUP' | 'INFLUENCE_FACTION' | 'PRODUCE_ITEM'
    | 'OFFER_SERVICE' | 'RESEARCH_TOPIC' | 'PATROL_AREA' | 'COMMIT_CRIME';

export type ActionParameters =
    | { type: 'MOVE'; destinationLocationId: string; }
    | { type: 'INTERACT_NPC'; targetNpcId: string; intent: 'friendly' | 'hostile' | 'neutral' | 'transaction'; }
    | { type: 'UPDATE_GOAL'; newShortTermGoal: string; newLongTermGoal?: string; }
    | { type: 'UPDATE_PLAN'; newPlanSteps: string[]; }
    | { type: 'IDLE'; }
    | { type: 'ACQUIRE_ITEM'; itemName: string; quantity: number; }
    | { type: 'PRACTICE_SKILL'; skillName: string; }
    | { type: 'USE_SKILL'; skillName: string; targetId?: string; }
    | { type: 'INTERACT_OBJECT'; objectName: string; locationId: string; }
    | { type: 'CONVERSE'; targetNpcId: string; topic: string; }
    | { type: 'BUILD_RELATIONSHIP'; targetNpcId: string; relationshipType: 'friendship' | 'rivalry' | 'romance' | 'mentorship'; }
    | { type: 'FORM_GROUP'; memberIds: string[]; groupGoal: string; durationTurns: number; }
    | { type: 'INFLUENCE_FACTION'; factionId: string; influenceType: 'positive' | 'negative'; magnitude: number; }
    | { type: 'PRODUCE_ITEM'; itemName: string; quantity: number; materialsUsed: string[]; }
    | { type: 'OFFER_SERVICE'; serviceName: string; targetNpcId: string; price: number; }
    | { type: 'RESEARCH_TOPIC'; topic: string; }
    | { type: 'PATROL_AREA'; areaLocationIds: string[]; durationTurns: number; }
    | { type: 'COMMIT_CRIME'; crimeType: 'theft' | 'assault' | 'vandalism'; targetNpcId?: string; target?: string; locationId?: string; itemName?: string; quantity?: number; };

export interface NpcAction {
    type: NpcActionType;
    parameters: ActionParameters;
    reason: string;
}

export interface NpcActionPlan {
    npcId: string;
    actions: NpcAction[];
}

export interface WorldTickUpdate {
    npcUpdates: NpcActionPlan[];
}
