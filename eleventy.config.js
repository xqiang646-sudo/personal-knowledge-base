import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";

const SITE_PREFIX = "/personal-knowledge-base/";

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
  }).use(markdownItAnchor, {
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
