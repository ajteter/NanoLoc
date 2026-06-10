import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { getProject } from '@/lib/services/project.service';
import { logAudit } from '@/lib/services/audit.service';
import {
    getTermScreenshot,
    removeTermScreenshot,
    saveTermScreenshot,
} from '@/lib/services/term-screenshot.service';
import { AppError } from '@/lib/api/errors';
import { jsonError, jsonErrorFromUnknown } from '@/lib/api/responses';

export const runtime = 'nodejs';

async function requireProject(id: string) {
    const project = await getProject(id);
    if (!project) {
        throw new AppError('PROJECT_NOT_FOUND');
    }

    return project;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; keyId: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return jsonError('UNAUTHORIZED');
    }

    const { id, keyId } = await params;

    try {
        await requireProject(id);
        const screenshot = await getTermScreenshot(id, keyId);

        if (!screenshot) {
            return jsonError('SCREENSHOT_NOT_FOUND');
        }

        return new NextResponse(screenshot.data, {
            headers: {
                'Content-Type': screenshot.mimeType,
                'Content-Length': String(screenshot.size),
                'Cache-Control': 'private, max-age=3600',
                ...(screenshot.updatedAt
                    ? { 'Last-Modified': screenshot.updatedAt.toUTCString() }
                    : {}),
            },
        });
    } catch (error) {
        return jsonErrorFromUnknown(error, 'SCREENSHOT_LOAD_FAILED');
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; keyId: string }> }) {
    const session = await auth();
    if (!session?.user?.id) {
        return jsonError('UNAUTHORIZED');
    }

    const { id, keyId } = await params;

    try {
        const project = await requireProject(id);
        const formData = await request.formData();
        const file = formData.get('file');

        if (!(file instanceof File)) {
            return jsonError('NO_SCREENSHOT_UPLOADED');
        }

        const term = await saveTermScreenshot({
            projectId: id,
            keyId,
            file,
            userId: session.user.id,
        });

        await logAudit({
            action: 'UPDATE_TERM',
            userId: session.user.id,
            projectId: id,
            projectName: project.name,
            keyName: term.stringName,
            details: {
                action: 'updated screenshot',
                size: term.screenshotSize,
                mimeType: term.screenshotMimeType,
            },
        });

        revalidatePath(`/projects/${id}`);
        return NextResponse.json({ success: true, term });
    } catch (error) {
        return jsonErrorFromUnknown(error, 'SCREENSHOT_UPLOAD_FAILED');
    }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; keyId: string }> }) {
    const session = await auth();
    if (!session?.user?.id) {
        return jsonError('UNAUTHORIZED');
    }

    const { id, keyId } = await params;

    try {
        const project = await requireProject(id);
        const term = await removeTermScreenshot({
            projectId: id,
            keyId,
            userId: session.user.id,
        });

        await logAudit({
            action: 'UPDATE_TERM',
            userId: session.user.id,
            projectId: id,
            projectName: project.name,
            keyName: term.stringName,
            details: { action: 'deleted screenshot' },
        });

        revalidatePath(`/projects/${id}`);
        return NextResponse.json({ success: true });
    } catch (error) {
        return jsonErrorFromUnknown(error, 'SCREENSHOT_DELETE_FAILED');
    }
}
