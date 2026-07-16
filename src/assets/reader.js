function buildPageOutline() {
  const prose = document.querySelector("[data-course-prose]");
  const outlines = [...document.querySelectorAll("[data-page-toc]")];
  if (!prose || !outlines.length) return;

  const headings = [...prose.querySelectorAll("h2[id], h3[id]")];
  const linksById = new Map();

  for (const outline of outlines) {
    outline.replaceChildren();
    let currentSectionItem;
    let currentSublist;

    if (!headings.length) {
      const empty = document.createElement("li");
      empty.className = "toc-empty";
      empty.textContent = "本页暂无分节";
      outline.append(empty);
      continue;
    }

    for (const heading of headings) {
      const item = document.createElement("li");
      item.className = "toc-level-" + heading.tagName.toLowerCase();

      const link = document.createElement("a");
      link.href = "#" + heading.id;
      link.textContent = heading.textContent.trim();
      item.append(link);

      if (heading.tagName === "H3" && currentSectionItem) {
        if (!currentSublist) {
          currentSublist = document.createElement("ol");
          currentSublist.className = "toc-subsections";
          currentSectionItem.append(currentSublist);
        }
        currentSublist.append(item);
      } else {
        outline.append(item);
        currentSectionItem = heading.tagName === "H2" ? item : undefined;
        currentSublist = undefined;
      }

      const links = linksById.get(heading.id) || [];
      links.push(link);
      linksById.set(heading.id, links);
    }
  }

  if (!headings.length) return;

  const setCurrent = (id) => {
    for (const links of linksById.values()) {
      for (const link of links) {
        link.classList.remove("is-current");
        link.removeAttribute("aria-current");
      }
    }
    for (const link of linksById.get(id) || []) {
      link.classList.add("is-current");
      link.setAttribute("aria-current", "location");
    }
  };

  const updateCurrent = () => {
    let current = headings[0];
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= 150) current = heading;
      else break;
    }

    if (window.matchMedia("(max-width: 520px)").matches && current.tagName === "H3") {
      for (let index = headings.indexOf(current); index >= 0; index -= 1) {
        if (headings[index].tagName === "H2") {
          current = headings[index];
          break;
        }
      }
    }

    setCurrent(current.id);
  };

  let scheduled = false;
  const scheduleUpdate = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      updateCurrent();
      scheduled = false;
    });
  };

  updateCurrent();
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("load", scheduleUpdate, { once: true });
}

function configureResponsiveDisclosures() {
  for (const disclosure of document.querySelectorAll("[data-responsive-disclosure]")) {
    const breakpoint = Number(disclosure.dataset.collapseAt);
    if (!Number.isFinite(breakpoint)) continue;

    const media = window.matchMedia("(max-width: " + breakpoint + "px)");
    const sync = () => {
      disclosure.open = !media.matches;
    };

    sync();
    media.addEventListener("change", sync);
  }
}

function synchronizeReaderOrder() {
  for (const shell of document.querySelectorAll(".reader-shell")) {
    const content = shell.querySelector(".reader-content");
    const pageSidebar = shell.querySelector(".reader-page-sidebar");
    if (!content || !pageSidebar) continue;

    const media = window.matchMedia("(max-width: 1240px)");
    const sync = () => {
      if (media.matches) shell.insertBefore(pageSidebar, content);
      else content.after(pageSidebar);
    };

    sync();
    media.addEventListener("change", sync);
  }
}

function enhanceScrollableRegions() {
  for (const codeBlock of document.querySelectorAll(".course-prose pre:not(.mermaid)")) {
    codeBlock.tabIndex = 0;
    codeBlock.setAttribute("role", "region");
    codeBlock.setAttribute("aria-label", "代码示例，可横向滚动");
  }

  const enhanceMath = () => {
    for (const formula of document.querySelectorAll('.course-prose mjx-container[display="true"]')) {
      formula.tabIndex = 0;
      formula.setAttribute("role", "region");
      formula.setAttribute("aria-label", "数学公式，可横向滚动");
    }
  };

  enhanceMath();
  if (window.MathJax?.startup?.promise) {
    window.MathJax.startup.promise.then(enhanceMath);
  } else {
    window.addEventListener("load", enhanceMath, { once: true });
  }
}

synchronizeReaderOrder();
buildPageOutline();
configureResponsiveDisclosures();
enhanceScrollableRegions();
