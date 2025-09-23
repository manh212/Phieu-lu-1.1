import React from 'react';
import { useGameSetup } from '../../../../contexts/GameSetupContext';
import * as GameTemplates from '../../../../types/index';
import CollapsibleSection from '../../../ui/CollapsibleSection';
import SkillsSection from './SkillsSection';
import ItemsSection from './ItemsSection';
import NpcsSection from './NpcsSection';
import YeuThuSection from './YeuThuSection';
import LoreSection from './LoreSection';
import LocationsSection from './LocationsSection';
import FactionsSection from './FactionsSection';
import { VIETNAMESE } from '../../../../constants';
import { WorldSettings, StartingSkill, StartingItem, StartingNPC, StartingYeuThu, StartingLore, StartingLocation, StartingFaction } from '../../../../types/index';

interface StartingElementsTabProps {
    openSections: {
        skills: boolean; items: boolean; npcs: boolean; yeuThu: boolean;
        lore: boolean; locations: boolean; factions: boolean;
    };
    toggleSection: (section: keyof StartingElementsTabProps['openSections']) => void;
}

const StartingElementsTab: React.FC<StartingElementsTabProps> = ({ openSections, toggleSection }) => {
  const { state, dispatch } = useGameSetup();
  const { settings } = state;
  
  // Handlers for Skills
  const handleStartingSkillChange = (index: number, field: string, value: any) => {
    const list = state.settings.startingSkills as any[];
    const updatedList = [...list];
    const itemToUpdate = { ...updatedList[index] };
    const fieldParts = field.split('.');
      if (fieldParts.length > 1) {
          if (!itemToUpdate[fieldParts[0]]) (itemToUpdate as any)[fieldParts[0]] = {};
          (itemToUpdate as any)[fieldParts[0]][fieldParts[1]] = value;
      } else {
          (itemToUpdate as any)[field] = value;
      }
    updatedList[index] = itemToUpdate;
    dispatch({ type: 'UPDATE_FIELD', payload: { field: 'startingSkills', value: updatedList } });
  };
  const addStartingSkill = (type: GameTemplates.SkillTypeValues) => {
      dispatch({ type: 'ADD_ELEMENT', payload: { list: 'startingSkills', element: { name: '', description: '', skillType: type } } })
  };
  const removeStartingSkill = (index: number) => {
      const updatedList = (state.settings.startingSkills || []).filter((_, i) => i !== index);
      dispatch({ type: 'UPDATE_FIELD', payload: { field: 'startingSkills', value: updatedList } });
  };

  // Handlers for Items
  const handleStartingItemChange = (index: number, field: string, value: any) => {
      const list = state.settings.startingItems as any[];
      const updatedList = [...list];
      const itemToUpdate = { ...updatedList[index] };
      const fieldParts = field.split('.');
      if (fieldParts.length > 1) {
          if (!itemToUpdate[fieldParts[0]]) (itemToUpdate as any)[fieldParts[0]] = {};
          (itemToUpdate as any)[fieldParts[0]][fieldParts[1]] = value;
      } else {
          (itemToUpdate as any)[field] = value;
      }
      updatedList[index] = itemToUpdate;
      dispatch({ type: 'UPDATE_FIELD', payload: { field: 'startingItems', value: updatedList } });
  };
  const addStartingItem = () => {
      dispatch({ type: 'ADD_ELEMENT', payload: { list: 'startingItems', element: { name: '', description: '', quantity: 1, category: GameTemplates.ItemCategory.MISCELLANEOUS } } });
  };
  const removeStartingItem = (index: number) => {
      const updatedList = (state.settings.startingItems || []).filter((_, i) => i !== index);
      dispatch({ type: 'UPDATE_FIELD', payload: { field: 'startingItems', value: updatedList } });
  };

  // Handlers for NPCs
  const handleStartingNPCChange = (index: number, field: keyof StartingNPC, value: any) => {
    const list = state.settings.startingNPCs as any[];
    const updatedList = [...list];
    updatedList[index] = { ...updatedList[index], [field]: value };
    dispatch({ type: 'UPDATE_FIELD', payload: { field: 'startingNPCs', value: updatedList } });
  };
  const addStartingNPC = () => {
    dispatch({ type: 'ADD_ELEMENT', payload: { list: 'startingNPCs', element: { name: '', personality: '', initialAffinity: 0, details: '' } } });
  };
  const removeStartingNPC = (index: number) => {
    const updatedList = (state.settings.startingNPCs || []).filter((_, i) => i !== index);
    dispatch({ type: 'UPDATE_FIELD', payload: { field: 'startingNPCs', value: updatedList } });
  };
  
  // Handlers for YeuThu
  const handleStartingYeuThuChange = (index: number, field: keyof StartingYeuThu, value: any) => {
    const list = state.settings.startingYeuThu as any[];
    const updatedList = [...list];
    updatedList[index] = { ...updatedList[index], [field]: value };
    dispatch({ type: 'UPDATE_FIELD', payload: { field: 'startingYeuThu', value: updatedList } });
  };
  const addStartingYeuThu = () => {
    dispatch({ type: 'ADD_ELEMENT', payload: { list: 'startingYeuThu', element: { name: '', species: '', description: '', isHostile: true } } });
  };
  const removeStartingYeuThu = (index: number) => {
    const updatedList = (state.settings.startingYeuThu || []).filter((_, i) => i !== index);
    dispatch({ type: 'UPDATE_FIELD', payload: { field: 'startingYeuThu', value: updatedList } });
  };

  // Handlers for Lore
  const handleStartingLoreChange = (index: number, field: keyof StartingLore, value: any) => {
    const list = state.settings.startingLore as any[];
    const updatedList = [...list];
    updatedList[index] = { ...updatedList[index], [field]: value };
    dispatch({ type: 'UPDATE_FIELD', payload: { field: 'startingLore', value: updatedList } });
  };
  const addStartingLore = () => {
    dispatch({ type: 'ADD_ELEMENT', payload: { list: 'startingLore', element: { title: '', content: '' } } });
  };
  const removeStartingLore = (index: number) => {
    const updatedList = (state.settings.startingLore || []).filter((_, i) => i !== index);
    dispatch({ type: 'UPDATE_FIELD', payload: { field: 'startingLore', value: updatedList } });
  };

  // Handlers for Locations
  const handleStartingLocationChange = (index: number, field: keyof StartingLocation, value: any) => {
    const list = state.settings.startingLocations as any[];
    const updatedList = [...list];
    updatedList[index] = { ...updatedList[index], [field]: value };
    dispatch({ type: 'UPDATE_FIELD', payload: { field: 'startingLocations', value: updatedList } });
  };
  const addStartingLocation = () => {
    dispatch({ type: 'ADD_ELEMENT', payload: { list: 'startingLocations', element: { name: '', description: '' } } });
  };
  const removeStartingLocation = (index: number) => {
    const updatedList = (state.settings.startingLocations || []).filter((_, i) => i !== index);
    dispatch({ type: 'UPDATE_FIELD', payload: { field: 'startingLocations', value: updatedList } });
  };
  
  // Handlers for Factions
  const handleStartingFactionChange = (index: number, field: keyof StartingFaction, value: any) => {
    const list = state.settings.startingFactions as any[];
    const updatedList = [...list];
    updatedList[index] = { ...updatedList[index], [field]: value };
    dispatch({ type: 'UPDATE_FIELD', payload: { field: 'startingFactions', value: updatedList } });
  };
  const addStartingFaction = () => {
    dispatch({ type: 'ADD_ELEMENT', payload: { list: 'startingFactions', element: { name: '', description: '', alignment: GameTemplates.FactionAlignment.TRUNG_LAP, initialPlayerReputation: 0 } } });
  };
  const removeStartingFaction = (index: number) => {
    const updatedList = (state.settings.startingFactions || []).filter((_, i) => i !== index);
    dispatch({ type: 'UPDATE_FIELD', payload: { field: 'startingFactions', value: updatedList } });
  };

  // Generic handler for toggling the 'isPinned' property on any starting element
  const handlePinToggle = (listKey: keyof WorldSettings, index: number) => {
      const list = (state.settings as any)[listKey] as any[];
      const updatedList = [...list];
      const itemToUpdate = { ...updatedList[index] };
      itemToUpdate.isPinned = !itemToUpdate.isPinned;
      updatedList[index] = itemToUpdate;
      dispatch({ type: 'UPDATE_FIELD', payload: { field: listKey, value: updatedList } });
  };

  return (
    <div className="space-y-2">
      <CollapsibleSection title={VIETNAMESE.startingSkillsSection} isOpen={openSections.skills} onToggle={() => toggleSection('skills')} itemCount={(settings.startingSkills || []).length}>
        <SkillsSection 
          settings={settings}
          handleStartingSkillChange={handleStartingSkillChange}
          addStartingSkill={addStartingSkill}
          removeStartingSkill={removeStartingSkill}
          handlePinToggle={(index) => handlePinToggle('startingSkills', index)}
        />
      </CollapsibleSection>

      <CollapsibleSection title={VIETNAMESE.startingItemsSection} isOpen={openSections.items} onToggle={() => toggleSection('items')} itemCount={(settings.startingItems || []).length}>
        <ItemsSection 
          settings={settings}
          handleStartingItemChange={handleStartingItemChange}
          addStartingItem={addStartingItem}
          removeStartingItem={removeStartingItem}
          handlePinToggle={(index) => handlePinToggle('startingItems', index)}
        />
      </CollapsibleSection>
      
      <CollapsibleSection title={VIETNAMESE.startingNPCsSection} isOpen={openSections.npcs} onToggle={() => toggleSection('npcs')} itemCount={(settings.startingNPCs || []).length}>
        <NpcsSection 
          settings={settings}
          handleStartingNPCChange={handleStartingNPCChange}
          addStartingNPC={addStartingNPC}
          removeStartingNPC={removeStartingNPC}
          handlePinToggle={(index) => handlePinToggle('startingNPCs', index)}
        />
      </CollapsibleSection>

      <CollapsibleSection title={"Yêu Thú Khởi Đầu"} isOpen={openSections.yeuThu} onToggle={() => toggleSection('yeuThu')} itemCount={(settings.startingYeuThu || []).length}>
        <YeuThuSection 
          settings={settings}
          handleStartingYeuThuChange={handleStartingYeuThuChange}
          addStartingYeuThu={addStartingYeuThu}
          removeStartingYeuThu={removeStartingYeuThu}
          handlePinToggle={(index) => handlePinToggle('startingYeuThu', index)}
        />
      </CollapsibleSection>

      <CollapsibleSection title={VIETNAMESE.startingLoreSection} isOpen={openSections.lore} onToggle={() => toggleSection('lore')} itemCount={(settings.startingLore || []).length}>
        <LoreSection
          startingLore={settings.startingLore}
          handleStartingLoreChange={handleStartingLoreChange}
          addStartingLore={addStartingLore}
          removeStartingLore={removeStartingLore}
          handlePinToggle={(index) => handlePinToggle('startingLore', index)}
        />
      </CollapsibleSection>

      <CollapsibleSection title={VIETNAMESE.startingLocationsSection} isOpen={openSections.locations} onToggle={() => toggleSection('locations')} itemCount={(settings.startingLocations || []).length}>
        <LocationsSection
          startingLocations={settings.startingLocations}
          handleStartingLocationChange={handleStartingLocationChange}
          addStartingLocation={addStartingLocation}
          removeStartingLocation={removeStartingLocation}
          handlePinToggle={(index) => handlePinToggle('startingLocations', index)}
        />
      </CollapsibleSection>
      
      <CollapsibleSection title={VIETNAMESE.startingFactionsSection} isOpen={openSections.factions} onToggle={() => toggleSection('factions')} itemCount={(settings.startingFactions || []).length}>
        <FactionsSection
          startingFactions={settings.startingFactions}
          handleStartingFactionChange={handleStartingFactionChange}
          addStartingFaction={addStartingFaction}
          removeStartingFaction={removeStartingFaction}
          handlePinToggle={(index) => handlePinToggle('startingFactions', index)}
        />
      </CollapsibleSection>
    </div>
  );
};

export default StartingElementsTab;
