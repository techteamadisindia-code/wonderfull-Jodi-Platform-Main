import './globals.css';
import type { Metadata } from 'next';
import { AppLayoutWrapper } from '../components/AppLayoutWrapper';

export const metadata: Metadata = {
  title: 'Wonderful Jodi - Matrimony for Professionals',
  description: 'Find your life partner with a premium, secure and trusted matrimonial experience.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="flex min-h-screen flex-col bg-[#FAF8F5] text-slate-900 antialiased">
        <AppLayoutWrapper>{children}</AppLayoutWrapper>
      </body>
    </html>
  );
}

