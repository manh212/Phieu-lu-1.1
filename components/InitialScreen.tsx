

import React, { useCallback, useRef, useEffect } from 'react';
import { GameScreen } from '@/types/index'; 
import Button from './ui/Button';
import { VIETNAMESE, GAME_TITLE, APP_VERSION } from '@/constants';

interface InitialScreenProps {
  setCurrentScreen: (screen: GameScreen) => void;
  onSignOut: () => void; 
  isFirebaseLoading: boolean; 
}

const InitialScreen: React.FC<InitialScreenProps> = ({ setCurrentScreen }) => {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Automatically focus the main title when the screen loads for better accessibility.
    titleRef.current?.focus();
  }, []);

  const handleLoadGameClick = useCallback(() => {
    setCurrentScreen(GameScreen.LoadGameSelection);
  }, [setCurrentScreen]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-6 text-center">
      <h1
        ref={titleRef}
        tabIndex={-1}
        className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 mb-6 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 rounded-lg"
      >
        {GAME_TITLE}
      </h1>
      <p className="text-xl text-gray-300 mb-12 max-w-2xl">{VIETNAMESE.welcomeMessage(GAME_TITLE)}</p>
      
      <nav aria-label={VIETNAMESE.mainMenu || 'Menu chính'} className="w-full max-w-sm">
        <ul className="space-y-4">
          <li>
            <Button 
              variant="primary" 
              size="lg" 
              className="w-full"
              onClick={() => setCurrentScreen(GameScreen.GameSetup)}
            >
              {VIETNAMESE.newGame}
            </Button>
          </li>
          <li>
            <Button 
              variant="secondary" 
              size="lg" 
              className="w-full" 
              onClick={handleLoadGameClick}
            >
              {VIETNAMESE.loadGame}
            </Button>
          </li>
          <li>
            <Button 
                variant="ghost" 
                size="md" 
                className="w-full" 
                onClick={() => setCurrentScreen(GameScreen.ImportExport)}
              >
              {VIETNAMESE.importExportData}
            </Button>
          </li>
          <li>
            <Button 
                variant="ghost" 
                size="md" 
                className="w-full" 
                onClick={() => setCurrentScreen(GameScreen.ApiSettings)}
              >
              {VIETNAMESE.apiSettings}
            </Button>
          </li>
           <li>
            <Button 
                variant="ghost" 
                size="md" 
                className="w-full" 
                onClick={() => setCurrentScreen(GameScreen.ParameterSettings)}
              >
              {VIETNAMESE.parameterSettings}
            </Button>
          </li>
          <li>
            <Button 
                variant="ghost" 
                size="md" 
                className="w-full" 
                onClick={() => setCurrentScreen(GameScreen.StorageSettings)}
              >
              {VIETNAMESE.storageSettings} 
            </Button>
          </li>
        </ul>
      </nav>
      <p className="mt-12 text-sm text-gray-500">Phiên bản {APP_VERSION}</p>
    </div>
  );
};

export default InitialScreen;