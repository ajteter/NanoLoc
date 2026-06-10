import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { jsonError, jsonErrorFromUnknown } from '@/lib/api/responses';

export async function PUT(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return jsonError('UNAUTHORIZED');
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
                return jsonError('CURRENT_PASSWORD_REQUIRED');
            }

            if (newPassword.length < 6) {
                return jsonError('NEW_PASSWORD_TOO_SHORT');
            }

            const user = await prisma.user.findUnique({ where: { id: session.user.id } });
            if (!user) {
                return jsonError('USER_NOT_FOUND');
            }

            const isValid = await bcrypt.compare(currentPassword, user.password);
            if (!isValid) {
                return jsonError('CURRENT_PASSWORD_INCORRECT');
            }

            updateData.password = await bcrypt.hash(newPassword, 10);
        }

        if (Object.keys(updateData).length === 0) {
            return jsonError('NOTHING_TO_UPDATE');
        }

        const updated = await prisma.user.update({
            where: { id: session.user.id },
            data: updateData,
            select: { id: true, name: true, username: true },
        });

        return NextResponse.json({ user: updated });
    } catch (error) {
        console.error('Profile update error:', error);
        return jsonErrorFromUnknown(error, 'PROFILE_UPDATE_FAILED');
    }
}
