'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
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
    const validatedFields = RegisterSchema.safeParse({
        username: formData.get('username'),
        password: formData.get('password'),
    });

    if (!validatedFields.success) {
        return 'Invalid fields. Username is required and password must be at least 6 characters.';
    }

    const { username, password } = validatedFields.data;

    try {
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) return 'User already exists.';

        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
            },
        });
    } catch (error) {
        console.error(error);
        return 'Failed to create user.';
    }

    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Something went wrong logging in after registration.';
                default:
                    throw error;
            }
        }
        throw error;
    }
}
