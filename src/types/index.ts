export type ProjectVisibility = 'public' | 'private';

export interface Project {
    id: string;
    name: string;
    description: string | null;
    baseLanguage: string;
    targetLanguages: string;
    visibility: ProjectVisibility;
    ownerId: string | null;
    owner?: { id: string; email: string } | null;
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
    targetLanguages: string[];
    visibility: ProjectVisibility;
    aiBaseUrl?: string;
    aiApiKey?: string;
    aiModelId?: string;
    systemPrompt?: string;
}

export interface User {
    id: string;
    email: string;
    name?: string | null;
}

export interface TranslationValue {
    id: string;
    languageCode: string;
    content: string | null;
    lastModifiedBy?: {
        name: string | null;
        email: string;
    } | null;
}

export interface TranslationKey {
    id: string;
    stringName: string;
    remarks: string | null;
    values: TranslationValue[];
    lastModifiedBy?: {
        name: string | null;
        email: string;
    } | null;
    createdAt: string;
    updatedAt: string;
}
