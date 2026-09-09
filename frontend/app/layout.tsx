import './globals.css';
import type { Metadata } from 'next';
<<<<<<< HEAD
import { AppLayoutWrapper } from '../components/AppLayoutWrapper';
=======
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1

export const metadata: Metadata = {
  title: 'Wonderful Jodi - Matrimony for Professionals',
  description: 'Find your life partner with a premium, secure and trusted matrimonial experience.',
<<<<<<< HEAD
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
=======
  metadataBase: new URL('http://localhost:3000'),
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
<<<<<<< HEAD
      <body className="flex min-h-screen flex-col bg-[#FAF8F5] text-slate-900 antialiased">
        <AppLayoutWrapper>{children}</AppLayoutWrapper>
=======
      <body className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
      </body>
    </html>
  );
}

