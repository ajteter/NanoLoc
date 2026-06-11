import { auth } from '@/auth';
import { createCsvExportStream } from '@/lib/services/storage.service';
import { jsonError, jsonErrorFromUnknown } from '@/lib/api/responses';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return jsonError('UNAUTHORIZED');
    }

    const { id } = await params;

    try {
        const { stream, fileName } = await createCsvExportStream(id);

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error("Export CSV Error:", error);
        return jsonErrorFromUnknown(error, 'EXPORT_FAILED');
    }
}
