import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listTerms, createTerm, getProject, ConflictError } from '@/lib/services/project.service';
import { logAudit } from '@/lib/services/audit.service';
import { z } from 'zod';

const createTermSchema = z.object({
    stringName: z.string().min(1),
    values: z.record(z.string(), z.string()).optional(),
    remarks: z.string().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const project = await getProject(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    try {
        const result = await listTerms(id, { page, limit, search });
        return NextResponse.json(result);
    } catch (error) {
        console.error("Fetch terms error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const project = await getProject(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Resolve userId from session for audit
    const userId = session.user.id;
    if (!userId) {
        return NextResponse.json({ error: "Session missing user ID" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const result = createTermSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }

        const term = await createTerm(id, result.data, userId);
        logAudit({ action: 'CREATE_TERM', userId, projectId: id, projectName: project.name, keyName: result.data.stringName });
        return NextResponse.json({ term }, { status: 201 });
    } catch (error) {
        if (error instanceof ConflictError) {
            return NextResponse.json({ error: error.message }, { status: 409 });
        }
        console.error("Create term error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
