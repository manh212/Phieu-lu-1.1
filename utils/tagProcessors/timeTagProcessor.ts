import { KnowledgeBase, GameMessage } from '../../types/index';

export const processChangeTime = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];

    const daysToAdd = parseInt(tagParams.ngay || "0", 10);
    const monthsToAdd = parseInt(tagParams.thang || "0", 10);
    const yearsToAdd = parseInt(tagParams.nam || "0", 10);
    const hoursToAdd = parseInt(tagParams.gio || "0", 10);
    const minutesToAdd = parseInt(tagParams.phut || "0", 10);

    if (isNaN(daysToAdd) || isNaN(monthsToAdd) || isNaN(yearsToAdd) || isNaN(hoursToAdd) || isNaN(minutesToAdd) || (daysToAdd <= 0 && monthsToAdd <= 0 && yearsToAdd <= 0 && hoursToAdd <= 0 && minutesToAdd <= 0)) {
        console.warn("CHANGE_TIME: Invalid or no time change specified.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }

    let { day, month, year, hour, minute } = newKb.worldDate;

    // --- Calculate total minutes passed for lifespan reduction ---
    let totalMinutesPassed = minutesToAdd + (hoursToAdd * 60) + (daysToAdd * 24 * 60) + (monthsToAdd * 30 * 24 * 60) + (yearsToAdd * 360 * 24 * 60);
    
    if (totalMinutesPassed <= 0) {
        return { updatedKb: newKb, systemMessages }; // No time actually passed
    }

    // --- Update date and time ---
    minute += minutesToAdd;
    hour += hoursToAdd + Math.floor(minute / 60);
    minute %= 60;

    day += daysToAdd + Math.floor(hour / 24);
    hour %= 24;
    
    month += monthsToAdd;
    year += yearsToAdd;

    // Normalize date (handle overflows)
    while (day > 30) {
        day -= 30;
        month += 1;
    }
    while (month > 12) {
        month -= 12;
        year += 1;
    }

    newKb.worldDate = { day, month, year, hour, minute };

    // --- Lifespan Reduction Logic ---
    // Assuming 1 year passed in game = 1 year of lifespan lost
    const yearsPassed = totalMinutesPassed / (360 * 24 * 60);
    if (newKb.worldConfig?.isCultivationEnabled && newKb.playerStats.thoNguyen !== undefined && yearsPassed > 0) {
        newKb.playerStats.thoNguyen -= yearsPassed;
        if (newKb.playerStats.thoNguyen <= 0) {
            newKb.playerStats.thoNguyen = 0;
            // The game should handle the consequence of running out of lifespan elsewhere
            // We just update the state here.
        }
    }
    
    return { updatedKb: newKb, systemMessages };
};
