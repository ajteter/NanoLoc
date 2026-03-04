import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listProjects, createProject } from '@/lib/services/project.service';
import { logAudit } from '@/lib/services/audit.service';
import { z } from 'zod';

const createProjectSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    baseLanguage: z.string().default('en-US'),
    targetLanguages: z.array(z.string()).default([]),
    aiBaseUrl: z.string().optional(),
    aiApiKey: z.string().optional(),
    aiModelId: z.string().optional(),
    systemPrompt: z.string().optional(),
});

export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await listProjects();
    return NextResponse.json({ projects });
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const result = createProjectSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }

        const project = await createProject(result.data);
        logAudit({ action: 'CREATE_PROJECT', userId: session.user.id, projectId: project.id, projectName: project.name });
        return NextResponse.json({ project }, { status: 201 });
    } catch (error) {
        console.error("Create project error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
