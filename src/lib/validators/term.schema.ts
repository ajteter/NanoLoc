import { z } from 'zod';

const languageCodeSchema = z.string().trim().min(1);
const translationValuesSchema = z.record(languageCodeSchema, z.string());

export const createTermSchema = z.object({
    stringName: z.string().trim().min(1),
    values: translationValuesSchema.optional(),
    remarks: z.string().optional(),
});

export const updateTermSchema = z.object({
    stringName: z.string().trim().min(1).optional(),
    remarks: z.string().nullable().optional(),
    values: translationValuesSchema.optional(),
});

export type CreateTermInput = z.infer<typeof createTermSchema>;
export type UpdateTermInput = z.infer<typeof updateTermSchema>;
