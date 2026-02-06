import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createProjectSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    baseLanguage: z.string().default('en-US'),
    targetLanguages: z.array(z.string()).default([]),
    visibility: z.enum(['public', 'private']).default('public'),
    aiBaseUrl: z.string().optional(),
    aiApiKey: z.string().optional(),
    aiModelId: z.string().optional(),
    systemPrompt: z.string().optional(),
});

export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Global access: Fetch all projects
    const projects = await prisma.project.findMany({
        orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ projects });
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const result = createProjectSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }

        const { name, description, baseLanguage, targetLanguages, visibility, aiBaseUrl, aiApiKey, aiModelId, systemPrompt } = result.data;

        const dbUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
        if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

        const project = await prisma.project.create({
            data: {
                name,
                description,
                baseLanguage,
                targetLanguages: JSON.stringify(targetLanguages),
                visibility: visibility ?? 'public',
                ownerId: dbUser.id,
                aiBaseUrl,
                aiApiKey,
                aiModelId,
                systemPrompt,
                users: {
                    connect: { email: session.user.email }
                }
            }
        });

        return NextResponse.json({ project }, { status: 201 });
    } catch (error) {
        console.error("Create project error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
