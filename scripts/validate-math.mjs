import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import markdownIt from "markdown-it";
import { markdownItMath } from "../eleventy.config.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const markdown = markdownIt({ html: true }).use(markdownItMath);
const renderInline = (source) => markdown.renderInline(source);

assert.equal(renderInline("速度是 $v_x$。"), "速度是 \\(v_x\\)。");
assert.equal(renderInline("价格从 $5 到 $10"), "价格从 $5 到 $10");
assert.equal(
  renderInline("错误 $x 跨行\n到 y$ 结束"),
  "错误 $x 跨行\n到 y$ 结束"
);
assert.equal(
  renderInline("行内 $x$ 后接块符号 $$y$$"),
  "行内 \\(x\\) 后接块符号 $$y$$"
);
assert.equal(renderInline("转义 \\$5 与公式 $x$"), "转义 $5 与公式 \\(x\\)");
assert.equal(renderInline("不要把 $x$2 吞成公式"), "不要把 $x$2 吞成公式");
assert.equal(
  renderInline("保留 $x$2，再继续解析 $y$"),
  "保留 $x$2，再继续解析 \\(y\\)"
);
assert.equal(
  renderInline("代码 `$x$`，公式 $y$"),
  "代码 <code>$x$</code>，公式 \\(y\\)"
);

const evenEscape = renderInline(String.raw`偶数反斜杠 \\$x$`);
assert.ok(evenEscape.includes("\\(x\\)"), "偶数个反斜杠后仍应识别公式");
assert.equal(
  markdown.render("$$\nx^2 + y^2\n$$\n"),
  '<div class="math-display">\\[x^2 + y^2\\]</div>\n'
);

const baseTemplate = await readFile(`${repositoryRoot}src/_includes/layouts/base.njk`, "utf8");
const baseConfigIndex = baseTemplate.indexOf("mathjax-config.js");
const baseCdnIndex = baseTemplate.indexOf("mathjax@4/tex-chtml.js");
assert.ok(baseConfigIndex >= 0 && baseConfigIndex < baseCdnIndex, "MathJax 配置必须先于 CDN 脚本加载");

const noteNames = (await readdir(`${repositoryRoot}notes`)).filter((name) => name.endsWith(".html"));
const mathNoteNames = [];
for (const name of noteNames) {
  const html = await readFile(`${repositoryRoot}notes/${name}`, "utf8");
  const cdnIndex = html.indexOf("mathjax@4/tex-chtml.js");
  if (cdnIndex < 0) continue;
  mathNoteNames.push(name);
  const configIndex = html.indexOf("mathjax-config.js");
  assert.ok(configIndex >= 0 && configIndex < cdnIndex, `${name} 的 MathJax 配置必须先于 CDN 脚本加载`);
}
assert.equal(mathNoteNames.length, 5, "旧版数学页面数量变化时，请同步检查 MathJax 配置覆盖范围");

console.log("Math delimiter regression checks passed.");
