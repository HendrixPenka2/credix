// Dessine en PNG les diagrammes ```mermaid d'un fichier Markdown, pour les PDF.
// Usage : node run.js docs/build/render_mermaid.js  (via le skill Playwright)
//   variables : MD=<fichier.md> OUT=<dossier de sortie> NAME=<préfixe> MERMAID_JS=<chemin de mermaid.min.js>
// La bibliothèque n'est pas versionnée (3,5 Mo). Pour la récupérer :
//   curl -L -o docs/build/mermaid.min.js https://cdn.jsdelivr.net/npm/mermaid@11.17.2/dist/mermaid.min.js
// Les PNG déjà produits sont dans docs/images/mermaid/ : cet outil ne sert que si un schéma change.
"use strict";
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const md = fs.readFileSync(process.env.MD, "utf8");
const blocs = [...md.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1]);
fs.mkdirSync(process.env.OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 });
  await p.setContent('<html><body style="margin:0;background:white"><div id="c" style="display:inline-block;padding:16px;background:white"></div></body></html>');
  await p.addScriptTag({ path: process.env.MERMAID_JS });
  await p.evaluate(() => mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose", fontFamily: "Helvetica, Arial, sans-serif", themeVariables: { fontSize: "20px" }, class: { useMaxWidth: false }, flowchart: { useMaxWidth: false }, sequence: { useMaxWidth: false, wrap: true, width: 150, actorMargin: 25, boxMargin: 8, actorFontSize: 20, messageFontSize: 20, noteFontSize: 18 } }));
  let n = 0;
  for (const src of blocs) {
    n++;
    const out = path.join(process.env.OUT, `${process.env.NAME}_${n}.png`);
    try {
      await p.evaluate(async (code) => { const { svg } = await mermaid.render("g" + Math.random().toString(36).slice(2), code); document.getElementById("c").innerHTML = svg; }, src);
      await p.locator("#c").screenshot({ path: out });
      console.log("OK  ", out);
    } catch (e) { console.log("ECHEC diagramme", n, ":", e.message.split("\n")[0]); }
  }
  await b.close();
})();
