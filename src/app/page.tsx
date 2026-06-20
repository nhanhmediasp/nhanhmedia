'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { Rocket } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (user.role === 'admin') {
          router.replace('/admin/dashboard');
        } else {
          router.replace('/dashboard');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white gap-5">
      <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center animate-spin">
        <Rocket className="w-6 h-6 text-white" />
      </div>
      <p className="text-sm font-semibold text-muted-foreground tracking-widest uppercase animate-pulse">
        Đang tải hệ thống...
      </p>
    </div>
  );
}
