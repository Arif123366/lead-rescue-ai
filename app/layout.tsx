import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Lead Rescue AI — High-Intent Lead Recovery & AI Qualification Platform',
  description:
    'Autonomous AI lead qualification, smart CRM pipeline velocity, automated multi-channel follow-ups, and 48-hour idle lead recovery.',
  keywords: ['AI CRM', 'Lead Qualification', 'Lead Rescue', 'Sales Automation', 'Follow-up AI'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ErrorBoundary>
          <ToastProvider>{children}</ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
