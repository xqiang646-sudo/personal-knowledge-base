import fs from "node:fs";
import path from "node:path";

const output = process.argv[2] || "_site";
const errors = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

for (const file of walk(output).filter((entry) => entry.endsWith(".html"))) {
  const html = fs.readFileSync(file, "utf8");
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${file}: duplicate id ${id}`);
    seen.add(id);
  }
  for (const match of html.matchAll(/<label[^>]*\bfor=["']([^"']+)["']/g)) {
    if (!seen.has(match[1])) errors.push(`${file}: missing label target ${match[1]}`);
  }
}

const updateFile = path.join(output, "update.html");
if (!fs.existsSync(updateFile)) {
  errors.push(`${updateFile}: learning-card page is missing`);
} else {
  const update = fs.readFileSync(updateFile, "utf8");
  for (const token of [
    "data-learning-record-form",
    "data-storage-recovery",
    "data-copy-skill-prompt",
    "data-import-learning-json",
    "learning-record-schema"
  ]) {
    if (!update.includes(token)) errors.push(`${updateFile}: missing ${token}`);
  }
  if ((update.match(/<main\b/g) || []).length !== 1) errors.push(`${updateFile}: expected exactly one main element`);
}

if (errors.length) {
  console.error(`HTML 结构校验失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HTML 静态结构校验通过：无重复 ID，label 目标完整，学习卡关键控件齐全。");
