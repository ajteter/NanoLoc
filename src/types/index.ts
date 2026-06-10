export interface Project {
    id: string;
    name: string;
    description: string | null;
    baseLanguage: string;
    // Serialized JSON array from Prisma/API. Use getProjectLanguageCodes before UI logic.
    targetLanguages: string;
    aiBaseUrl?: string;
    aiApiKey?: string;
    aiModelId?: string;
    systemPrompt?: string;
    updatedAt: string | Date;
    createdAt: string | Date;
}

export interface ProjectFormData {
    name: string;
    description: string;
    baseLanguage: string;
    targetLanguages: string[];
    aiBaseUrl: string;
    aiApiKey: string;
    aiModelId: string;
    systemPrompt: string;
}

export interface User {
    id: string;
    username: string;
    name?: string | null;
}

export interface TranslationValue {
    id: string;
    languageCode: string;
    content: string | null;
    lastModifiedBy?: {
        name: string | null;
        username?: string;
    } | null;
}

export interface TranslationKey {
    id: string;
    stringName: string;
    remarks: string | null;
    screenshotPath?: string | null;
    screenshotMimeType?: string | null;
    screenshotSize?: number | null;
    screenshotUpdatedAt?: string | Date | null;
    values: TranslationValue[];
    lastModifiedBy?: {
        name: string | null;
        username?: string;
    } | null;
    createdAt: string | Date;
    updatedAt: string | Date;
}
