import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canEditProject, getSessionUserId } from '@/lib/project-access';
import { z } from 'zod';

const createTermSchema = z.object({
    stringName: z.string().min(1),
    values: z.record(z.string(), z.string()).optional(), // languageCode -> content
    remarks: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    // 1. Auth check
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify edit access (public: anyone; private: only owner)
    const project = await prisma.project.findUnique({
        where: { id },
        include: { users: { select: { email: true, id: true } } }
    });

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const currentUserId = await getSessionUserId(session);
    if (!canEditProject(project, currentUserId)) return NextResponse.json({ error: "Forbidden: only owner can edit private project" }, { status: 403 });
    if (!currentUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const result = createTermSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }

        const { stringName, values, remarks } = result.data;

        // Check availability
        const existing = await prisma.translationKey.findUnique({
            where: { projectId_stringName: { projectId: id, stringName } }
        });

        if (existing) {
            return NextResponse.json({ error: "Term with this key already exists" }, { status: 409 });
        }

        const term = await prisma.translationKey.create({
            data: {
                projectId: id,
                stringName,
                remarks,
                lastModifiedById: currentUserId, // Audit
                values: {
                    create: values ? Object.entries(values as Record<string, string>).map(([code, content]) => ({
                        languageCode: code,
                        content,
                        lastModifiedById: currentUserId // Audit
                    })) : []
                }
            },
            include: { values: true }
        });

        return NextResponse.json({ term }, { status: 201 });

    } catch (error) {
        console.error("Create term error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const project = await prisma.project.findUnique({
        where: { id },
        include: { users: { select: { email: true } } }
    });

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // All authenticated users can view terms (public and private projects visible to all)

    // Build Filter
    const whereClause: any = {
        projectId: id,
    };

    if (search) {
        whereClause.OR = [
            { stringName: { contains: search } }, // Case insensitive usually depends on DB collation (SQLite default is often case-insensitive for ASCII)
            { remarks: { contains: search } },
            { values: { some: { content: { contains: search } } } }
        ];
    }

    try {
        const [total, keys] = await prisma.$transaction([
            prisma.translationKey.count({ where: whereClause }),
            prisma.translationKey.findMany({
                where: whereClause,
                include: {
                    values: {
                        include: { lastModifiedBy: { select: { name: true, email: true } } }
                    },
                    lastModifiedBy: { select: { name: true, email: true } }
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { updatedAt: 'desc' } // or stringName asc
            })
        ]);

        return NextResponse.json({
            data: keys,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Fetch terms error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
