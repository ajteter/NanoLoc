const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content.replace(/text-green-([1-9]00)/g, 'text-emerald-$1');
    newContent = newContent.replace(/bg-green-([1-9]00)/g, 'bg-emerald-$1');
    newContent = newContent.replace(/border-green-([1-9]00)/g, 'border-emerald-$1');
    newContent = newContent.replace(/ring-green-([1-9]00)/g, 'ring-emerald-$1');

    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
    }
});
console.log('Done!');
