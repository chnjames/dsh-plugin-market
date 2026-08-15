import type { Metadata } from 'next';
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const body = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'DSH 插件市场',
    template: '%s · DSH 插件市场',
  },
  description: 'DeepSeek Harness 社区插件目录。浏览、复制安装命令；在 DSH「设置 → 插件 → 插件市场」里一键安装。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <div className="wrap">
          <header className="site-header">
            <Link className="brand" href="/">
              DSH <span>插件市场</span>
            </Link>
            <nav className="nav" aria-label="站点">
              <Link href="/">目录</Link>
              <a href="https://github.com/deepseek-ai/deepseek-harness" rel="noreferrer">DeepSeek Harness</a>
              <a href="https://github.com/chnjames/dsh-plugin-market" rel="noreferrer">本仓库</a>
            </nav>
          </header>
          {children}
          <footer className="site-footer">
            公开索引来自 GitHub topic <code>dsh-plugin</code> 与 npm keyword。
            本站只负责浏览与复制命令；安装在 DSH「设置 → 插件 → 插件市场」完成。
            安装第三方插件即在本机执行其代码，请自行评估。
          </footer>
        </div>
      </body>
    </html>
  );
}
