/**
 * GitHub-stats-like SVG cards.
 * Layout: [Stats]  [Rank circle]  [Top Languages]
 * Rank uses the official anuraghazra/github-readme-stats algorithm.
 *   https://github.com/anuraghazra/github-readme-stats/blob/master/src/calculateRank.js
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

/** Official github-readme-stats calculateRank */
function exponential_cdf(x) {
  return 1 - 2 ** -x;
}

function log_normal_cdf(x) {
  // approximation used by github-readme-stats
  return x / (1 + x);
}

/**
 * Port of anuraghazra/github-readme-stats src/calculateRank.js
 * @returns {{ level: string, percentile: number }}
 */
function calculateRank({ all_commits, commits, prs, issues, reviews, repos, stars, followers }) {
  const COMMITS_MEDIAN = all_commits ? 1000 : 250,
    COMMITS_WEIGHT = 2;
  const PRS_MEDIAN = 50,
    PRS_WEIGHT = 3;
  const ISSUES_MEDIAN = 25,
    ISSUES_WEIGHT = 1;
  const REVIEWS_MEDIAN = 2,
    REVIEWS_WEIGHT = 1;
  const STARS_MEDIAN = 50,
    STARS_WEIGHT = 4;
  const FOLLOWERS_MEDIAN = 10,
    FOLLOWERS_WEIGHT = 1;

  const TOTAL_WEIGHT =
    COMMITS_WEIGHT +
    PRS_WEIGHT +
    ISSUES_WEIGHT +
    REVIEWS_WEIGHT +
    STARS_WEIGHT +
    FOLLOWERS_WEIGHT;

  // Official ladder (no S+/S-/C- in upstream)
  const THRESHOLDS = [1, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
  const LEVELS = ["S", "A+", "A", "A-", "B+", "B", "B-", "C+", "C"];

  const rank =
    1 -
    (COMMITS_WEIGHT * exponential_cdf(commits / COMMITS_MEDIAN) +
      PRS_WEIGHT * exponential_cdf(prs / PRS_MEDIAN) +
      ISSUES_WEIGHT * exponential_cdf(issues / ISSUES_MEDIAN) +
      REVIEWS_WEIGHT * exponential_cdf(reviews / REVIEWS_MEDIAN) +
      STARS_WEIGHT * log_normal_cdf(stars / STARS_MEDIAN) +
      FOLLOWERS_WEIGHT * log_normal_cdf(followers / FOLLOWERS_MEDIAN)) /
      TOTAL_WEIGHT;

  const idx = THRESHOLDS.findIndex((t) => rank * 100 <= t);
  const level = LEVELS[idx >= 0 ? idx : LEVELS.length - 1];
  return { level, percentile: rank * 100 };
}

/** Simple colored icons (github-readme-stats like), 16x16 viewBox */
function iconSvg(kind, x, y, size) {
  const s = size || 14;
  const k = s / 16;
  const open = `<svg x="${x}" y="${y - s}" width="${s}" height="${s}" viewBox="0 0 16 16" fill="none">`;
  const close = `</svg>`;
  if (kind === "star") {
    return (
      open +
      `<path fill="#f5a623" d="M8 1.5l1.76 3.57 3.94.57-2.85 2.78.67 3.92L8 10.77 4.48 12.34l.67-3.92L2.3 5.64l3.94-.57L8 1.5z"/>` +
      close
    );
  }
  if (kind === "repo") {
    return (
      open +
      `<rect x="2" y="1.5" width="12" height="13" rx="1.5" fill="#52adc8"/>` +
      `<path fill="#ffffff" d="M5 4.5h6v1.2H5zm0 2.8h6v1.2H5zm0 2.8h4v1.2H5z"/>` +
      close
    );
  }
  if (kind === "fork") {
    return (
      open +
      `<circle cx="4" cy="3.5" r="2" fill="#6b7c85"/>` +
      `<circle cx="12" cy="3.5" r="2" fill="#6b7c85"/>` +
      `<circle cx="8" cy="12.5" r="2" fill="#6b7c85"/>` +
      `<path stroke="#6b7c85" stroke-width="1.4" d="M4 5.5v2a2 2 0 002 2h4a2 2 0 002-2v-2M8 9.5v1"/>` +
      close
    );
  }
  if (kind === "issue") {
    return (
      open +
      `<circle cx="8" cy="8" r="6" fill="#e5534b"/>` +
      `<circle cx="8" cy="8" r="2.2" fill="#ffffff"/>` +
      close
    );
  }
  if (kind === "pr") {
    return (
      open +
      `<circle cx="4" cy="4" r="2" fill="#8957e5"/>` +
      `<circle cx="4" cy="12" r="2" fill="#8957e5"/>` +
      `<circle cx="12" cy="12" r="2" fill="#8957e5"/>` +
      `<path stroke="#8957e5" stroke-width="1.4" d="M4 6v4M6 4h3l2 2M12 10V8"/>` +
      close
    );
  }
  // commit
  return (
    open +
    `<circle cx="8" cy="8" r="3" fill="#3fb950"/>` +
    `<path stroke="#3fb950" stroke-width="1.6" d="M1 8h4M11 8h4"/>` +
    close
  );
}

/** Left card: pure stats — no rank badge, no private note */
function renderStatsSvg(data) {
  const width = 420;
  const height = 185;
  const rowsLeft = [
    { icon: "star", label: "Total Stars", value: data.stars },
    { icon: "repo", label: "Total Repos", value: data.repoCount },
    { icon: "fork", label: "Total Forks", value: data.forks },
  ];
  const rowsRight = [
    { icon: "issue", label: "Total Issues", value: data.issues },
    { icon: "pr", label: "Pull Requests", value: data.prs },
    { icon: "commit", label: "Commits (1y)", value: data.commits },
  ];

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  );
  parts.push(`<style>
    .t{font:600 14px ${fontStack()};fill:${C.title}}
    .l{font:400 12px ${fontStack()};fill:${C.text}}
    .v{font:600 12px ${fontStack()};fill:${C.text}}
  </style>`);
  parts.push(
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="${C.bg}" stroke="${C.border}"/>`,
  );
  parts.push(`<text class="t" x="24" y="30">22ABLE22's GitHub Stats</text>`);
  parts.push(`<line x1="24" y1="46" x2="${width - 24}" y2="46" stroke="${C.border}"/>`);

  const drawCol = (items, x, valDx) => {
    let y = 82;
    for (const it of items) {
      parts.push(iconSvg(it.icon, x, y, 14));
      parts.push(`<text class="l" x="${x + 20}" y="${y}">${esc(it.label)}:</text>`);
      parts.push(`<text class="v" x="${x + valDx}" y="${y}">${esc(it.value)}</text>`);
      y += 30;
    }
  };
  drawCol(rowsLeft, 24, 155);
  drawCol(rowsRight, 215, 155);
  parts.push(`</svg>`);
  return parts.join("\n");
}

/** Middle card: official rank letter in a circle */
function renderRankSvg(rank, percentile) {
  const width = 130;
  const height = 185;
  const cx = width / 2;
  const cy = 110;
  const r = 42;

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  );
  parts.push(`<style>
    .t{font:600 12px ${fontStack()};fill:${C.title}}
    .r{font:700 26px ${fontStack()};fill:${C.icon}}
    .m{font:400 10px ${fontStack()};fill:${C.muted}}
  </style>`);
  parts.push(
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="${C.bg}" stroke="${C.border}"/>`,
  );
  parts.push(`<text class="t" x="${cx}" y="28" text-anchor="middle">Rank</text>`);
  parts.push(
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f3faf7" stroke="${C.icon}" stroke-width="3"/>`,
  );
  parts.push(
    `<circle cx="${cx}" cy="${cy}" r="${r + 8}" fill="none" stroke="${C.icon}" stroke-width="1" opacity="0.25"/>`,
  );
  parts.push(
    `<text class="r" x="${cx}" y="${cy + 2}" text-anchor="middle" dominant-baseline="central">${esc(rank)}</text>`,
  );
  parts.push(`</svg>`);
  return parts.join("\n");
}

/** Right card: top languages compact (donut + legend) */
function renderTopLangsSvg(langs, totalBytes) {
  const items = langs.slice(0, 6);
  const width = 380;
  const height = 185;

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

  const cx = 72;
  const cy = 108;
  const r = 44;
  const stroke = 16;
  const circumference = 2 * Math.PI * r;

  parts.push(
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.ring}" stroke-width="${stroke}"/>`,
  );

  let offset = 0;
  for (const [name, bytes] of items) {
    const frac = totalBytes > 0 ? bytes / totalBytes : 0;
    const len = frac * circumference;
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${langColor(name)}" stroke-width="${stroke}" stroke-dasharray="${len} ${circumference - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`,
    );
    offset += len;
  }

  let y = 62;
  for (const [name, bytes] of items) {
    const pct = totalBytes > 0 ? ((bytes / totalBytes) * 100).toFixed(2) : "0.00";
    parts.push(
      `<rect x="140" y="${y - 8}" width="10" height="10" rx="2" fill="${langColor(name)}"/>`,
    );
    parts.push(`<text class="l" x="156" y="${y}">${esc(name)}</text>`);
    parts.push(`<text class="p" x="${width - 16}" y="${y}" text-anchor="end">${pct}%</text>`);
    y += 20;
  }

  parts.push(`</svg>`);
  return parts.join("\n");
}

async function graphql(query) {
  const res = await fetch(`${API}/graphql`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`graphql ${res.status} ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  if (json.errors?.[0]) throw new Error(json.errors[0].message);
  return json.data;
}

async function main() {
  const me = await gh(`${API}/user`);
  const login = me.login;
  const followers = me.followers || 0;

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

  let issues = 0;
  let prs = 0;
  let commits = 0;
  let reviews = 0;

  try {
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

  try {
    const data = await graphql(`{
      user(login: "${login}") {
        contributionsCollection {
          totalCommitContributions
          totalPullRequestReviewContributions
          contributionCalendar { totalContributions }
        }
      }
    }`);
    const cc = data.user.contributionsCollection;
    commits = cc.totalCommitContributions || 0;
    reviews = cc.totalPullRequestReviewContributions || 0;
    if (!commits) commits = cc.contributionCalendar?.totalContributions || 0;
  } catch (e) {
    console.warn("graphql fail", e.message);
  }

  // all_commits=false → use last-year commit count (GRS default unless include_all_commits)
  const rankInfo = calculateRank({
    all_commits: false,
    commits,
    prs,
    issues,
    reviews,
    repos: repos.length,
    stars,
    followers,
  });

  const langs = [...langMap.entries()].filter(([, b]) => b > 0).sort((a, b) => b[1] - a[1]);
  const total = langs.reduce((s, [, b]) => s + b, 0);
  const stats = { repoCount: repos.length, stars, forks, issues, prs, commits };

  const outDir = path.join(process.cwd(), "assets");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "stats-token.svg"), renderStatsSvg(stats), "utf8");
  fs.writeFileSync(
    path.join(outDir, "rank.svg"),
    renderRankSvg(rankInfo.level, rankInfo.percentile),
    "utf8",
  );
  fs.writeFileSync(path.join(outDir, "top-langs.svg"), renderTopLangsSvg(langs, total), "utf8");

  console.log("login:", login);
  console.log("inputs:", { commits, prs, issues, reviews, stars, followers, repos: repos.length });
  console.log("official rank:", rankInfo);
  console.log("top langs:", langs.slice(0, 6));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
