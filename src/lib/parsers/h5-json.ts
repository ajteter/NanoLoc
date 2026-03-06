export interface ParsedString {
    name: string;
    value: string;
}

/**
 * Parser for H5 flat JSON localization files.
 * Format: { "dotted.key": "value", ... }
 */
export class H5JsonParser {
    parse(jsonContent: string): ParsedString[] {
        let obj: Record<string, unknown>;

        try {
            obj = JSON.parse(jsonContent);
        } catch {
            throw new Error('Invalid JSON: Could not parse file content');
        }

        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
            throw new Error('Invalid H5 JSON: Expected a flat object { "key": "value" }');
        }

        const result: ParsedString[] = [];

        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                result.push({ name: key, value });
            }
            // Skip non-string values silently
        }

        return result;
    }
}
