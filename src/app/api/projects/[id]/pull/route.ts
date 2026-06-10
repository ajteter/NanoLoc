import { pullProjectTranslations } from '@/lib/services/storage.service';
import { jsonError, jsonErrorFromUnknown } from '@/lib/api/responses';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    // Bearer token authentication
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const expectedToken = process.env.API_ACCESS_TOKEN;

    if (!expectedToken || !token || token !== expectedToken) {
        return jsonError('UNAUTHORIZED');
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'json') as 'json' | 'xml';
    const lang = searchParams.get('lang') || undefined;

    if (format !== 'json' && format !== 'xml') {
        return jsonError('INVALID_FORMAT');
    }

    if (format === 'xml' && !lang) {
        return jsonError('XML_LANG_REQUIRED');
    }

    try {
        const { data, contentType } = await pullProjectTranslations(id, format, lang);

        return new Response(data, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error: unknown) {
        console.error('Pull API error:', error);
        return jsonErrorFromUnknown(error, 'INTERNAL_ERROR');
    }
}
