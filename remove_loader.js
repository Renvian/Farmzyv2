const fs = require('fs');
const path = require('path');

const dirs = [
    'c:/Users/Renvil/Downloads/Farmzy.-main (1)/Farmzy.-main',
    'c:/Users/Renvil/Downloads/Farmzy.-main'
];

dirs.forEach(dir => {
    // 1. Clean app.js
    let appJsPath = path.join(dir, 'app.js');
    if (fs.existsSync(appJsPath)) {
        let appJs = fs.readFileSync(appJsPath, 'utf8');
        // Remove hideLoadingAnimation and DOMContentLoaded
        appJs = appJs.replace(/\/\/ Truck Loading Animation Function[\s\S]*?setTimeout\(hideLoadingAnimation, 2000\);\s*\n\}\);/g, '');
        fs.writeFileSync(appJsPath, appJs);
    }

    // 2. Clean index.html
    let indexHtmlPath = path.join(dir, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
        let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
        // Remove <div class="loader"> ... </div>
        indexHtml = indexHtml.replace(/[ \t]*<!-- Truck Loading Animation -->[\s\S]*?<div class="loader">[\s\S]*?<\/div>\s*<\/div>/, '');
        fs.writeFileSync(indexHtmlPath, indexHtml);
    }

    // 3. Clean style.css
    let styleCssPath = path.join(dir, 'style.css');
    if (fs.existsSync(styleCssPath)) {
        let styleCss = fs.readFileSync(styleCssPath, 'utf8');
        // Remove the loader CSS block
        styleCss = styleCss.replace(/\/\* Original Truck Loading Animation \(Preserved\) \*\/[\s\S]*?@keyframes roadAnimation \{ 0% \{ transform: translateX\(0px\); \} 100% \{ transform: translateX\(-350px\); \} \}/, '');
        fs.writeFileSync(styleCssPath, styleCss);
    }
});
console.log("Cleanup complete");
