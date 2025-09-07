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
// FIX: Import the WorldSettings type to resolve multiple 'Cannot find name' errors.
import { WorldSettings } from '../../../../types/index';

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
  
  // FIX: This component will now create the necessary handlers itself to pass down,
  // resolving the prop and signature mismatches with the child components.
  // This avoids using the `useStartingElements` hook which had incompatible handler signatures.

  const createChangeHandler = (listKey: keyof WorldSettings) => (index: number, field: string, value: any) => {
      const list = (state.settings as any)[listKey] as any[];
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
      dispatch({ type: 'UPDATE_FIELD', payload: { field: listKey, value: updatedList } });
  };
  
  const createAddHandler = (listKey: keyof WorldSettings, newElement: object) => () => {
      const currentList = (state.settings as any)[listKey] as any[] || [];
      // FIX: Explicitly convert listKey to a string to prevent potential runtime errors with symbols.
      const updatedList = [...currentList, { ...newElement, id: `${String(listKey)}-${Date.now()}-${Math.random()}` }];
      dispatch({ type: 'UPDATE_FIELD', payload: { field: listKey, value: updatedList } });
  };
  
  const createRemoveHandler = (listKey: keyof WorldSettings) => (index: number) => {
      const currentList = (state.settings as any)[listKey] as any[] || [];
      const updatedList = currentList.filter((_, i) => i !== index);
      dispatch({ type: 'UPDATE_FIELD', payload: { field: listKey, value: updatedList } });
  };

  return (
    <div className="space-y-2">
      <CollapsibleSection title={VIETNAMESE.startingSkillsSection} isOpen={openSections.skills} onToggle={() => toggleSection('skills')} itemCount={(settings.startingSkills || []).length}>
        {/* FIX: Pass props that match SkillsSectionProps */}
        <SkillsSection 
          settings={settings}
          handleStartingSkillChange={createChangeHandler('startingSkills')}
          addStartingSkill={(type) => dispatch({ type: 'ADD_ELEMENT', payload: { list: 'startingSkills', element: { name: '', description: '', skillType: type } } })}
          removeStartingSkill={createRemoveHandler('startingSkills')}
        />
      </CollapsibleSection>

      <CollapsibleSection title={VIETNAMESE.startingItemsSection} isOpen={openSections.items} onToggle={() => toggleSection('items')} itemCount={(settings.startingItems || []).length}>
        {/* FIX: Pass props that match ItemsSectionProps */}
        <ItemsSection 
          settings={settings}
          handleStartingItemChange={createChangeHandler('startingItems')}
          addStartingItem={createAddHandler('startingItems', { name: '', description: '', quantity: 1, category: GameTemplates.ItemCategory.MISCELLANEOUS })}
          removeStartingItem={createRemoveHandler('startingItems')}
        />
      </CollapsibleSection>
      
      <CollapsibleSection title={VIETNAMESE.startingNPCsSection} isOpen={openSections.npcs} onToggle={() => toggleSection('npcs')} itemCount={(settings.startingNPCs || []).length}>
        {/* FIX: Pass props that match NpcsSectionProps */}
        <NpcsSection 
          settings={settings}
          handleStartingNPCChange={createChangeHandler('startingNPCs')}
          addStartingNPC={createAddHandler('startingNPCs', { name: '', personality: '', initialAffinity: 0, details: '' })}
          removeStartingNPC={createRemoveHandler('startingNPCs')}
        />
      </CollapsibleSection>

      <CollapsibleSection title={"Yêu Thú Khởi Đầu"} isOpen={openSections.yeuThu} onToggle={() => toggleSection('yeuThu')} itemCount={(settings.startingYeuThu || []).length}>
        {/* FIX: Pass props that match YeuThuSectionProps */}
        <YeuThuSection 
          settings={settings}
          handleStartingYeuThuChange={createChangeHandler('startingYeuThu')}
          addStartingYeuThu={createAddHandler('startingYeuThu', { name: '', species: '', description: '', isHostile: true })}
          removeStartingYeuThu={createRemoveHandler('startingYeuThu')}
        />
      </CollapsibleSection>

      <CollapsibleSection title={VIETNAMESE.startingLoreSection} isOpen={openSections.lore} onToggle={() => toggleSection('lore')} itemCount={(settings.startingLore || []).length}>
        {/* FIX: Pass props that match LoreSectionProps */}
        <LoreSection
          startingLore={settings.startingLore}
          handleStartingLoreChange={createChangeHandler('startingLore')}
          addStartingLore={createAddHandler('startingLore', { title: '', content: '' })}
          removeStartingLore={createRemoveHandler('startingLore')}
        />
      </CollapsibleSection>

      <CollapsibleSection title={VIETNAMESE.startingLocationsSection} isOpen={openSections.locations} onToggle={() => toggleSection('locations')} itemCount={(settings.startingLocations || []).length}>
        {/* FIX: Pass props that match LocationsSectionProps */}
        <LocationsSection
          startingLocations={settings.startingLocations}
          handleStartingLocationChange={createChangeHandler('startingLocations')}
          addStartingLocation={createAddHandler('startingLocations', { name: '', description: '' })}
          removeStartingLocation={createRemoveHandler('startingLocations')}
        />
      </CollapsibleSection>
      
      <CollapsibleSection title={VIETNAMESE.startingFactionsSection} isOpen={openSections.factions} onToggle={() => toggleSection('factions')} itemCount={(settings.startingFactions || []).length}>
        {/* FIX: Pass props that match FactionsSectionProps */}
        <FactionsSection
          startingFactions={settings.startingFactions}
          handleStartingFactionChange={createChangeHandler('startingFactions')}
          addStartingFaction={createAddHandler('startingFactions', { name: '', description: '', alignment: GameTemplates.FactionAlignment.TRUNG_LAP, initialPlayerReputation: 0 })}
          removeStartingFaction={createRemoveHandler('startingFactions')}
        />
      </CollapsibleSection>
    </div>
  );
};

export default StartingElementsTab;