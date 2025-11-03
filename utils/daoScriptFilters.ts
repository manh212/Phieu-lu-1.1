// utils/daoScriptFilters.ts

// A map of all available filter functions for Dao-Script
// Each function takes the input value as the first argument,
// followed by any parameters from the template.

const filters: Record<string, (value: any, ...args: any[]) => any> = {
    uppercase: (value: any): string => {
        return String(value ?? '').toUpperCase();
    },

    lowercase: (value: any): string => {
        return String(value ?? '').toLowerCase();
    },

    capitalize: (value: any): string => {
        const str = String(value ?? '');
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    truncate: (value: any, lengthStr: string = '50'): string => {
        const str = String(value ?? '');
        const length = parseInt(lengthStr, 10);
        if (isNaN(length)) return str;
        if (str.length <= length) return str;
        return str.substring(0, length) + '...';
    },

    random: (value: any): any => {
        if (!Array.isArray(value) || value.length === 0) return value;
        return value[Math.floor(Math.random() * value.length)];
    },
    
    add: (value: any, amountStr: string = '1'): number => {
        const num = parseFloat(value);
        const amount = parseFloat(amountStr);
        if (isNaN(num) || isNaN(amount)) return value;
        return num + amount;
    },

    subtract: (value: any, amountStr: string = '1'): number => {
        const num = parseFloat(value);
        const amount = parseFloat(amountStr);
        if (isNaN(num) || isNaN(amount)) return value;
        return num - amount;
    },
    
    default: (value: any, defaultValue: string = ''): any => {
        // Return default if value is null, undefined, or an empty string
        return value !== null && value !== undefined && value !== '' ? value : defaultValue;
    },

    join: (value: any, separator: string = ', '): string => {
        if (!Array.isArray(value)) return String(value ?? '');
        return value.join(separator);
    },
    
    length: (value: any): number => {
        if (Array.isArray(value) || typeof value === 'string') {
            return value.length;
        }
        return 0;
    }
};

export const filterRegistry = filters;
