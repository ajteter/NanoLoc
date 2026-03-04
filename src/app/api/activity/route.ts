import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listAuditLogs } from '@/lib/services/audit.service';

export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    try {
        const result = await listAuditLogs({ page, limit });
        return NextResponse.json(result);
    } catch (error) {
        console.error('Activity API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
