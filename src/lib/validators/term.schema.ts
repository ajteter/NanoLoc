import { z } from 'zod';

const languageCodeSchema = z.string().trim().min(1);
const translationValuesSchema = z.record(languageCodeSchema, z.string());
const valueSourcesSchema = z.record(languageCodeSchema, z.enum(['manual', 'machine', 'copied']));

export const importMetadataSchema = z.object({
    developerOwner: z.string().trim().min(1),
    requestNote: z.string().trim().optional(),
});

export const createTermSchema = z.object({
    stringName: z.string().trim().min(1),
    values: translationValuesSchema.optional(),
    remarks: z.string().optional(),
    ...importMetadataSchema.shape,
});

export const updateTermSchema = z.object({
    stringName: z.string().trim().min(1).optional(),
    remarks: z.string().nullable().optional(),
    values: translationValuesSchema.optional(),
    valueSources: valueSourcesSchema.optional(),
    developerOwner: z.string().trim().min(1).optional(),
    requestNote: z.string().trim().optional(),
});

export type CreateTermInput = z.infer<typeof createTermSchema>;
export type UpdateTermInput = z.infer<typeof updateTermSchema>;
export type ImportMetadataInput = z.infer<typeof importMetadataSchema>;
