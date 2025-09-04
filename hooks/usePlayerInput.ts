
import { useState, useRef, useCallback } from 'react';
import { PlayerActionInputType, ResponseLength, AiChoice } from '../types';

interface UsePlayerInputProps {
  onPlayerAction: (action: AiChoice | string, isChoice: boolean, inputType: PlayerActionInputType, responseLength: ResponseLength, isStrictMode: boolean) => void;
  onRefreshChoices: (playerHint: string) => void;
  isLoading: boolean;
  isSummarizing: boolean;
  isCurrentlyActivePage: boolean;
  messageIdBeingEdited: string | null;
}

export const usePlayerInput = ({ onPlayerAction, onRefreshChoices, isLoading, isSummarizing, isCurrentlyActivePage, messageIdBeingEdited }: UsePlayerInputProps) => {
  const [playerInput, setPlayerInput] = useState('');
  const [currentActionType, setCurrentActionType] = useState<PlayerActionInputType>('action');
  const [selectedResponseLength, setSelectedResponseLength] = useState<ResponseLength>('default');
  const [isResponseLengthDropdownOpen, setIsResponseLengthDropdownOpen] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(true);
  const [isStrictMode, setIsStrictMode] = useState(false); // NEW: State for strict mode

  const responseLengthDropdownRef = useRef<HTMLDivElement | null>(null);
  
  const handleChoiceClick = useCallback((choice: AiChoice) => {
    if (!isLoading && !isSummarizing && isCurrentlyActivePage) {
      onPlayerAction(choice, true, 'action', selectedResponseLength, isStrictMode);
      setPlayerInput('');
    }
  }, [isLoading, isSummarizing, isCurrentlyActivePage, onPlayerAction, selectedResponseLength, isStrictMode]);
  
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (playerInput.trim() && !isLoading && !isSummarizing && isCurrentlyActivePage && !messageIdBeingEdited) {
      onPlayerAction(playerInput.trim(), false, currentActionType, selectedResponseLength, isStrictMode); // Pass isStrictMode
      setPlayerInput('');
    }
  }, [playerInput, isLoading, isSummarizing, isCurrentlyActivePage, messageIdBeingEdited, onPlayerAction, currentActionType, selectedResponseLength, isStrictMode]); // Add isStrictMode

  const handleRefresh = useCallback(() => {
    if (!isLoading && !isSummarizing && isCurrentlyActivePage) {
        onRefreshChoices(playerInput);
        setPlayerInput(''); // Clear input after refresh request
    }
  }, [isLoading, isSummarizing, isCurrentlyActivePage, onRefreshChoices, playerInput]);


  return {
    playerInput,
    setPlayerInput,
    currentActionType,
    setCurrentActionType,
    selectedResponseLength,
    setSelectedResponseLength,
    isResponseLengthDropdownOpen,
    setIsResponseLengthDropdownOpen,
    showAiSuggestions,
    setShowAiSuggestions,
    isStrictMode, // Expose state
    setIsStrictMode, // Expose setter
    responseLengthDropdownRef,
    handleChoiceClick,
    handleSubmit,
    handleRefresh,
  };
};
