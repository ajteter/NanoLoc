'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getServerTranslator } from '@/lib/i18n/server';

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', {
            ...Object.fromEntries(formData),
            redirectTo: '/projects'
        });
    } catch (error) {
        if (error instanceof AuthError) {
            const { t } = await getServerTranslator();
            switch (error.type) {
                case 'CredentialsSignin':
                    return t('auth.invalidCredentials');
                default:
                    return t('auth.genericError');
            }
        }
        throw error;
    }
}

const RegisterSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function register(prevState: string | undefined, formData: FormData) {
    const { t } = await getServerTranslator();
    const validatedFields = RegisterSchema.safeParse({
        username: formData.get('username'),
        password: formData.get('password'),
    });

    if (!validatedFields.success) {
        return t('auth.registrationFailed');
    }

    const { username, password } = validatedFields.data;

    try {
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) return t('auth.userExists');

        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                name: username,
            },
        });
    } catch (error) {
        console.error(error);
        return t('auth.registrationFailed');
    }

    try {
        await signIn('credentials', {
            ...Object.fromEntries(formData),
            redirectTo: '/projects'
        });
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return t('auth.loginAfterRegisterFailed');
                default:
                    throw error;
            }
        }
        throw error;
    }
}
