import { Type } from "@google/genai";
import { getApiSettings, generateContentAndCheck } from './api/geminiClient';

// The JSON schema definition for the AI's response
export const worldTickUpdateSchema = {
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
