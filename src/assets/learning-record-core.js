function cleanText(value, maxLength = 8000) {
  return String(value ?? "").replace(/\r\n?/g, "\n").trim().slice(0, maxLength);
}

function allowedRecordTypes(schema) {
  return new Set(schema.recordTypes.map((item) => item.id));
}

function allowedStatuses(schema) {
  return new Set(schema.statuses.map((item) => item.id));
}

function normalizedTimestamp(value, fallback) {
  const timestamp = cleanText(value, 80);
  const parsed = Date.parse(timestamp);
  return timestamp && Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

export function fieldsForType(schema, recordType) {
  return schema.groups
    .filter((group) => group.types.includes(recordType))
    .flatMap((group) => group.fields.map((field) => ({ ...field, groupTitle: group.title })));
}

export function emptyLearningRecordState(schema) {
  return { version: schema.schemaVersion, activeId: null, updatedAt: null, entries: [] };
}

export function normalizeLearningRecord(raw, schema, options = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("记录必须是对象");
  const recordType = cleanText(raw.recordType, 64);
  if (!allowedRecordTypes(schema).has(recordType)) throw new Error("记录类型无效");

  const courseId = cleanText(raw.courseId, 160);
  const questionFields = fieldsForType(schema, recordType);
  const fields = {};
  for (const field of questionFields) {
    const value = cleanText(raw.fields?.[field.id], field.maxLength || 8000);
    if (field.required && !value && options.allowIncomplete !== true) {
      throw new Error(`${field.label}不能为空`);
    }
    if (value) fields[field.id] = value;
  }

  if (!courseId && options.allowIncomplete !== true) throw new Error("请选择课程");
  const sessionDate = /^\d{4}-\d{2}-\d{2}$/.test(String(raw.sessionDate || ""))
    ? String(raw.sessionDate)
    : new Date().toISOString().slice(0, 10);
  const requestedStatus = cleanText(raw.selfStatus, 64);
  const selfStatus = recordType === "knowledge-contribution"
    ? "draft"
    : (allowedStatuses(schema).has(requestedStatus) ? requestedStatus : "starting");
  const now = new Date().toISOString();

  if (recordType === "learning-session" && selfStatus === "transfer-ready" && options.allowIncomplete !== true) {
    const requirements = [
      ["transfer", "换一个条件后的独立结果"],
      ["evidenceRef", "可以复查的安全证据"],
      ["counterexample", "故意改错和失败边界"]
    ];
    const missing = requirements.filter(([fieldId]) => !fields[fieldId]).map(([, label]) => label);
    if (missing.length) {
      throw new Error(`想标记为“换个条件也能做”，还需要补上：${missing.join("、")}`);
    }
  }

  const createdAt = normalizedTimestamp(raw.createdAt, now);
  const requestedUpdatedAt = normalizedTimestamp(raw.updatedAt, now);
  const updatedAt = Date.parse(requestedUpdatedAt) < Date.parse(createdAt) ? createdAt : requestedUpdatedAt;

  return {
    schemaVersion: schema.schemaVersion,
    recordId: cleanText(raw.recordId, 180) || `learning-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    recordType,
    courseId,
    courseTitleSnapshot: cleanText(raw.courseTitleSnapshot, 300),
    courseUrl: cleanText(raw.courseUrl, 600),
    sessionDate,
    selfStatus,
    fields,
    privacy: "private",
    syncState: "local",
    createdAt,
    updatedAt
  };
}

export function mergeCourseProgressStatus(existingStatus, record) {
  const rank = { "not-started": 0, "in-progress": 1, "artifact-ready": 2 };
  const current = Object.hasOwn(rank, existingStatus) ? existingStatus : "not-started";
  if (record.recordType !== "learning-session") return current;
  const candidate = record.selfStatus === "transfer-ready" ? "artifact-ready" : "in-progress";
  return rank[candidate] > rank[current] ? candidate : current;
}

export function normalizeLearningRecordState(raw, schema) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("备份格式无效");
  if (raw.version !== schema.schemaVersion || !Array.isArray(raw.entries)) throw new Error("备份版本无效");
  if (raw.entries.length > (schema.maxEntries || 500)) throw new Error("备份中的记录过多");
  const entries = raw.entries.map((entry) => {
    if (!Number.isFinite(Date.parse(entry?.createdAt)) || !Number.isFinite(Date.parse(entry?.updatedAt))) {
      throw new Error("备份中的记录时间无效");
    }
    return normalizeLearningRecord(entry, schema);
  });
  const ids = new Set();
  for (const entry of entries) {
    if (ids.has(entry.recordId)) throw new Error("备份中存在重复记录");
    ids.add(entry.recordId);
  }
  return {
    version: schema.schemaVersion,
    activeId: ids.has(raw.activeId) ? raw.activeId : null,
    updatedAt: cleanText(raw.updatedAt, 80) || null,
    entries
  };
}

function labelFor(items, id) {
  return items.find((item) => item.id === id)?.label || id;
}

function valueLabel(field, value) {
  return field.kind === "select" ? labelFor(field.options || [], value) : value;
}

export function learningRecordMarkdown(record, schema) {
  const typeLabel = labelFor(schema.recordTypes, record.recordType);
  const statusLabel = record.recordType === "learning-session"
    ? labelFor(schema.statuses, record.selfStatus)
    : "私人补充草稿";
  const title = record.recordType === "learning-session" ? "这次只弄懂一件事" : "知识库补充建议";
  const lines = [
    `# ${title}`,
    "",
    `- 记录类型：${typeLabel}`,
    `- 日期：${record.sessionDate}`,
    `- 课程：${record.courseTitleSnapshot || record.courseId}`,
    `- 课程 ID：${record.courseId}`,
    `- 当前状态：${statusLabel}`,
    "- 可见范围：私人草稿，未经确认不公开",
    ""
  ];

  for (const field of fieldsForType(schema, record.recordType)) {
    const value = record.fields[field.id];
    if (!value) continue;
    lines.push(`## ${field.label}`, "", valueLabel(field, value), "");
  }
  lines.push(
    "## 隐私检查",
    "",
    "- [ ] 没有密码、Token、账号、IP、内部路径、车辆标识或原始敏感日志",
    "- [ ] 私人学习记录不会直接变成公开课程内容",
    ""
  );
  return lines.join("\n");
}

export function firstPrinciplesPrompt(record, schema) {
  const instruction = record.recordType === "learning-session"
    ? "请先区分事实和我的解释，再从一个可观察问题和最小模型开始。不要一次给完整答案；一次只推进一个问题，并在最后帮我更新学习卡。"
    : "请先定位对应页面和小节，判断这是清晰度、例子、图、推导、练习、修正还是来源问题。只生成可审阅草稿，不要把私人记录直接公开，也不要直接推送 main。";
  return [
    "请使用 $first-principles-learning。",
    "",
    instruction,
    "",
    learningRecordMarkdown(record, schema)
  ].join("\n");
}

export function learningRecordFileName(record) {
  const prefix = record.recordType === "learning-session" ? "learning-card" : "knowledge-proposal";
  const safeCourse = String(record.courseId || "course").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80);
  return `${prefix}-${record.sessionDate}-${safeCourse}.md`;
}
