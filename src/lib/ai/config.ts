import { prisma } from "@/lib/prisma";
import { AIConfig } from "./br-client";
import { AppError } from '@/lib/api/errors';

export async function getProjectAIConfig(projectId: string): Promise<AIConfig> {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
            aiBaseUrl: true,
            aiApiKey: true,
            aiModelId: true,
            systemPrompt: true,
        }
    });

    if (!project) {
        throw new AppError('PROJECT_NOT_FOUND');
    }

    // Fallback to Env Vars if project config is missing
    const baseUrl = project.aiBaseUrl || process.env.bedrock_base_url;
    const apiKey = project.aiApiKey || process.env.bedrock_secret;
    const modelId = project.aiModelId || process.env.bedrock_model_id;

    if (!baseUrl || !apiKey || !modelId) {
        throw new AppError('AI_CONFIG_MISSING');
    }

    return {
        baseUrl,
        apiKey,
        modelId,
        systemPrompt: project.systemPrompt || undefined
    };
}
