import { PrismaClient } from '@prisma/client';
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const email = process.env.INITIAL_USER_EMAIL || "admin@example.com";
    const password = process.env.INITIAL_USER_PASSWORD || "password123";
    const name = "Admin User";

    console.log(`Seeding user: ${email}`);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log("User already exists.");
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
        },
    });
    console.log("User created.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
