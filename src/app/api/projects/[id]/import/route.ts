import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getProject } from '@/lib/services/project.service';
import { importXml } from '@/lib/services/storage.service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    const project = await getProject(projectId);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const userId = session.user.id;
    if (!userId) {
        return NextResponse.json({ error: "Session missing user ID" }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const xmlContent = await file.text();
        const result = await importXml(projectId, xmlContent, project.baseLanguage, userId);

        return NextResponse.json({ success: true, ...result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error("Import error:", error);
        return NextResponse.json({ error: message || "Internal Server Error" }, { status: 500 });
    }
}
