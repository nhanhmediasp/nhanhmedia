'use client';

import React from 'react';
import {
  Tag,
  Zap,
  Globe,
  ShoppingCart,
  User,
  Shield,
  Box,
  Gift,
  Key,
  Cpu,
  Database,
  Server,
  Terminal,
  Wifi,
  Smartphone,
  CreditCard,
  Award,
  Star,
  Crown,
  Gem,
  LucideIcon
} from 'lucide-react';

export const SUPPLIER_ICONS: Record<string, LucideIcon> = {
  Tag,
  Zap,
  Globe,
  ShoppingCart,
  User,
  Shield,
  Box,
  Gift,
  Key,
  Cpu,
  Database,
  Server,
  Terminal,
  Wifi,
  Smartphone,
  CreditCard,
  Award,
  Star,
  Crown,
  Gem
};

export const SUPPLIER_ICON_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  Tag: { bg: 'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)', color: '#a145ab', border: 'rgba(161,69,171,0.15)' },
  Zap: { bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', color: '#d97706', border: 'rgba(217,119,6,0.15)' },
  Globe: { bg: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', color: '#0284c7', border: 'rgba(2,132,199,0.15)' },
  ShoppingCart: { bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', color: '#16a34a', border: 'rgba(22,163,74,0.15)' },
  User: { bg: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', color: '#4f46e5', border: 'rgba(79,70,229,0.15)' },
  Shield: { bg: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', color: '#ea580c', border: 'rgba(234,88,12,0.15)' },
  Box: { bg: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', color: '#475569', border: 'rgba(71,85,105,0.15)' },
  Gift: { bg: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)', color: '#db2777', border: 'rgba(219,39,119,0.15)' },
  Key: { bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', color: '#b45309', border: 'rgba(180,83,9,0.15)' },
  Cpu: { bg: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', color: '#2563eb', border: 'rgba(37,99,235,0.15)' },
  Database: { bg: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', color: '#7c3aed', border: 'rgba(124,58,237,0.15)' },
  Server: { bg: 'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)', color: '#c026d3', border: 'rgba(192,38,211,0.15)' },
  Terminal: { bg: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', color: '#0f172a', border: 'rgba(15,23,42,0.15)' },
  Wifi: { bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', color: '#15803d', border: 'rgba(21,128,61,0.15)' },
  Smartphone: { bg: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', color: '#1e293b', border: 'rgba(30,41,59,0.15)' },
  CreditCard: { bg: 'linear-gradient(135deg, #fff5f5 0%, #ffe3e3 100%)', color: '#e11d48', border: 'rgba(225,29,72,0.15)' },
  Award: { bg: 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)', color: '#ca8a04', border: 'rgba(202,138,4,0.15)' },
  Star: { bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', color: '#d97706', border: 'rgba(217,119,6,0.15)' },
  Crown: { bg: 'linear-gradient(135deg, #fffbeb 0%, #fde68a 100%)', color: '#ca8a04', border: 'rgba(202,138,4,0.2)' },
  Gem: { bg: 'linear-gradient(135deg, #ecfeff 0%, #a5f3fc 100%)', color: '#0891b2', border: 'rgba(8,145,178,0.2)' }
};

interface SupplierAvatarProps {
  iconName?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SupplierAvatar({ iconName, className = '', size = 'md' }: SupplierAvatarProps) {
  const name = iconName && SUPPLIER_ICONS[iconName] ? iconName : 'Tag';
  const IconComponent = SUPPLIER_ICONS[name] || Tag;
  const style = SUPPLIER_ICON_STYLES[name] || SUPPLIER_ICON_STYLES.Tag;

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
