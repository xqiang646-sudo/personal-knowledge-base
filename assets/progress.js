(function () {
  "use strict";

  const STORAGE_KEY = "personal-knowledge-base.progress.v2";
  const LABELS = {
    "not-started": "还没开始",
    "in-progress": "我正在学",
    "artifact-ready": "我能独立做一次",
  };

  function emptyState() {
    return { version: 2, courses: {}, lastCourseId: null, lastCourseUrl: null };
  }

  function readState() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      if (!parsed || parsed.version !== 2 || typeof parsed.courses !== "object") {
        return emptyState();
      }
      return parsed;
    } catch (_error) {
      return emptyState();
    }
  }

  function writeState(state) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function stateFor(state, courseId) {
    return state.courses[courseId]?.status || "not-started";
  }

  function render(state) {
    document.querySelectorAll("[data-progress-select]").forEach((select) => {
      select.value = stateFor(state, select.dataset.courseId);
    });

    document.querySelectorAll("[data-progress-label]").forEach((label) => {
      const status = stateFor(state, label.dataset.progressLabel);
      label.textContent = LABELS[status];
      label.dataset.state = status;
    });

    const cards = Array.from(document.querySelectorAll("[data-course-card]"));
    const ready = cards.filter((card) => stateFor(state, card.dataset.courseCard) === "artifact-ready").length;
    const inProgress = cards.filter((card) => stateFor(state, card.dataset.courseCard) === "in-progress").length;
    const total = cards.length;
    const summaries = document.querySelectorAll("[data-progress-summary]");

    summaries.forEach((summary) => {
      if (ready > 0 && inProgress > 0) {
        summary.textContent = `${ready} 门已能独立做，${inProgress} 门正在学`;
      } else if (ready > 0) {
        summary.textContent = `${ready} / ${total} 门已经能独立做`;
      } else if (inProgress > 0) {
        summary.textContent = `${inProgress} 门正在学，先完成眼前这一门`;
      } else {
        summary.textContent = "还没有开始也没关系";
      }
    });

    document.querySelectorAll("[data-progress-bar]").forEach((bar) => {
      bar.style.width = `${total ? (ready / total) * 100 : 0}%`;
    });

    document.querySelectorAll("[data-progress-count]").forEach((count) => {
      count.textContent = `${ready} / ${total}`;
    });

    document.querySelectorAll("[role='progressbar'].home-header-progress-track").forEach((track) => {
      track.setAttribute("aria-valuemax", String(total));
      track.setAttribute("aria-valuenow", String(ready));
    });

    document.querySelectorAll("[data-continue-link]").forEach((continueLink) => {
      if (!state.lastCourseUrl) return;
      continueLink.href = state.lastCourseUrl;
      continueLink.textContent = "接着上次的位置";
    });
  }

  function message(text) {
    const node = document.querySelector("[data-progress-message]");
    if (node) node.textContent = text;
  }

  let state = readState();
  render(state);

  document.querySelectorAll("[data-progress-select]").forEach((select) => {
    select.addEventListener("change", () => {
      const courseId = select.dataset.courseId;
      state.courses[courseId] = { status: select.value, updatedAt: new Date().toISOString() };
      state.lastCourseId = courseId;
      state.lastCourseUrl = window.location.pathname + window.location.search;
      writeState(state);
      render(state);
    });
  });

  document.querySelector("[data-progress-export]")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "learning-progress-v2.json";
    link.click();
    URL.revokeObjectURL(url);
    message("本机学习进度已导出。文件不包含导师评价或作业内容。");
  });

  document.querySelector("[data-progress-import]")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (imported.version !== 2 || typeof imported.courses !== "object") {
        throw new Error("invalid schema");
      }
      state = imported;
      writeState(state);
      render(state);
      message("进度已导入并保存在当前浏览器。");
    } catch (_error) {
      message("导入失败：请选择由本系统导出的学习进度 JSON 文件。");
    } finally {
      event.target.value = "";
    }
  });

  document.querySelector("[data-progress-reset]")?.addEventListener("click", () => {
    if (!window.confirm("确定清除当前浏览器中的全部学习进度吗？")) return;
    state = emptyState();
    writeState(state);
    render(state);
    message("当前浏览器的学习进度已清除。");
  });
})();
