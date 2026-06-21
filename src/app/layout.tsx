import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthContext';
import Navigation from '@/components/Navigation';
import { ToastContainer } from '@/components/ui';
import { prisma } from '@/lib/db';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await prisma.websiteSettings.findUnique({
      where: { id: 'default' },
    });

    return {
      title: settings?.siteName || 'Hệ thống Quản lý Dịch vụ - Nhanh Media',
      description: settings?.siteDescription || 'Website quản lý khách hàng, cộng tác viên nội bộ, đại lý và đơn hàng dịch vụ của Nhanh Media.',
      icons: {
        icon: settings?.faviconUrl || '/favicon.ico',
      },
      robots: {
        index: false,
        follow: false,
      },
    };
  } catch (error) {
    console.error('generateMetadata error:', error);
    return {
      title: 'Hệ thống Quản lý Dịch vụ - Nhanh Media',
      description: 'Website quản lý khách hàng, cộng tác viên nội bộ, đại lý và đơn hàng dịch vụ của Nhanh Media.',
      icons: {
        icon: '/favicon.ico',
      },
      robots: {
        index: false,
        follow: false,
      },
    };
  }
}

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
      <body className="min-h-full flex flex-col antialiased" suppressHydrationWarning>
        <AuthProvider>
          <Navigation>{children}</Navigation>
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
}
