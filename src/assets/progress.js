(function () {
  "use strict";
  const STORAGE_KEY = "personal-knowledge-base.progress.v2";
  const LABELS = {"not-started":"未开始","in-progress":"学习中","artifact-ready":"产物已就绪"};
  function emptyState(){return {version:2,courses:{},lastCourseId:null,lastCourseUrl:null};}
  function readState(){try{const parsed=JSON.parse(window.localStorage.getItem(STORAGE_KEY));if(!parsed||parsed.version!==2||typeof parsed.courses!=="object")return emptyState();return parsed;}catch(_error){return emptyState();}}
  function writeState(state){window.localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
  function stateFor(state,courseId){return state.courses[courseId]?.status||"not-started";}
  function render(state){
    document.querySelectorAll("[data-progress-select]").forEach((select)=>{select.value=stateFor(state,select.dataset.courseId);});
    document.querySelectorAll("[data-progress-label]").forEach((label)=>{const status=stateFor(state,label.dataset.progressLabel);label.textContent=LABELS[status];label.dataset.state=status;});
    const cards=Array.from(document.querySelectorAll("[data-course-card]"));
    const ready=cards.filter((card)=>stateFor(state,card.dataset.courseCard)==="artifact-ready").length;
    const summary=document.querySelector("[data-progress-summary]");const bar=document.querySelector("[data-progress-bar]");
    if(summary)summary.textContent=ready+" / "+cards.length+" 门产物就绪";
    if(bar)bar.style.width=(cards.length?(ready/cards.length)*100:0)+"%";
    const continueLink=document.querySelector("[data-continue-link]");
    if(continueLink&&state.lastCourseUrl){continueLink.href=state.lastCourseUrl;continueLink.textContent="继续上次学习 →";}
  }
  function message(text){const node=document.querySelector("[data-progress-message]");if(node)node.textContent=text;}
  let state=readState();render(state);
  document.querySelectorAll("[data-progress-select]").forEach((select)=>{select.addEventListener("change",()=>{const courseId=select.dataset.courseId;state.courses[courseId]={status:select.value,updatedAt:new Date().toISOString()};state.lastCourseId=courseId;state.lastCourseUrl=window.location.pathname+window.location.search;writeState(state);render(state);});});
  document.querySelector("[data-progress-export]")?.addEventListener("click",()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="learning-progress-v2.json";link.click();URL.revokeObjectURL(url);message("本机学习进度已导出。文件不包含导师评价或作业内容。");});
  document.querySelector("[data-progress-import]")?.addEventListener("change",async(event)=>{const file=event.target.files?.[0];if(!file)return;try{const imported=JSON.parse(await file.text());if(imported.version!==2||typeof imported.courses!=="object")throw new Error("invalid schema");state=imported;writeState(state);render(state);message("进度已导入并保存在当前浏览器。");}catch(_error){message("导入失败：请选择由本系统导出的 V2 JSON 文件。");}finally{event.target.value="";}});
  document.querySelector("[data-progress-reset]")?.addEventListener("click",()=>{if(!window.confirm("确定清除当前浏览器中的全部学习进度吗？"))return;state=emptyState();writeState(state);render(state);message("当前浏览器的学习进度已清除。");});
})();
