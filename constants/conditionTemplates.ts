// constants/conditionTemplates.ts
import { ConditionElement } from '../types/index';

export interface ConditionTemplate {
    label: string;
    element: ConditionElement;
}

// Recursive function to assign new unique IDs to an element and its children
export const cloneTemplateAndAssignNewIds = (element: ConditionElement): ConditionElement => {
    const newElement = JSON.parse(JSON.stringify(element));

    const assignIds = (el: any) => {
        el.id = `${el.type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        if (el.type === 'group' && el.children) {
            el.children.forEach(assignIds);
        }
    };
    
    assignIds(newElement);
    return newElement;
};


export const CONDITION_TEMPLATES: ConditionTemplate[] = [
    {
        label: "Khi đang trong trận chiến",
        element: {
            id: 'template-1',
            type: 'condition',
            field: 'player_in_combat',
            operator: 'IS',
            value: 'true'
        }
    },
    {
        label: "Khi ở nơi an toàn",
        element: {
            id: 'template-2',
            type: 'condition',
            field: 'location_is_safe',
            operator: 'IS',
            value: 'true'
        }
    },
    {
        label: "Khi KHÔNG ở nơi an toàn",
        element: {
            id: 'template-3',
            type: 'condition',
            field: 'location_is_safe',
            operator: 'IS_NOT',
            value: 'true'
        }
    },
    {
        label: "Khi đang bị thương nặng (HP < 30%)",
        element: {
            id: 'template-4',
            type: 'condition',
            field: 'player_hp_percent',
            operator: 'LESS_THAN',
            value: 30
        }
    },
    {
        label: "Khi cạn kiệt linh lực (MP < 10%)",
        element: {
            id: 'template-5',
            type: 'condition',
            field: 'player_mp_percent',
            operator: 'LESS_THAN',
            value: 10
        }
    },
    {
        label: "Khi giàu có (Tiền > 10000)",
        element: {
            id: 'template-6',
            type: 'condition',
            field: 'player_currency',
            operator: 'GREATER_THAN',
            value: 10000
        }
    }
];
