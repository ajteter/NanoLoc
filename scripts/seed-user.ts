import { PrismaClient } from '@prisma/client';
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const username = process.env.INITIAL_USER_USERNAME || "admin";
    const password = process.env.INITIAL_USER_PASSWORD || "admin";
    const name = "Admin User";

    console.log(`Seeding user: ${username}`);

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
        console.log("User already exists.");
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
        data: {
            username,
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
