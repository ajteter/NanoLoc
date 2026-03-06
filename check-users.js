const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const users = await prisma.user.findMany({
        select: { id: true, username: true, name: true }
    });
    console.log("USERS:", JSON.stringify(users, null, 2));

    const audits = await prisma.auditLog.findMany({
        take: 3,
        include: { user: { select: { username: true, name: true } } },
        orderBy: { createdAt: 'desc' }
    });
    console.log("AUDITS:", JSON.stringify(audits, null, 2));
}

check().then(() => prisma.$disconnect());
