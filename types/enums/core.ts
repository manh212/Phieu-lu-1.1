// types/enums/core.ts
export enum GameScreen {
  Initial = 'Initial', GameSetup = 'GameSetup', Gameplay = 'Gameplay', ApiSettings = 'ApiSettings',
  LoadGameSelection = 'LoadGameSelection', StorageSettings = 'StorageSettings', ImportExport = 'ImportExport', Equipment = 'Equipment', 
  Crafting = 'Crafting', Map = 'Map', Auction = 'Auction', Cultivation = 'Cultivation',
  CompanionManagement = 'CompanionManagement',
  PrisonerManagement = 'PrisonerManagement',
  CompanionEquipment = 'CompanionEquipment',
  SlaveAuction = 'SlaveAuction',
  Prompts = 'Prompts',
  Events = 'Events',
  AICopilotPanel = 'AICopilotPanel',
  Combat = 'Combat',
  ApiUsage = 'ApiUsage',
  ParameterSettings = 'ParameterSettings',
  RAGMemoryViewer = 'RAGMemoryViewer',
}

export type PlayerActionInputType = 'action' | 'story';
export type ResponseLength = 'default' | 'short' | 'medium' | 'long';

export const DIALOGUE_MARKER = '"';