import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

let url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL mismatch");

if (url.startsWith('"') && url.endsWith('"')) {
    url = url.slice(1, -1);
}
if (url.startsWith('file:')) {
    url = url.slice(5);
}

const sqlite = new Database(url);
const adapter = new PrismaBetterSqlite3(sqlite);
const prisma = new PrismaClient({ adapter });

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
        sqlite.close();
    });
