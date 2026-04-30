import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Supplier Payment Agent — AI-Powered Vendor Due Diligence',
  description: 'Drop in a new supplier invoice, and the agent does the due diligence that takes your team an hour — then pays or escalates in seconds.',
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
