import type { Metadata } from 'next';
import { Fraunces, Source_Sans_3 } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const body = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'DSH 插件市场',
    template: '%s · DSH 插件市场',
  },
  description: 'DeepSeek Harness 社区插件目录。浏览、复制安装命令，或在 DSH Web UI 里一键安装。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${display.variable} ${body.variable}`}>
        <div className="wrap">
          <header className="site-header">
            <Link className="brand" href="/">DSH 插件市场</Link>
            <nav className="nav">
              <Link href="/">目录</Link>
              <a href="https://github.com/deepseek-ai/deepseek-harness" rel="noreferrer">DeepSeek Harness</a>
              <a href="https://github.com/chnjames/dsh-plugin-market" rel="noreferrer">本仓库</a>
            </nav>
          </header>
          {children}
          <footer className="site-footer">
            公开索引来自 GitHub topic <code>dsh-plugin</code> 与 npm keyword。
            站点只负责浏览；一键安装在 DSH Web UI 的「插件市场」入口完成。
            安装第三方插件即在本机执行其代码，请自行评估风险。
          </footer>
        </div>
      </body>
    </html>
  );
}
