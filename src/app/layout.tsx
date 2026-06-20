import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthContext';
import Navigation from '@/components/Navigation';
import { ToastContainer } from '@/components/ui';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Hệ thống Quản lý Dịch vụ - Nhanh Media',
  description: 'Website quản lý khách hàng, cộng tác viên nội bộ, đại lý và đơn hàng dịch vụ của Nhanh Media.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`h-full ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-full flex flex-col antialiased" suppressHydrationWarning>
        <AuthProvider>
          <Navigation>{children}</Navigation>
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
}
