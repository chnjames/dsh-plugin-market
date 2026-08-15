import type { Metadata } from 'next';
import { Montserrat, DM_Sans, Fragment_Mono } from 'next/font/google';
import { loadRegistry } from '@/lib/registry';
import { Providers } from '@/components/Providers';
import { SiteShell } from '@/components/SiteShell';
import './globals.css';

const display = Montserrat({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const body = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

const mono = Fragment_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'DSH 插件市场',
    template: '%s · DSH 插件市场',
  },
  description:
    'DeepSeek Harness 社区插件目录。浏览、复制安装命令；在 DSH「设置 → 插件 → 插件市场」里确认安装。',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    title: 'DSH 插件市场',
    description: 'DeepSeek Harness 社区插件目录',
    type: 'website',
  },
};

const themeInitScript = `(function(){try{var k='dsh-market-theme';var s=localStorage.getItem(k);var t=(s==='light'||s==='dark')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const registry = loadRegistry();

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <Providers>
          <SiteShell generatedAt={registry.generatedAt}>{children}</SiteShell>
        </Providers>
      </body>
    </html>
  );
}
