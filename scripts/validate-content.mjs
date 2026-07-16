import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const curriculum = JSON.parse(fs.readFileSync(path.join(root, "src/_data/curriculum.json"), "utf8"));
const errors = [];
const requiredFields = ["id","title","description","stage","order","effort","track","status","prerequisites","deliverable","topics","mentorModules"];
const validStatuses = new Set(["pilot","legacy","planned"]);
const stageIds = new Set(curriculum.stages.map((stage) => stage.id));
const courseIds = new Set();
function report(condition,message){if(!condition)errors.push(message);}
function markdownOutsideFences(source){
  let inFence=false;
  return source.split("\n").filter((line)=>{
    if(/^\s*```/.test(line)){inFence=!inFence;return false;}
    return !inFence;
  }).join("\n");
}
function effortRange(value){
  const match=String(value).match(/(\d+)\s*[–-]\s*(\d+)/);
  return match?[Number(match[1]),Number(match[2])]:null;
}

report(curriculum.version===2,"curriculum.version 必须为 2");
report(curriculum.stages.length>0,"至少需要一个学习阶段");
for(const stage of curriculum.stages){for(const field of ["id","code","title","description","effort","gate"])report(Boolean(stage[field]),`阶段 ${stage.id||"<unknown>"} 缺少字段 ${field}`);}

for(const course of curriculum.courses){
  for(const field of requiredFields){const present=Array.isArray(course[field])?true:course[field]!==undefined&&course[field]!==null&&course[field]!=="";report(present,`课程 ${course.id||"<unknown>"} 缺少字段 ${field}`);}
  report(!courseIds.has(course.id),`课程 ID 重复：${course.id}`);courseIds.add(course.id);
  report(stageIds.has(course.stage),`课程 ${course.id} 引用了不存在的阶段 ${course.stage}`);
  report(validStatuses.has(course.status),`课程 ${course.id} 的状态 ${course.status} 无效`);
  report(Number.isInteger(course.order)&&course.order>0,`课程 ${course.id} 的 order 必须是正整数`);
  report(Array.isArray(course.prerequisites),`课程 ${course.id} 的 prerequisites 必须是数组`);
  report(Array.isArray(course.topics)&&course.topics.length>0,`课程 ${course.id} 至少需要一个 topic`);
  report(Array.isArray(course.mentorModules)&&course.mentorModules.length>0,`课程 ${course.id} 至少需要一个导师模块`);
  if(course.status==="planned")report(course.url===null,`待建设课程 ${course.id} 不应声明可访问 URL`);
  else report(typeof course.url==="string"&&course.url.startsWith("/"),`课程 ${course.id} 需要站内绝对 URL`);
  if(course.status==="pilot"){
    report(Boolean(course.contentFile),`V2 试点课程 ${course.id} 缺少 contentFile`);
    if(course.contentFile){const absolute=path.join(root,course.contentFile);report(fs.existsSync(absolute),`V2 试点课程 ${course.id} 的内容文件不存在：${course.contentFile}`);if(fs.existsSync(absolute)){const source=fs.readFileSync(absolute,"utf8");const body=markdownOutsideFences(source.replace(/^---[\s\S]*?---/,""));report(source.includes(`courseId: ${course.id}`),`${course.contentFile} 的 courseId 与课程数据不一致`);report(!/^#\s+/m.test(body),`${course.contentFile} 正文不应包含 H1`);report((source.match(/```/g)||[]).length%2===0,`${course.contentFile} 的代码围栏未成对`);report((source.match(/\\\[/g)||[]).length===(source.match(/\\\]/g)||[]).length,`${course.contentFile} 的块级 LaTeX 分隔符未成对`);if(source.includes("diagrams: true")){const diagrams=[...source.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)].map((match)=>match[1]);report(diagrams.length>0,`${course.contentFile} 启用了图表但没有 Mermaid 图`);for(const [diagramIndex,diagram] of diagrams.entries()){report(/\baccTitle:/.test(diagram),`${course.contentFile} 第 ${diagramIndex+1} 幅图缺少 accTitle`);report(/\baccDescr:/.test(diagram),`${course.contentFile} 第 ${diagramIndex+1} 幅图缺少 accDescr`);}}}}
  }
}

for(const course of curriculum.courses){for(const prerequisite of course.prerequisites){report(courseIds.has(prerequisite),`课程 ${course.id} 引用了不存在的先修课程 ${prerequisite}`);report(prerequisite!==course.id,`课程 ${course.id} 不能依赖自身`);}}
const visiting=new Set();const visited=new Set();
function visit(id,trail=[]){if(visiting.has(id)){errors.push(`检测到先修循环：${[...trail,id].join(" -> ")}`);return;}if(visited.has(id))return;visiting.add(id);const course=curriculum.courses.find((item)=>item.id===id);for(const prerequisite of course?.prerequisites||[])visit(prerequisite,[...trail,id]);visiting.delete(id);visited.add(id);}
for(const id of courseIds)visit(id);
for(const stage of curriculum.stages){
  const stageCourses=curriculum.courses.filter((course)=>course.stage===stage.id);
  const orders=stageCourses.map((course)=>course.order);
  report(new Set(orders).size===orders.length,`阶段 ${stage.id} 存在重复 order`);
  const declared=effortRange(stage.effort);
  const courseRanges=stageCourses.map((course)=>effortRange(course.effort));
  report(Boolean(declared)&&courseRanges.every(Boolean),`阶段 ${stage.id} 存在无法解析的课时范围`);
  if(declared&&courseRanges.every(Boolean)){
    const summed=courseRanges.reduce((total,range)=>[total[0]+range[0],total[1]+range[1]],[0,0]);
    report(declared[0]===summed[0]&&declared[1]===summed[1],`阶段 ${stage.id} 课时 ${stage.effort} 与课程合计 ${summed[0]}–${summed[1]} 小时不一致`);
  }
}

if(errors.length){console.error(`内容校验失败（${errors.length} 项）：`);for(const error of errors)console.error(`- ${error}`);process.exit(1);}
console.log(`内容校验通过：${curriculum.stages.length} 个阶段，${curriculum.courses.length} 门课程，${curriculum.courses.filter((course)=>course.status==="pilot").length} 门 V2 试点。`);
