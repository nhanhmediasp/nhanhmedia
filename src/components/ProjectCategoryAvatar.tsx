'use client';

import React from 'react';
import {
  Folder,
  Briefcase,
  Code,
  Megaphone,
  Globe,
  Palette,
  ShoppingBag,
  Video,
  Award,
  Terminal,
  Database,
  Cpu,
  LineChart,
  Settings,
  Layers,
  Search,
  LucideIcon
} from 'lucide-react';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Folder,
  Briefcase,
  Code,
  Megaphone,
  Globe,
  Palette,
  ShoppingBag,
  Video,
  Award,
  Terminal,
  Database,
  Cpu,
  LineChart,
  Settings,
  Layers,
  Search
};

export const CATEGORY_ICON_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  Folder: { bg: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)', color: '#7c3aed', border: 'rgba(124,58,237,0.15)' },
  Briefcase: { bg: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', color: '#0284c7', border: 'rgba(2,132,199,0.15)' },
  Code: { bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', color: '#16a34a', border: 'rgba(22,163,74,0.15)' },
  Megaphone: { bg: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', color: '#ea580c', border: 'rgba(234,88,12,0.15)' },
  Globe: { bg: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', color: '#2563eb', border: 'rgba(37,99,235,0.15)' },
  Palette: { bg: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)', color: '#db2777', border: 'rgba(219,39,119,0.15)' },
  ShoppingBag: { bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', color: '#d97706', border: 'rgba(217,119,6,0.15)' },
  Video: { bg: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)', color: '#e11d48', border: 'rgba(225,29,72,0.15)' },
  Award: { bg: 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)', color: '#ca8a04', border: 'rgba(202,138,4,0.15)' },
  Terminal: { bg: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', color: '#0f172a', border: 'rgba(15,23,42,0.15)' },
  Database: { bg: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', color: '#9333ea', border: 'rgba(147,51,234,0.15)' },
  Cpu: { bg: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)', color: '#0891b2', border: 'rgba(8,145,178,0.15)' },
  LineChart: { bg: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)', color: '#0d9488', border: 'rgba(13,148,136,0.15)' },
  Settings: { bg: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', color: '#475569', border: 'rgba(71,85,105,0.15)' },
  Layers: { bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', color: '#3b82f6', border: 'rgba(59,130,246,0.15)' },
  Search: { bg: 'linear-gradient(135deg, #fafaf9 0%, #f5f5f4 100%)', color: '#57534e', border: 'rgba(87,83,78,0.15)' }
};

interface ProjectCategoryAvatarProps {
  iconName?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ProjectCategoryAvatar({ iconName, className = '', size = 'md' }: ProjectCategoryAvatarProps) {
  const name = iconName && CATEGORY_ICONS[iconName] ? iconName : 'Folder';
  const IconComponent = CATEGORY_ICONS[name] || Folder;
  const style = CATEGORY_ICON_STYLES[name] || CATEGORY_ICON_STYLES.Folder;

  const sizeClasses = {
    sm: 'w-7 h-7 rounded-lg text-xs',
    md: 'w-8 h-8 rounded-lg text-sm',
    lg: 'w-12 h-12 rounded-xl text-lg'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-4.5 h-4.5',
    lg: 'w-6 h-6'
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-bold border shrink-0 transition-all duration-200 ${sizeClasses[size]} ${className}`}
      style={{
        background: style.bg,
        color: style.color,
        borderColor: style.border
      }}
    >
      <IconComponent className={iconSizes[size]} />
    </span>
  );
}
