// utils/conditionClipboard.ts
import { ConditionElement } from '../types/index';

let clipboard: ConditionElement | null = null;

// Recursive function to assign new unique IDs to an element and its children
const assignNewIds = (element: any): any => {
    element.id = `${element.type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    if (element.type === 'group' && element.children) {
        element.children = element.children.map(assignNewIds);
    }
    return element;
};

export const copyToClipboard = (element: ConditionElement) => {
    // Deep copy the element to the clipboard
    clipboard = JSON.parse(JSON.stringify(element));
};

export const pasteFromClipboard = (): ConditionElement | null => {
    if (!clipboard) return null;
    // Create a new deep copy from the clipboard
    const pastedElement = JSON.parse(JSON.stringify(clipboard));
    // Assign new unique IDs to the copied structure before returning
    return assignNewIds(pastedElement);
};

export const isClipboardEmpty = (): boolean => {
    return clipboard === null;
};
