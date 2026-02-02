import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional(),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const result = registerSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error.errors }, { status: 400 });
        }

        const { email, password, name } = result.data;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
            },
            select: {
                id: true,
                email: true,
                name: true,
            }
        });

        return NextResponse.json({ user }, { status: 201 });
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
