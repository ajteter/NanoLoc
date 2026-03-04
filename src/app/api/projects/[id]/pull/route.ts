import { NextResponse } from 'next/server';
import { pullProjectTranslations } from '@/lib/services/storage.service';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    // Bearer token authentication
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const expectedToken = process.env.API_ACCESS_TOKEN;

    if (!expectedToken || !token || token !== expectedToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'json') as 'json' | 'xml';
    const lang = searchParams.get('lang') || undefined;

    if (format !== 'json' && format !== 'xml') {
        return NextResponse.json({ error: 'Invalid format. Use "json" or "xml".' }, { status: 400 });
    }

    if (format === 'xml' && !lang) {
        return NextResponse.json({ error: 'XML format requires a "lang" parameter.' }, { status: 400 });
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
    } catch (error: any) {
        if (error.message === 'Project not found') {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        console.error('Pull API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
