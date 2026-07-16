import {
  emptyLearningRecordState,
  fieldsForType,
  firstPrinciplesPrompt,
  learningRecordFileName,
  learningRecordMarkdown,
  mergeCourseProgressStatus,
  normalizeLearningRecord,
  normalizeLearningRecordState
} from "./learning-record-core.js";

const schemaNode = document.querySelector("#learning-record-schema");
const form = document.querySelector("[data-learning-record-form]");
if (!schemaNode || !form) throw new Error("Learning record interface is incomplete.");

const schema = JSON.parse(schemaNode.textContent);
const historyList = document.querySelector("[data-learning-history-list]");
const historyEmpty = document.querySelector("[data-learning-history-empty]");
const messageNode = document.querySelector("[data-learning-message]");
const manualPanel = document.querySelector("[data-manual-copy-panel]");
const manualOutput = document.querySelector("[data-manual-copy-output]");
const recordIdInput = form.querySelector("[data-record-id]");
const courseSelect = form.querySelector("[data-course-select]");
const dateInput = form.querySelector("[data-session-date]");
const statusSelect = form.querySelector("[data-self-status]");
const recoveryPanel = document.querySelector("[data-storage-recovery]");
const updatePage = document.querySelector(".learning-update-page");
const storageSensitiveControls = document.querySelectorAll(
  "[data-new-record], [data-copy-skill-prompt], [data-export-learning-json], [data-import-learning-json]"
);
const MAX_IMPORT_BYTES = schema.maxImportBytes || 32_000_000;
let storageReadFailure = null;
let lastPersistFailure = null;
let lastProgressSyncSucceeded = true;

function localDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function setMessage(text) {
  if (messageNode) messageNode.textContent = text;
}

function readState() {
  let raw = null;
  try {
    raw = window.localStorage.getItem(schema.storageKey);
    return raw ? normalizeLearningRecordState(JSON.parse(raw), schema) : emptyLearningRecordState(schema);
  } catch (error) {
    storageReadFailure = { raw, message: error.message };
    return emptyLearningRecordState(schema);
  }
}

function writeState() {
  if (storageReadFailure) {
    setMessage("检测到旧学习卡数据无法读取。为避免覆盖，保存已暂停；请先下载恢复文件或确认清空损坏数据。");
    return false;
  }
  state.updatedAt = new Date().toISOString();
  try {
    window.localStorage.setItem(schema.storageKey, JSON.stringify(state));
    return true;
  } catch (_error) {
    setMessage("无法保存到当前浏览器。请先导出文字，并检查浏览器是否禁用了本地存储。");
    return false;
  }
}

let state = readState();
let autosaveTimer;
let formDirty = false;
let displayedRecordType = currentRecordType();

function currentRecordType() {
  return form.elements.recordType.value || schema.recordTypes[0].id;
}

function applyRecordType(recordType) {
  for (const section of document.querySelectorAll("[data-record-types]")) {
    const enabled = section.dataset.recordTypes.split(/\s+/).includes(recordType);
    section.hidden = !enabled;
    for (const control of section.querySelectorAll("input, select, textarea, button")) control.disabled = !enabled;
  }
  displayedRecordType = recordType;
}

function setFormStorageBlocked(blocked) {
  for (const control of form.elements) control.disabled = blocked;
  for (const control of storageSensitiveControls) control.disabled = blocked;
  if (updatePage) updatePage.dataset.storageBlocked = String(blocked);
  if (!blocked) applyRecordType(currentRecordType());
}

function optionForCourse(courseId) {
  return [...courseSelect.options].find((option) => option.value === courseId);
}

function rawRecordFromForm(recordType = currentRecordType()) {
  const existing = state.entries.find((entry) => entry.recordId === recordIdInput.value);
  const selectedCourse = optionForCourse(courseSelect.value);
  const fields = {};
  for (const field of fieldsForType(schema, recordType)) {
    const control = form.querySelector(`[data-field-id="${field.id}"]`);
    if (control && !control.disabled) fields[field.id] = control.value;
  }
  const now = new Date().toISOString();
  return {
    recordType,
    recordId: existing?.recordId || recordIdInput.value,
    courseId: courseSelect.value,
    courseTitleSnapshot: selectedCourse?.textContent.trim() || courseSelect.value,
    courseUrl: selectedCourse?.dataset.courseUrl || "",
    sessionDate: dateInput.value || localDate(),
    selfStatus: recordType === "learning-session" ? statusSelect.value : "draft",
    fields,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
}

function currentValidRecord(showValidation = true, recordType = currentRecordType()) {
  if (showValidation && !form.reportValidity()) throw new Error("请先填写标为必填的内容");
  return normalizeLearningRecord(rawRecordFromForm(recordType), schema);
}

function updateCourseProgress(record) {
  if (record.recordType !== "learning-session") return true;
  try {
    const raw = JSON.parse(window.localStorage.getItem(schema.progressStorageKey) || "null");
    const progress = raw?.version === 2 && raw.courses && typeof raw.courses === "object"
      ? raw
      : { version: 2, courses: {}, lastCourseId: null, lastCourseUrl: null };
    const current = progress.courses[record.courseId];
    const aggregatedStatus = state.entries
      .filter((entry) => entry.recordType === "learning-session" && entry.courseId === record.courseId)
      .reduce((status, entry) => mergeCourseProgressStatus(status, entry), current?.status);
    progress.courses[record.courseId] = {
      ...current,
      status: aggregatedStatus,
      updatedAt: record.updatedAt
    };
    progress.lastCourseId = record.courseId;
    progress.lastCourseUrl = record.courseUrl || window.location.pathname;
    window.localStorage.setItem(schema.progressStorageKey, JSON.stringify(progress));
    return true;
  } catch (_error) {
    return false;
  }
}

function persistCurrent({ silent = false, recordType = currentRecordType(), refresh = true } = {}) {
  lastPersistFailure = null;
  lastProgressSyncSucceeded = true;
  let record;
  try {
    record = currentValidRecord(!silent, recordType);
  } catch (error) {
    lastPersistFailure = { kind: "validation", message: error.message };
    if (!silent) setMessage(error.message);
    return null;
  }
  const previousState = state;
  const entries = [...state.entries];
  const index = entries.findIndex((entry) => entry.recordId === record.recordId);
  if (index < 0 && entries.length >= (schema.maxEntries || 500)) {
    lastPersistFailure = { kind: "validation", message: "这台设备已经保存了很多学习卡。请先导出全部备份并删除不再需要的旧卡。" };
    if (!silent) setMessage(lastPersistFailure.message);
    return null;
  }
  if (index >= 0) entries[index] = record;
  else entries.unshift(record);
  state = { ...state, entries, activeId: record.recordId };
  if (!writeState()) {
    state = previousState;
    lastPersistFailure = {
      kind: "storage",
      message: storageReadFailure
        ? "旧学习卡数据无法读取，保存已暂停。"
        : "浏览器没有成功写入这次修改。"
    };
    return null;
  }
  recordIdInput.value = record.recordId;
  formDirty = false;
  lastProgressSyncSucceeded = updateCourseProgress(record);
  if (refresh) {
    renderHistory();
    showManualText(learningRecordMarkdown(record, schema), false);
  }
  if (!lastProgressSyncSucceeded) setMessage("学习卡已保存，但课程进度没有同步。你仍可以导出学习卡备份。");
  else if (!silent) setMessage("已保存到这台设备。记得在换设备前导出备份。");
  return record;
}

function flushPendingDraft({ recordType = displayedRecordType, refresh = true } = {}) {
  window.clearTimeout(autosaveTimer);
  if (!formDirty) return state.entries.find((entry) => entry.recordId === recordIdInput.value) || true;
  return persistCurrent({ silent: true, recordType, refresh });
}

function canLeaveCurrentDraft() {
  if (!formDirty || flushPendingDraft()) return true;
  if (lastPersistFailure?.kind === "storage") {
    return window.confirm("浏览器没有成功保存刚才的修改。请先使用“复制 Markdown”或“下载当前卡片”留一份副本；如果已经备份，仍要离开吗？");
  }
  return window.confirm("当前草稿还缺少必填内容，暂时无法自动保存。离开后这部分文字会丢失，仍要继续吗？");
}

function resetForm(prefillCourse = "", recordType = schema.recordTypes[0].id) {
  if (storageReadFailure) {
    setMessage("旧学习卡数据无法读取。请先下载恢复文件，再决定是否清空损坏数据。");
    return false;
  }
  window.clearTimeout(autosaveTimer);
  form.reset();
  recordIdInput.value = "";
  dateInput.value = localDate();
  state.activeId = null;
  const typeControl = [...form.elements.recordType].find((control) => control.value === recordType);
  if (typeControl) typeControl.checked = true;
  applyRecordType(recordType);
  if (optionForCourse(prefillCourse)) courseSelect.value = prefillCourse;
  formDirty = false;
  writeState();
  showManualText("", false);
  setMessage("新学习卡已准备好。先写一个你真正想弄懂的问题。");
  return true;
}

function loadRecord(recordId, shouldScroll = false) {
  if (storageReadFailure) return;
  const record = state.entries.find((entry) => entry.recordId === recordId);
  if (!record) return;
  form.reset();
  recordIdInput.value = record.recordId;
  const typeControl = [...form.elements.recordType].find((control) => control.value === record.recordType);
  if (typeControl) typeControl.checked = true;
  applyRecordType(record.recordType);
  courseSelect.value = optionForCourse(record.courseId) ? record.courseId : "";
  dateInput.value = record.sessionDate;
  if (record.recordType === "learning-session") statusSelect.value = record.selfStatus;
  for (const field of fieldsForType(schema, record.recordType)) {
    const control = form.querySelector(`[data-field-id="${field.id}"]`);
    if (control) control.value = record.fields[field.id] || "";
  }
  state.activeId = record.recordId;
  formDirty = false;
  writeState();
  showManualText(learningRecordMarkdown(record, schema), false);
  setMessage("已打开这张学习卡，可以继续补充或修改。");
  if (shouldScroll) form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function statusLabel(record) {
  if (record.recordType === "knowledge-contribution") return "私人补充草稿";
  return schema.statuses.find((item) => item.id === record.selfStatus)?.label || record.selfStatus;
}

function typeLabel(record) {
  return schema.recordTypes.find((item) => item.id === record.recordType)?.label || record.recordType;
}

function makeActionButton(label, action, recordId, className = "button button-outline") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.dataset.recordAction = action;
  button.dataset.recordId = recordId;
  return button;
}

function renderHistory() {
  historyList.replaceChildren();
  const entries = [...state.entries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  historyEmpty.hidden = entries.length > 0;
  for (const record of entries) {
    const article = document.createElement("article");
    article.className = "learning-record-history-card";
    if (record.recordId === state.activeId) article.dataset.active = "true";

    const meta = document.createElement("p");
    meta.className = "learning-record-history-meta";
    meta.textContent = `${record.sessionDate} · ${typeLabel(record)} · ${statusLabel(record)}`;
    const title = document.createElement("h3");
    title.textContent = record.courseTitleSnapshot || record.courseId;
    const question = document.createElement("p");
    question.className = "learning-record-history-question";
    question.textContent = record.fields.question || "尚未写下问题";
    const actions = document.createElement("div");
    actions.className = "learning-record-history-actions";
    actions.append(
      makeActionButton("继续填写", "edit", record.recordId),
      makeActionButton("复制", "copy", record.recordId),
      makeActionButton("删除", "delete", record.recordId, "button button-danger")
    );
    article.append(meta, title, question, actions);
    historyList.append(article);
  }
}

function showManualText(text, openPanel = true) {
  manualOutput.value = text;
  if (openPanel && text) manualPanel.open = true;
}

async function copyText(text, successMessage) {
  showManualText(text, false);
  try {
    await navigator.clipboard.writeText(text);
    setMessage(successMessage);
  } catch (_error) {
    showManualText(text, true);
    manualOutput.focus();
    manualOutput.select();
    setMessage("浏览器没有允许自动复制。文字已放在下方，请手动复制。");
  }
}

function downloadText(text, fileName, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  persistCurrent();
});

form.addEventListener("input", (event) => {
  if (event.target.name === "recordType") return;
  formDirty = true;
  window.clearTimeout(autosaveTimer);
  autosaveTimer = window.setTimeout(() => {
    const record = persistCurrent({ silent: true, recordType: displayedRecordType });
    if (record && lastProgressSyncSucceeded) setMessage("草稿已自动保存在这台设备。");
  }, 600);
});

form.addEventListener("change", (event) => {
  if (event.target.name !== "recordType" || event.target.value === displayedRecordType) return;
  const previousType = displayedRecordType;
  const nextType = event.target.value;
  const prefillCourse = courseSelect.value;
  const hadSavedRecord = Boolean(recordIdInput.value);
  const hadDirtyDraft = formDirty;
  const preserved = !hadDirtyDraft || Boolean(flushPendingDraft({ recordType: previousType }));
  const discardMessage = lastPersistFailure?.kind === "storage"
    ? "浏览器没有成功保存刚才的修改。请先复制或下载当前卡片；如果已经备份，仍要切换类型吗？"
    : "当前草稿还缺少必填内容。切换类型会丢失这部分未保存文字，仍要继续吗？";
  if (!preserved && !window.confirm(discardMessage)) {
    const previousControl = [...form.elements.recordType].find((control) => control.value === previousType);
    if (previousControl) previousControl.checked = true;
    applyRecordType(previousType);
    return;
  }
  if (hadSavedRecord || hadDirtyDraft) {
    resetForm(prefillCourse, nextType);
    setMessage("原来的卡片已经保留，并为另一种记录新建了一张空白卡。");
    return;
  }
  applyRecordType(nextType);
});

document.querySelector("[data-new-record]")?.addEventListener("click", () => {
  if (canLeaveCurrentDraft()) resetForm(courseSelect.value, displayedRecordType);
});

document.querySelector("[data-copy-markdown]")?.addEventListener("click", () => {
  try {
    const portableRecord = currentValidRecord();
    const savedRecord = persistCurrent();
    const message = savedRecord
      ? "当前学习卡已保存并复制为 Markdown。"
      : "浏览器未能保存，但当前文字已经复制；请先把它粘贴到安全位置。";
    copyText(learningRecordMarkdown(savedRecord || portableRecord, schema), message);
  } catch (error) {
    setMessage(error.message);
  }
});

document.querySelector("[data-download-markdown]")?.addEventListener("click", () => {
  try {
    const portableRecord = currentValidRecord();
    const savedRecord = persistCurrent();
    const record = savedRecord || portableRecord;
    downloadText(learningRecordMarkdown(record, schema), learningRecordFileName(record), "text/markdown;charset=utf-8");
    setMessage(savedRecord
      ? "当前学习卡已保存并下载。文件仍是私人草稿，请先做隐私检查再分享。"
      : "浏览器未能保存，但当前卡片已经下载。请先保留这个文件，再离开页面。");
  } catch (error) {
    setMessage(error.message);
  }
});

document.querySelector("[data-copy-skill-prompt]")?.addEventListener("click", () => {
  try {
    const portableRecord = currentValidRecord();
    const savedRecord = persistCurrent();
    const message = savedRecord
      ? "学习卡已保存，并复制了给第一性原理学习助手的完整提示。"
      : "浏览器未能保存，但提示已经复制；请先把它粘贴到安全位置。";
    copyText(firstPrinciplesPrompt(savedRecord || portableRecord, schema), message);
  } catch (error) {
    setMessage(error.message);
  }
});

historyList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-record-action]");
  if (!button) return;
  const record = state.entries.find((entry) => entry.recordId === button.dataset.recordId);
  if (!record) return;
  if (button.dataset.recordAction === "edit" && canLeaveCurrentDraft()) loadRecord(record.recordId, true);
  if (button.dataset.recordAction === "copy") copyText(learningRecordMarkdown(record, schema), "这张学习卡已复制为 Markdown。");
  if (button.dataset.recordAction === "delete") {
    if (!window.confirm("确定删除这张学习卡吗？删除后只能从你导出的备份中恢复。")) return;
    state.entries = state.entries.filter((entry) => entry.recordId !== record.recordId);
    if (state.activeId === record.recordId) resetForm(record.courseId);
    else writeState();
    renderHistory();
    setMessage("这张学习卡已从当前浏览器删除。");
  }
});

document.querySelector("[data-export-learning-json]")?.addEventListener("click", () => {
  if (storageReadFailure) {
    setMessage("当前只能下载原始恢复文件；确认清空损坏数据后，才可以重新导出正常备份。");
    return;
  }
  if (formDirty && !flushPendingDraft()) {
    if (lastPersistFailure?.kind !== "storage") {
      setMessage("当前草稿还缺少必填内容。请先补全并保存，再导出全部备份。");
      return;
    }
    if (!window.confirm("浏览器没有成功保存当前修改。导出的全部 JSON 只包含此前已保存的卡片；请先另行下载当前卡片。仍要导出吗？")) return;
  }
  downloadText(JSON.stringify(state, null, 2), "learning-cards-v1.json", "application/json");
  setMessage("全部学习卡已导出。备份可能包含私人想法，请妥善保存。");
});

document.querySelector("[data-import-learning-json]")?.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (storageReadFailure) throw new Error("请先处理无法读取的旧数据");
    if (!canLeaveCurrentDraft()) return;
    if (file.size > MAX_IMPORT_BYTES) throw new Error("备份文件过大");
    const imported = normalizeLearningRecordState(JSON.parse(await file.text()), schema);
    if (!window.confirm(`将 ${imported.entries.length} 张学习卡合并到当前浏览器，是否继续？`)) return;
    const previousState = state;
    const merged = new Map(state.entries.map((entry) => [entry.recordId, entry]));
    let accepted = 0;
    let keptLocal = 0;
    for (const entry of imported.entries) {
      const local = merged.get(entry.recordId);
      if (!local || Date.parse(entry.updatedAt) > Date.parse(local.updatedAt)) {
        merged.set(entry.recordId, entry);
        accepted += 1;
      } else {
        keptLocal += 1;
      }
    }
    const activeId = state.activeId || (imported.activeId && merged.has(imported.activeId) ? imported.activeId : null);
    state = { ...state, entries: [...merged.values()], activeId };
    if (!writeState()) {
      state = previousState;
      return;
    }
    renderHistory();
    if (state.activeId) loadRecord(state.activeId);
    setMessage(`学习卡备份已合并：采用 ${accepted} 张较新的卡，保留 ${keptLocal} 张本地卡。`);
  } catch (_error) {
    setMessage("导入失败：请选择由本页面导出的 learning-cards-v1.json。");
  } finally {
    event.target.value = "";
  }
});

document.querySelector("[data-download-recovery]")?.addEventListener("click", () => {
  if (!storageReadFailure?.raw) return;
  downloadText(storageReadFailure.raw, `learning-cards-recovery-${localDate()}.txt`, "text/plain;charset=utf-8");
  setMessage("原始恢复文件已下载。请妥善保存，再决定是否清空损坏数据。");
});

document.querySelector("[data-reset-corrupt-storage]")?.addEventListener("click", () => {
  if (!storageReadFailure) return;
  if (!window.confirm("确认已经下载恢复文件，并清空当前无法读取的学习卡数据吗？此操作无法撤销。")) return;
  try {
    window.localStorage.removeItem(schema.storageKey);
    storageReadFailure = null;
    state = emptyLearningRecordState(schema);
    recoveryPanel.hidden = true;
    setFormStorageBlocked(false);
    resetForm();
    renderHistory();
    setMessage("损坏数据已清空。现在可以重新记录，或导入一份有效备份。");
  } catch (_error) {
    setMessage("浏览器没有允许清空本地数据。请保留恢复文件，并检查站点存储权限。");
  }
});

window.addEventListener("pagehide", () => {
  if (!storageReadFailure) flushPendingDraft({ refresh: false });
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && !storageReadFailure) flushPendingDraft({ refresh: false });
});

dateInput.value = localDate();
applyRecordType(currentRecordType());
renderHistory();

const search = new URLSearchParams(window.location.search);
const requestedCourse = search.get("course") || "";
if (storageReadFailure) {
  recoveryPanel.hidden = false;
  setFormStorageBlocked(true);
  setMessage("旧学习卡数据无法读取。为了不覆盖原内容，编辑和保存已暂停。");
} else if (search.get("new") === "1") resetForm(requestedCourse);
else if (state.activeId && state.entries.some((entry) => entry.recordId === state.activeId)) loadRecord(state.activeId);
else if (optionForCourse(requestedCourse)) courseSelect.value = requestedCourse;
