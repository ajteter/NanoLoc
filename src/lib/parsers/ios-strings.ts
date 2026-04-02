export interface ParsedString {
    name: string;
    value: string;
}

/**
 * Parser for iOS Localizable.strings files.
 * Supported format: "key" = "value";
 */
export class IOSStringsParser {
    parse(stringsContent: string): ParsedString[] {
        const result: ParsedString[] = [];
        const content = stringsContent.replace(/\/\*[\s\S]*?\*\//g, '');
        const entryRegex = /"((?:\\.|[^"\\])*)"\s*=\s*"((?:\\.|[^"\\])*)"\s*;/g;
        let match: RegExpExecArray | null;

        while ((match = entryRegex.exec(content)) !== null) {
            result.push({
                name: this.unescapeIosString(match[1]),
                value: this.unescapeIosString(match[2]),
            });
        }

        if (result.length === 0) {
            throw new Error('Invalid iOS strings file: Expected entries like "key" = "value";');
        }

        return result;
    }

    private unescapeIosString(value: string): string {
        return value
            .replace(/\\\\/g, '\\')
            .replace(/\\"/g, '"')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t');
    }
}
