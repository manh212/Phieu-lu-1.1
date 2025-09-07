import React, { ChangeEvent, useState, useRef, useEffect } from 'react';
import { GameMessage, PlayerActionInputType, ResponseLength, GameLocation, AiChoice } from '../../../types/index';
import Button from '../../ui/Button';
import { VIETNAMESE } from '../../../constants';
import * as GameTemplates from '../../../types/index';

interface PlayerInputAreaProps {
  latestMessageWithChoices: GameMessage | undefined;
  showAiSuggestions: boolean;
  setShowAiSuggestions: (show: boolean) => void;
  playerInput: string;
  setPlayerInput: (input: string) => void;
  currentActionType: PlayerActionInputType;
  setCurrentActionType: (type: PlayerActionInputType) => void;
  selectedResponseLength: ResponseLength;
  setSelectedResponseLength: (length: ResponseLength) => void;
  isResponseLengthDropdownOpen: boolean;
  setIsResponseLengthDropdownOpen: (isOpen: boolean) => void;
  responseLengthDropdownRef: React.RefObject<HTMLDivElement | null>;
  isLoadingUi: boolean;
  isSummarizingUi: boolean;
  isCurrentlyActivePage: boolean;
  messageIdBeingEdited: string | null;
  handleChoiceClick: (choice: AiChoice) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleRefresh: () => void;
  choiceButtonStyles: React.CSSProperties;
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onJump: (page: number) => void;
  economySubLocations: GameLocation[];
  onEconomyLocationClick: (location: GameLocation) => void;
  isStrictMode: boolean;
  setIsStrictMode: (isStrict: boolean) => void;
}

const PlayerInputArea: React.FC<PlayerInputAreaProps> = ({
  latestMessageWithChoices,
  showAiSuggestions,
  setShowAiSuggestions,
  playerInput,
  setPlayerInput,
  currentActionType,
  setCurrentActionType,
  selectedResponseLength,
  setSelectedResponseLength,
  isResponseLengthDropdownOpen,
  setIsResponseLengthDropdownOpen,
  responseLengthDropdownRef,
  isLoadingUi,
  isSummarizingUi,
  isCurrentlyActivePage,
  messageIdBeingEdited,
  handleChoiceClick,
  handleSubmit,
  handleRefresh,
  choiceButtonStyles,
  currentPage,
  totalPages,
  onPrev,
  onNext,
  onJump,
  economySubLocations,
  onEconomyLocationClick,
  isStrictMode,
  setIsStrictMode,
}) => {
    const [isPaginationMenuOpen, setIsPaginationMenuOpen] = useState(false);
    const paginationMenuRef = useRef<HTMLDivElement | null>(null);
    const [jumpToPageInput, setJumpToPageInput] = useState<string>(currentPage.toString());
    
    const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
    const locationMenuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setJumpToPageInput(currentPage.toString());
    }, [currentPage]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (paginationMenuRef.current && !paginationMenuRef.current.contains(event.target as Node)) {
                setIsPaginationMenuOpen(false);
            }
            if (locationMenuRef.current && !locationMenuRef.current.contains(event.target as Node)) {
                setIsLocationMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleJumpInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setJumpToPageInput(e.target.value);
    };

    const handleJumpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const pageNum = parseInt(jumpToPageInput, 10);
        if (!isNaN(pageNum)) {
            onJump(pageNum);
            setIsPaginationMenuOpen(false);
        }
    };
    
    const handlePrevClick = () => {
        onPrev();
        setIsPaginationMenuOpen(false);
    };

    const handleNextClick = () => {
        onNext();
        setIsPaginationMenuOpen(false);
    };

    const responseLengthOptions: { label: string, value: ResponseLength }[] = [
        { label: VIETNAMESE.responseLength_default, value: 'default' },
        { label: VIETNAMESE.responseLength_short, value: 'short' },
        { label: VIETNAMESE.responseLength_medium, value: 'medium' },
        { label: VIETNAMESE.responseLength_long, value: 'long' },
    ];

  const isAction = currentActionType === 'action';
  const canRefresh = !isLoadingUi && !isSummarizingUi && isCurrentlyActivePage && !messageIdBeingEdited && !!latestMessageWithChoices?.choices?.length;
  const choicesToDisplay = latestMessageWithChoices?.choices;

  return (
    <div className="bg-gray-800 p-2 sm:p-3 border-t border-gray-700 flex-shrink-0">
      {choicesToDisplay && choicesToDisplay.length > 0 && isCurrentlyActivePage && !isSummarizingUi && (
        <div className="mb-2">
          <Button type="button" variant="ghost" size="sm" className="w-full text-left justify-start py-1.5 px-2 text-xs text-indigo-300 hover:text-indigo-200 mb-1" onClick={() => setShowAiSuggestions(!showAiSuggestions)}>
            {showAiSuggestions ? VIETNAMESE.hideAiSuggestionsButton : VIETNAMESE.showAiSuggestionsButton}
          </Button>
          {showAiSuggestions && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2">
              {choicesToDisplay.map((choice, index) => (
                <Button 
                  key={index} 
                  variant="ghost" 
                  className="w-full text-left justify-start py-1.5 px-2 sm:py-2 sm:px-3 text-xs sm:text-sm whitespace-normal h-auto" 
                  onClick={() => handleChoiceClick(choice)} 
                  disabled={isLoadingUi || isSummarizingUi || !isCurrentlyActivePage || !!messageIdBeingEdited} 
                  title={choice.text}
                  customStyles={choiceButtonStyles}
                >
                  {index + 1}. {choice.text}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-2">
            <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`w-full sm:w-auto h-full justify-center transition-colors duration-200 ${isAction ? 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500 border-indigo-500' : 'bg-teal-600 hover:bg-teal-700 text-white focus:ring-teal-500 border-teal-500'}`}
                    onClick={() => setCurrentActionType(isAction ? 'story' : 'action')}
                    disabled={isLoadingUi || isSummarizingUi || !isCurrentlyActivePage || !!messageIdBeingEdited}
                    title={isAction ? VIETNAMESE.inputTypeToggleTooltipAction : VIETNAMESE.inputTypeToggleTooltipStory}
                >
                    <span className="flex items-center gap-2">
                        {isAction ? '⚔️' : '📖'}
                        <span>{isAction ? VIETNAMESE.inputTypeActionLabel : VIETNAMESE.inputTypeStoryLabel}</span>
                    </span>
                </Button>

                <div ref={responseLengthDropdownRef} className="relative flex-shrink-0">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full sm:w-auto h-full justify-between"
                        onClick={() => setIsResponseLengthDropdownOpen(!isResponseLengthDropdownOpen)}
                        disabled={isLoadingUi || isSummarizingUi || !isCurrentlyActivePage || !!messageIdBeingEdited}
                        id="response-length-button"
                        aria-haspopup="menu"
                        aria-expanded={isResponseLengthDropdownOpen}
                        aria-controls="response-length-menu"
                    >
                        <span>{VIETNAMESE.responseLengthLabel}: {responseLengthOptions.find(o => o.value === selectedResponseLength)?.label}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </Button>
                    {isResponseLengthDropdownOpen && (
                        <div id="response-length-menu" role="menu" aria-labelledby="response-length-button" className="absolute bottom-full right-0 mb-1 w-max bg-gray-600 rounded-md shadow-lg z-20">
                            {responseLengthOptions.map(opt => (
                                <a
                                    key={opt.value}
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); setSelectedResponseLength(opt.value); setIsResponseLengthDropdownOpen(false); }}
                                    className="block px-4 py-2 text-sm text-gray-200 hover:bg-indigo-500 first:rounded-t-md last:rounded-b-md"
                                    role="menuitem"
                                >
                                    {opt.label}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
                <input
                type="text"
                value={playerInput}
                onChange={(e) => setPlayerInput(e.target.value)}
                placeholder={!isCurrentlyActivePage ? "Chỉ có thể hành động ở trang hiện tại nhất." : VIETNAMESE.enterAction}
                aria-label={VIETNAMESE.enterAction}
                className="flex-grow w-full p-2 sm:p-2.5 text-sm sm:text-base bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 placeholder-gray-400"
                disabled={isLoadingUi || isSummarizingUi || !isCurrentlyActivePage || !!messageIdBeingEdited}
                />
                
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsStrictMode(!isStrictMode)}
                    disabled={isLoadingUi || isSummarizingUi || !isCurrentlyActivePage || !!messageIdBeingEdited}
                    title={isStrictMode ? "Tắt Chế độ Nghiêm ngặt (AI sẽ diễn giải và hành động tự do hơn)" : "Bật Chế độ Nghiêm ngặt (AI chỉ thực hiện hành động vật lý bạn yêu cầu)"}
                    className={`h-full px-3 transition-colors ${isStrictMode ? 'bg-blue-600 text-white border-blue-500' : 'text-gray-400'}`}
                    aria-pressed={isStrictMode}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        {isStrictMode ? (
                            <path fillRule="evenodd" d="M10 1a3 3 0 00-3 3v1H6a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002 2V7a2 2 0 00-2-2h-1V4a3 3 0 00-3-3zM9 4a1 1 0 012 0v1H9V4z" clipRule="evenodd" />
                        ) : (
                            <>
                                <path fillRule="evenodd" d="M10 4a3 3 0 00-3 3v1h6V7a3 3 0 00-3-3zM7 7v1h6V7a3 3 0 00-6 0z" clipRule="evenodd" />
                                <path d="M5 10a2 2 0 012-2h6a2 2 0 012 2v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7z" />
                            </>
                        )}
                    </svg>
                </Button>

                <div className="flex flex-col gap-1 sm:gap-2">
                    <Button type="submit" variant="primary" size="sm" className="px-3 sm:px-4 w-full flex-grow" disabled={isLoadingUi || isSummarizingUi || playerInput.trim() === "" || !isCurrentlyActivePage || !!messageIdBeingEdited} isLoading={isLoadingUi && !isSummarizingUi} loadingText={VIETNAMESE.sendingAction}>
                        {VIETNAMESE.sendInputButton}
                    </Button>
                    <Button 
                        type="button" 
                        variant="secondary" 
                        size="sm" 
                        className="px-3 sm:px-4 w-full flex-grow border-purple-500 text-purple-300 hover:bg-purple-700 hover:text-white" 
                        disabled={!canRefresh} 
                        onClick={handleRefresh}
                        title="Linh Cảm Dẫn Lối: Yêu cầu AI tạo lựa chọn mới (có thể kèm gợi ý)."
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7V9a1 1 0 01-2 0V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13V11a1 1 0 112 0v6a1 1 0 01-1 1h-6a1 1 0 110-2h2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                    </Button>
                </div>
                
                <div className="flex gap-2">
                    {economySubLocations.length > 0 && (
                        <div ref={locationMenuRef} className="relative flex-shrink-0">
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="w-full sm:w-auto h-full justify-center px-3"
                                onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
                                disabled={isLoadingUi || isSummarizingUi || !!messageIdBeingEdited}
                                title="Mở Menu Địa Điểm Phụ"
                                aria-haspopup="true"
                                aria-expanded={isLocationMenuOpen}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                            </Button>
                            {isLocationMenuOpen && (
                                <div className="absolute bottom-full right-0 mb-2 w-max max-w-xs bg-gray-600 rounded-lg shadow-lg z-20 p-2 border border-gray-500 space-y-2">
                                    {economySubLocations.map(loc => {
                                        let buttonLabel = loc.name;
                                        if (loc.locationType === GameTemplates.EconomyLocationType.MARKETPLACE) buttonLabel = VIETNAMESE.openMarketplaceButton || loc.name;
                                        else if (loc.locationType === GameTemplates.EconomyLocationType.SHOPPING_CENTER) buttonLabel = VIETNAMESE.openShoppingCenterButton || loc.name;
                                        else if (loc.locationType === GameTemplates.EconomyLocationType.AUCTION_HOUSE) buttonLabel = VIETNAMESE.openAuctionHouseButton || loc.name;
                                        else if (loc.locationType === GameTemplates.EconomyLocationType.SLAVE_MARKET) buttonLabel = VIETNAMESE.openSlaveMarketButton || loc.name;
                                        else if (loc.locationType === GameTemplates.EconomyLocationType.SLAVE_AUCTION) buttonLabel = VIETNAMESE.openSlaveAuctionButton || loc.name;
                                        
                                        return (
                                            <Button
                                                key={loc.id}
                                                variant="ghost"
                                                size="sm"
                                                className="w-full text-left justify-start text-sm hover:bg-indigo-600"
                                                onClick={() => { onEconomyLocationClick(loc); setIsLocationMenuOpen(false); }}
                                            >
                                                {buttonLabel}
                                            </Button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div ref={paginationMenuRef} className="relative flex-shrink-0">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="w-full sm:w-auto h-full justify-center px-3"
                            onClick={() => setIsPaginationMenuOpen(!isPaginationMenuOpen)}
                            disabled={isLoadingUi || isSummarizingUi || !!messageIdBeingEdited}
                            title="Mở Menu Trang"
                            id="pagination-button"
                            aria-haspopup="true"
                            aria-expanded={isPaginationMenuOpen}
                            aria-controls="pagination-menu"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </Button>
                        {isPaginationMenuOpen && (
                            <div id="pagination-menu" aria-labelledby="pagination-button" className="absolute bottom-full right-0 mb-2 w-72 bg-gray-600 rounded-lg shadow-lg z-20 p-3 border border-gray-500 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Button onClick={handlePrevClick} disabled={currentPage <= 1 || isSummarizingUi} size="sm" variant="ghost" className="text-xs px-2 py-1">
                                        {VIETNAMESE.previousPage}
                                    </Button>
                                    <span className="text-sm text-gray-200 mx-2 font-semibold" aria-live="polite">
                                        {VIETNAMESE.pageIndicator(currentPage, totalPages)}
                                    </span>
                                    <Button onClick={handleNextClick} disabled={currentPage >= totalPages || isSummarizingUi} size="sm" variant="ghost" className="text-xs px-2 py-1">
                                        {VIETNAMESE.nextPage}
                                    </Button>
                                </div>
                                <form onSubmit={handleJumpSubmit} className="flex items-center gap-2 border-t border-gray-500 pt-3" aria-label="Chuyển trang nhanh">
                                    <input
                                        type="number"
                                        value={jumpToPageInput}
                                        onChange={handleJumpInputChange}
                                        min="1"
                                        max={totalPages}
                                        className="w-full p-2 text-sm text-center bg-gray-800 border border-gray-700 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-100"
                                        aria-label="Nhập số trang để chuyển tới"
                                        disabled={isSummarizingUi}
                                    />
                                    <Button type="submit" size="sm" variant="primary" className="h-full px-3" disabled={isSummarizingUi}>
                                        {VIETNAMESE.goToPage}
                                    </Button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </form>
    </div>
  );
};

export default PlayerInputArea;