/**
 * Generate GitHub-stats-like SVG cards (buefy-inspired), including private repos
 * when the token can see them. Output: assets/stats-token.svg, assets/top-langs.svg
 */
const fs = require("fs");
const path = require("path");

const TOKEN = process.env.GITHUB_TOKEN || process.env.STATS_PAT || process.env.SNAKE_PAT;
if (!TOKEN) {
  console.error("Missing GITHUB_TOKEN / STATS_PAT / SNAKE_PAT");
  process.exit(1);
}

const API = "https://api.github.com";
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "22ABLE22-profile-stats",
  "X-GitHub-Api-Version": "2022-11-28",
};

// buefy-like palette (github-readme-stats)
const C = {
  title: "#395B64",
  text: "#395B64",
  icon: "#42b983",
  muted: "#6b7c85",
  bg: "#ffffff",
  border: "#e6ebef",
  ring: "#dfe7ee",
};

const LANG_COLOR = {
  Python: "#3572A5",
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  HTML: "#e34c26",
  CSS: "#563d7c",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  Cuda: "#3A4E3A",
  Jupyter: "#DA5B0B",
  "Jupyter Notebook": "#DA5B0B",
  Shell: "#89e051",
  Batchfile: "#C1F12E",
  GDScript: "#355570",
  GDShader: "#355570",
  Markdown: "#083fa1",
  Rust: "#dea584",
  Java: "#b07219",
  Go: "#00ADD8",
  PHP: "#4F5D95",
  Vue: "#41b883",
  SCSS: "#c6538c",
};

function langColor(name) {
  return LANG_COLOR[name] || "#8b949e";
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fontStack() {
  return "-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,PingFang SC,Microsoft YaHei,sans-serif";
}

async function gh(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${url} ${text.slice(0, 180)}`);
  }
  return res.json();
}

/** github-readme-stats style stats card (hide_border=false look, buefy colors) */
function renderStatsSvg(data) {
  const width = 450;
  const height = 195;
  const rows = [
    { icon: "🔥", label: "Total Stars", value: data.stars },
    { icon: "📦", label: "Total Repos", value: data.repoCount },
    { icon: "📥", label: "Total Forks", value: data.forks },
    { icon: "❗", label: "Total Issues", value: data.issues },
    { icon: "🔃", label: "Pull Requests", value: data.prs },
    { icon: "🧮", label: "Commits (1y)", value: data.commits },
  ];

  // rank heuristic like github-readme-stats
  const score = data.stars * 2 + data.commits + data.prs * 3 + data.repoCount;
  const rank =
    score > 200 ? "S+" : score > 120 ? "A" : score > 60 ? "B" : score > 20 ? "C" : "C+";

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  );
  parts.push(`<style>
    .t{font:600 14px ${fontStack()};fill:${C.title}}
    .l{font:400 12px ${fontStack()};fill:${C.text}}
    .v{font:600 12px ${fontStack()};fill:${C.text}}
    .m{font:400 11px ${fontStack()};fill:${C.muted}}
  </style>`);
  parts.push(
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="${C.bg}" stroke="${C.border}"/>`,
  );
  parts.push(
    `<text class="t" x="24" y="30">22ABLE22's GitHub Stats</text>`,
  );

  // rank circle
  parts.push(
    `<circle cx="392" cy="28" r="22" fill="#f3faf7" stroke="${C.icon}" stroke-width="2"/>`,
  );
  parts.push(
    `<text x="392" y="28" text-anchor="middle" dominant-baseline="central" style="font:700 13px ${fontStack()};fill:${C.icon}">${esc(rank)}</text>`,
  );
  parts.push(
    `<text class="m" x="392" y="58" text-anchor="middle">Rank</text>`,
  );

  // divider
  parts.push(`<line x1="24" y1="48" x2="${width - 24}" y2="48" stroke="${C.border}"/>`);

  // two-column stats like GRS
  let y = 72;
  const col1 = rows.slice(0, 3);
  const col2 = rows.slice(3);
  const drawCol = (items, x) => {
    let yy = y;
    for (const it of items) {
      parts.push(
        `<text class="l" x="${x}" y="${yy}">${esc(it.icon)} ${esc(it.label)}:</text>`,
      );
      parts.push(
        `<text class="v" x="${x + 165}" y="${yy}">${esc(it.value)}</text>`,
      );
      yy += 28;
    }
  };
  drawCol(col1, 28);
  drawCol(col2, 240);

  parts.push(
    `<text class="m" x="24" y="${height - 16}">Includes private repositories visible to STATS_PAT</text>`,
  );
  parts.push(`</svg>`);
  return parts.join("\n");
}

/** compact top-langs card: title + donut + legend, like github-readme-stats compact */
function renderTopLangsSvg(langs, totalBytes) {
  const items = langs.slice(0, 6);
  const width = 350;
  const legendW = 200;
  const height = 180;

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  );
  parts.push(`<style>
    .t{font:600 14px ${fontStack()};fill:${C.title}}
    .l{font:400 12px ${fontStack()};fill:${C.text}}
    .p{font:600 12px ${fontStack()};fill:${C.text}}
  </style>`);
  parts.push(
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="${C.bg}" stroke="${C.border}"/>`,
  );
  parts.push(`<text class="t" x="20" y="28">Most Used Languages</text>`);

  // donut
  const cx = 78;
  const cy = 105;
  const r = 48;
  const stroke = 18;
  const circumference = 2 * Math.PI * r;

  parts.push(
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.ring}" stroke-width="${stroke}"/>`,
  );

  let offset = 0;
  for (const [name, bytes] of items) {
    const frac = totalBytes > 0 ? bytes / totalBytes : 0;
    const len = frac * circumference;
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${langColor(name)}" stroke-width="${stroke}" stroke-dasharray="${len} ${circumference - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="butt"/>`,
    );
    offset += len;
  }

  // legend compact
  let y = 56;
  for (const [name, bytes] of items) {
    const pct = totalBytes > 0 ? ((bytes / totalBytes) * 100).toFixed(2) : "0.00";
    parts.push(
      `<rect x="148" y="${y - 8}" width="10" height="10" rx="2" fill="${langColor(name)}"/>`,
    );
    parts.push(`<text class="l" x="164" y="${y}">${esc(name)}</text>`);
    parts.push(
      `<text class="p" x="${width - 16}" y="${y}" text-anchor="end">${pct}%</text>`,
    );
    y += 22;
  }

  parts.push(`</svg>`);
  return parts.join("\n");
}

async function main() {
  const repos = [];
  for (let page = 1; page <= 5; page += 1) {
    const batch = await gh(
      `${API}/user/repos?per_page=100&page=${page}&affiliation=owner,collaborator,organization_member&sort=updated`,
    );
    if (!batch.length) break;
    repos.push(...batch);
  }

  const langMap = new Map();
  let stars = 0;
  let forks = 0;
  let issues = 0;
  let prs = 0;
  let commits = 0;

  for (const repo of repos) {
    stars += repo.stargazers_count || 0;
    forks += repo.forks_count || 0;
    try {
      const langs = await gh(`${API}/repos/${repo.full_name}/languages`);
      for (const [lang, bytes] of Object.entries(langs)) {
        if (!lang) continue;
        langMap.set(lang, (langMap.get(lang) || 0) + Number(bytes || 0));
      }
    } catch (e) {
      console.warn("langs fail", repo.full_name, e.message);
    }
  }

  try {
    const me = await gh(`${API}/user`);
    const login = me.login;
    const iss = await gh(
      `${API}/search/issues?q=${encodeURIComponent(`author:${login} type:issue`)}&per_page=1`,
    );
    issues = iss.total_count || 0;
    const prq = await gh(
      `${API}/search/issues?q=${encodeURIComponent(`author:${login} type:pr`)}&per_page=1`,
    );
    prs = prq.total_count || 0;
  } catch (e) {
    console.warn("search fail", e.message);
  }

  // last-year commits from contribution calendar when possible
  try {
    const q = `{"query":"{ user(login:\\"22ABLE22\\"){ contributionsCollection { totalCommitContributions contributionCalendar { totalContributions } } } }"}`;
    const res = await fetch(`${API}/graphql`, {
      method: "POST",
      headers,
      body: q,
    });
    if (res.ok) {
      const g = await res.json();
      commits =
        g?.data?.user?.contributionsCollection?.totalCommitContributions ??
        g?.data?.user?.contributionsCollection?.contributionCalendar?.totalContributions ??
        0;
    }
  } catch (e) {
    console.warn("graphql commits fail", e.message);
  }

  const langs = [...langMap.entries()].filter(([, b]) => b > 0).sort((a, b) => b[1] - a[1]);
  const total = langs.reduce((s, [, b]) => s + b, 0);

  const outDir = path.join(process.cwd(), "assets");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "stats-token.svg"),
    renderStatsSvg({
      repoCount: repos.length,
      stars,
      forks,
      issues,
      prs,
      commits,
    }),
    "utf8",
  );
  fs.writeFileSync(
    path.join(outDir, "top-langs.svg"),
    renderTopLangsSvg(langs, total),
    "utf8",
  );

  console.log("repos:", repos.length);
  console.log("top langs:", langs.slice(0, 8));
  console.log("commits(1y):", commits, "stars:", stars, "issues:", issues, "prs:", prs);
  console.log("wrote assets/stats-token.svg assets/top-langs.svg");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
