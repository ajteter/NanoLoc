import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createJiti } from 'jiti';
import { createTermSchema, importMetadataSchema } from '../src/lib/validators/term.schema';

async function main() {
    const root = process.cwd();
    const directory = mkdtempSync(path.join(tmpdir(), 'nanoloc-feedback-'));
    const databasePath = path.join(directory, 'test.db');
    writeFileSync(databasePath, '');
    process.env.DATABASE_URL = `file:${databasePath}`;
    const keepDatabase = process.env.NANOLOC_KEEP_TEST_DB === '1';
    const jiti = createJiti(path.join(root, 'scripts/verify-feedback-contracts.ts'), {
        alias: { '@': path.join(root, 'src') },
    });
    execFileSync(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
        cwd: root,
        env: process.env,
        stdio: 'pipe',
        encoding: 'utf8',
    });
    const { prisma } = await jiti.import<typeof import('../src/lib/prisma')>(path.join(root, 'src/lib/prisma.ts'));
    const { createTerm, updateTerm, clearTermTranslations } = await jiti.import<typeof import('../src/lib/services/project.service')>(path.join(root, 'src/lib/services/project.service.ts'));
    const { importFile } = await jiti.import<typeof import('../src/lib/services/storage.service')>(path.join(root, 'src/lib/services/storage.service.ts'));
    const { batchTranslateProject } = await jiti.import<typeof import('../src/lib/services/translate.service')>(path.join(root, 'src/lib/services/translate.service.ts'));
    const { BRClient } = await jiti.import<typeof import('../src/lib/ai/br-client')>(path.join(root, 'src/lib/ai/br-client.ts'));
    const originalFetch = globalThis.fetch;

    try {
        assert.equal(importMetadataSchema.safeParse({ developerOwner: '   ' }).success, false);
        assert.equal(createTermSchema.safeParse({ stringName: 'missing.owner' }).success, false);
        assert.equal(importMetadataSchema.safeParse({ developerOwner: '张三', requestNote: '登录页需求 / AS100-2809' }).success, true);

        const user = await prisma.user.create({ data: { username: 'feedback-test', password: 'test-only' } });
        const project = await prisma.project.create({ data: {
            name: 'Feedback regression', baseLanguage: 'en-US', targetLanguages: '["de","fr","ja","ar"]',
            aiBaseUrl: 'http://ai.test', aiApiKey: 'test-only', aiModelId: 'test-only',
        } });
        const term = await createTerm(project.id, {
            stringName: 'range.label', developerOwner: 'Alice', requestNote: 'Initial request', remarks: 'Original note',
            values: { 'en-US': '10-20 kg', de: 'Hand edited', fr: 'Machine draft' },
        }, user.id);
        await updateTerm(term.id, { values: { fr: 'Machine output' }, valueSources: { fr: 'machine' } }, user.id);
        await updateTerm(term.id, { values: { ja: 'Copied base' }, valueSources: { ja: 'copied' } }, user.id);
        // Saving an unchanged full row must not relabel its machine translations.
        await updateTerm(term.id, { remarks: 'Original note', values: { de: 'Hand edited', fr: 'Machine output' } }, user.id);
        let current = await prisma.translationKey.findUniqueOrThrow({ where: { id: term.id }, include: { values: true } });
        assert.equal(current.values.find(value => value.languageCode === 'de')?.isManual, true);
        assert.equal(current.values.find(value => value.languageCode === 'fr')?.isManual, false);
        assert.equal(current.values.find(value => value.languageCode === 'ja')?.isManual, false);

        await clearTermTranslations(term.id, 'en-US', user.id);
        current = await prisma.translationKey.findUniqueOrThrow({ where: { id: term.id }, include: { values: true } });
        assert.deepEqual(current.values.map(value => value.languageCode).sort(), ['de', 'en-US']);
        assert.equal(current.values.find(value => value.languageCode === 'de')?.content, 'Hand edited');
        assert.equal(current.remarks, 'Original note');

        // Historical keys keep their text and acquire only missing metadata.
        const legacy = await prisma.translationKey.create({ data: {
            projectId: project.id, stringName: 'legacy', remarks: 'Legacy note',
            values: { create: { languageCode: 'en-US', content: '24/7 support' } },
        } });
        const metadata = { developerOwner: 'Alice', requestNote: '需求 / AS100-2809' };
        await importFile(project.id, '{"legacy":"24/7 support","new.key":"3.5 MB"}', 'test.json', 'en-US', user.id, metadata);
        const before = await prisma.translationKey.findUniqueOrThrow({ where: { id: legacy.id } });
        assert.equal(before.developerOwner, 'Alice');
        assert.equal(before.requestNote, metadata.requestNote);
        assert.ok(before.remarks?.startsWith('Legacy note\n'));
        await importFile(project.id, '{"legacy":"24/7 support"}', 'test.json', 'en-US', user.id, { developerOwner: 'Bob', requestNote: 'Follow-up request' });
        const after = await prisma.translationKey.findUniqueOrThrow({ where: { id: legacy.id } });
        assert.equal(after.developerOwner, 'Alice');
        assert.equal(after.requestNote, metadata.requestNote);
        assert.ok(after.remarks?.startsWith(before.remarks!));
        assert.ok(after.remarks?.includes('Follow-up request'));
        await importFile(project.id, '{"legacy":"24/7 support"}', 'test.json', 'en-US', user.id, { developerOwner: 'Bob', requestNote: 'Follow-up request' });
        assert.equal((await prisma.translationKey.findUniqueOrThrow({ where: { id: legacy.id } })).remarks, after.remarks);
        await importFile(project.id, '{"legacy":"Changed source"}', 'test.json', 'en-US', user.id, metadata);
        assert.equal((await prisma.translationValue.findUniqueOrThrow({ where: { translationKeyId_languageCode: { translationKeyId: legacy.id, languageCode: 'en-US' } } })).content, '24/7 support');
        await importFile(project.id, '<resources><string name="xml.key">10-20 kg</string></resources>', 'test.xml', 'en-US', user.id, metadata);
        await importFile(project.id, '"ios.key" = "3.5 MB";', 'Localizable.strings', 'en-US', user.id, metadata);
        await assert.rejects(importFile(project.id, '{"invalid":"x"}', 'test.json', 'en-US', user.id, { developerOwner: ' ' }));
        assert.equal(await prisma.translationKey.count({ where: { projectId: project.id, stringName: 'invalid' } }), 0);

        const samples = ['10-20 kg', '24/7 support', '3.5 MB', '-10 °C', '1. First option', '[2] Option', '100% complete', 'Version 2.0', 'Count %1$d'];
        globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: samples.map((text, index) => `<<${index + 1}>> ${text}`).join('\n') } }] }));
        const client = new BRClient({ baseUrl: 'http://ai.test', apiKey: 'test-only', modelId: 'test-only' });
        assert.deepEqual(await client.translateBatch(samples, 'de'), samples);

        // Batch translation must skip a manual empty value and a draft saved while AI runs.
        await updateTerm(term.id, { values: { ja: 'Temporary manual' } }, user.id);
        await updateTerm(term.id, { values: { ja: '' } }, user.id);
        let concurrentSave = false;
        globalThis.fetch = async (_input, init) => {
            if (!concurrentSave) {
                concurrentSave = true;
                await updateTerm(legacy.id, { values: { ja: 'Saved during AI request' } }, user.id);
            }
            const body = JSON.parse(String(init?.body)) as { messages: { content: string }[] };
            const source = body.messages[1].content;
            const anchors = Array.from(source.matchAll(/<<(\d+)>> ([^\n]*)/g));
            return new Response(JSON.stringify({ choices: [{ message: { content: anchors.map(match => `<<${match[1]}>> Translated ${match[2]}`).join('\n') } }] }));
        };
        await batchTranslateProject(project.id, ['ja'], user.id);
        const manualEmpty = await prisma.translationValue.findUniqueOrThrow({ where: { translationKeyId_languageCode: { translationKeyId: term.id, languageCode: 'ja' } } });
        assert.equal(manualEmpty.content, '');
        assert.equal(manualEmpty.isManual, true);
        assert.equal((await prisma.translationValue.findUniqueOrThrow({ where: { translationKeyId_languageCode: { translationKeyId: legacy.id, languageCode: 'ja' } } })).content, 'Saved during AI request');
        assert.equal(await prisma.translationValue.count({ where: { languageCode: 'ja', isManual: false, content: { startsWith: 'Translated' } } }) > 0, true);

        if (keepDatabase) {
            const bcrypt = await import('bcryptjs');
            await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash('Feedback-Only-2026!', 10) } });
            await prisma.translationValue.create({ data: { translationKeyId: legacy.id, languageCode: 'fr', content: '   ' } });
            writeFileSync(path.join(directory, 'fixture.json'), JSON.stringify({ databaseUrl: process.env.DATABASE_URL, projectId: project.id, username: user.username }));
            console.log(`Browser fixture: ${path.join(directory, 'fixture.json')}`);
        }
        console.log('Feedback contracts verified: numeric text, metadata, import formats, manual provenance, Clear Row, and concurrent AI writes.');
    } finally {
        globalThis.fetch = originalFetch;
        await prisma.$disconnect();
        if (!keepDatabase) rmSync(directory, { recursive: true, force: true });
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
