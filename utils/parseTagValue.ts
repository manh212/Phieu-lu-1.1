
export const parseTagValue = (tagValue: string): Record<string, string> => {
    const result: Record<string, string> = {};
    if (!tagValue) return result;

    // This regex is designed to find all occurrences of key=value pairs.
    // It correctly handles values that are double-quoted, single-quoted, or unquoted (without spaces).
    const regex = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s,]+))/g;
    let match;

    while ((match = regex.exec(tagValue)) !== null) {
        const key = match[1];
        // The captured value will be in one of these groups, the others will be undefined.
        const value = match[2] ?? match[3] ?? match[4]; 
        
        if (key && value !== undefined) {
            // AI might escape quotes, so we un-escape them.
            result[key] = value.replace(/\\"/g, '"').replace(/\\'/g, "'");
        }
    }
    
    return result;
};
