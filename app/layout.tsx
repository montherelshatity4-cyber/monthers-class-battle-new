import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Monther’s Class Battle', description: 'Real-time classroom team battles' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
