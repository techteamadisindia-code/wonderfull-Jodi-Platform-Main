import './globals.css';
import type { Metadata } from 'next';
import { AppLayoutWrapper } from '../components/AppLayoutWrapper';

export const metadata: Metadata = {
  title: 'Wonderful Jodi - Doctor Matrimony for Healthcare Professionals',
  description:
    'Find your life partner on India’s premier Doctor Matrimony platform with verified medical professionals and esteemed families.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://wonderfuljodi.com'
        : 'http://localhost:3000')
  ),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Wonderful Jodi - Doctor Matrimony for Healthcare Professionals',
    description:
      'Find your life partner on India’s premier Doctor Matrimony platform with verified medical professionals and esteemed families.',
    url: 'https://wonderfuljodi.com',
    siteName: 'Wonderful Jodi',
    images: [
      {
        url: '/images/wonderful-jodi-logo.png',
        width: 800,
        height: 600,
        alt: 'Wonderful Jodi Matrimonial Platform',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wonderful Jodi - Doctor Matrimony for Healthcare Professionals',
    description:
      'Find your life partner on India’s premier Doctor Matrimony platform with verified medical professionals and esteemed families.',
    images: ['/images/wonderful-jodi-logo.png'],
  },
  icons: {
    icon: '/images/wonderful-jodi-logo.png',
    apple: '/images/wonderful-jodi-logo.png',
  },
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

