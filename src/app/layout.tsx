import type { Metadata, Viewport } from 'next';
import { unstable_rethrow } from 'next/navigation';
import { connection } from 'next/server';
import './globals.css';
import { AuthProvider } from '@/components/AuthContext';
import Navigation from '@/components/Navigation';
import { ToastContainer } from '@/components/ui';
import { prisma } from '@/lib/db';
export async function generateMetadata(): Promise<Metadata> {
  try {
    // Metadata lấy từ PostgreSQL phải chạy theo request, không được làm bước
    // `next build` phụ thuộc vào khả năng kết nối DB production.
    await connection();
    const settings = await prisma.websiteSettings.findUnique({
      where: { id: 'default' },
    });

    return {
      title: settings?.siteName || 'Hệ thống Quản lý Dịch vụ - Nhanh Media',
      description: settings?.siteDescription || 'Hệ thống quản trị khách hàng, dự án và đơn hàng dịch vụ của Nhanh Media.',
      icons: {
        icon: settings?.faviconUrl || '/favicon.ico',
      },
      robots: {
        index: false,
        follow: false,
      },
    };
  } catch (error) {
    // Không nuốt tín hiệu nội bộ mà Next dùng để chuyển route sang dynamic.
    unstable_rethrow(error);
    console.error('generateMetadata error:', error);
    return {
      title: 'Hệ thống Quản lý Dịch vụ - Nhanh Media',
      description: 'Hệ thống quản trị khách hàng, dự án và đơn hàng dịch vụ của Nhanh Media.',
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
    <html lang="vi" className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased" suppressHydrationWarning>
        <AuthProvider>
          <Navigation>{children}</Navigation>
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
}
