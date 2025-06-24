import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'SANCHARI',
  description: 'Collaborative map editing using satellite imagery',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar">
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
          <Link href="/dashboard">Dashboard</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
