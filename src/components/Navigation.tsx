'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';
import {
  LayoutDashboard,
  Package,
  FileText,
  Users,
  BarChart3,
  CreditCard,
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
  Sparkles,
  RefreshCw,
  Clock,
  MessageSquare,
  Send,
  PlusCircle,
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
    label: 'Tạo đơn hàng mới',
    href: '/admin/orders/create',
    icon: PlusCircle,
  },
  {
    type: 'group' as const,
    key: 'reports',
    label: 'Báo cáo doanh thu',
    icon: BarChart3,
    subLinks: [
      { label: 'Báo cáo doanh thu', href: '/admin/reports', icon: BarChart3 },
      { label: 'Thanh toán Sepay', href: '/admin/reports/payments', icon: CreditCard },
      { label: 'Báo cáo Dự Án', href: '/admin/projects/dashboard', icon: FileText },
    ],
  },
  {
    type: 'group' as const,
    key: 'projects',
    label: 'Quản lý Dự Án',
    icon: FolderGit2,
    subLinks: [
      { label: 'Quản lý Dự Án', href: '/admin/projects', icon: FolderGit2 },
      { label: 'Quản lý Nhân sự', href: '/admin/users', icon: UserCheck },
      { label: 'Khách hàng dự án', href: '/admin/projects/customers', icon: Users },
      { label: 'Phân loại', href: '/admin/projects/categories', icon: Tag },
      { label: 'Kê khai giờ làm (To-do)', href: '/admin/work-logs', icon: Clock },
    ],
  },
  {
    type: 'group' as const,
    key: 'productsAndSuppliers',
    label: 'Sản phẩm',
    icon: Package,
    subLinks: [
      { label: 'Sản phẩm & Giá', href: '/admin/products', icon: Package },
      { label: 'Khách hàng', href: '/admin/customers', icon: Users },
      { label: 'Nguồn hàng', href: '/admin/suppliers', icon: Tag },
      { label: 'Đơn hàng dịch vụ', href: '/admin/orders', icon: FileText },
    ],
  },
];

const adminSettingsLinks = [
  { label: 'Tùy chỉnh Website',  href: '/admin/settings/website',  icon: Globe },
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
    productsAndSuppliers: false,
    reports: false,
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

  // Floating AI Chat Widget States
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [widgetMessages, setWidgetMessages] = useState<any[]>([
    {
      role: 'assistant',
      content: `Xin chào! Tôi là **Trợ lý của Nhanh Media** 🤖.

Tôi có thể giúp bạn kiểm tra dự án, doanh thu, đơn hàng dịch vụ hoặc thao tác trực tiếp các dữ liệu trên hệ thống. Bạn cần tôi hỗ trợ việc gì?`,
    },
  ]);
  const [widgetInput, setWidgetInput] = useState('');
  const [widgetSending, setWidgetSending] = useState(false);
  const widgetMessagesEndRef = useRef<HTMLDivElement>(null);

  const handleSendWidgetMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!widgetInput.trim() || widgetSending) return;

    const userMsg = { role: 'user', content: widgetInput };
    setWidgetMessages((prev) => [...prev, userMsg]);
    const promptToSend = widgetInput;
    setWidgetInput('');
    setWidgetSending(true);

    try {
      const res = await fetch('/api/admin/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          history: widgetMessages.slice(1).map(msg => ({
            role: msg.role,
            content: msg.content
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setWidgetMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setWidgetMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Có lỗi xảy ra khi kết nối máy chủ AI.' },
        ]);
      }
    } catch {
      setWidgetMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Không thể kết nối máy chủ AI.' },
      ]);
    } finally {
      setWidgetSending(false);
    }
  };

  const handleClearWidgetChat = () => {
    setWidgetMessages([
      {
        role: 'assistant',
        content: `Tôi đã được làm mới bộ nhớ. Hãy đặt câu hỏi bất kỳ về dữ liệu hệ thống nhé!`,
      },
    ]);
  };

  useEffect(() => {
    if (isWidgetOpen) {
      widgetMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [widgetMessages, isWidgetOpen]);

  const formatWidgetMessage = (text: string) => {
    let formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    formatted = formatted.replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-slate-900 text-slate-100 p-2 rounded-lg my-1.5 font-mono text-[9px] overflow-x-auto border border-slate-800 shadow-inner select-text whitespace-pre-wrap break-all">$1</pre>'
    );
    formatted = formatted.replace(
      /`([^`]+)`/g,
      '<code class="px-1 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-[9px] border border-slate-200">$1</code>'
    );
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
    formatted = formatted.replace(/^\s*\*\s+(.*)$/gm, '<li class="ml-2.5 list-disc pl-0.5 text-slate-700">$1</li>');
    formatted = formatted.replace(/\n/g, '<br/>');
    return <div className="space-y-0.5" dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

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
    const isProjectsActive = (pathname.startsWith('/admin/projects') && pathname !== '/admin/projects/dashboard') || pathname.startsWith('/admin/work-logs');
    const isUsersCustomersActive = pathname.startsWith('/admin/users') || pathname.startsWith('/admin/customers');
    const isProductsSuppliersActive = pathname.startsWith('/admin/products') || pathname.startsWith('/admin/suppliers');
    const isReportsActive = pathname.startsWith('/admin/reports') || pathname === '/admin/projects/dashboard';
    const isSettingsActive = 
      pathname.startsWith('/admin/settings') || 
      pathname.startsWith('/admin/notifications') || 
      pathname.startsWith('/admin/audit-logs');

    setOpenGroups((prev) => ({
      projects: isProjectsActive ? true : prev.projects,
      usersAndCustomers: isUsersCustomersActive ? true : prev.usersAndCustomers,
      productsAndSuppliers: isProductsSuppliersActive ? true : prev.productsAndSuppliers,
      reports: isReportsActive ? true : prev.reports,
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

        {/* Trợ lý AI */}
        {(() => {
          const isActive = pathname === '/admin/assistant';
          return (
            <Link
              href="/admin/assistant"
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
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="flex-1 leading-none">Trợ Lý AI</span>
            </Link>
          );
        })()}

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

        {/* ── Floating AI Chat Assistant Widget ── */}
        <div>
          <button
            onClick={() => setIsWidgetOpen(!isWidgetOpen)}
            className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[999] w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-white cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-transform"
            style={{
              background: 'linear-gradient(135deg, #a145ab 0%, #7c2d82 100%)',
              boxShadow: '0 4px 16px rgba(161,69,171,0.4)',
            }}
          >
            {isWidgetOpen ? <X className="w-5 h-5 md:w-6 md:h-6 animate-fade-in" /> : <MessageSquare className="w-5 h-5 md:w-6 md:h-6 animate-fade-in" />}
          </button>

          {isWidgetOpen && (
            <div
              className="fixed bottom-20 right-4 md:bottom-24 md:right-6 z-[999] w-[calc(100vw-32px)] md:w-[380px] h-[480px] md:h-[520px] rounded-2xl shadow-2xl border border-slate-200/80 bg-white flex flex-col overflow-hidden animate-slide-up"
              style={{
                boxShadow: '0 12px 40px rgba(108,117,147,0.18)',
              }}
            >
              {/* Header */}
              <div
                className="px-4 py-3 md:py-3.5 text-white flex justify-between items-center shrink-0 select-none"
                style={{ background: 'linear-gradient(135deg, #a145ab 0%, #7c2d82 100%)' }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                  </div>
                  <div>
                    <span className="font-bold text-xs block leading-none">Trợ lý Nhanh Media</span>
                    <span className="text-[9px] opacity-80 leading-none mt-1 block">Groq AI • Hoạt động</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleClearWidgetChat}
                    title="Làm mới cuộc trò chuyện"
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsWidgetOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 flex flex-col">
                {widgetMessages.map((msg, index) => {
                  const isAI = msg.role === 'assistant';
                  return (
                    <div
                      key={index}
                      className={`flex gap-2.5 max-w-[85%] ${
                        isAI ? 'self-start' : 'self-end flex-row-reverse ml-auto'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-white text-xs select-none ${
                          isAI ? 'bg-primary' : 'bg-slate-600'
                        }`}
                        style={isAI ? { background: 'linear-gradient(135deg, #a145ab 0%, #7c2d82 100%)' } : {}}
                      >
                        {isAI ? <Sparkles className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                      </div>
                      <div
                        className={`rounded-2xl p-3 shadow-sm border text-[11px] leading-relaxed break-words ${
                          isAI
                            ? 'bg-white border-slate-100 text-slate-800 rounded-tl-none'
                            : 'bg-primary text-white border-transparent rounded-tr-none'
                        }`}
                        style={!isAI ? { background: 'linear-gradient(135deg, #a145ab 0%, #8b3c94 100%)' } : {}}
                      >
                        {isAI ? formatWidgetMessage(msg.content) : msg.content}
                      </div>
                    </div>
                  );
                })}
                {widgetSending && (
                  <div className="flex gap-2.5 max-w-[80%] self-start">
                    <div
                      className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-white select-none"
                      style={{ background: 'linear-gradient(135deg, #a145ab 0%, #7c2d82 100%)' }}
                    >
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center gap-1.5 min-w-[55px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
                    </div>
                  </div>
                )}
                <div ref={widgetMessagesEndRef} />
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendWidgetMessage} className="p-3 border-t border-slate-100 bg-white flex gap-2 shrink-0">
                <input
                  type="text"
                  value={widgetInput}
                  onChange={(e) => setWidgetInput(e.target.value)}
                  placeholder="Nhập yêu cầu hoặc hỏi trợ lý..."
                  disabled={widgetSending}
                  className="flex-1 px-3 py-2 text-xs rounded-lg focus:outline-none bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!widgetInput.trim() || widgetSending}
                  className="px-3 py-2 text-white rounded-lg hover:opacity-90 transition-opacity font-bold text-xs cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #a145ab 0%, #7c2d82 100%)' }}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
