import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SnakeBet Arena - Play, Bet, Win',
  description: 'Multiplayer Snake game with real money stakes via M-PESA',
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
