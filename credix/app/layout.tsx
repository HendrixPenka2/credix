import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Global styles
import { Providers } from '../components/Providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'CREDIX - Scoring de Risque',
  description: 'Application IA de Scoring de Risque de Crédit',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="fr" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
