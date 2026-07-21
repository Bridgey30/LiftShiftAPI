import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';

const DIR = join(import.meta.dirname, '..', 'frontend/public/images/LandingPageSvgAssets');

function standardizeSvg(filePath) {
  let svg = readFileSync(filePath, 'utf-8');

  // Step 1: Remove XML declaration
  svg = svg.replace(/<\?xml[^?]*\?>\s*/g, '');

  // Step 2: Remove DOCTYPE
  svg = svg.replace(/<!DOCTYPE[^>]*>\s*/g, '');

  // Step 3: Remove HTML comments (license, generator, etc.)
  svg = svg.replace(/<!--[\s\S]*?-->/g, '');

  // Step 4: Remove blank lines
  svg = svg.trim().replace(/\n\s*\n/g, '\n');

  // Step 5: Extract CSS class definitions from <style> blocks, then remove them
  const cssRules = {};
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  svg = svg.replace(styleRegex, (match, css) => {
    const ruleRegex = /\.(\w+)\s*\{([^}]+)\}/g;
    let r;
    while ((r = ruleRegex.exec(css)) !== null) {
      cssRules[r[1]] = r[2];
    }
    return '';
  });

  // Step 6: Apply CSS class styles as inline styles on elements
  for (const [cls, props] of Object.entries(cssRules)) {
    const escaped = cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const classRegex = new RegExp(`class="([^"]*\\b${escaped}\\b[^"]*)"`, 'g');
    svg = svg.replace(classRegex, (match, classes) => {
      const remaining = classes.split(/\s+/).filter(c => c !== cls).join(' ');
      if (remaining) {
        return `class="${remaining}" style="${props}"`;
      }
      return `style="${props}"`;
    });
  }

  // Step 7: Remove any remaining empty class attributes
  svg = svg.replace(/\s*class="\s*"/g, '');

  // Step 8: Normalize stroke colors -> currentColor
  svg = svg.replace(/stroke="(#[0-9a-fA-F]{3,6})"/gi, 'stroke="currentColor"');
  svg = svg.replace(/stroke:\s*(#[0-9a-fA-F]{3,6})/gi, 'stroke:currentColor');

  // Step 9: Normalize fill colors -> currentColor
  svg = svg.replace(/fill="(#[0-9a-fA-F]{3,6})"/gi, 'fill="currentColor"');
  svg = svg.replace(/fill:\s*(#[0-9a-fA-F]{3,6})/gi, 'fill:currentColor');

  // Step 10: Normalize stroke-width in both CSS and attribute forms
  svg = svg.replace(/stroke-width:\s*2(?![\d.])/g, 'stroke-width:1.5');
  svg = svg.replace(/stroke-width:\s*3(?![\d.])/g, 'stroke-width:1.5');
  svg = svg.replace(/stroke-width="2"/g, 'stroke-width="1.5"');
  svg = svg.replace(/stroke-width="3"/g, 'stroke-width="1.5"');

  // Step 11: Remove fixed width/height from <svg> (use viewBox + 100%)
  // Negative lookbehind avoids matching stroke-width, stroke-width etc.
  svg = svg.replace(/(?<![\w-])width="[^"]*"/g, '');
  svg = svg.replace(/(?<![\w-])height="[^"]*"/g, '');

  // Step 12: Remove extraneous SVG attributes
  svg = svg.replace(/\s*xml:space="preserve"/g, '');
  svg = svg.replace(/\s*enable-background="[^"]*"/g, '');
  svg = svg.replace(/\s*x="0px"/g, '');
  svg = svg.replace(/\s*y="0px"/g, '');
  svg = svg.replace(/\s*id="[^"]*"/g, '');
  svg = svg.replace(/\s*data-name="[^"]*"/g, '');
  svg = svg.replace(/\s*version="[^"]*"/g, '');
  svg = svg.replace(/\s*xmlns:xlink="[^"]*"/g, '');
  svg = svg.replace(/\s*class="iconify[^"]*"/g, '');
  svg = svg.replace(/\s*aria-hidden="[^"]*"/g, '');
  svg = svg.replace(/\s*role="[^"]*"/g, '');
  svg = svg.replace(/\s*preserveAspectRatio="[^"]*"/g, '');

  // Step 13: Remove enable-background from style attributes
  svg = svg.replace(/enable-background:[^;"]*;?/g, '');

  // Step 14: Remove empty style attributes
  svg = svg.replace(/\s*style="\s*;?\s*"/g, '');

  // Step 15: Add fill="currentColor" to root <svg> if not already present
  // This ensures fill-based SVGs (which rely on SVG default fill) get currentColor.
  // Stroke-based SVGs have fill="none" on child elements which overrides this.
  if (!/<svg[^>]*\bfill\s*=/i.test(svg)) {
    svg = svg.replace(/<svg\s/, '<svg fill="currentColor" ');
  }

  // Step 16: Add stroke-linecap/join defaults if stroke is used
  // Only add to elements that have stroke but no linecap/linejoin
  svg = svg.replace(/stroke-linecap="([^"]*)"/g, ''); // remove existing first
  svg = svg.replace(/stroke-linejoin="([^"]*)"/g, '');

  // Add stroke-linecap and stroke-linejoin to stroke-based elements
  // Find elements that have stroke (but not stroke="none")
  svg = svg.replace(/(<[^>]*\bstroke="currentColor"[^>]*)(>)/g, (match, tag, end) => {
    if (!/stroke-linecap/.test(tag)) {
      tag += ' stroke-linecap="round"';
    }
    if (!/stroke-linejoin/.test(tag)) {
      tag += ' stroke-linejoin="round"';
    }
    return tag + end;
  });

  // Clean up
  svg = svg.replace(/\s{2,}/g, ' ');
  svg = svg.replace(/<svg\s+/, '<svg ');
  svg = svg.replace(/\n\s*\n\s*\n/g, '\n\n');
  svg = svg.trim() + '\n';

  return svg;
}

// Restore from backups first
const BACKUP_DIR = join(DIR, '_backup');
if (readdirSync(BACKUP_DIR, { withFileTypes: false }).length > 0) {
  console.log('Restoring from backups...');
  for (const file of readdirSync(BACKUP_DIR)) {
    if (file === '.DS_Store') continue;
    writeFileSync(join(DIR, file), readFileSync(join(BACKUP_DIR, file), 'utf-8'));
  }
}

const files = readdirSync(DIR).filter(f => f.endsWith('.svg'));

// Create new backups
mkdirSync(BACKUP_DIR, { recursive: true });
for (const file of files) {
  writeFileSync(join(BACKUP_DIR, file), readFileSync(join(DIR, file), 'utf-8'));
}

console.log(`Processing ${files.length} SVG files...\n`);

for (const file of files) {
  const filePath = join(DIR, file);
  try {
    const result = standardizeSvg(filePath);
    writeFileSync(filePath, result);
    console.log(`  ✓ ${file}`);
  } catch (err) {
    console.log(`  ✗ ${file}: ${err.message}`);
  }
}

console.log(`\nDone. Backups at ${BACKUP_DIR}`);
