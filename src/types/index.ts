export interface Project {
    id: string;
    name: string;
    description: string | null;
    baseLanguage: string;
    targetLanguages: string; // JSON string in DB, need parsing usually, but let's keep it string for simple display or parse it
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
