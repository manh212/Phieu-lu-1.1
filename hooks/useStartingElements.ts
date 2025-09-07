import { useCallback } from 'react';
import { useGameSetup } from '../contexts/GameSetupContext';
// FIX: Correct import path for types
import { 
    WorldSettings, 
    StartingSkill, 
    StartingItem, 
    StartingNPC, 
    StartingYeuThu, 
    StartingLore, 
    StartingLocation, 
    StartingFaction, 
    RaceCultivationSystem 
} from '../types/index';
// FIX: Correct import path for types
import * as GameTemplates from '../types/index';

type ElementListKey = keyof Pick<WorldSettings, 'startingSkills' | 'startingItems' | 'startingNPCs' | 'startingYeuThu' | 'startingLore' | 'startingLocations' | 'startingFactions' | 'raceCultivationSystems'>;

export const useStartingElements = () => {
    const { dispatch } = useGameSetup();

    const addElement = useCallback((list: ElementListKey, newElement: any) => {
        dispatch({ type: 'ADD_ELEMENT', payload: { list, element: newElement }});
    }, [dispatch]);

    const updateElement = useCallback((list: ElementListKey, updatedElement: any) => {
        dispatch({ type: 'UPDATE_ELEMENT', payload: { list, element: updatedElement }});
    }, [dispatch]);

    const removeElement = useCallback((list: ElementListKey, id: string) => {
        dispatch({ type: 'REMOVE_ELEMENT', payload: { list, id }});
    }, [dispatch]);

    // Specific handlers for convenience
    const addSkill = useCallback((type: GameTemplates.SkillTypeValues) => {
        addElement('startingSkills', { name: '', description: '', skillType: type });
    }, [addElement]);

    const updateSkill = useCallback((updatedSkill: StartingSkill) => {
        updateElement('startingSkills', updatedSkill);
    }, [updateElement]);
    
    const removeSkill = useCallback((id: string) => {
        removeElement('startingSkills', id);
    }, [removeElement]);

    const addItem = useCallback(() => {
        addElement('startingItems', { name: '', description: '', quantity: 1, category: GameTemplates.ItemCategory.MISCELLANEOUS });
    }, [addElement]);

    const updateItem = useCallback((updatedItem: StartingItem) => {
        updateElement('startingItems', updatedItem);
    }, [updateElement]);

    const removeItem = useCallback((id: string) => {
        removeElement('startingItems', id);
    }, [removeElement]);
    
    const addNpc = useCallback(() => {
        addElement('startingNPCs', { name: '', personality: '', initialAffinity: 0, details: '' });
    }, [addElement]);

    const updateNpc = useCallback((updatedNpc: StartingNPC) => {
        updateElement('startingNPCs', updatedNpc);
    }, [updateElement]);

    const removeNpc = useCallback((id: string) => {
        removeElement('startingNPCs', id);
    }, [removeElement]);
    
    // ... Add similar convenient handlers for YeuThu, Lore, Locations, Factions, RaceSystems
     const addYeuThu = useCallback(() => { addElement('startingYeuThu', { name: '', species: '', description: '', isHostile: true }); }, [addElement]);
     const updateYeuThu = useCallback((updated: StartingYeuThu) => { updateElement('startingYeuThu', updated); }, [updateElement]);
     const removeYeuThu = useCallback((id: string) => { removeElement('startingYeuThu', id); }, [removeElement]);

     const addLore = useCallback(() => { addElement('startingLore', { title: '', content: '' }); }, [addElement]);
     const updateLore = useCallback((updated: StartingLore) => { updateElement('startingLore', updated); }, [updateElement]);
     const removeLore = useCallback((id: string) => { removeElement('startingLore', id); }, [removeElement]);

     const addLocation = useCallback(() => { addElement('startingLocations', { name: '', description: '' }); }, [addElement]);
     const updateLocation = useCallback((updated: StartingLocation) => { updateElement('startingLocations', updated); }, [updateElement]);
     const removeLocation = useCallback((id: string) => { removeElement('startingLocations', id); }, [removeElement]);

     const addFaction = useCallback(() => { addElement('startingFactions', { name: '', description: '', alignment: GameTemplates.FactionAlignment.TRUNG_LAP, initialPlayerReputation: 0 }); }, [addElement]);
     const updateFaction = useCallback((updated: StartingFaction) => { updateElement('startingFactions', updated); }, [updateElement]);
     const removeFaction = useCallback((id: string) => { removeElement('startingFactions', id); }, [removeElement]);


    return {
        addSkill,
        updateSkill,
        removeSkill,
        addItem,
        updateItem,
        removeItem,
        addNpc,
        updateNpc,
        removeNpc,
        addYeuThu,
        updateYeuThu,
        removeYeuThu,
        addLore,
        updateLore,
        removeLore,
        addLocation,
        updateLocation,
        removeLocation,
        addFaction,
        updateFaction,
        removeFaction,
    };
};