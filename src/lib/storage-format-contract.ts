export type FormatTranslationValueRow = {
    languageCode: string;
    content: string | null;
};

export type FormatKeyRow = {
    stringName: string;
    remarks?: string | null;
    values: FormatTranslationValueRow[];
};

export function getTranslationValueMap(key: { values: FormatTranslationValueRow[] }) {
    return new Map(key.values.map((value) => [value.languageCode, value.content || '']));
}

export function escapeCsv(str: string | null | undefined) {
    if (str === null || str === undefined) return '';
    const s = String(str);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

export function buildCsvHeader(baseLanguage: string, targetLangs: string[]) {
    return ['Key', 'Remarks', baseLanguage, ...targetLangs].map(escapeCsv).join(',');
}

export function buildCsvRow(key: FormatKeyRow, baseLanguage: string, targetLangs: string[]) {
    const values = getTranslationValueMap(key);
    const row: string[] = [key.stringName, key.remarks || '', values.get(baseLanguage) || ''];

    targetLangs.forEach((lang) => {
        row.push(values.get(lang) || '');
    });

    return row.map(escapeCsv).join(',') + '\n';
}

export function escapeXml(s: string) {
    return s.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, "\\'");
}

export function formatFullJsonPullEntry(key: FormatKeyRow, allLanguages: string[]) {
    const values = getTranslationValueMap(key);
    const entries = allLanguages
        .map((languageCode) => {
            const value = values.get(languageCode);
            return value ? [languageCode, value] as const : null;
        })
        .filter((entry): entry is readonly [string, string] => Boolean(entry));

    if (entries.length === 0) {
        return `  ${JSON.stringify(key.stringName)}: {}`;
    }

    const fields = entries
        .map(([languageCode, value]) => `    ${JSON.stringify(languageCode)}: ${JSON.stringify(value)}`)
        .join(',\n');

    return `  ${JSON.stringify(key.stringName)}: {\n${fields}\n  }`;
}

export function formatSingleJsonPullEntry(key: FormatKeyRow, targetLang: string, baseLanguage: string) {
    const values = getTranslationValueMap(key);
    const value = values.get(targetLang) || values.get(baseLanguage) || '';
    if (!value) return null;

    return `  ${JSON.stringify(key.stringName)}: ${JSON.stringify(value)}`;
}

export function formatXmlStringResource(name: string, value: string) {
    return `    <string name="${escapeXml(name)}">${escapeXml(value)}</string>`;
}
