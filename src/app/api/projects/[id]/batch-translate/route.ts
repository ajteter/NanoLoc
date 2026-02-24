import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getProject } from '@/lib/services/project.service';
import { batchTranslateProject } from '@/lib/services/translate.service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const project = await getProject(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const userId = session.user.id;
    if (!userId) {
        return NextResponse.json({ error: "Session missing user ID" }, { status: 401 });
    }

    try {
        let targetLanguages: string[] = [];

        // The client may send an empty POST body, so guard against JSON parse failure
        let body: Record<string, unknown> = {};
        try {
            body = await request.json();
        } catch {
            // No body sent — that's fine, we'll use the project's configured languages
        }

        if (body.targetLanguages && Array.isArray(body.targetLanguages)) {
            targetLanguages = body.targetLanguages;
        } else {
            targetLanguages = JSON.parse(project.targetLanguages || '[]');
        }

        if (!Array.isArray(targetLanguages) || targetLanguages.length === 0) {
            return NextResponse.json({ error: "No target languages configured" }, { status: 400 });
        }

        const translated = await batchTranslateProject(id, targetLanguages, userId);
        return NextResponse.json({ success: true, translated });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error("Batch translate error:", error);
        return NextResponse.json({ error: message || "Internal Server Error" }, { status: 500 });
    }
}
