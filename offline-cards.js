const fs = require("fs");
const path = require("path");
// Inline last-known data; re-run generate-lang-stats.js when STATS_PAT works again.
const C = {
  title: "#395B64", text: "#395B64", icon: "#42b983", muted: "#6b7c85",
  bg: "#ffffff", border: "#e6ebef", ring: "#dfe7ee",
};
const LANG_COLOR = {
  Python: "#3572A5", "Jupyter Notebook": "#DA5B0B", GDScript: "#355570",
  HTML: "#e34c26", JavaScript: "#f1e05a", TypeScript: "#3178c6",
  "C#": "#178600", CSS: "#563d7c", Shell: "#89e051", Batchfile: "#C1F12E",
};
const langs = [
  ["Python", 4759749], ["Jupyter Notebook", 3909627], ["GDScript", 1666119],
  ["HTML", 767735], ["JavaScript", 598023], ["TypeScript", 378790],
];
const total = langs.reduce((s, [, b]) => s + b, 0);
const stats = { repoCount: 11, stars: 10, forks: 0, issues: 0, prs: 5, commits: 156 };
const rank = "B";

function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function fontStack(){return "-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,PingFang SC,Microsoft YaHei,sans-serif";}
function langColor(n){return LANG_COLOR[n]||"#8b949e";}

function renderStatsSvg(data) {
  const width = 450, height = 185;
  const rowsLeft = [
    { icon: "🔥", label: "Total Stars", value: data.stars },
    { icon: "📦", label: "Total Repos", value: data.repoCount },
    { icon: "📥", label: "Total Forks", value: data.forks },
  ];
  const rowsRight = [
    { icon: "❗", label: "Total Issues", value: data.issues },
    { icon: "🔃", label: "Pull Requests", value: data.prs },
    { icon: "🧮", label: "Commits (1y)", value: data.commits },
  ];
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
  parts.push(`<style>
    .t{font:600 14px ${fontStack()};fill:${C.title}}
    .l{font:400 12px ${fontStack()};fill:${C.text}}
    .v{font:600 12px ${fontStack()};fill:${C.text}}
  </style>`);
  parts.push(`<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="${C.bg}" stroke="${C.border}"/>`);
  parts.push(`<text class="t" x="24" y="30">22ABLE22's GitHub Stats</text>`);
  parts.push(`<line x1="24" y1="46" x2="${width - 24}" y2="46" stroke="${C.border}"/>`);
  const drawCol = (items, x) => {
    let y = 78;
    for (const it of items) {
      parts.push(`<text class="l" x="${x}" y="${y}">${esc(it.icon)} ${esc(it.label)}:</text>`);
      parts.push(`<text class="v" x="${x + 160}" y="${y}">${esc(it.value)}</text>`);
      y += 30;
    }
  };
  drawCol(rowsLeft, 28);
  drawCol(rowsRight, 240);
  parts.push(`</svg>`);
  return parts.join("\n");
}

function renderRankSvg(rank) {
  const width = 130, height = 185;
  const cx = width / 2, cy = 88, r = 42;
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
  parts.push(`<style>
    .t{font:600 12px ${fontStack()};fill:${C.title}}
    .r{font:700 28px ${fontStack()};fill:${C.icon}}
    .m{font:400 11px ${fontStack()};fill:${C.muted}}
  </style>`);
  parts.push(`<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="${C.bg}" stroke="${C.border}"/>`);
  parts.push(`<text class="t" x="${cx}" y="28" text-anchor="middle">Rank</text>`);
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f3faf7" stroke="${C.icon}" stroke-width="3"/>`);
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${r + 8}" fill="none" stroke="${C.icon}" stroke-width="1" opacity="0.25"/>`);
  parts.push(`<text class="r" x="${cx}" y="${cy + 2}" text-anchor="middle" dominant-baseline="central">${esc(rank)}</text>`);
  parts.push(`<text class="m" x="${cx}" y="${height - 28}" text-anchor="middle">GitHub Stats</text>`);
  parts.push(`</svg>`);
  return parts.join("\n");
}

function renderTopLangsSvg(langs, totalBytes) {
  const items = langs.slice(0, 6);
  const width = 350, height = 185;
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
  parts.push(`<style>
    .t{font:600 14px ${fontStack()};fill:${C.title}}
    .l{font:400 12px ${fontStack()};fill:${C.text}}
    .p{font:600 12px ${fontStack()};fill:${C.text}}
  </style>`);
  parts.push(`<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="${C.bg}" stroke="${C.border}"/>`);
  parts.push(`<text class="t" x="20" y="28">Most Used Languages</text>`);
  const cx = 72, cy = 108, r = 44, stroke = 16;
  const circumference = 2 * Math.PI * r;
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.ring}" stroke-width="${stroke}"/>`);
  let offset = 0;
  for (const [name, bytes] of items) {
    const frac = totalBytes > 0 ? bytes / totalBytes : 0;
    const len = frac * circumference;
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${langColor(name)}" stroke-width="${stroke}" stroke-dasharray="${len} ${circumference - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`);
    offset += len;
  }
  let y = 62;
  for (const [name, bytes] of items) {
    const pct = totalBytes > 0 ? ((bytes / totalBytes) * 100).toFixed(2) : "0.00";
    parts.push(`<rect x="140" y="${y - 8}" width="10" height="10" rx="2" fill="${langColor(name)}"/>`);
    parts.push(`<text class="l" x="156" y="${y}">${esc(name)}</text>`);
    parts.push(`<text class="p" x="${width - 16}" y="${y}" text-anchor="end">${pct}%</text>`);
    y += 20;
  }
  parts.push(`</svg>`);
  return parts.join("\n");
}

const outDir = path.join(process.cwd(), "assets");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "stats-token.svg"), renderStatsSvg(stats), "utf8");
fs.writeFileSync(path.join(outDir, "rank.svg"), renderRankSvg(rank), "utf8");
fs.writeFileSync(path.join(outDir, "top-langs.svg"), renderTopLangsSvg(langs, total), "utf8");
console.log("offline cards written, rank=", rank);