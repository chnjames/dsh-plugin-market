// ============================================================
// DSH Plugin Market - GitHub API Wrapper
// ============================================================

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  pushed_at: string;
  owner: {
    login: string;
    avatar_url: string;
    type: string;
  };
  topics: string[];
  language: string | null;
  license: {
    key: string;
    name: string;
    spdx_id: string;
  } | null;
  default_branch: string;
  homepage: string | null;
}

export interface GitHubSearchResult {
  total_count: number;
  items: GitHubRepo[];
  incomplete_results: boolean;
}

export interface GitHubReadmeResponse {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  download_url: string | null;
  content: string; // base64 encoded
  encoding: string;
}

export class GitHubApiClient {
  private baseUrl = 'https://api.github.com';
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  private get headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'dsh-plugin-market',
    };
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }
    return headers;
  }

  /**
   * 搜索 topic 为 dsh-plugin 的仓库
   */
  async searchByTopic(topic: string, page: number = 1, perPage: number = 100): Promise<GitHubSearchResult> {
    const url = `${this.baseUrl}/search/repositories?q=topic:${encodeURIComponent(topic)}&sort=stars&order=desc&per_page=${perPage}&page=${page}`;
    const response = await fetch(url, { headers: this.headers });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<GitHubSearchResult>;
  }

  /**
   * 获取仓库详情
   */
  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}`;
    const response = await fetch(url, { headers: this.headers });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<GitHubRepo>;
  }

  /**
   * 获取仓库 README
   */
  async getReadme(owner: string, repo: string): Promise<string | null> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/readme`;
    const response = await fetch(url, { headers: this.headers });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as GitHubReadmeResponse;
    if (data.encoding === 'base64' && data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }

    return null;
  }

  /**
   * 获取最新的 commit hash
   */
  async getLatestCommitHash(owner: string, repo: string, branch?: string): Promise<string | null> {
    const ref = branch ? `heads/${branch}` : 'HEAD';
    const url = `${this.baseUrl}/repos/${owner}/${repo}/commits/${ref}`;
    const response = await fetch(url, {
      headers: { ...this.headers, 'Accept': 'application/vnd.github.sha' },
    });

    if (!response.ok) {
      return null;
    }

    return response.text();
  }

  /**
   * 全量拉取所有 topic 仓库（最多 1000 条，GitHub 搜索限制）
   */
  async fetchAllRepos(topic: string): Promise<GitHubRepo[]> {
    const allRepos: GitHubRepo[] = [];
    const perPage = 100;
    let page = 1;
    const maxPages = 10; // GitHub 搜索 API 最多 1000 条 = 10 页

    while (page <= maxPages) {
      try {
        const result = await this.searchByTopic(topic, page, perPage);
        if (result.items.length === 0) break;
        allRepos.push(...result.items);
        if (allRepos.length >= result.total_count) break;
        page++;
      } catch (error) {
        console.error('[plugin-market] GitHub search error:', error);
        break;
      }
    }

    return allRepos;
  }
}
