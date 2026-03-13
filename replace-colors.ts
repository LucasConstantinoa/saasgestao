import fs from 'fs';

const files = [
  'src/App.tsx',
  'src/components/SettingsView.tsx',
  'src/components/BranchRealTimeDashboard.tsx',
  'src/components/UI.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/dark:text-sky-400\/40/g, 'dark:text-primary/40');
    content = content.replace(/dark:text-sky-400\/30/g, 'dark:text-primary/30');
    content = content.replace(/dark:text-sky-400\/60/g, 'dark:text-primary/60');
    content = content.replace(/dark:text-sky-400/g, 'dark:text-primary');
    content = content.replace(/text-sky-500/g, 'text-primary');
    content = content.replace(/text-sky-400/g, 'text-primary');
    
    content = content.replace(/dark:bg-sky-950\/10/g, 'dark:bg-primary/5');
    content = content.replace(/dark:bg-sky-950\/20/g, 'dark:bg-primary/5');
    content = content.replace(/dark:bg-sky-950\/30/g, 'dark:bg-primary/10');
    content = content.replace(/dark:bg-sky-950\/50/g, 'dark:bg-primary/20');
    content = content.replace(/dark:bg-sky-950\/60/g, 'dark:bg-primary/20');
    content = content.replace(/dark:bg-sky-400\/5/g, 'dark:bg-primary/5');
    
    content = content.replace(/bg-sky-500\/5/g, 'bg-primary/5');
    content = content.replace(/bg-sky-500\/10/g, 'bg-primary/10');
    content = content.replace(/hover:bg-sky-500\/5/g, 'hover:bg-primary/5');
    content = content.replace(/hover:bg-sky-500\/10/g, 'hover:bg-primary/10');
    
    content = content.replace(/dark:border-sky-500\/10/g, 'dark:border-primary/20');
    content = content.replace(/border-sky-500\/10/g, 'border-primary/10');
    content = content.replace(/border-sky-500\/20/g, 'border-primary/20');
    
    content = content.replace(/dark:text-sky-50/g, 'dark:text-white');
    content = content.replace(/from-sky-500\/10/g, 'from-primary/10');
    content = content.replace(/to-sky-500\/10/g, 'to-primary/10');
    content = content.replace(/to-sky-400/g, 'to-primary');
    
    fs.writeFileSync(file, content);
  }
});
console.log("Replaced sky colors with primary colors.");
