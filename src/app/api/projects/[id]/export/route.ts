import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { exportCsv } from '@/lib/services/storage.service';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    try {
        const { csvContent, fileName } = await exportCsv(id);
        const csvBytes = new TextEncoder().encode(csvContent);

        return new NextResponse(csvBytes, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Content-Length': String(csvBytes.byteLength),
            },
        });
    } catch (error) {
        console.error("Export CSV Error:", error);
        return new NextResponse("Failed to generate CSV", { status: 500 });
    }
}
