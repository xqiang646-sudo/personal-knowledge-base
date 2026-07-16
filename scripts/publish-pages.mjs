import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildRoot = path.join(projectRoot, "_site");

if (!fs.existsSync(buildRoot)) {
  console.error("发布失败：_site 不存在，请先运行 npm run check。");
  process.exit(1);
}

let copiedFiles = 0;

function copyTree(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyTree(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
      copiedFiles += 1;
    }
  }
}

function cleanHtmlFile(file) {
  const original = fs.readFileSync(file, "utf8");
  const cleaned = original.replace(/[\t ]+$/gm, "");
  if (cleaned !== original) fs.writeFileSync(file, cleaned);
}

function cleanHtml(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) cleanHtml(file);
    else if (entry.name.endsWith(".html")) cleanHtmlFile(file);
  }
}

for (const entry of fs.readdirSync(buildRoot, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".html")) continue;
  fs.copyFileSync(path.join(buildRoot, entry.name), path.join(projectRoot, entry.name));
  copiedFiles += 1;
}

for (const directory of ["assets", "notes"]) {
  copyTree(path.join(buildRoot, directory), path.join(projectRoot, directory));
}

for (const directory of ["learn", "pagefind"]) {
  const target = path.join(projectRoot, directory);
  fs.rmSync(target, { recursive: true, force: true });
  copyTree(path.join(buildRoot, directory), target);
}

for (const entry of fs.readdirSync(projectRoot, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".html")) {
    cleanHtmlFile(path.join(projectRoot, entry.name));
  }
}
cleanHtml(path.join(projectRoot, "learn"));
cleanHtml(path.join(projectRoot, "notes"));

console.log(`GitHub Pages 发布目录已同步：${copiedFiles} 个文件。`);
