import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'NITP Scheduler & Seating Engine',
  description: 'Single-College Academic Timetable Generator & Anti-Cheating Seating System',
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
