const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    filelist = fs.statSync(path.join(dir, file)).isDirectory()
      ? walkSync(path.join(dir, file), filelist)
      : filelist.concat(path.join(dir, file));
  });
  return filelist;
};

const componentsDir = path.join(__dirname, 'src', 'components');
const files = walkSync(componentsDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

files.push(path.join(__dirname, 'App.tsx'));

let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const initialContent = content;

  content = content.replace(/text-\[7px\]/g, 'text-[10px]');
  content = content.replace(/text-\[8px\]/g, 'text-xs');
  content = content.replace(/text-\[9px\]/g, 'text-xs');
  content = content.replace(/text-\[10px\]/g, 'text-sm');
  content = content.replace(/text-\[11px\]/g, 'text-sm');
  content = content.replace(/uppercase tracking-widest/g, 'tracking-normal font-medium');

  // Fix tiny icon sizes
  content = content.replace(/size=\{[6-9]\}/g, 'size={14}');
  content = content.replace(/size=\{10\}/g, 'size={16}');
  content = content.replace(/size=\{11\}/g, 'size={16}');
  content = content.replace(/size=\{12\}/g, 'size={16}');

  if (content !== initialContent) {
    fs.writeFileSync(file, content);
    changedFiles++;
  }
});

console.log(`Updated ${changedFiles} files with better typography.`);
