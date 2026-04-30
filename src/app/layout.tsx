import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PayGate — AI-Powered Vendor Due Diligence & Payment Approval',
  description: 'Drop in a new supplier invoice, and the agent does the due diligence that takes your team an hour — then pays or escalates in seconds.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
