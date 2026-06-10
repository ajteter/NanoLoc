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

export function normalizeTargetLanguages(
    value?: string[] | null,
    baseLanguage?: string | null
): string[] {
    const base = baseLanguage || DEFAULT_BASE_LANGUAGE;
    return normalizeLanguageCodes(value).filter((code) => code !== base);
}

export function parseVisibleTargetLanguages(
    value: string | string[] | undefined,
    availableLanguages: string[]
): string[] {
    if (value === undefined) return availableLanguages;

    const rawValue = Array.isArray(value) ? value.join(',') : value;
    const available = new Set(availableLanguages);

    return normalizeLanguageCodes(rawValue.split(',')).filter((code) => available.has(code));
}

export function serializeTargetLanguages(value?: string[] | null, baseLanguage?: string | null): string {
    return JSON.stringify(normalizeTargetLanguages(value, baseLanguage));
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
    const targetLanguages = normalizeTargetLanguages(parseTargetLanguages(project.targetLanguages), baseLanguage);

    return {
        baseLanguage,
        targetLanguages,
        allLanguages: [baseLanguage, ...targetLanguages],
    };
}
