const fs = require('fs');
const file = 'c:/Users/Renvil/Downloads/Farmzy.-main (1)/Farmzy.-main/app.js';
let data = fs.readFileSync(file, 'utf8');

const target = /document\.addEventListener\('DOMContentLoaded', function\(\) \{\s*\/\/ Hide the loader after a short delay to show the animation\s*setTimeout\(hideLoadingAnimation, 2000\);\s*\}\);/;

const replacement = `// Auto-hide loading animation after page loads
document.addEventListener('DOMContentLoaded', async function() {
    if (!document.querySelector('.loader')) {
        try {
            const res = await fetch('index.html');
            if (res.ok) {
                const text = await res.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');
                const loader = doc.querySelector('.loader');
                if (loader) {
                    document.body.prepend(loader);
                }
            }
        } catch (e) {}
    }
    setTimeout(hideLoadingAnimation, 2000);
});`;

data = data.replace(target, replacement);
fs.writeFileSync(file, data);

// Also sync to the other folder
const file2 = 'c:/Users/Renvil/Downloads/Farmzy.-main/app.js';
fs.writeFileSync(file2, data);
