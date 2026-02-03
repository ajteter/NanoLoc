
import { PrismaClient } from '@prisma/client';
import { getProjectAIConfig } from '../src/lib/ai/config';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log("Debugging Project '安卓2'...");

    // 1. Find Project
    const project = await prisma.project.findFirst({
        where: { name: { contains: '安卓2' } }
    });

    if (!project) {
        console.error("Project '安卓2' not found!");
        return;
    }
    console.log("Found Project:", project.id, project.name);

    // 2. Test Get AI Config
    console.log("Testing getProjectAIConfig...");
    try {
        const config = await getProjectAIConfig(project.id);
        console.log("AI Config loaded successfully:", config);
    } catch (e: any) {
        console.error("getProjectAIConfig FAILED:", e.message);
        console.log("Env vars check:");
        console.log("bedrock_base_url:", process.env.bedrock_base_url);
        console.log("bedrock_secret:", process.env.bedrock_secret ? "****" : "missing");
        console.log("bedrock_model_id:", process.env.bedrock_model_id);
    }

    // 3. Test Prisma Upsert (Simulate Save)
    console.log("Testing Prisma Upsert...");
    const keys = await prisma.translationKey.findMany({
        where: { projectId: project.id },
        take: 1
    });

    if (keys.length === 0) {
        console.log("No keys found in project.");
        return;
    }
    const key = keys[0];
    console.log("Using Key:", key.id, key.stringName);

    try {
        const result = await prisma.translationValue.upsert({
            where: {
                translationKeyId_languageCode: {
                    translationKeyId: key.id,
                    languageCode: 'zh-CN'
                }
            },
            update: { content: "Debug Content Update" },
            create: {
                translationKeyId: key.id,
                languageCode: 'zh-CN',
                content: "Debug Content Create"
            }
        });
        console.log("Prisma Upsert SUCCESS:", result);
    } catch (e: any) {
        console.error("Prisma Upsert FAILED:", e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
