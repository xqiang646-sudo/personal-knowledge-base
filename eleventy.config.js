import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";

const SITE_PREFIX = "/personal-knowledge-base/";

function normalizeLatex(source) {
  // Keep TeX commands and matrix row separators untouched. The dedicated math
  // tokens prevent Markdown from interpreting underscores or backslashes.
  return source;
}

function markdownItMath(markdown) {
  markdown.inline.ruler.before("escape", "math_inline", (state, silent) => {
    const start = state.pos;
    if (state.src[start] !== "$" || state.src[start + 1] === "$" || state.src[start - 1] === "\\") {
      return false;
    }

    let end = start + 1;
    while (end < state.posMax) {
      if (state.src[end] === "$" && state.src[end - 1] !== "\\") break;
      end += 1;
    }
    if (end >= state.posMax || end === start + 1) return false;
    if (silent) return true;

    const token = state.push("math_inline", "math", 0);
    token.content = normalizeLatex(state.src.slice(start + 1, end));
    token.markup = "$";
    state.pos = end + 1;
    return true;
  });

  markdown.block.ruler.before("fence", "math_block", (state, startLine, endLine, silent) => {
    const start = state.bMarks[startLine] + state.tShift[startLine];
    const lineEnd = state.eMarks[startLine];
    if (state.src.slice(start, start + 2) !== "$$") return false;
    if (silent) return true;

    const openingRemainder = state.src.slice(start + 2, lineEnd);
    let content = "";
    let closingLine = startLine;
    let found = false;

    if (openingRemainder.trim().endsWith("$$")) {
      content = openingRemainder.trim().slice(0, -2);
      found = true;
    } else {
      content = openingRemainder;
      for (closingLine = startLine + 1; closingLine < endLine; closingLine += 1) {
        const currentStart = state.bMarks[closingLine] + state.tShift[closingLine];
        const currentEnd = state.eMarks[closingLine];
        const currentLine = state.src.slice(currentStart, currentEnd);
        const closingIndex = currentLine.lastIndexOf("$$");
        if (closingIndex >= 0 && currentLine.slice(closingIndex + 2).trim() === "") {
          content += `\n${currentLine.slice(0, closingIndex)}`;
          found = true;
          break;
        }
        content += `\n${currentLine}`;
      }
    }

    if (!found) return false;

    const token = state.push("math_block", "math", 0);
    token.block = true;
    token.content = normalizeLatex(content.trim());
    token.map = [startLine, closingLine + 1];
    token.markup = "$$";
    state.line = closingLine + 1;
    return true;
  }, { alt: ["paragraph", "reference", "blockquote", "list"] });

  markdown.renderer.rules.math_inline = (tokens, index) =>
    `\\(${markdown.utils.escapeHtml(tokens[index].content)}\\)`;
  markdown.renderer.rules.math_block = (tokens, index) =>
    `<div class="math-display">\\[${markdown.utils.escapeHtml(tokens[index].content)}\\]</div>\n`;
}

function normalizedUrl(value) {
  if (!value) return "";
  if (/^(?:https?:|mailto:|tel:|#)/.test(value)) return value;
  const path = value.startsWith("/") ? value.slice(1) : value;
  return `${SITE_PREFIX}${path}`;
}

export default function (eleventyConfig) {
  const markdown = markdownIt({
    html: true,
    linkify: true,
    typographer: false,
  }).use(markdownItMath).use(markdownItAnchor, {
    level: [2, 3, 4],
    slugify: (value) => value
      .trim()
      .toLowerCase()
      .replace(/[\s/]+/g, "-")
      .replace(/[^\p{L}\p{N}\-_]/gu, ""),
  });

  markdown.renderer.rules.table_open = () =>
    '<div class="table-wrap" role="region" aria-label="数据表，可横向滚动" tabindex="0"><table>';
  markdown.renderer.rules.table_close = () => '</table></div>';
  const defaultFence = markdown.renderer.rules.fence;
  markdown.renderer.rules.fence = (tokens, index, options, environment, renderer) => {
    const language = tokens[index].info.trim().split(/\s+/)[0];
    if (language === "mermaid") {
      const source = markdown.utils.escapeHtml(tokens[index].content);
      return `<div class="lesson-diagram" role="region" aria-label="课程图示，可横向滚动" tabindex="0"><pre class="mermaid">${source}</pre></div>`;
    }
    return defaultFence(tokens, index, options, environment, renderer);
  };

  eleventyConfig.setLibrary("md", markdown);
  // The repository root is also the GitHub Pages publish directory. Keep only
  // legacy assets here as Eleventy inputs; V2 assets are sourced from src/assets
  // and copied back to the root after a successful production build.
  eleventyConfig.addPassthroughCopy("assets/knowledge.css");
  eleventyConfig.addPassthroughCopy("assets/*.png");
  eleventyConfig.addPassthroughCopy("notes");
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addWatchTarget("assets");
  eleventyConfig.addWatchTarget("src/assets");

  eleventyConfig.addFilter("siteUrl", normalizedUrl);
  eleventyConfig.addFilter("courseById", (courses, id) =>
    courses.find((course) => course.id === id));
  eleventyConfig.addFilter("stageById", (stages, id) =>
    stages.find((stage) => stage.id === id));
  eleventyConfig.addFilter("coursesForStage", (courses, stageId) =>
    courses.filter((course) => course.stage === stageId).sort((left, right) => left.order - right.order));
  eleventyConfig.addFilter("coursesByTopic", (courses, topic) =>
    courses.filter((course) => course.topics.includes(topic)));
  eleventyConfig.addFilter("uniqueTopics", (courses) =>
    [...new Set(courses.flatMap((course) => course.topics))].sort((a, b) => a.localeCompare(b, "zh-CN")));
  eleventyConfig.addFilter("countStatus", (courses, status) =>
    courses.filter((course) => course.status === status).length);
  eleventyConfig.addFilter("prerequisiteCourses", (courses, ids = []) =>
    ids.map((id) => courses.find((course) => course.id === id)).filter(Boolean));
  eleventyConfig.addFilter("nextAvailableCourse", (courses, id) => {
    const available = courses.filter((course) => course.url && course.status !== "planned");
    const index = available.findIndex((course) => course.id === id);
    return index >= 0 ? available[index + 1] : undefined;
  });
  eleventyConfig.addFilter("previousAvailableCourse", (courses, id) => {
    const available = courses.filter((course) => course.url && course.status !== "planned");
    const index = available.findIndex((course) => course.id === id);
    return index > 0 ? available[index - 1] : undefined;
  });
}

export const config = {
  pathPrefix: SITE_PREFIX,
  dir: {
    input: "src",
    output: "_site",
    includes: "_includes",
    data: "_data"
  },
  markdownTemplateEngine: "njk",
  htmlTemplateEngine: "njk"
};
