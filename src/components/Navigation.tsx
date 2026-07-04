'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';
import {
  LayoutDashboard,
  Package,
  FileText,
  Users,
  BarChart3,
  UserCheck,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  User,
  ChevronRight,
  Megaphone,
  Tag,
  History,
  Globe,
  Mail,
  FolderGit2,
} from 'lucide-react';
import { Badge } from './ui';

interface NavLink {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const menuItems = [
  {
    type: 'link' as const,
    label: 'Tổng quan',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    type: 'link' as const,
    label: 'Báo cáo doanh thu',
    href: '/admin/reports',
    icon: BarChart3,
  },
  {
    type: 'group' as const,
    key: 'projects',
    label: 'Quản lý Dự Án',
    icon: FolderGit2,
    subLinks: [
      { label: 'Quản lý Dự Án', href: '/admin/projects', icon: FolderGit2 },
      { label: 'Khách hàng dự án', href: '/admin/projects/customers', icon: Users },
      { label: 'Phân loại', href: '/admin/projects/categories', icon: Tag },
      { label: 'Báo cáo chi tiết', href: '/admin/projects/dashboard', icon: FileText },
    ],
  },
  {
    type: 'group' as const,
    key: 'usersAndCustomers',
    label: 'Tài khoản',
    icon: Users,
    subLinks: [
      { label: 'Quản lý Tài khoản', href: '/admin/users', icon: UserCheck },
      { label: 'Khách hàng', href: '/admin/customers', icon: Users },
    ],
  },
  {
    type: 'group' as const,
    key: 'productsAndSuppliers',
    label: 'Sản phẩm',
    icon: Package,
    subLinks: [
      { label: 'Sản phẩm & Giá', href: '/admin/products', icon: Package },
      { label: 'Nguồn hàng', href: '/admin/suppliers', icon: Tag },
      { label: 'Đơn hàng dịch vụ', href: '/admin/orders', icon: FileText },
    ],
  },
];

const adminSettingsLinks = [
  { label: 'Tùy chỉnh Website',  href: '/admin/settings/website',  icon: Globe },
  { label: 'Quản lý Thông báo',  href: '/admin/notifications',      icon: Megaphone },
  { label: 'Cấu hình Email',     href: '/admin/settings/email',     icon: Mail },
  { label: 'Nhật ký hoạt động',  href: '/admin/audit-logs',         icon: History },
];

export default function Navigation({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    projects: false,
    usersAndCustomers: false,
    productsAndSuppliers: false,
    settings: false,
  });

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Dynamic branding & public website settings
  const [siteName, setSiteName] = useState('Nhanh Media');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/public/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setSiteName(data.settings.siteName || 'Nhanh Media');
            let logo = data.settings.logoUrl || null;
            if (logo && logo.includes('theselfishmeme.co.uk')) {
              logo = null;
            }
            setLogoUrl(logo);
          }
        }
      } catch (err) {
        console.error('Fetch public settings in Navigation error:', err);
      }
    };
    fetchSettings();
  }, []);

  const fetchUserNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchUserNotifications();
    const interval = setInterval(fetchUserNotifications, 60000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const isProjectsActive = pathname.startsWith('/admin/projects');
    const isUsersCustomersActive = pathname.startsWith('/admin/users') || pathname.startsWith('/admin/customers');
    const isProductsSuppliersActive = pathname.startsWith('/admin/products') || pathname.startsWith('/admin/suppliers');
    const isSettingsActive = 
      pathname.startsWith('/admin/settings') || 
      pathname.startsWith('/admin/notifications') || 
      pathname.startsWith('/admin/audit-logs');

    setOpenGroups((prev) => ({
      projects: isProjectsActive ? true : prev.projects,
      usersAndCustomers: isUsersCustomersActive ? true : prev.usersAndCustomers,
      productsAndSuppliers: isProductsSuppliersActive ? true : prev.productsAndSuppliers,
      settings: isSettingsActive ? true : prev.settings,
    }));
  }, [pathname]);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const timeAgo = (dateStr: string) => {
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 65) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay} ngày trước`;
    return d.toLocaleDateString('vi-VN');
  };

  if (!user) return <>{children}</>;

  const isAdmin = user.role === 'admin';

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':        return <Badge variant="primary">Admin</Badge>;
      case 'member':       return <Badge variant="info">Thành viên</Badge>;
      case 'collaborator': return <Badge variant="success">Cộng tác viên</Badge>;
      case 'agency':       return <Badge variant="warning">Đại lý</Badge>;
      default:             return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const links = menuItems;

  const NavContent = () => (
    <div className="flex flex-col h-full" style={{ background: '#fff' }}>
      {/* ── Brand ── */}
      <div className="px-5 py-5 shrink-0" style={{ borderBottom: '1px solid rgba(108,117,147,0.08)' }}>
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={siteName} 
              className="max-h-9 max-w-[180px] object-contain select-none" 
              onError={() => setLogoUrl(null)}
            />
          ) : (
            <>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-base shrink-0"
                style={{
                  background: 'linear-gradient(135deg,#c060c8 0%,#a145ab 100%)',
                  boxShadow: '0 4px 12px rgba(161,69,171,0.35)',
                }}
              >
                {siteName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-black text-sm tracking-widest uppercase truncate max-w-[130px]" style={{ color: '#1e293b' }}>
                  {siteName}
                </div>
                <div className="text-[9.5px] font-bold uppercase tracking-widest mt-0.5" style={{ color: '#a145ab' }}>
                  Digital Platform
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Nav label ── */}
      <div className="px-5 pt-5 pb-2 shrink-0">
        <span className="text-[9.5px] font-extrabold uppercase tracking-widest" style={{ color: '#a1acb8' }}>
          Menu chính
        </span>
      </div>

      <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto">
        {links.map((item) => {
          if (item.type === 'link') {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 relative"
                style={
                  isActive
                    ? {
                        background: 'linear-gradient(90deg,#f3d0f7 0%,#ede1f7 100%)',
                        color: '#a145ab',
                      }
                    : {
                        color: '#697a8d',
                        background: 'transparent',
                      }
                }
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                    style={{ background: '#a145ab' }}
                  />
                )}

                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200"
                  style={
                    isActive
                      ? { background: '#a145ab', color: '#fff', boxShadow: '0 3px 8px rgba(161,69,171,0.35)' }
                      : { background: 'rgba(108,117,147,0.06)', color: '#a1acb8' }
                  }
                >
                  <Icon className="w-4 h-4" />
                </span>

                <span className="flex-1 leading-none">{item.label}</span>

                {isActive && (
                  <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
                )}
              </Link>
            );
          } else {
            // Group Item
            const isOpen = openGroups[item.key] || false;
            const Icon = item.icon;
            
            // Check if any sublink is active to highlight the group icon/label slightly
            const isGroupActive = item.subLinks.some(
              sub => pathname === sub.href || pathname.startsWith(sub.href + '/')
            );

            return (
              <div key={item.key} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(item.key)}
                  className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 relative w-full text-left cursor-pointer focus:outline-none"
                  style={{
                    color: isGroupActive ? '#a145ab' : '#697a8d',
                    background: 'transparent',
                  }}
                >
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200"
                    style={{
                      background: isGroupActive ? 'rgba(161,69,171,0.08)' : 'rgba(108,117,147,0.06)',
                      color: isGroupActive ? '#a145ab' : '#a1acb8',
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="flex-1 leading-none">{item.label}</span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 opacity-60 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="pl-6 space-y-0.5 mt-0.5 transition-all duration-300">
                    {item.subLinks.map((subLink) => {
                      const isSubActive = pathname === subLink.href || pathname.startsWith(subLink.href + '/');
                      const SubIcon = subLink.icon;

                      return (
                        <Link
                          key={subLink.href}
                          href={subLink.href}
                          onClick={() => setIsMobileOpen(false)}
                          className="group flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 relative"
                          style={
                            isSubActive
                              ? {
                                  background: '#fcf6fd',
                                  color: '#a145ab',
                                }
                              : {
                                  color: '#697a8d',
                                  background: 'transparent',
                                }
                          }
                        >
                          {isSubActive && (
                            <span
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full"
                              style={{ background: '#a145ab' }}
                            />
                          )}
                          <span
                            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all duration-200"
                            style={
                              isSubActive
                                ? { background: 'rgba(161,69,171,0.08)', color: '#a145ab' }
                                : { background: 'rgba(108,117,147,0.04)', color: '#a1acb8' }
                            }
                          >
                            <SubIcon className="w-3.5 h-3.5" />
                          </span>
                          <span className="flex-1 leading-none">{subLink.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
        })}

        {isAdmin && (
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => toggleGroup('settings')}
              className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 relative w-full text-left cursor-pointer focus:outline-none"
              style={{
                color: openGroups.settings ? '#a145ab' : '#697a8d',
                background: 'transparent',
              }}
            >
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200"
                style={{
                  background: openGroups.settings ? 'rgba(161,69,171,0.08)' : 'rgba(108,117,147,0.06)',
                  color: openGroups.settings ? '#a145ab' : '#a1acb8',
                }}
              >
                <Settings className="w-4 h-4" />
              </span>
              <span className="flex-1 leading-none">Cài đặt website</span>
              <ChevronRight
                className={`w-3.5 h-3.5 opacity-60 shrink-0 transition-transform duration-200 ${
                  openGroups.settings ? 'rotate-90' : ''
                }`}
              />
            </button>

            {openGroups.settings && (
              <div className="pl-6 space-y-0.5 mt-0.5 transition-all duration-300">
                {adminSettingsLinks.map((link) => {
                  const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                  const Icon = link.icon;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileOpen(false)}
                      className="group flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 relative"
                      style={
                        isActive
                          ? {
                              background: '#fcf6fd',
                              color: '#a145ab',
                            }
                          : {
                              color: '#697a8d',
                              background: 'transparent',
                            }
                      }
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full"
                          style={{ background: '#a145ab' }}
                        />
                      )}
                      <span
                        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all duration-200"
                        style={
                          isActive
                            ? { background: 'rgba(161,69,171,0.08)', color: '#a145ab' }
                            : { background: 'rgba(108,117,147,0.04)', color: '#a1acb8' }
                        }
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="flex-1 leading-none">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* ── User Footer ── */}
      <div
        className="p-4 shrink-0"
        style={{ borderTop: '1px solid rgba(108,117,147,0.08)', background: 'rgba(108,117,147,0.025)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          {/* Avatar */}
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt="Avatar"
              className="w-9 h-9 rounded-full object-cover shrink-0 select-none border border-slate-200"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 select-none"
              style={{
                background: 'linear-gradient(135deg,#c060c8 0%,#a145ab 100%)',
                boxShadow: '0 2px 8px rgba(161,69,171,0.30)',
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold truncate" style={{ color: '#1e293b' }}>{user.name}</div>
            <div className="text-[10px] truncate mt-0.5" style={{ color: '#a1acb8' }}>{user.email}</div>
          </div>
          {getRoleBadge(user.role)}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/profile"
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:opacity-80"
            style={{
              background: 'rgba(108,117,147,0.07)',
              color: '#697a8d',
              border: '1px solid rgba(108,117,147,0.10)',
            }}
          >
            <User className="w-3.5 h-3.5" />
            Cá nhân
          </Link>
          <button
            onClick={() => { setIsMobileOpen(false); logout(); }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:opacity-80 cursor-pointer"
            style={{
              background: 'rgba(239,68,68,0.06)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.12)',
            }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Đăng xuất
          </button>
        </div>
        <div className="mt-2.5">
          <Link
            href="/contact"
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:opacity-80 bg-primary/5 hover:bg-primary/10 border border-primary/10 text-primary"
          >
            <Mail className="w-3.5 h-3.5" />
            Liên hệ hỗ trợ
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: '#f4f5fb' }}>
      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden md:flex flex-col w-64 h-screen sticky top-0 shrink-0 z-40"
        style={{ boxShadow: '2px 0 12px rgba(108,117,147,0.07)', borderRight: '1px solid rgba(108,117,147,0.08)' }}
      >
        <NavContent />
      </aside>

      {/* ── Mobile Top Bar ── */}
      <header
        className="md:hidden flex items-center justify-between px-4 py-3.5 sticky top-0 z-40"
        style={{
          background: 'rgba(255,255,255,0.90)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(108,117,147,0.10)',
        }}
      >
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={siteName} 
              className="max-h-7 max-w-[130px] object-contain select-none" 
              onError={() => setLogoUrl(null)}
            />
          ) : (
            <>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-sm"
                style={{ background: 'linear-gradient(135deg,#c060c8 0%,#a145ab 100%)' }}
              >
                {siteName.charAt(0).toUpperCase()}
              </div>
              <span className="font-black text-sm tracking-widest uppercase truncate max-w-[120px]" style={{ color: '#1e293b' }}>
                {siteName}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Bell Icon & Dropdown Container for Mobile */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) {
                  fetchUserNotifications();
                }
              }}
              className="relative p-1.5 rounded-lg transition-colors cursor-pointer"
              style={{ background: 'rgba(108,117,147,0.08)' }}
            >
              <Bell className="w-4.5 h-4.5" style={{ color: '#697a8d' }} />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full flex items-center justify-center text-[8px] font-extrabold text-white animate-pulse"
                  style={{ background: '#ef4444', border: '1.5px solid #fff' }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-45" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-[-45px] mt-2 w-72 max-h-[380px] bg-card border border-border rounded-xl shadow-xl z-50 flex flex-col overflow-hidden animate-fade-in">
                  {/* Header */}
                  <div className="px-3.5 py-2.5 border-b border-border/80 flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs text-foreground">Thông báo</span>
                      {unreadCount > 0 && (
                        <Badge variant="danger" className="text-[8px] px-1 py-0 scale-90">
                          {unreadCount} mới
                        </Badge>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[9px] font-bold text-primary hover:underline cursor-pointer"
                      >
                        Đọc tất cả
                      </button>
                    )}
                  </div>

                  {/* Scrollable list */}
                  <div className="flex-1 overflow-y-auto divide-y divide-border/60 max-h-[250px]">
                    {notifications.length === 0 ? (
                      <div className="px-3 py-6 text-center text-[11px] text-muted-foreground flex flex-col items-center gap-1.5">
                        <Bell className="w-6 h-6 text-slate-350 opacity-40" />
                        <span>Không có thông báo nào</span>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.isRead) markAsRead(n.id);
                          }}
                          className={`p-3 flex items-start gap-2.5 transition-colors cursor-pointer text-left ${
                            !n.isRead ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'
                          }`}
                        >
                          <div className="mt-1 shrink-0">
                            <div className={`w-1.5 h-1.5 rounded-full ${!n.isRead ? 'bg-primary' : 'bg-transparent'}`} />
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className={`text-[11px] font-bold text-foreground leading-tight ${!n.isRead ? 'font-black' : ''}`}>
                              {n.title}
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-relaxed break-words line-clamp-3">
                              {n.content}
                            </p>
                            <div className="flex items-center justify-between text-[8px] text-slate-400 pt-0.5">
                              <span>{n.createdByUser?.name || 'Hệ thống'}</span>
                              <span>{timeAgo(n.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  {isAdmin && (
                    <div className="px-3 py-2 border-t border-border bg-muted/10 text-center">
                      <Link
                        href="/admin/notifications"
                        onClick={() => setShowNotifications(false)}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        Quản lý thông báo →
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {getRoleBadge(user.role)}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ background: 'rgba(108,117,147,0.08)' }}
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* ── Mobile Overlay ── */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
          <aside className="relative w-64 max-w-[80vw] h-full shadow-2xl flex flex-col animate-slide-left">
            <NavContent />
          </aside>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Desktop Topbar ── */}
        <header
          className="hidden md:flex items-center justify-between px-6 h-16 sticky top-0 z-30 shrink-0"
          style={{
            background: 'rgba(244,245,251,0.92)',
            backdropFilter: 'blur(14px)',
            borderBottom: '1px solid rgba(108,117,147,0.09)',
          }}
        >
          {/* Spacer */}
          <div />

          {/* Right */}
          <div className="flex items-center gap-3">
            {/* Bell Icon & Dropdown Container */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) {
                    fetchUserNotifications();
                  }
                }}
                className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer hover:scale-105"
                style={{ background: '#fff', border: '1px solid rgba(108,117,147,0.12)' }}
              >
                <Bell className="w-4.5 h-4.5" style={{ color: '#697a8d' }} />
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white animate-pulse"
                    style={{ background: '#ef4444', border: '2px solid #fff' }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  {/* Backdrop to close */}
                  <div className="fixed inset-0 z-45" onClick={() => setShowNotifications(false)} />
                  
                  {/* Dropdown Card */}
                  <div className="absolute right-0 mt-2 w-80 max-h-[420px] bg-card border border-border rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden animate-fade-in">
                    {/* Header */}
                    <div className="px-4 py-3.5 border-b border-border/80 flex items-center justify-between bg-muted/20">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-foreground">Thông báo</span>
                        {unreadCount > 0 && (
                          <Badge variant="danger" className="text-[9px] px-1.5 py-0">
                            {unreadCount} mới
                          </Badge>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                        >
                          Đọc tất cả
                        </button>
                      )}
                    </div>

                    {/* Scrollable list */}
                    <div className="flex-1 overflow-y-auto divide-y divide-border/60 max-h-[300px]">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                          <Bell className="w-8 h-8 text-slate-350 opacity-40" />
                          <span>Không có thông báo nào</span>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              if (!n.isRead) markAsRead(n.id);
                            }}
                            className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer text-left ${
                              !n.isRead ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'
                            }`}
                          >
                            {/* Dot indicator */}
                            <div className="mt-1.5 shrink-0">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  !n.isRead ? 'bg-primary' : 'bg-transparent'
                                }`}
                              />
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className={`text-xs font-bold text-foreground leading-tight ${!n.isRead ? 'font-black' : ''}`}>
                                {n.title}
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-relaxed break-words line-clamp-3">
                                {n.content}
                              </p>
                              <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                                <span>{n.createdByUser?.name || 'Hệ thống'}</span>
                                <span>{timeAgo(n.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    {isAdmin && (
                      <div className="px-4 py-2.5 border-t border-border bg-muted/10 text-center">
                        <Link
                          href="/admin/notifications"
                          onClick={() => setShowNotifications(false)}
                          className="text-[11px] font-bold text-primary hover:underline"
                        >
                          Quản lý thông báo →
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-6" style={{ background: 'rgba(108,117,147,0.15)' }} />

            {/* User dropdown chip */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer text-left focus:outline-none"
                style={{ background: '#fff', border: '1px solid rgba(108,117,147,0.12)' }}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt="Avatar"
                    className="w-7 h-7 rounded-full object-cover shrink-0 select-none border border-slate-200"
                  />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs select-none"
                    style={{ background: 'linear-gradient(135deg,#c060c8 0%,#a145ab 100%)' }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-xs font-bold leading-none" style={{ color: '#1e293b' }}>{user.name}</span>
                  <span className="text-[10px] leading-none mt-0.5 font-semibold" style={{ color: '#a145ab' }}>
                    {user.role.toUpperCase()}
                  </span>
                </div>
              </button>

              {showUserDropdown && (
                <>
                  {/* Backdrop to close */}
                  <div className="fixed inset-0 z-45" onClick={() => setShowUserDropdown(false)} />
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-fade-in">
                    <Link
                      href="/profile"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Thông tin tài khoản</span>
                    </Link>
                    <Link
                      href="/contact"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>Liên hệ hỗ trợ</span>
                    </Link>
                    <div className="h-px bg-border/60" />
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50/50 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 px-8 py-8 overflow-y-auto w-full max-w-[1400px] mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
