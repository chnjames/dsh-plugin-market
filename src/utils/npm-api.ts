// ============================================================
// DSH Plugin Market - npm Registry API Wrapper
// ============================================================

export interface NpmPackage {
  name: string;
  version: string;
  description: string;
  author?: {
    name: string;
    email?: string;
    url?: string;
  };
  keywords: string[];
  license: string;
  links: {
    npm?: string;
    homepage?: string;
    repository?: string;
    bugs?: string;
  };
  date: string;
  publisher?: {
    username: string;
    email: string;
  };
  maintainers?: Array<{
    username: string;
    email: string;
  }>;
}

export interface NpmSearchResult {
  objects: Array<{
    package: NpmPackage;
    score: {
      final: number;
      detail: {
        quality: number;
        popularity: number;
        maintenance: number;
      };
    };
    searchScore: number;
  }>;
  total: number;
  time: string;
}

export interface NpmDownloadResult {
  downloads: number;
  start: string;
  end: string;
  package: string;
}

export class NpmApiClient {
  private registry: string;

  constructor(registry: string = 'https://registry.npmjs.org') {
    this.registry = registry.replace(/\/$/, '');
  }

  /**
   * 按关键词搜索 npm 包
   */
  async search(keyword: string, size: number = 250): Promise<NpmSearchResult> {
    const url = `${this.registry}/-/v1/search?text=keywords:${encodeURIComponent(keyword)}&size=${size}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`npm registry error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<NpmSearchResult>;
  }

  /**
   * 获取包详情
   */
  async getPackage(name: string): Promise<any> {
    const url = `${this.registry}/${encodeURIComponent(name)}`;
    const response = await fetch(url);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`npm registry error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 获取包的周下载量
   */
  async getWeeklyDownloads(packageName: string): Promise<number> {
    try {
      const url = `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(packageName)}`;
      const response = await fetch(url);
      if (!response.ok) return 0;
      const data = await response.json() as NpmDownloadResult;
      return data.downloads || 0;
    } catch {
      return 0;
    }
  }

  /**
   * 获取 README（从包详情中）
   */
  async getReadme(packageName: string): Promise<string | null> {
    try {
      const pkg = await this.getPackage(packageName);
      return pkg?.readme || null;
    } catch {
      return null;
    }
  }

  /**
   * 从 repository 字段中提取 GitHub owner/repo
   */
  extractGitHubRepo(repoUrl: string): { owner: string; repo: string } | null {
    if (!repoUrl) return null;

    // 处理各种格式:
    // https://github.com/owner/repo
    // git+https://github.com/owner/repo.git
    // github:owner/repo
    // owner/repo
    const patterns = [
      /github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?/,
      /^([^/]+)\/([^/]+)$/,
    ];

    for (const pattern of patterns) {
      const match = repoUrl.match(pattern);
      if (match) {
        return { owner: match[1], repo: match[2] };
      }
    }

    return null;
  }
}
