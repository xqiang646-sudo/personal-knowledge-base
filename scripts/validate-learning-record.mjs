import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  emptyLearningRecordState,
  fieldsForType,
  firstPrinciplesPrompt,
  learningRecordFileName,
  learningRecordMarkdown,
  mergeCourseProgressStatus,
  normalizeLearningRecord,
  normalizeLearningRecordState
} from "../src/assets/learning-record-core.js";

const schema = JSON.parse(await readFile(new URL("../src/_data/learningRecord.json", import.meta.url), "utf8"));
const sample = normalizeLearningRecord({
  recordType: "learning-session",
  recordId: "sample-coordinate",
  courseId: "linear-algebra-coordinate",
  courseTitleSnapshot: "线性代数与坐标变换",
  courseUrl: "/learn/math/linear-algebra-coordinate.html",
  sessionDate: "2026-07-17",
  selfStatus: "experiment-done",
  fields: {
    question: "为什么变换顺序不能交换？",
    startingModel: "我原来以为两次移动换顺序也一样。",
    observed: "先旋转再平移与先平移再旋转得到不同坐标。",
    unknownField: "不应进入记录"
  }
}, schema);

assert.equal(schema.schemaVersion, 1);
assert.equal(schema.maxEntries, 500);
assert.ok(schema.maxImportBytes >= 20_000_000);
assert.equal(sample.fields.unknownField, undefined);
assert.equal(sample.privacy, "private");
assert.match(learningRecordMarkdown(sample, schema), /为什么变换顺序不能交换/);
assert.match(firstPrinciplesPrompt(sample, schema), /^请使用 \$first-principles-learning。/);
assert.equal(learningRecordFileName(sample), "learning-card-2026-07-17-linear-algebra-coordinate.md");
assert.equal(normalizeLearningRecordState({ ...emptyLearningRecordState(schema), entries: [sample] }, schema).entries.length, 1);
assert.throws(() => normalizeLearningRecord({ ...sample, recordType: "unknown" }, schema), /记录类型无效/);
assert.throws(() => normalizeLearningRecord({ ...sample, fields: {} }, schema), /不能为空/);
assert.throws(() => normalizeLearningRecordState({ version: 99, entries: [] }, schema), /备份版本无效/);
assert.throws(() => normalizeLearningRecordState({
  ...emptyLearningRecordState(schema),
  entries: [{ ...sample, updatedAt: "not-a-time" }]
}, schema), /记录时间无效/);
assert.throws(() => normalizeLearningRecord({
  ...sample,
  selfStatus: "transfer-ready"
}, schema), /换一个条件后的独立结果/);

const transferReady = normalizeLearningRecord({
  ...sample,
  selfStatus: "transfer-ready",
  fields: {
    ...sample.fields,
    transfer: "把平移量改成 2 米后，我独立算出并核对了结果。",
    evidenceRef: "脱敏手算结果：coordinate-transfer-2m.md",
    counterexample: "交换旋转和平移顺序后结果错误；边界是变换不可交换。"
  }
}, schema);
assert.equal(mergeCourseProgressStatus("not-started", sample), "in-progress");
assert.equal(mergeCourseProgressStatus("artifact-ready", sample), "artifact-ready");
assert.equal(mergeCourseProgressStatus("in-progress", transferReady), "artifact-ready");

const fieldIds = fieldsForType(schema, "learning-session").map((field) => field.id);
assert.equal(new Set(fieldIds).size, fieldIds.length, "学习记录字段 ID 不应重复");

const skill = await readFile(new URL("../.agents/skills/first-principles-learning/SKILL.md", import.meta.url), "utf8");
assert.match(skill, /^---\nname: first-principles-learning\n/m);
assert.match(skill, /src\/_data\/learningRecord\.json/);
assert.match(skill, /only as the field contract/);

const skillMetadata = await readFile(new URL("../.agents/skills/first-principles-learning/agents/openai.yaml", import.meta.url), "utf8");
assert.match(skillMetadata, /display_name: "第一性原理学习教练"/);
assert.match(skillMetadata, /default_prompt: "使用 \$first-principles-learning/);

const updateTemplate = await readFile(new URL("../src/update.njk", import.meta.url), "utf8");
assert.match(updateTemplate, /data-course-url="\{\{ course\.url \| siteUrl \}\}"/);
assert.match(updateTemplate, /<li><span>7<\/span><strong>换一个条件再做<\/strong>/);
assert.doesNotMatch(updateTemplate, /data-import-learning-json hidden/);

console.log("学习卡合同与第一性原理 Skill 校验通过。");
