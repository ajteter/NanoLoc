import { LANGUAGES } from '@/lib/constants/languages';

const DEFAULT_BASE_LANGUAGE = 'en-US';

function normalizeLanguageCodes(value: unknown): string[] {
    if (!Array.isArray(value)) return [];

    return Array.from(
        new Set(
            value
                .filter((code): code is string => typeof code === 'string')
                .map((code) => code.trim())
                .filter(Boolean)
        )
    );
}

export function parseTargetLanguages(value?: string | string[] | null): string[] {
    if (Array.isArray(value)) {
        return normalizeLanguageCodes(value);
    }

    if (!value) return [];

    try {
        return normalizeLanguageCodes(JSON.parse(value));
    } catch {
        return [];
    }
}

export function serializeTargetLanguages(value?: string[] | null): string {
    return JSON.stringify(normalizeLanguageCodes(value));
}

export function getLanguageDisplayName(code: string): string {
    const lang = LANGUAGES.find((item) => item.code === code);
    return lang ? `${lang.name} (${lang.localName}) - ${code}` : code;
}

export function getProjectLanguageCodes(project: {
    baseLanguage?: string | null;
    targetLanguages?: string | string[] | null;
}) {
    const baseLanguage = project.baseLanguage || DEFAULT_BASE_LANGUAGE;
    const targetLanguages = parseTargetLanguages(project.targetLanguages).filter((code) => code !== baseLanguage);

    return {
        baseLanguage,
        targetLanguages,
        allLanguages: [baseLanguage, ...targetLanguages],
    };
}
