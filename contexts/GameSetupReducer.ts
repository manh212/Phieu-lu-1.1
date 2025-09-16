import { WorldSettings, StartingSkill, StartingItem, StartingNPC, StartingYeuThu, StartingLore, StartingLocation, StartingFaction, RaceCultivationSystem, GeneratedWorldElements } from '../types/index';
import { DEFAULT_WORLD_SETTINGS } from '../constants';

// 1. State and Action Types
export interface GameSetupState {
    settings: WorldSettings;
    error: string | null;
}

// Using a mapped type for stronger payload typing
type ActionMap = {
    UPDATE_FIELD: { field: keyof WorldSettings; value: any };
    APPLY_AI_GENERATION: Partial<GeneratedWorldElements>;
    LOAD_SETTINGS: Partial<WorldSettings>;
    SET_ERROR: string | null;
    RESET_TO_DEFAULT: undefined;
    ADD_ELEMENT: {
        list: keyof Pick<WorldSettings, 'startingSkills' | 'startingItems' | 'startingNPCs' | 'startingYeuThu' | 'startingLore' | 'startingLocations' | 'startingFactions' | 'raceCultivationSystems'>;
        element: any; // The new element to add (without ID)
    };
    UPDATE_ELEMENT: {
        list: keyof Pick<WorldSettings, 'startingSkills' | 'startingItems' | 'startingNPCs' | 'startingYeuThu' | 'startingLore' | 'startingLocations' | 'startingFactions' | 'raceCultivationSystems'>;
        element: { id: string; [key: string]: any }; // The full updated element with ID
    };
    REMOVE_ELEMENT: {
        list: keyof Pick<WorldSettings, 'startingSkills' | 'startingItems' | 'startingNPCs' | 'startingYeuThu' | 'startingLore' | 'startingLocations' | 'startingFactions' | 'raceCultivationSystems'>;
        id: string;
    };
    MANUALLY_ADD_ELEMENTS: Partial<GeneratedWorldElements>;
};

export type GameSetupAction = {
    [Key in keyof ActionMap]: {
        type: Key;
        payload: ActionMap[Key];
    }
}[keyof ActionMap];

// 2. Reducer Function
export const gameSetupReducer = (state: GameSetupState, action: GameSetupAction): GameSetupState => {
    switch (action.type) {
        case 'UPDATE_FIELD':
            return {
                ...state,
                settings: {
                    ...state.settings,
                    [action.payload.field]: action.payload.value,
                },
                error: null, // Clear error on any field update
            };

        case 'APPLY_AI_GENERATION':
            // Merges the partial settings from AI into the current state
            return {
                ...state,
                settings: {
                    ...state.settings,
                    ...action.payload,
                },
                error: null,
            };
        
        case 'LOAD_SETTINGS':
            return {
                ...state,
                settings: {
                    ...DEFAULT_WORLD_SETTINGS,
                    ...action.payload
                },
                error: null,
            };

        case 'SET_ERROR':
            return {
                ...state,
                error: action.payload,
            };

        case 'RESET_TO_DEFAULT':
            return {
                settings: { ...DEFAULT_WORLD_SETTINGS },
                error: null,
            };

        case 'ADD_ELEMENT': {
            const { list, element } = action.payload;
            const newElement = {
                ...element,
                id: `${list}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
            };
            const currentList = state.settings[list] as any[] || [];
            return {
                ...state,
                settings: {
                    ...state.settings,
                    [list]: [...currentList, newElement],
                }
            };
        }

        case 'UPDATE_ELEMENT': {
            const { list, element } = action.payload;
            const currentList = state.settings[list] as any[] || [];
            const newList = currentList.map(item =>
                item.id === element.id ? element : item
            );
            return {
                ...state,
                settings: {
                    ...state.settings,
                    [list]: newList,
                }
            };
        }

        case 'REMOVE_ELEMENT': {
            const { list, id } = action.payload;
            const currentList = state.settings[list] as any[] || [];
            const newList = currentList.filter(item => item.id !== id);
            return {
                ...state,
                settings: {
                    ...state.settings,
                    [list]: newList,
                }
            };
        }
        
        case 'MANUALLY_ADD_ELEMENTS': {
            const newSettings = { ...state.settings };
            const payload = action.payload;

            for (const key in payload) {
                const parsedKey = key as keyof GeneratedWorldElements;
                const existingValue = newSettings[parsedKey];
                const newValue = payload[parsedKey];

                if (Array.isArray(existingValue) && Array.isArray(newValue)) {
                    // For arrays, concatenate new elements to the existing list.
                    (newSettings as any)[parsedKey] = [...existingValue, ...newValue];
                } else if (newValue !== undefined) {
                    // For single values, overwrite the existing one.
                    (newSettings as any)[parsedKey] = newValue;
                }
            }
            return {
                ...state,
                settings: newSettings,
                error: null,
            };
        }


        default:
            return state;
    }
};
