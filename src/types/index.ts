export interface Project {
    id: string;
    name: string;
    description: string | null;
    baseLanguage: string;
    targetLanguages: string; // JSON string in DB, need parsing usually, but let's keep it string for simple display or parse it
    aiBaseUrl?: string;
    aiApiKey?: string;
    aiModelId?: string;
    systemPrompt?: string;
    updatedAt: string;
    createdAt: string;
}

export interface ProjectFormData {
    name: string;
    description?: string;
    baseLanguage: string;
    targetLanguages: string[]; // Array for form
    aiBaseUrl?: string;
    aiApiKey?: string;
    aiModelId?: string;
    systemPrompt?: string;
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
    values: TranslationValue[];
    lastModifiedBy?: {
        name: string | null;
        username?: string;
    } | null;
    createdAt: string;
    updatedAt: string;
}
