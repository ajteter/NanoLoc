import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { exportCsv } from '@/lib/services/storage.service';
import { jsonError, jsonErrorFromUnknown } from '@/lib/api/responses';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return jsonError('UNAUTHORIZED');
    }

    const { id } = await params;

    try {
        const { csvContent, fileName } = await exportCsv(id);

        return new NextResponse(new TextEncoder().encode(csvContent), {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${fileName}"`,
            },
        });
    } catch (error) {
        console.error("Export CSV Error:", error);
        return jsonErrorFromUnknown(error, 'EXPORT_FAILED');
    }
}
