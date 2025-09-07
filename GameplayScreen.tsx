import React, { useRef, useEffect, useCallback, useMemo, useLayoutEffect } from 'react';
import { GameScreen, GameMessage, StyleSettings, StyleSettingProperty, GameLocation, KnowledgeBase } from './types/index';
import { VIETNAMESE } from './constants';
import * as GameTemplates from './types/index'; // Import GameTemplates

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
import MiniInfoPopover from './components/gameplay/MiniInfoPopover';
import { MainMenuPanel } from './components/gameplay/layout/MainMenuPanel';
import AICopilotPanel from './components/gameplay/AICopilotPanel';

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
    
    const {
        playerInput, setPlayerInput, currentActionType, setCurrentActionType,
        selectedResponseLength, setSelectedResponseLength,
        isResponseLengthDropdownOpen, setIsResponseLengthDropdownOpen, showAiSuggestions, setShowAiSuggestions,
        responseLengthDropdownRef, handleChoiceClick, handleSubmit, handleRefresh,
        isStrictMode, setIsStrictMode
    } = usePlayerInput({
        onPlayerAction: game.handlePlayerAction,
        onRefreshChoices: game.handleRefreshChoices,
        isLoading: game.isLoadingApi || game.isSummarizingNextPageTransition || game.knowledgeBase.isWorldTicking,
        isSummarizing: game.isSummarizingOnLoad || game.isSummarizingNextPageTransition,
        isCurrentlyActivePage: game.isCurrentlyActivePage,
        messageIdBeingEdited: game.messageIdBeingEdited,
    });

    const isLoadingUi = game.isLoadingApi || game.isUploadingAvatar || game.knowledgeBase.isWorldTicking;
    const isSummarizingUi = game.isSummarizingNextPageTransition || game.isSummarizingOnLoad;

    // --- NEW: Effect to start combat ---
    useEffect(() => {
        if (game.knowledgeBase.pendingOpponentIdsForCombat && game.knowledgeBase.pendingOpponentIdsForCombat.length > 0) {
            combat.startCombat(game.knowledgeBase.pendingOpponentIdsForCombat);
            // Clear the pending state after starting combat to prevent re-triggering
            game.setKnowledgeBase((prev: KnowledgeBase) => ({
                ...prev,
                pendingOpponentIdsForCombat: null
            }));
            // Switch to combat screen
            game.setCurrentScreen(GameScreen.Combat);
        }
    }, [game.knowledgeBase.pendingOpponentIdsForCombat, combat.startCombat, game.setKnowledgeBase, game.setCurrentScreen]);

    // --- NEW: Effect to handle post-combat results ---
    useEffect(() => {
        if (game.knowledgeBase.postCombatState) {
            game.handleCombatEnd(game.knowledgeBase.postCombatState);
        }
    }, [game.knowledgeBase.postCombatState, game.handleCombatEnd]);


    const handleStartDebugCombat = useCallback(() => {
        const { knowledgeBase, setKnowledgeBase, showNotification } = game;
        const { combatState } = combat;
    
        if (combatState.isInCombat) {
            showNotification("Đã ở trong trận chiến!", 'warning');
            return;
        }
    
        const opponentsInLocation = [
            ...knowledgeBase.discoveredNPCs.filter((npc: any) => npc.locationId === knowledgeBase.currentLocationId && !npc.isEssential),
            ...knowledgeBase.discoveredYeuThu.filter((yt: any) => yt.locationId === knowledgeBase.currentLocationId)
        ];

        let potentialOpponents = opponentsInLocation;

        if(potentialOpponents.length === 0) {
             potentialOpponents = [
                ...knowledgeBase.discoveredNPCs.filter((npc: any) => !npc.isEssential),
                ...knowledgeBase.discoveredYeuThu
            ];
        }
    
        if (potentialOpponents.length === 0) {
            showNotification("Không tìm thấy đối thủ nào để bắt đầu chiến đấu thử.", 'error');
            return;
        }
    
        const shuffled = potentialOpponents.sort(() => 0.5 - Math.random());
        const selectedOpponents = shuffled.slice(0, Math.min(2, shuffled.length));
        const opponentIds = selectedOpponents.map((opp: any) => opp.id);
    
        showNotification(`Bắt đầu chiến đấu thử với: ${selectedOpponents.map((o: any) => o.name).join(', ')}`, 'info');
    
        setKnowledgeBase((prev: KnowledgeBase) => ({
            ...prev,
            pendingOpponentIdsForCombat: opponentIds
        }));
    
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
                setIsCopilotOpen(false); // NEW
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
            if (settingsToApply.fontFamily && settingsToApply.fontFamily !== 'inherit') {
                styles.fontFamily = settingsToApply.fontFamily;
            }
            if (settingsToApply.fontSize && settingsToApply.fontSize !== 'inherit') {
                styles.fontSize = settingsToApply.fontSize;
            }
            if (settingsToApply.textColor) {
                styles.color = settingsToApply.textColor;
            }
            if (settingsToApply.backgroundColor) {
                styles.backgroundColor = settingsToApply.backgroundColor;
            }
        }

        return styles;
    }, [game.styleSettings]);
    
    const getChoiceButtonStyles = useCallback((): React.CSSProperties => {
        const styles: React.CSSProperties = {};
        const settingsToApply = game.styleSettings.choiceButton;
    
        if (settingsToApply) {
            if (settingsToApply.fontFamily && settingsToApply.fontFamily !== 'inherit') {
                styles.fontFamily = settingsToApply.fontFamily;
            }
            if (settingsToApply.fontSize && settingsToApply.fontSize !== 'inherit') {
                styles.fontSize = settingsToApply.fontSize;
            }
            if (settingsToApply.textColor) {
                styles.color = settingsToApply.textColor;
            }
            if (settingsToApply.backgroundColor && settingsToApply.backgroundColor !== 'transparent') {
                styles.backgroundColor = settingsToApply.backgroundColor;
            }
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
                            isStrictMode={isStrictMode}
                            setIsStrictMode={setIsStrictMode}
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
                <QuestsSidePanel quests={game.knowledgeBase.allQuests} onQuestClick={(quest) => game.openEntityModal('quest', quest)} />
            </OffCanvasPanel>
             <OffCanvasPanel isOpen={isWorldPanelOpen} onClose={() => setIsWorldPanelOpen(false)} title={VIETNAMESE.worldPanelTitle} position="right">
                <WorldSidePanel 
                    knowledgeBase={game.knowledgeBase} 
                    onNpcClick={(npc) => game.openEntityModal('npc', npc)} 
                    onYeuThuClick={(yt) => game.openEntityModal('yeuThu', yt)}
                    onLocationClick={(loc) => game.openEntityModal('location', loc)} 
                    onLoreClick={(lore) => game.openEntityModal('lore', lore)} 
                    onFactionClick={(fac) => game.openEntityModal('faction', fac)}
                    onCompanionClick={(comp) => game.openEntityModal('companion', comp)}
                />
            </OffCanvasPanel>
            
            <AICopilotPanel isOpen={isCopilotOpen} onClose={() => setIsCopilotOpen(false)} />

            <MiniInfoPopover isOpen={popover.isOpen} targetRect={popover.targetRect} entity={popover.entity} entityType={popover.entityType} onClose={closePopover} knowledgeBase={game.knowledgeBase} />
            {!isReaderMode && showDebugPanel && <DebugPanelDisplay 
                kb={game.knowledgeBase} 
                sentPromptsLog={game.sentPromptsLog} 
                rawAiResponsesLog={game.rawAiResponsesLog} 
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
                onStartDebugCombat={handleStartDebugCombat} 
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
        </div>
    );
};