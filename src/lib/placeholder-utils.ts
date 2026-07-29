const PRINTF_PLACEHOLDER_PATTERN = /%(?:\d+\$)?[-+#0,(<']*(?:\d+|\*)?(?:\.(?:\d+|\*))?(?:hh|h|ll|l|j|z|t|L)?[a-zA-Z@]/g;
const BRACE_PLACEHOLDER_PATTERN = /\{\{[^{}\r\n]+\}\}|\$\{[A-Za-z_][\w.-]*\}|\{[A-Za-z_][\w.-]*\}/g;

export const PLACEHOLDER_SEGMENT_PATTERN = new RegExp(
    `(${PRINTF_PLACEHOLDER_PATTERN.source}|${BRACE_PLACEHOLDER_PATTERN.source})`,
    'g'
);

export type PlaceholderComparison = {
    valid: boolean;
    source: string[];
    translated: string[];
    missing: string[];
    extra: string[];
};

function countTokens(tokens: string[]) {
    const counts = new Map<string, number>();
    for (const token of tokens) {
        counts.set(token, (counts.get(token) || 0) + 1);
    }
    return counts;
}

function expandCountDifference(
    left: Map<string, number>,
    right: Map<string, number>
) {
    const difference: string[] = [];
    for (const [token, count] of left) {
        const remaining = count - (right.get(token) || 0);
        for (let index = 0; index < remaining; index++) {
            difference.push(token);
        }
    }
    return difference;
}

export function extractPlaceholders(text: string | null | undefined): string[] {
    if (!text) return [];

    const matches = text.match(PLACEHOLDER_SEGMENT_PATTERN) || [];
    return matches.filter((token) => token !== '%%');
}

export function comparePlaceholders(
    sourceText: string | null | undefined,
    translatedText: string | null | undefined
): PlaceholderComparison {
    const source = extractPlaceholders(sourceText);
    const translated = extractPlaceholders(translatedText);
    const sourceCounts = countTokens(source);
    const translatedCounts = countTokens(translated);
    const missing = expandCountDifference(sourceCounts, translatedCounts);
    const extra = expandCountDifference(translatedCounts, sourceCounts);

    return {
        valid: missing.length === 0 && extra.length === 0,
        source,
        translated,
        missing,
        extra,
    };
}

export function splitPlaceholderSegments(text: string): string[] {
    return text.split(PLACEHOLDER_SEGMENT_PATTERN).filter(Boolean);
}

export function isPlaceholderSegment(segment: string): boolean {
    const placeholders = extractPlaceholders(segment);
    return placeholders.length === 1 && placeholders[0] === segment;
}
