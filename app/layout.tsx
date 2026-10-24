import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'NITP Scheduler & Seating Engine',
  description: 'Single-College Academic Timetable Generator & Anti-Cheating Seating System for NIT Patna',
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/logo.png',
    // apple-icon.png is the actual filename in /app — Next.js serves it at /apple-icon.png
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'NITP Scheduler & Seating Engine',
    description: 'Clash-free timetable generator and anti-cheating exam seating system for NIT Patna',
    siteName: 'NIT Patna Academic Engine',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'NITP Scheduler & Seating Engine',
    description: 'Clash-free timetable generator and anti-cheating exam seating system for NIT Patna',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full light" style={{ colorScheme: 'light' }} data-theme="light">
      <body className="min-h-full flex flex-col font-sans bg-[#fafafa] text-zinc-900" style={{ colorScheme: 'light' }}>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
