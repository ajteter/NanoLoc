import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function PUT(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, currentPassword, newPassword } = body;

        const updateData: Record<string, string> = {};

        // Update name
        if (name && typeof name === 'string' && name.trim().length > 0) {
            updateData.name = name.trim();
        }

        // Update password
        if (newPassword) {
            if (!currentPassword) {
                return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
            }

            if (newPassword.length < 6) {
                return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
            }

            const user = await prisma.user.findUnique({ where: { id: session.user.id } });
            if (!user) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            const isValid = await bcrypt.compare(currentPassword, user.password);
            if (!isValid) {
                return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 });
            }

            updateData.password = await bcrypt.hash(newPassword, 10);
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
        }

        const updated = await prisma.user.update({
            where: { id: session.user.id },
            data: updateData,
            select: { id: true, name: true, username: true },
        });

        return NextResponse.json({ user: updated });
    } catch (error) {
        console.error('Profile update error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
