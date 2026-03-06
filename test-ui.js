const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');

(async () => {
    // 1. Ensure user has a name in DB
    const prisma = new PrismaClient();
    await prisma.user.updateMany({
        where: { username: "hx" },
        data: { name: "Xiao Hu" }
    });
    console.log("Updated DB name to Xiao Hu");

    const browser = await chromium.launch();
    const page = await browser.newPage();

    // 2. Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[id="username"]', 'hx');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000');

    // 3. Go to Activity
    await page.goto('http://localhost:3000/activity');
    await page.waitForSelector('table');

    // 4. Get text in User column
    const userTexts = await page.$$eval('tbody tr td:nth-child(3)', tds => tds.map(td => td.textContent.trim()));
    console.log("USER COLUMN TEXTS:", userTexts);

    await browser.close();
    await prisma.$disconnect();
})();
