const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
test("visual executivo vinculado ao documento e PWA",()=>{
 const html=read("index.html");
 const sw=read("service-worker.js");
 const css=read("analysis/executive-ui.css");
 const version=html.match(/name="app-version" content="(\\d+\\.\\d+\\.\\d+)"/)?.[1];
 assert.ok(version,"a versão semântica deve estar declarada no HTML");
 assert.ok(html.includes("analysis/executive-ui.css?v="+version),"CSS e versão pública devem coincidir");
 assert.ok(sw.includes("michelle-shell-v"+version+"-executive-ui"),"cache do PWA deve usar a versão pública");
 assert.match(sw,/\.\/analysis\/executive-ui\.css/);
 assert.ok(css.length>12000,"camada visual com regras completas");
});
test("navegação acessível e mobile responsivo",()=>{
 const app=read("app.js");
 const css=read("analysis/executive-ui.css");
 assert.match(app,/mc-skip-link/);
 assert.match(app,/id="mc-main" tabindex="-1"/);
 assert.match(app,/mc-supplementary/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/\.mc-role-priorities\{display:flex;flex-direction:column/);
 assert.match(css,/\.dash-widget\{grid-column:span 12!important/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media print/);
});
test("configuração de dados e API permanece isolada",()=>{
 const css=read("analysis/executive-ui.css");
 const app=read("app.js");
 assert.match(app,/recordsFor\(\)/);
 assert.match(app,/window\.MichelleDashboard\?\.wire/);
 assert.doesNotMatch(css,/@import|url\(https?:\/\//);
});
