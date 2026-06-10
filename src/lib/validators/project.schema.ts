import { z } from 'zod';
import { normalizeTargetLanguages } from '@/lib/language-utils';

const languageCodeSchema = z.string().trim().min(1);
const optionalTextSchema = z.string().optional();
const targetLanguagesSchema = z.array(languageCodeSchema);

function normalizeProjectLanguages<T extends { baseLanguage?: string; targetLanguages?: string[] }>(data: T): T {
    if (!data.targetLanguages) return data;

    return {
        ...data,
        targetLanguages: normalizeTargetLanguages(data.targetLanguages, data.baseLanguage),
    };
}

export const createProjectSchema = z.object({
    name: z.string().trim().min(1),
    description: optionalTextSchema,
    baseLanguage: languageCodeSchema.default('en-US'),
    targetLanguages: targetLanguagesSchema.default([]),
    aiBaseUrl: optionalTextSchema,
    aiApiKey: optionalTextSchema,
    aiModelId: optionalTextSchema,
    systemPrompt: optionalTextSchema,
}).transform(normalizeProjectLanguages);

export const updateProjectSchema = z.object({
    name: z.string().trim().min(1).optional(),
    description: optionalTextSchema,
    baseLanguage: languageCodeSchema.optional(),
    targetLanguages: targetLanguagesSchema.optional(),
    aiBaseUrl: optionalTextSchema,
    aiApiKey: optionalTextSchema,
    aiModelId: optionalTextSchema,
    systemPrompt: optionalTextSchema,
}).transform(normalizeProjectLanguages);

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
