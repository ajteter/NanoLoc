
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { LANGUAGES } from '@/lib/constants/languages';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.email) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const project = await prisma.project.findUnique({
        where: { id },
        include: { keys: { include: { values: true } } }
    });

    if (!project) {
        return new NextResponse("Project not found", { status: 404 });
    }

    // Parse target languages
    let targetLangs: string[] = [];
    try {
        targetLangs = JSON.parse(project.targetLanguages || '[]');
    } catch (e) {
        targetLangs = [];
    }

    // CSV Header
    const header = ['Key', 'Remarks', project.baseLanguage, ...targetLangs];

    // Rows
    const rows = project.keys.map(key => {
        const row: string[] = [];
        // Key
        row.push(key.stringName);
        // Remarks
        row.push(key.remarks || '');

        // Base Value
        const baseVal = key.values.find(v => v.languageCode === project.baseLanguage)?.content || '';
        row.push(baseVal);

        // Target Values
        targetLangs.forEach(lang => {
            const val = key.values.find(v => v.languageCode === lang)?.content || '';
            row.push(val);
        });

        return row;
    });

    // Helper to escape CSV
    const escapeCsv = (str: string) => {
        if (str === null || str === undefined) return '';
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    // Construct CSV String
    let csvContent = header.map(escapeCsv).join(',') + '\n';
    rows.forEach(r => {
        csvContent += r.map(escapeCsv).join(',') + '\n';
    });

    // Return response with headers for download
    return new NextResponse(csvContent, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${project.name}_export.csv"`
        }
    });
}
