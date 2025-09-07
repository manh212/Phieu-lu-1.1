import React, { createContext, useReducer, useContext, useMemo, useEffect, ReactNode } from 'react';
import { WorldSettings } from '../types/index';
import { gameSetupReducer, GameSetupAction, GameSetupState } from './GameSetupReducer';
import { DEFAULT_WORLD_SETTINGS } from '../constants';

// 1. Define Context Shape
interface GameSetupContextType {
    state: GameSetupState;
    dispatch: React.Dispatch<GameSetupAction>;
}

// 2. Create Context
const GameSetupContext = createContext<GameSetupContextType | null>(null);

// Initial state definition
const initialState: GameSetupState = {
    settings: {
        ...DEFAULT_WORLD_SETTINGS,
        // Ensure arrays are new instances to avoid shared references
        startingSkills: [...DEFAULT_WORLD_SETTINGS.startingSkills],
        startingItems: [...DEFAULT_WORLD_SETTINGS.startingItems],
        startingNPCs: [...DEFAULT_WORLD_SETTINGS.startingNPCs],
        startingYeuThu: [...DEFAULT_WORLD_SETTINGS.startingYeuThu],
        startingLore: [...DEFAULT_WORLD_SETTINGS.startingLore],
        startingLocations: [...DEFAULT_WORLD_SETTINGS.startingLocations],
        startingFactions: [...DEFAULT_WORLD_SETTINGS.startingFactions],
        raceCultivationSystems: [...DEFAULT_WORLD_SETTINGS.raceCultivationSystems],
    },
    error: null,
};


// 3. Create Provider Component
interface GameSetupProviderProps {
    children: ReactNode;
    initialSettings?: Partial<WorldSettings>; // Allow optional initial settings
}

export const GameSetupProvider: React.FC<GameSetupProviderProps> = ({ children, initialSettings }) => {
    const [state, dispatch] = useReducer(gameSetupReducer, {
        ...initialState,
        settings: {
            ...initialState.settings,
            ...initialSettings,
        },
    });

    useEffect(() => {
        // This effect ensures that whenever the component mounts or `initialSettings` prop changes,
        // the state is synchronized. It dispatches an action that loads the settings.
        if (initialSettings) {
            dispatch({ type: 'LOAD_SETTINGS', payload: initialSettings });
        }
    }, [initialSettings]); // Dependency array ensures this runs when initialSettings changes

    // Memoize the context value to prevent unnecessary re-renders of consumers
    const contextValue = useMemo(() => ({ state, dispatch }), [state, dispatch]);

    return (
        <GameSetupContext.Provider value={contextValue}>
            {children}
        </GameSetupContext.Provider>
    );
};


// 4. Create Custom Hook for easy consumption
export const useGameSetup = (): GameSetupContextType => {
    const context = useContext(GameSetupContext);
    if (!context) {
        throw new Error('useGameSetup must be used within a GameSetupProvider');
    }
    return context;
};