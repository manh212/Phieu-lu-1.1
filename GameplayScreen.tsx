


















import React, { useRef, useEffect, useCallback, useMemo, useLayoutEffect, useState } from 'react';
import { GameScreen, GameMessage, StyleSettings, StyleSettingProperty, GameLocation, KnowledgeBase, AiChoice, PlayerActionInputType, ResponseLength } from './../types/index';
import { VIETNAMESE } from './../constants';
import * as GameTemplates from './../types/index'; // Import GameTemplates

// Import Layout Components
import GameHeader from './components/gameplay/layout/GameHeader';
import StoryLog from './components/gameplay/layout/StoryLog';
import PlayerInputArea from './components/gameplay/layout/PlayerInputArea';

// Import Panels & Modals
import OffCanvasPanel from './components/ui/OffCanvasPanel';
import CharacterSidePanel from './components/gameplay/CharacterSidePanel';
import QuestsSidePanel from './components/gameplay/QuestsSidePanel';
import WorldSidePanel from './components/gameplay/WorldSidePanel';
import DebugPanelDisplay from './components/gameplay/DebugPanelDisplay';
import MiniInfoPopover from './components/ui/MiniInfoPopover';
import { MainMenuPanel } from './components/gameplay/layout/MainMenuPanel';
import AICopilotPanel from './components/gameplay/AICopilotPanel';
import CombatStatusPanel from './components/gameplay/CombatStatusPanel'; // NEW: Import combat panel
import DebugCombatSetupModal from './components/combat/DebugCombatSetupModal'; // NEW: Import modal

// Import Custom Hooks
import { useGameplayPanels } from './hooks/useGameplayPanels';
import { usePlayerInput } from './hooks/usePlayerInput';
import { usePopover } from './hooks/usePopover';
import { useGame } from './hooks/useGame'; // Using useGame to get context
import { useCombat } from './hooks/useCombat'; // NEW: Import combat hook

// Import Utilities
import { parseAndHighlightText as parseAndHighlightTextUtil } from './utils/textHighlighting';
import Spinner from './components/ui/Spinner'; // Import Spinner

export const GameplayScreen: React.FC = () => {
    const game = useGame(); // Get all props from context
    const combat = useCombat(); // NEW: Get combat context
    const storyLogRef = useRef<HTMLDivElement>(null);

    // Use custom hooks for UI state not needed globally
    const { isReaderMode, setIsReaderMode, isCharPanelOpen, setIsCharPanelOpen, isQuestsPanelOpen, setIsQuestsPanelOpen, isWorldPanelOpen, setIsWorldPanelOpen, showDebugPanel, setShowDebugPanel, isMainMenuOpen, setIsMainMenuOpen, isCopilotOpen, setIsCopilotOpen } = useGameplayPanels();
    const { popover, handleKeywordClick, closePopover } = usePopover();
    const [isCombatSetupModalOpen, setIsCombatSetupModalOpen] = useState(false); // NEW: State for debug combat modal
    
    // NEW: Action Router to fix circular dependency
    const handleActionRouter = useCallback((
        action: AiChoice | string, 
        isChoice: boolean, 
        inputType: PlayerActionInputType, 
        responseLength: ResponseLength,
        isStrictMode: boolean
    ) => {
        if (combat.combatState.isInCombat) {
            const actionTag = typeof action === 'object' ? action.actionTag : undefined;
            combat.processPlayerAction(actionTag);
        } else {
            const actionText = typeof action === 'string' ? action : action.text;
            game.handlePlayerAction(actionText, isChoice, inputType, responseLength, isStrictMode);
        }
    }, [combat, game.handlePlayerAction]);

    // FIX: Removed isStrictMode and setIsStrictMode from destructuring as they are not returned by usePlayerInput.
    const {
        playerInput, setPlayerInput, currentActionType, setCurrentActionType,
        selectedResponseLength, setSelectedResponseLength,
        isResponseLengthDropdownOpen, setIsResponseLengthDropdownOpen, showAiSuggestions, setShowAiSuggestions,
        responseLengthDropdownRef, handleChoiceClick, handleSubmit, handleRefresh,
    } = usePlayerInput({
        onPlayerAction: handleActionRouter, // Use the new router function
        onRefreshChoices: game.handleRefreshChoices,
        isLoading: game.isLoadingApi || game.isSummarizingNextPageTransition || game.knowledgeBase.isWorldTicking,
        isSummarizing: game.isSummarizingOnLoad || game.isSummarizingNextPageTransition,
        isCurrentlyActivePage: game.isCurrentlyActivePage,
        messageIdBeingEdited: game.messageIdBeingEdited,
        // FIX: Added the required isStrictMode prop, sourcing it from the global game context.
        isStrictMode: game.isStrictMode,
    });

    const isLoadingUi = game.isLoadingApi || game.isUploadingAvatar || game.knowledgeBase.isWorldTicking;
    const isSummarizingUi = game.isSummarizingNextPageTransition || game.isSummarizingOnLoad;

    // --- NEW: Effect to start combat ---
    useEffect(() => {
        if (game.knowledgeBase.pendingOpponentIdsForCombat) {
            combat.startCombat(game.knowledgeBase.pendingOpponentIdsForCombat);
            // Clear the pending state after starting combat to prevent re-triggering
            game.setKnowledgeBase((prev: KnowledgeBase) => ({
                ...prev,
                pendingOpponentIdsForCombat: null
            }));
        }
    }, [game.knowledgeBase.pendingOpponentIdsForCombat, combat.startCombat, game.setKnowledgeBase]);

    // NEW: Handler for starting debug combat with selected opponents
    const handleStartDebugCombatWithOpponents = useCallback((opponentIds: string[]) => {
        const { showNotification, setKnowledgeBase, knowledgeBase } = game;
        
        if (opponentIds.length === 0) {
            showNotification("Vui lòng chọn ít nhất một đối thủ.", 'warning');
            return;
        }

        const allPotentialOpponents = [...knowledgeBase.discoveredNPCs, ...knowledgeBase.discoveredYeuThu];
        const opponentNames = opponentIds.map(id => {
            const opp = allPotentialOpponents.find(o => o.id === id);
            return opp ? opp.name : 'Không rõ';
        });

        showNotification(`Bắt đầu chiến đấu thử với: ${opponentNames.join(', ')}`, 'info');

        setKnowledgeBase((prev: KnowledgeBase) => ({
            ...prev,
            pendingOpponentIdsForCombat: opponentIds
        }));
        
        setIsCombatSetupModalOpen(false);
    }, [game, combat]);


    // Scroll management
    useLayoutEffect(() => {
        const storyLog = storyLogRef.current;
        if (storyLog && game.justLoadedGame.current) {
            storyLog.scrollTop = storyLog.scrollHeight;
            game.gameplayScrollPosition.current = storyLog.scrollTop;
            game.justLoadedGame.current = false;
        }
    }, [game.getMessagesForPage(game.currentPageDisplay), game.justLoadedGame, game.gameplayScrollPosition]);

    useLayoutEffect(() => {
        const storyLog = storyLogRef.current;
        if (storyLog && !game.justLoadedGame.current) {
            storyLog.scrollTop = game.gameplayScrollPosition.current;
        }
        return () => {
            if (storyLog) {
                game.gameplayScrollPosition.current = storyLog.scrollTop;
            }
        };
    }, []); // Empty dependency array runs this on mount and its cleanup on unmount.

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closePopover();
                game.setIsStyleSettingsModalOpen(false);
                game.closeModal();
                game.closeEconomyModal();
                game.closeSlaveMarketModal();
                setIsCopilotOpen(false);
                if (game.messageIdBeingEdited) game.onCancelEditMessage();
            }
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [closePopover, game, setIsCopilotOpen]);
    
    const getDynamicMessageStyles = useCallback((msgType: GameMessage['type']): React.CSSProperties => {
        const styles: React.CSSProperties = {};
        let settingsToApply: StyleSettingProperty | undefined;

        switch (msgType) {
            case 'narration':
                settingsToApply = game.styleSettings.narration;
                break;
            case 'player_action':
                settingsToApply = game.styleSettings.playerAction;
                break;
            default:
                return {};
        }

        if (settingsToApply) {
            if (settingsToApply.fontFamily && settingsToApply.fontFamily !== 'inherit') styles.fontFamily = settingsToApply.fontFamily;
            if (settingsToApply.fontSize && settingsToApply.fontSize !== 'inherit') styles.fontSize = settingsToApply.fontSize;
            if (settingsToApply.textColor) styles.color = settingsToApply.textColor;
            if (settingsToApply.backgroundColor) styles.backgroundColor = settingsToApply.backgroundColor;
        }

        return styles;
    }, [game.styleSettings]);
    
    const getChoiceButtonStyles = useCallback((): React.CSSProperties => {
        const styles: React.CSSProperties = {};
        const settingsToApply = game.styleSettings.choiceButton;
    
        if (settingsToApply) {
            if (settingsToApply.fontFamily && settingsToApply.fontFamily !== 'inherit') styles.fontFamily = settingsToApply.fontFamily;
            if (settingsToApply.fontSize && settingsToApply.fontSize !== 'inherit') styles.fontSize = settingsToApply.fontSize;
            if (settingsToApply.textColor) styles.color = settingsToApply.textColor;
            if (settingsToApply.backgroundColor && settingsToApply.backgroundColor !== 'transparent') styles.backgroundColor = settingsToApply.backgroundColor;
        }
        return styles;
    }, [game.styleSettings]);


    const isSaveDisabled = game.isSavingGame || isLoadingUi || isSummarizingUi;
    const isStopButtonDisabled = isSummarizingUi || (!isLoadingUi && !(game.knowledgeBase.turnHistory && game.knowledgeBase.turnHistory.length > 1));

    const gameTitleDisplay = game.knowledgeBase.manualSaveName || game.knowledgeBase.worldConfig?.saveGameName || game.knowledgeBase.worldConfig?.theme || "Role Play AI";

    const currentLocation = game.knowledgeBase.discoveredLocations.find(l => l.id === game.knowledgeBase.currentLocationId);
    const economySubLocations = useMemo(() => {
        if (!currentLocation) return [];
        return game.knowledgeBase.discoveredLocations.filter(loc =>
            loc.parentLocationId === currentLocation.id &&
            (Object.values(GameTemplates.EconomyLocationType).includes(loc.locationType as any))
        );
    }, [currentLocation, game.knowledgeBase.discoveredLocations]);

    const handleEconomyLocationClick = useCallback((location: GameLocation) => {
        if (isLoadingUi || isSummarizingUi || !!game.messageIdBeingEdited) return;

        switch(location.locationType) {
            case GameTemplates.EconomyLocationType.MARKETPLACE:
                game.setActiveEconomyModal({ type: 'marketplace', locationId: location.id });
                break;
            case GameTemplates.EconomyLocationType.SHOPPING_CENTER:
                game.setActiveEconomyModal({ type: 'shopping_center', locationId: location.id });
                break;
            case GameTemplates.EconomyLocationType.AUCTION_HOUSE:
                game.handleStartAuction(location.id);
                break;
            case GameTemplates.EconomyLocationType.SLAVE_MARKET:
                game.setActiveSlaveMarketModal({ locationId: location.id });
                break;
            case GameTemplates.EconomyLocationType.SLAVE_AUCTION:
                game.handleStartSlaveAuction(location.id);
                break;
            default:
                console.warn("Unknown economy location type clicked:", location.locationType);
        }
    }, [isLoadingUi, isSummarizingUi, game]);

    const parseAndHighlightText = useCallback((text: string) => {
        return parseAndHighlightTextUtil(text, game.knowledgeBase, game.styleSettings, handleKeywordClick);
    }, [game.knowledgeBase, game.styleSettings, handleKeywordClick]);

    return (
        <div className="h-screen flex flex-col bg-gray-900 text-gray-100 p-2 sm:p-4">
            {!isReaderMode && (
                <GameHeader
                    gameTitleDisplay={gameTitleDisplay}
                    knowledgeBase={game.knowledgeBase}
                    setIsMainMenuOpen={setIsMainMenuOpen}
                    onRollbackTurn={game.onRollbackTurn}
                    isStopButtonDisabled={isStopButtonDisabled}
                    isLoading={isLoadingUi}
                    onSaveGame={game.onSaveGame}
                    isSaveDisabled={isSaveDisabled}
                    isSavingGame={game.isSavingGame}
                    onQuit={game.onQuit}
                    isSummarizing={isSummarizingUi}
                    onToggleCopilot={() => setIsCopilotOpen(true)}
                />
            )}
            
            <div className="flex-grow flex flex-col bg-gray-850 shadow-xl rounded-lg overflow-hidden relative min-h-0">
                 {combat.combatState.isInCombat && <CombatStatusPanel />}
                 {game.knowledgeBase.isWorldTicking && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20" aria-live="polite" aria-busy="true">
                        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm shadow-lg border border-sky-500/50">
                            <Spinner size="sm" />
                            <span>Thế giới đang vận động...</span>
                        </div>
                    </div>
                )}
                <StoryLog 
                    storyLogRef={storyLogRef}
                    displayedMessages={game.getMessagesForPage(game.currentPageDisplay)}
                    isLoadingUi={isLoadingUi}
                    isSummarizingUi={isSummarizingUi}
                    isCurrentlyActivePage={game.isCurrentlyActivePage}
                    knowledgeBase={game.knowledgeBase}
                    styleSettings={game.styleSettings}
                    messageIdBeingEdited={game.messageIdBeingEdited}
                    currentEditText={""}
                    setCurrentEditText={() => {}}
                    onStartEditMessage={game.onStartEditMessage}
                    onSaveEditedMessage={game.onSaveEditedMessage}
                    onCancelEditMessage={game.onCancelEditMessage}
                    parseAndHighlightText={parseAndHighlightText}
                    getDynamicMessageStyles={getDynamicMessageStyles}
                    onClick={() => setIsReaderMode(prev => !prev)}
                     onAskCopilotAboutError={(errorMsg) => {
                        game.handleCopilotQuery("Giải thích lỗi này giúp tôi.", errorMsg);
                        setIsCopilotOpen(true);
                    }}
                />
                 {!isReaderMode && (
                    <div className="flex-shrink-0">
                        <PlayerInputArea 
                            latestMessageWithChoices={[...game.getMessagesForPage(game.currentPageDisplay)].reverse().find(msg => msg.type === 'narration' && msg.choices && msg.choices.length > 0)}
                            showAiSuggestions={showAiSuggestions} setShowAiSuggestions={setShowAiSuggestions}
                            playerInput={playerInput} setPlayerInput={setPlayerInput}
                            currentActionType={currentActionType} setCurrentActionType={setCurrentActionType}
                            selectedResponseLength={selectedResponseLength} setSelectedResponseLength={setSelectedResponseLength}
                            isResponseLengthDropdownOpen={isResponseLengthDropdownOpen} setIsResponseLengthDropdownOpen={setIsResponseLengthDropdownOpen}
                            responseLengthDropdownRef={responseLengthDropdownRef}
                            isLoadingUi={isLoadingUi}
                            isSummarizingUi={isSummarizingUi}
                            isCurrentlyActivePage={game.isCurrentlyActivePage}
                            messageIdBeingEdited={game.messageIdBeingEdited}
                            handleChoiceClick={handleChoiceClick}
                            handleSubmit={handleSubmit}
                            handleRefresh={handleRefresh}
                            choiceButtonStyles={getChoiceButtonStyles()}
                            currentPage={game.currentPageDisplay}
                            totalPages={game.totalPages}
                            onPrev={game.onGoToPrevPage}
                            onNext={game.onGoToNextPage}
                            onJump={game.onJumpToPage}
                            economySubLocations={economySubLocations}
                            onEconomyLocationClick={handleEconomyLocationClick}
                            // FIX: Pass the global strict mode state and toggle function from the game context.
                            isStrictMode={game.isStrictMode}
                            onToggleStrictMode={game.toggleStrictMode}
                        />
                    </div>
                 )}
            </div>

            <OffCanvasPanel isOpen={isMainMenuOpen} onClose={() => setIsMainMenuOpen(false)} title="Menu Trò Chơi" position="right">
                <MainMenuPanel
                    onClose={() => setIsMainMenuOpen(false)}
                    setIsCharPanelOpen={setIsCharPanelOpen}
                    setIsQuestsPanelOpen={setIsQuestsPanelOpen}
                    setIsWorldPanelOpen={setIsWorldPanelOpen}
                    showDebugPanel={showDebugPanel}
                    setShowDebugPanel={setShowDebugPanel}
                />
            </OffCanvasPanel>

            <OffCanvasPanel isOpen={isCharPanelOpen} onClose={() => setIsCharPanelOpen(false)} title={VIETNAMESE.characterPanelTitle} position="right">
                <CharacterSidePanel knowledgeBase={game.knowledgeBase} onItemClick={(item) => game.openEntityModal('item', item)} onSkillClick={(skill) => game.openEntityModal('skill', skill)} onPlayerAvatarUploadRequest={game.onUpdatePlayerAvatar} isUploadingPlayerAvatar={game.isUploadingAvatar} />
            </OffCanvasPanel>
             <OffCanvasPanel isOpen={isQuestsPanelOpen} onClose={() => setIsQuestsPanelOpen(false)} title={VIETNAMESE.questsPanelTitle} position="right">
                <QuestsSidePanel quests={game.knowledgeBase.allQuests} onQuestClick={(quest) => game.openEntityModal('quest', quest)} onQuestEditClick={(quest) => game.openEntityModal('quest', quest, true)}/>
            </OffCanvasPanel>
             <OffCanvasPanel isOpen={isWorldPanelOpen} onClose={() => setIsWorldPanelOpen(false)} title={VIETNAMESE.worldPanelTitle} position="right">
                {/* FIX: Pass all required on...Click and on...EditClick props to WorldSidePanel. */}
                <WorldSidePanel 
                    knowledgeBase={game.knowledgeBase}
                    onNpcClick={(npc) => game.openEntityModal('npc', npc)}
                    onNpcEditClick={(npc) => game.openEntityModal('npc', npc, true)}
                    onYeuThuClick={(yeuThu) => game.openEntityModal('yeuThu', yeuThu)}
                    onYeuThuEditClick={(yeuThu) => game.openEntityModal('yeuThu', yeuThu, true)}
                    onLocationClick={(location) => game.openEntityModal('location', location)}
                    onLocationEditClick={(location) => game.openEntityModal('location', location, true)}
                    onLoreClick={(lore) => game.openEntityModal('lore', lore)}
                    onLoreEditClick={(lore) => game.openEntityModal('lore', lore, true)}
                    onFactionClick={(faction) => game.openEntityModal('faction', faction)}
                    onFactionEditClick={(faction) => game.openEntityModal('faction', faction, true)}
                    onCompanionClick={(companion) => game.openEntityModal('companion', companion)}
                    onCompanionEditClick={(companion) => game.openEntityModal('companion', companion, true)}
                />
            </OffCanvasPanel>
            
            <AICopilotPanel isOpen={isCopilotOpen} onClose={() => setIsCopilotOpen(false)} />

            <MiniInfoPopover isOpen={popover.isOpen} targetRect={popover.targetRect} entity={popover.entity} entityType={popover.entityType} onClose={closePopover} knowledgeBase={game.knowledgeBase} />
            
            {!isReaderMode && showDebugPanel && <DebugPanelDisplay 
                kb={game.knowledgeBase} 
                sentPromptsLog={game.sentPromptsLog} 
                rawAiResponsesLog={game.rawAiResponsesLog} 
                aiThinkingLog={game.aiThinkingLog}
                sentEconomyPromptsLog={game.sentEconomyPromptsLog} 
                receivedEconomyResponsesLog={game.receivedEconomyResponsesLog} 
                sentGeneralSubLocationPromptsLog={game.sentGeneralSubLocationPromptsLog} 
                receivedGeneralSubLocationResponsesLog={game.receivedGeneralSubLocationResponsesLog} 
                latestPromptTokenCount={game.latestPromptTokenCount} 
                summarizationResponsesLog={game.summarizationResponsesLog} 
                sentCraftingPromptsLog={game.sentCraftingPromptsLog} 
                receivedCraftingResponsesLog={game.receivedCraftingResponsesLog} 
                sentNpcAvatarPromptsLog={game.sentNpcAvatarPromptsLog} 
                retrievedRagContextLog={game.retrievedRagContextLog}
                currentPageDisplay={game.currentPageDisplay} 
                totalPages={game.totalPages} 
                isAutoPlaying={game.isAutoPlaying} 
                onToggleAutoPlay={game.onToggleAutoPlay} 
                onStartDebugCombat={() => setIsCombatSetupModalOpen(true)} 
                onProcessDebugTags={game.handleProcessDebugTags} 
                isLoading={isLoadingUi} 
                onCheckTokenCount={game.handleCheckTokenCount}
                sentCombatSummaryPromptsLog={game.sentCombatSummaryPromptsLog}
                receivedCombatSummaryResponsesLog={game.receivedCombatSummaryResponsesLog}
                sentVictoryConsequencePromptsLog={game.sentVictoryConsequencePromptsLog}
                receivedVictoryConsequenceResponsesLog={game.receivedVictoryConsequenceResponsesLog}
                sentLivingWorldPromptsLog={game.sentLivingWorldPromptsLog}
                rawLivingWorldResponsesLog={game.rawLivingWorldResponsesLog}
                lastScoredNpcsForTick={game.lastScoredNpcsForTick}
                onManualTick={game.handleManualTick}
            />}
            <DebugCombatSetupModal
                isOpen={isCombatSetupModalOpen}
                onClose={() => setIsCombatSetupModalOpen(false)}
                knowledgeBase={game.knowledgeBase}
                onStartCombat={handleStartDebugCombatWithOpponents}
            />
        </div>
    );
};