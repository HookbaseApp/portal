import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hookbase Portal Example',
  description: 'Example integration of @hookbase/portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
