import assert from 'node:assert/strict';
import {
    comparePlaceholders,
    extractPlaceholders,
    isPlaceholderSegment,
    splitPlaceholderSegments,
} from '../src/lib/placeholder-utils';
import { buildCsvRow, formatSingleJsonPullEntry } from '../src/lib/storage-format-contract';

const source = 'Alert %1$s for {name}: ${count} / {{total}}';
const translated = 'تنبيه %1$s إلى {name}: ${count} / {{total}}';

assert.deepEqual(extractPlaceholders(source), ['%1$s', '{name}', '${count}', '{{total}}']);
assert.equal(comparePlaceholders(source, translated).valid, true);
assert.deepEqual(comparePlaceholders(source, 'تنبيه %s إلى {name}: ${count}').missing, ['%1$s', '{{total}}']);
assert.deepEqual(comparePlaceholders(source, 'تنبيه %s إلى {name}: ${count}').extra, ['%s']);
assert.equal(comparePlaceholders('%s %s', 'قيمة %s').valid, false);
assert.deepEqual(extractPlaceholders('Save 50% today'), []);

const segments = splitPlaceholderSegments('تنبيه، %1$s');
assert.deepEqual(segments, ['تنبيه، ', '%1$s']);
assert.equal(isPlaceholderSegment(segments[0]), false);
assert.equal(isPlaceholderSegment(segments[1]), true);

const key = {
    stringName: 'alert.message',
    remarks: null,
    values: [
        { languageCode: 'en-US', content: source },
        { languageCode: 'ar', content: translated },
    ],
};
assert.equal(buildCsvRow(key, 'en-US', ['ar']).includes(translated), true);
assert.equal(JSON.parse(`{${formatSingleJsonPullEntry(key, 'ar', 'en-US')}}`)['alert.message'], translated);

console.log('Placeholder contracts verified.');
