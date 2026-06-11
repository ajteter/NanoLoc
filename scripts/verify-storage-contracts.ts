import assert from 'node:assert/strict';
import { AndroidXmlParser } from '../src/lib/parsers/android-xml';
import { H5JsonParser } from '../src/lib/parsers/h5-json';
import { IOSStringsParser } from '../src/lib/parsers/ios-strings';
import {
    buildCsvHeader,
    buildCsvRow,
    formatFullJsonPullEntry,
    formatSingleJsonPullEntry,
    formatXmlStringResource,
    type FormatKeyRow,
} from '../src/lib/storage-format-contract';

function parseCsv(csv: string) {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let index = 0; index < csv.length; index++) {
        const char = csv[index];

        if (inQuotes) {
            if (char === '"') {
                if (csv[index + 1] === '"') {
                    field += '"';
                    index++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            inQuotes = true;
        } else if (char === ',') {
            row.push(field);
            field = '';
        } else if (char === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else if (char === '\r') {
            if (csv[index + 1] !== '\n') {
                row.push(field);
                rows.push(row);
                row = [];
                field = '';
            }
        } else {
            field += char;
        }
    }

    if (field || row.length) {
        row.push(field);
        rows.push(row);
    }

    if (rows[0]?.[0]?.charCodeAt(0) === 0xfeff) {
        rows[0][0] = rows[0][0].slice(1);
    }

    return rows;
}

const baseLanguage = 'en-US';
const targetLanguages = ['pt-BR', 'zh-CN'];
const key: FormatKeyRow = {
    stringName: 'home.title',
    remarks: 'Context, with "quotes"\nand ñ',
    values: [
        { languageCode: 'en-US', content: 'Hello, "world"' },
        { languageCode: 'pt-BR', content: 'Olá, ação' },
        { languageCode: 'zh-CN', content: '你好' },
    ],
};

const h5Json = JSON.stringify({
    'home.title': 'Olá, ação',
    'home.subtitle': 'Line 1\nLine 2',
    ignoredCount: 3,
});
assert.deepEqual(new H5JsonParser().parse(h5Json), [
    { name: 'home.title', value: 'Olá, ação' },
    { name: 'home.subtitle', value: 'Line 1\nLine 2' },
]);

const androidXml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<resources>',
    '    <string name="home.title">Olá &amp; ação</string>',
    '    <string name="home.subtitle">Line 1\\nLine 2</string>',
    '</resources>',
].join('\n');
assert.deepEqual(new AndroidXmlParser().parse(androidXml), [
    { name: 'home.title', value: 'Olá &amp; ação' },
    { name: 'home.subtitle', value: 'Line 1\\nLine 2' },
]);

const iosStrings = [
    '"home.title" = "Olá, ação";',
    '"home.subtitle" = "Line 1\\nLine 2";',
].join('\n');
assert.deepEqual(new IOSStringsParser().parse(iosStrings), [
    { name: 'home.title', value: 'Olá, ação' },
    { name: 'home.subtitle', value: 'Line 1\nLine 2' },
]);

const csv = `\uFEFF${buildCsvHeader(baseLanguage, targetLanguages)}\n${buildCsvRow(key, baseLanguage, targetLanguages)}`;
assert.deepEqual(Array.from(Buffer.from(csv).subarray(0, 3)), [0xef, 0xbb, 0xbf]);
assert.deepEqual(parseCsv(csv), [
    ['Key', 'Remarks', 'en-US', 'pt-BR', 'zh-CN'],
    ['home.title', 'Context, with "quotes"\nand ñ', 'Hello, "world"', 'Olá, ação', '你好'],
]);

const fullPullJson = JSON.parse(`{\n${formatFullJsonPullEntry(key, [baseLanguage, ...targetLanguages])}\n}`);
assert.deepEqual(fullPullJson, {
    'home.title': {
        'en-US': 'Hello, "world"',
        'pt-BR': 'Olá, ação',
        'zh-CN': '你好',
    },
});

const fallbackPullJson = JSON.parse(`{\n${formatSingleJsonPullEntry(key, 'fr-FR', baseLanguage)}\n}`);
assert.deepEqual(fallbackPullJson, {
    'home.title': 'Hello, "world"',
});

const emptyKey: FormatKeyRow = {
    stringName: 'empty.key',
    values: [{ languageCode: baseLanguage, content: '' }],
};
assert.equal(formatSingleJsonPullEntry(emptyKey, 'fr-FR', baseLanguage), null);

const pullXml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<resources>',
    formatXmlStringResource('home.title', 'Tom & <Jerry>'),
    '</resources>',
].join('\n');
assert.deepEqual(new AndroidXmlParser().parse(pullXml), [
    { name: 'home.title', value: 'Tom &amp; &lt;Jerry&gt;' },
]);

console.log('Storage format contracts verified.');
