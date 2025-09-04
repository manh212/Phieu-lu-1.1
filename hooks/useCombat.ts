import { useContext } from 'react';
import { CombatContext, CombatContextType } from '../contexts/CombatContext';

export const useCombat = (): CombatContextType => {
    const context = useContext(CombatContext);
    if (context === null) {
        throw new Error('useCombat must be used within a CombatProvider');
    }
    return context;
};
