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

    // Global gray -> zinc swap
    content = content.replace(/gray-/g, 'zinc-');

    // Primary Buttons (Indigo)
    content = content.replace(/bg-indigo-600/g, 'bg-zinc-100');
    content = content.replace(/hover:bg-indigo-[45]00/g, 'hover:bg-white');
    content = content.replace(/focus-visible:outline-indigo-500/g, 'focus-visible:outline-zinc-400');
    content = content.replace(/ring-indigo-500/g, 'ring-zinc-400');
    content = content.replace(/text-indigo-400/g, 'text-zinc-300');
    content = content.replace(/text-indigo-300/g, 'text-zinc-200');
    content = content.replace(/border-indigo-500/g, 'border-zinc-400');
    content = content.replace(/bg-indigo-500\/([0-9]+)/g, 'bg-zinc-400/$1');
    content = content.replace(/bg-indigo-500/g, 'bg-zinc-100');

    // Primary text adjustment for light backgrounds (changing text-white to text-zinc-900 where needed)
    // It's safer to just replace 'bg-zinc-100 text-white' to 'bg-zinc-100 text-zinc-900'
    content = content.replace(/bg-zinc-100([^"']*)text-white/g, 'bg-zinc-100$1text-zinc-900');
    content = content.replace(/text-white([^"']*)bg-zinc-100/g, 'text-zinc-900$1bg-zinc-100');
    content = content.replace(/text-white([^"']*)bg-indigo-600/g, 'text-zinc-900$1bg-zinc-100'); // safety catch

    // Batch Translate Button (Purple)
    content = content.replace(/bg-purple-600/g, 'bg-zinc-100');
    content = content.replace(/hover:bg-purple-500/g, 'hover:bg-white');
    content = content.replace(/text-purple-500/g, 'text-zinc-400');
    content = content.replace(/bg-zinc-100([^"']*)text-white/g, 'bg-zinc-100$1text-zinc-900');

    fs.writeFileSync(file, content, 'utf8');
});

console.log('✅ Applied UI/UX color changes to target source files.');
