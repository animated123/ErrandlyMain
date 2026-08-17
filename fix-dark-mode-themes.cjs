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

  // Semantic color replacements
  content = content.replace(/bg-white/g, 'bg-card text-card-foreground');
  content = content.replace(/bg-slate-50/g, 'bg-muted');
  content = content.replace(/bg-slate-100/g, 'bg-secondary');
  content = content.replace(/bg-slate-900/g, 'bg-foreground text-background');
  
  // Clean up potential double text-classes or double bg. 
  // Let's use simple logic: using tailwind utility standard regexes.
  
  content = content.replace(/text-slate-900/g, 'text-foreground');
  content = content.replace(/text-slate-800/g, 'text-foreground');
  content = content.replace(/text-slate-700/g, 'text-foreground');
  content = content.replace(/text-slate-600/g, 'text-muted-foreground');
  content = content.replace(/text-slate-500/g, 'text-muted-foreground');
  content = content.replace(/text-slate-400/g, 'text-muted-foreground');
  content = content.replace(/text-slate-300/g, 'text-muted-foreground/70');
  content = content.replace(/text-slate-200/g, 'text-muted-foreground/50');
  
  content = content.replace(/border-slate-100/g, 'border-border');
  content = content.replace(/border-slate-200/g, 'border-border');
  content = content.replace(/border-slate-300/g, 'border-border');
  
  // Some fixes to previous replace. bg-card text-card-foreground may overlap if originally it was `bg-white text-slate-900`
  content = content.replace(/text-card-foreground text-foreground/g, 'text-foreground');

  if (content !== initialContent) {
    fs.writeFileSync(file, content);
    changedFiles++;
  }
});

console.log(`Updated ${changedFiles} files with dark mode semantic colors.`);
