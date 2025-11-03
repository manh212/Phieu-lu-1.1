// services/presetService.ts
import { AIPreset, AIPresetCollection } from '@/types/index';
import { AI_PRESETS_STORAGE_KEY } from '@/constants/index';

/**
 * Retrieves all AI presets from localStorage.
 * @returns {AIPresetCollection} An object containing all presets, keyed by their names.
 */
export const getAIPresets = (): AIPresetCollection => {
    try {
        const storedPresets = localStorage.getItem(AI_PRESETS_STORAGE_KEY);
        if (storedPresets) {
            const parsed = JSON.parse(storedPresets);
            // Basic validation can be added here if needed
            return parsed as AIPresetCollection;
        }
    } catch (error) {
        console.error("Error reading AI presets from localStorage:", error);
    }
    return {}; // Return empty object if nothing is found or an error occurs
};

/**
 * Saves a collection of AI presets to localStorage.
 * @param {AIPresetCollection} presets - The entire collection of presets to save.
 */
export const saveAIPresets = (presets: AIPresetCollection): void => {
    try {
        const jsonString = JSON.stringify(presets, null, 2);
        localStorage.setItem(AI_PRESETS_STORAGE_KEY, jsonString);
    } catch (error) {
        console.error("Error saving AI presets to localStorage:", error);
    }
};

/**
 * Triggers a browser download for a given preset as a .json file.
 * @param {AIPreset} preset - The preset object to export.
 */
export const exportPresetToJSON = (preset: AIPreset): void => {
    try {
        const settingsString = JSON.stringify(preset, null, 2);
        const blob = new Blob([settingsString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        const safeName = preset.metadata.name.replace(/[^a-z0-9_-\s]/gi, '').replace(/\s+/g, '-').toLowerCase();
        link.download = `${safeName || 'ai-preset'}.aipreset.json`;

        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Error exporting preset:", err);
        // Consider showing a user-facing error
    }
};

/**
 * Parses and validates a JSON string to ensure it matches the AIPreset structure.
 * @param {string} jsonString - The raw JSON string from an imported file.
 * @returns {Promise<AIPreset>} A promise that resolves with the validated AIPreset object.
 * @throws {Error} if the JSON is invalid or doesn't match the expected structure.
 */
export const importPresetFromJSON = (jsonString: string): Promise<AIPreset> => {
    return new Promise((resolve, reject) => {
        try {
            const parsed = JSON.parse(jsonString);

            // Basic structural validation
            if (
                !parsed ||
                typeof parsed !== 'object' ||
                !parsed.metadata ||
                typeof parsed.metadata.name !== 'string' ||
                typeof parsed.metadata.version !== 'string' ||
                !parsed.configuration ||
                !parsed.configuration.contextToggles ||
                !parsed.configuration.rulebookContent ||
                !parsed.configuration.parameters
            ) {
                throw new Error("Tệp không hợp lệ hoặc thiếu cấu trúc AIPreset cần thiết.");
            }

            // More specific validation can be added here, e.g., checking keys
            // of contextToggles against a known list.

            resolve(parsed as AIPreset);

        } catch (error) {
            console.error("Error importing preset from JSON:", error);
            reject(new Error(`Lỗi khi nhập preset: ${error instanceof Error ? error.message : 'Định dạng tệp không hợp lệ.'}`));
        }
    });
};
