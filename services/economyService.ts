import {
    KnowledgeBase, ParsedAiResponse, Item as ItemType, GameLocation, FindLocationParams,
    AuctionItem, AuctionSlave, WorldSettings, PlayerStats, NPC
} from '../types/index';
import { PROMPT_FUNCTIONS } from '../prompts';
import { getApiSettings, generateContentAndCheck, generateContentWithRateLimit } from './api/geminiClient';
import { incrementApiCallCount } from '../utils/apiUsageTracker';
import { parseAiResponseText } from '../utils/responseParser';
import * as GameTemplates from '../types/index';
import { DEFAULT_MODEL_ID } from '../constants';

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

export async function generateVendorRestock(vendor: NPC, kb: KnowledgeBase): Promise<{response: ParsedAiResponse, rawText: string}> {
    const { economyModel } = getApiSettings();
    const prompt = PROMPT_FUNCTIONS.restockVendor(vendor, kb);
    incrementApiCallCount('ECONOMY_LOCATION');
    return generateContentWithRateLimit(prompt, economyModel || DEFAULT_MODEL_ID);
}