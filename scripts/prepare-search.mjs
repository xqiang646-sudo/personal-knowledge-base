import fs from "node:fs";
import path from "node:path";

const notesDirectory = path.resolve("_site/notes");
let tagged = 0;

if (fs.existsSync(notesDirectory)) {
  for (const name of fs.readdirSync(notesDirectory)) {
    if (!name.endsWith(".html")) continue;
    const file = path.join(notesDirectory, name);
    const original = fs.readFileSync(file, "utf8");
    if (!original.includes('<article class="page wrap">')) continue;
    const updated = original
      .replace('<nav class="topbar"', '<nav class="topbar" data-pagefind-ignore')
      .replace('<article class="page wrap">', '<article class="page wrap" data-pagefind-body>');
    fs.writeFileSync(file, updated);
    tagged += 1;
  }
}

console.log(`搜索准备完成：为 ${tagged} 个现有课程页面标记正文。`);
