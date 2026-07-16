import fs from "node:fs";
import path from "node:path";

const output=path.resolve(process.argv[2]||"_site");
const prefix="/personal-knowledge-base/";
const errors=[];
if(!fs.existsSync(output)){console.error(`构建目录不存在：${output}`);process.exit(1);}
function walk(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap((entry)=>{const absolute=path.join(directory,entry.name);return entry.isDirectory()?walk(absolute):[absolute];});}
function resolveTarget(sourceFile,href){const normalizedHref=href.replaceAll("&amp;","&");const [pathAndQuery,rawHash]=normalizedHref.split("#",2);const rawPath=pathAndQuery.split("?",1)[0];const hash=rawHash?decodeURIComponent(rawHash):"";let targetPath=decodeURIComponent(rawPath||"");if(targetPath.startsWith(prefix))targetPath=`/${targetPath.slice(prefix.length)}`;let absolute;if(!targetPath)absolute=sourceFile;else if(targetPath.startsWith("/"))absolute=path.join(output,targetPath.slice(1));else absolute=path.resolve(path.dirname(sourceFile),targetPath);if(absolute.endsWith(path.sep)||(fs.existsSync(absolute)&&fs.statSync(absolute).isDirectory()))absolute=path.join(absolute,"index.html");return {absolute,hash};}
const htmlFiles=walk(output).filter((file)=>file.endsWith(".html"));
for(const file of htmlFiles){const html=fs.readFileSync(file,"utf8");const hrefs=[...html.matchAll(/\bhref=["']([^"']+)["']/gi)].map((match)=>match[1]);for(const href of hrefs){if(/^(?:https?:|mailto:|tel:|javascript:|data:)/i.test(href))continue;const {absolute,hash}=resolveTarget(file,href);if(!fs.existsSync(absolute)){errors.push(`${path.relative(output,file)} -> ${href}（目标不存在）`);continue;}if(hash&&absolute.endsWith(".html")){const targetHtml=fs.readFileSync(absolute,"utf8");const escaped=hash.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");if(!new RegExp(`\\bid=["']${escaped}["']`).test(targetHtml))errors.push(`${path.relative(output,file)} -> ${href}（锚点不存在）`);}}}
if(errors.length){console.error(`链接校验失败（${errors.length} 项）：`);for(const error of errors)console.error(`- ${error}`);process.exit(1);}
console.log(`链接校验通过：检查 ${htmlFiles.length} 个 HTML 页面。`);
