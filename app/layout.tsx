import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lumni — Cross-Marketing for LA',
  description: 'The platform where local brands and creators run collaboration campaigns together.',
  icons: { icon: '/favicon.svg', apple: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
