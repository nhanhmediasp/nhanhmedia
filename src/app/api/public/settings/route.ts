import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    let settings = await prisma.websiteSettings.findUnique({
      where: { id: 'default' },
      select: {
        siteName: true,
        siteDescription: true,
        logoUrl: true,
        faviconUrl: true,
        adminEmail: true,
        adminPhone: true,
        adminAddress: true,
        facebookUrl: true,
        zaloUrl: true,
        telegramUrl: true,
        sepayAccountNumber: true,
        sepayBankCode: true,
        sepayAccountName: true,
      }
    });

    if (settings && settings.logoUrl && settings.logoUrl.includes('theselfishmeme.co.uk')) {
      await prisma.websiteSettings.update({
        where: { id: 'default' },
        data: { logoUrl: null }
      });
      settings.logoUrl = null;
    }

    if (!settings) {
      // Auto-create default settings record if it doesn't exist
      const newSettings = await prisma.websiteSettings.create({
        data: { id: 'default' },
        select: {
          siteName: true,
          siteDescription: true,
          logoUrl: true,
          faviconUrl: true,
          adminEmail: true,
          adminPhone: true,
          adminAddress: true,
          facebookUrl: true,
          zaloUrl: true,
          telegramUrl: true,
          sepayAccountNumber: true,
          sepayBankCode: true,
          sepayAccountName: true,
        }
      });
      settings = newSettings;
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('GET public website settings error:', error);
    // Return graceful fallback settings to avoid crashing layouts
    return NextResponse.json({
      settings: {
        siteName: 'Nhanh Media',
        siteDescription: 'Website quản lý khách hàng, cộng tác viên nội bộ, đại lý và đơn hàng dịch vụ của Nhanh Media.',
        logoUrl: null,
        faviconUrl: null,
        adminEmail: 'contact@nhanhmedia.vn',
        adminPhone: '0977 111 222',
        adminAddress: 'Hồ Chí Minh',
        facebookUrl: null,
        zaloUrl: null,
        telegramUrl: null,
      }
    });
  }
}
