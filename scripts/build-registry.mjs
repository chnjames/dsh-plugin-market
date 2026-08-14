#!/usr/bin/env node
/**
 * Build website/public/registry.json from GitHub topic:dsh-plugin + npm keyword:dsh-plugin.
 * Intended for GitHub Actions (GITHUB_TOKEN). Does not overwrite a good file on total failure.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyPlugin, inferRiskLevel } from '../shared/classifier.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outPath = join(root, 'website', 'public', 'registry.json');

const EXCLUDED = new Set(['deepseek-ai/deepseek-harness']);
const GITHUB_TOPIC = process.env.DSH_TOPIC || 'dsh-plugin';
const NPM_KEYWORD = process.env.DSH_NPM_KEYWORD || 'dsh-plugin';
const NPM_REGISTRY = (process.env.DSH_NPM_REGISTRY || 'https://registry.npmjs.org').replace(/\/$/, '');
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

function githubHeaders() {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'dsh-plugin-market-registry',
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  return headers;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, headers, attempt = 0) {
  const res = await fetch(url, { headers });
  if (res.status === 403 || res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after') || 0);
    const wait = Math.min(60_000, (retryAfter || 8) * 1000 * (attempt + 1));
    if (attempt < 4) {
      console.warn(`rate-limited ${res.status} ${url} — wait ${wait}ms`);
      await sleep(wait);
      return fetchJson(url, headers, attempt + 1);
    }
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} ${url}`);
  }
  return res.json();
}

async function fetchAllGithubRepos(topic) {
  const all = [];
  const perPage = 100;
  const maxPages = 10;
  for (let page = 1; page <= maxPages; page++) {
    const url = `https://api.github.com/search/repositories?q=topic:${encodeURIComponent(topic)}&sort=stars&order=desc&per_page=${perPage}&page=${page}`;
    const result = await fetchJson(url, githubHeaders());
    const items = result.items || [];
    if (items.length === 0) break;
    all.push(...items);
    console.log(`github page ${page}: +${items.length} (total ${all.length}/${result.total_count})`);
    if (all.length >= result.total_count) break;
    await sleep(400);
  }
  return all;
}

async function fetchNpmPackages(keyword) {
  const url = `${NPM_REGISTRY}/-/v1/search?text=keywords:${encodeURIComponent(keyword)}&size=250`;
  const result = await fetchJson(url, { 'User-Agent': 'dsh-plugin-market-registry' });
  return result.objects || [];
}

function githubRepoToPlugin(repo) {
  const fullName = repo.full_name;
  if (!fullName || EXCLUDED.has(fullName.toLowerCase())) return null;
  const name = repo.name || fullName.split('/')[1];
  const description = repo.description || '';
  const topics = repo.topics || [];
  const info = { name, description, topics, keywords: [] };
  const installSpec = `github:${fullName}`;
  return {
    id: `github:${fullName}`,
    source: 'github',
    name,
    description,
    category: classifyPlugin(info),
    author: repo.owner?.login || '',
    url: repo.html_url || `https://github.com/${fullName}`,
    stars: Number(repo.stargazers_count) || 0,
    downloads: 0,
    version: repo.default_branch || '',
    license: repo.license?.spdx_id || repo.license?.name || '',
    language: repo.language || '',
    topics,
    keywords: [],
    installSpec,
    installCmd: `dsh plugin --profile web add ${installSpec}`,
    permissionLevel: inferRiskLevel(info),
    updatedAt: repo.pushed_at || repo.updated_at || new Date().toISOString(),
    readmeUrl: `https://github.com/${fullName}/blob/${repo.default_branch || 'main'}/README.md`,
  };
}

function extractGithubFromNpm(pkg) {
  const repoUrl = pkg.links?.repository || '';
  const match = String(repoUrl).match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  if (!match) return null;
  return `${match[1]}/${match[2]}`;
}

function npmPackageToPlugin(pkg) {
  const name = pkg.name;
  if (!name) return null;
  const description = pkg.description || '';
  const keywords = pkg.keywords || [];
  const info = { name, description, topics: [], keywords };
  const installSpec = name;
  return {
    id: `npm:${name}`,
    source: 'npm',
    name,
    description,
    category: classifyPlugin(info),
    author: pkg.author?.name || pkg.publisher?.username || '',
    url: pkg.links?.homepage || pkg.links?.npm || pkg.links?.repository || `https://www.npmjs.com/package/${name}`,
    stars: 0,
    downloads: 0,
    version: pkg.version || '',
    license: pkg.license || '',
    language: '',
    topics: [],
    keywords,
    installSpec,
    installCmd: `dsh plugin --profile web add ${installSpec}`,
    permissionLevel: inferRiskLevel(info),
    updatedAt: pkg.date || new Date().toISOString(),
    readmeUrl: pkg.links?.repository || '',
  };
}

function loadPrevious() {
  if (!existsSync(outPath)) return null;
  try {
    return JSON.parse(readFileSync(outPath, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const previous = loadPrevious();
  const plugins = [];
  const seenGithub = new Set();
  let githubOk = false;
  let npmOk = false;

  try {
    const repos = await fetchAllGithubRepos(GITHUB_TOPIC);
    for (const repo of repos) {
      const plugin = githubRepoToPlugin(repo);
      if (!plugin) continue;
      const key = plugin.id.slice('github:'.length).toLowerCase();
      if (seenGithub.has(key) || EXCLUDED.has(key)) continue;
      seenGithub.add(key);
      plugins.push(plugin);
    }
    githubOk = true;
  } catch (err) {
    console.error('GitHub sync failed:', err);
  }

  try {
    const objects = await fetchNpmPackages(NPM_KEYWORD);
    for (const item of objects) {
      const pkg = item.package;
      if (!pkg) continue;
      const gh = extractGithubFromNpm(pkg);
      if (gh && seenGithub.has(gh.toLowerCase())) continue;
      const plugin = npmPackageToPlugin(pkg);
      if (!plugin) continue;
      plugins.push(plugin);
    }
    npmOk = true;
  } catch (err) {
    console.error('npm sync failed:', err);
  }

  if (!githubOk && !npmOk) {
    console.error('All sources failed; leaving previous registry in place.');
    process.exit(previous?.plugins?.length ? 0 : 1);
  }

  plugins.sort((a, b) => (b.stars || 0) - (a.stars || 0) || a.name.localeCompare(b.name));

  const registry = {
    generatedAt: new Date().toISOString(),
    source: [githubOk ? 'github' : null, npmOk ? 'npm' : null].filter(Boolean).join('+'),
    total: plugins.length,
    plugins,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(registry, null, 2) + '\n', 'utf8');
  console.log(`wrote ${outPath} (${plugins.length} plugins, source=${registry.source})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
