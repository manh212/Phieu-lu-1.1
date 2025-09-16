import { VIETNAMESE } from '../constants'; // VIETNAMESE might be needed for quest related strings in the future
import { Quest, NPC, Wife, Slave, Prisoner, Master, KnowledgeBase } from '../types/index';

// Helper function to sanitize quest objective text for display
export const sanitizeQuestObjectiveTextForDisplay = (text: string | undefined): string | undefined => {
    if (text === undefined || text === null) return undefined;
    // Remove single quotes, backslashes, and asterisks for display purposes only
    return text.replace(/['\\*]/g, '');
};

// New helper function to format objective text specifically for system messages
export const formatObjectiveForSystemMessage = (objectiveText: string, questTitle: string): string => {
  let text = objectiveText.replace(/['\\*]/g, '').trim(); // Basic sanitization
  const lowerQuestTitle = questTitle.toLowerCase();
  const lowerText = text.toLowerCase();

  if (lowerText.startsWith(lowerQuestTitle)) {
    let remainingText = text.substring(questTitle.length).trim();
    // Remove common leading separators like ':', '-', '(', ' - ' more robustly
    remainingText = remainingText.replace(/^[\s:\-\(\)]+/, '').trim();
    
    if (remainingText.startsWith("(") && remainingText.endsWith(")")) {
        const coreObjective = remainingText.substring(1, remainingText.length - 1).trim();
        if (coreObjective.indexOf("(") === -1 && coreObjective.indexOf(")") === -1) {
            remainingText = coreObjective;
        }
    }
    return remainingText || objectiveText; 
  }
  return text; 
};

// --- NEW STRING SIMILARITY HELPERS ---

/**
 * Creates a set of bigrams from a given string.
 * @param str The input string.
 * @returns A Set of 2-character strings.
 */
function getBigrams(str: string): Set<string> {
  const bigrams = new Set<string>();
  if (!str || str.length < 2) {
    return bigrams;
  }
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.add(str.substring(i, i + 2));
  }
  return bigrams;
}

/**
 * Calculates the Sørensen-Dice coefficient between two strings.
 * The coefficient is a value between 0 and 1, where 1 indicates identical strings.
 * @param str1 The first string.
 * @param str2 The second string.
 * @returns A similarity score between 0 and 1.
 */
export function diceCoefficient(str1: string, str2: string): number {
  if (!str1 || !str2) {
    return 0;
  }
  if (str1 === str2) {
    return 1;
  }

  const bigrams1 = getBigrams(str1);
  const bigrams2 = getBigrams(str2);
  
  if (bigrams1.size === 0 || bigrams2.size === 0) {
    return 0;
  }

  let intersectionSize = 0;
  for (const x of bigrams1) {
    if (bigrams2.has(x)) {
      intersectionSize++;
    }
  }

  return (2 * intersectionSize) / (bigrams1.size + bigrams2.size);
}

/**
 * Normalizes a string for comparison by converting to lowercase and removing common punctuation.
 * @param str The input string.
 * @returns The normalized string.
 */
export const normalizeStringForComparison = (str: string): string => {
    if (!str) return '';
    return str
        .toLowerCase()
        // Decompose accented letters into base letters and combining marks
        .normalize("NFD")
        // Remove combining diacritical marks
        .replace(/[\u0300-\u036f]/g, "")
        // Special case for the letter 'đ'
        .replace(/đ/g, "d")
        .replace(/['".,]/g, '') // Remove common punctuation that can vary
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim();
}

/**
 * Chuẩn hóa tên địa điểm để so sánh.
 * Chuyển thành chữ thường, bỏ dấu, bỏ khoảng trắng thừa.
 * @param name Tên cần chuẩn hóa.
 * @returns Tên đã được chuẩn hóa.
 */
export const normalizeLocationName = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
};

const PERSON_SIMILARITY_THRESHOLD = 0.8;

// Helper to find any person-like entity by ID or Name
export const findPersonByIdOrName = (kb: KnowledgeBase, identifier: string): NPC | Wife | Slave | Prisoner | Master | null => {
    if (!identifier) return null;
    
    const allPeople: (NPC | Wife | Slave | Prisoner | Master)[] = [
        ...kb.discoveredNPCs, ...kb.wives, ...kb.slaves, ...kb.prisoners,
    ];
    if (kb.master && !allPeople.some(p => p.id === kb.master!.id)) {
        allPeople.push(kb.master);
    }

    // 1. Direct ID match first
    const byId = allPeople.find(p => p.id === identifier);
    if (byId) return byId;

    // 2. Fuzzy name match
    let bestMatch = { person: null as (NPC | Wife | Slave | Prisoner | Master) | null, score: 0 };
    const normalizedIdentifier = normalizeStringForComparison(identifier);

    allPeople.forEach(person => {
        const score = diceCoefficient(normalizedIdentifier, normalizeStringForComparison(person.name));
        if (score > bestMatch.score) {
            bestMatch = { person, score };
        }
    });

    if (bestMatch.person && bestMatch.score >= PERSON_SIMILARITY_THRESHOLD) {
        return bestMatch.person;
    }
    
    console.warn(`[findPersonByIdOrName] Could not find a definitive match for identifier: "${identifier}". Best match was "${bestMatch.person?.name}" with score ${bestMatch.score}.`);
    return null;
};
