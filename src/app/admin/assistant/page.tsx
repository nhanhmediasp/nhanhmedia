'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  showToast,
  LoadingSkeleton,
} from '@/components/ui';
import {
  Sparkles,
  Send,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Xin chào! Tôi là **Trợ lý của Nhanh Media** 🤖.

Tôi đã đồng bộ toàn bộ dữ liệu dự án, đơn hàng và khách hàng hiện tại của bạn. Bạn có thể hỏi tôi bất kỳ thông tin nào, ví dụ:
* *Có dự án nào đang chạy bị quá hạn không?*
* *Tóm tắt doanh thu các đơn hàng đang hoạt động.*
* *Phân tích tiến độ trung bình của các dự án.*

Hãy nhập câu hỏi bên dưới hoặc chọn các mẫu gợi ý nhanh nhé!`,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    {
      label: 'Kiểm tra dự án trễ hạn',
      icon: AlertTriangle,
      prompt: 'Tìm kiếm và liệt kê các dự án đang chạy nhưng đã quá hạn hoàn thành. Cho biết tiến độ hiện tại của chúng.',
      color: 'from-amber-500/10 to-orange-500/10 text-orange-600 border-orange-200/50',
    },
    {
      label: 'Báo cáo doanh thu & đơn hàng',
      icon: TrendingUp,
      prompt: 'Tổng hợp doanh thu các đơn hàng đang hoạt động (Đang chạy/Sắp hết hạn) và đếm số lượng đơn hàng.',
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-200/50',
    },
    {
      label: 'Phân tích dự án sắp tới hạn',
      icon: Clock,
      prompt: 'Có dự án nào sắp tới hạn hoàn thành trong vòng 3 ngày tới không? Liệt kê chi tiết tên dự án và khách hàng.',
      color: 'from-blue-500/10 to-indigo-500/10 text-indigo-600 border-indigo-200/50',
    },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (promptText: string) => {
    if (!promptText.trim() || sending) return;

    const userMessage: Message = { role: 'user', content: promptText };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setSending(true);

    try {
      const res = await fetch('/api/admin/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          history: messages.slice(1), // Exclude the initial welcome message to avoid noise
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        showToast('Có lỗi xảy ra khi kết nối máy chủ AI.', 'error');
      }
    } catch (err) {
      console.error('Chat error:', err);
      showToast('Không thể kết nối máy chủ AI.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Xin chào! Tôi đã được làm mới bộ nhớ. Hãy đặt câu hỏi bất kỳ về dữ liệu hệ thống nhé!`,
      },
    ]);
  };

  // Simple Markdown formatter
  const formatMessage = (text: string) => {
    // Escape HTML to prevent XSS
    let formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks
    formatted = formatted.replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-slate-900 text-slate-100 p-4 rounded-xl my-3 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner select-text">$1</pre>'
    );

    // Inline code
    formatted = formatted.replace(
      /`([^`]+)`/g,
      '<code class="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-xs border border-slate-200">$1</code>'
    );

    // Bold text
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');

    // Bullet points (convert * items)
    formatted = formatted.replace(/^\s*\*\s+(.*)$/gm, '<li class="ml-4 list-disc pl-1 text-slate-700 py-0.5">$1</li>');

    // Paragraph breaks
    formatted = formatted.replace(/\n/g, '<br/>');

    return <div className="space-y-1 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6 h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{
              background: 'linear-gradient(135deg, #a145ab 0%, #7c2d82 100%)',
              boxShadow: '0 4px 12px rgba(161,69,171,0.25)',
            }}
          >
            <Sparkles className="w-5.5 h-5.5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              Trợ lý của Nhanh Media
              <span className="text-[10px] uppercase font-extrabold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md tracking-wider">
                Gemini AI
              </span>
            </h1>
            <p className="text-xs text-slate-500">Phân tích dự án, doanh thu và thao tác hệ thống tự động</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleClearChat}
          className="flex items-center gap-1.5 text-xs text-slate-500 border-slate-200 hover:bg-slate-50 cursor-pointer h-9 px-3"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Làm mới cuộc trò chuyện
        </Button>
      </div>

      {/* Main Chat Layout */}
      <div
        className="flex-1 min-h-0 rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: '#fff',
          border: '1px solid rgba(108,117,147,0.12)',
          boxShadow: '0 4px 20px rgba(108,117,147,0.06)',
        }}
      >
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
          {messages.map((msg, index) => {
            const isAI = msg.role === 'assistant';
            return (
              <div key={index} className={`flex gap-3 max-w-[85%] ${isAI ? 'self-start' : 'self-end flex-row-reverse ml-auto'}`}>
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-white ${
                    isAI ? 'bg-primary' : 'bg-slate-700'
                  }`}
                  style={isAI ? { background: 'linear-gradient(135deg, #a145ab 0%, #7c2d82 100%)' } : {}}
                >
                  {isAI ? <Sparkles className="w-4.5 h-4.5" /> : <MessageSquare className="w-4.5 h-4.5" />}
                </div>

                {/* Bubble */}
                <div
                  className={`rounded-2xl p-4 shadow-sm border ${
                    isAI
                      ? 'bg-white border-slate-100 text-slate-800 rounded-tl-none'
                      : 'bg-primary text-white border-transparent rounded-tr-none'
                  }`}
                  style={!isAI ? { background: 'linear-gradient(135deg, #a145ab 0%, #8b3c94 100%)' } : {}}
                >
                  {isAI ? (
                    formatMessage(msg.content)
                  ) : (
                    <div className="text-sm select-text whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  )}
                </div>
              </div>
            );
          })}

          {/* AI Thinking Animation */}
          {sending && (
            <div className="flex gap-3 max-w-[80%] self-start">
              <div
                className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-white"
                style={{ background: 'linear-gradient(135deg, #a145ab 0%, #7c2d82 100%)' }}
              >
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-1.5 min-w-[70px]">
                <span className="w-2.5 h-2.5 rounded-full bg-primary/45 animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce"></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Quick Prompts (Only show at the beginning or when chat is empty-ish) */}
        {messages.length <= 2 && !sending && (
          <div className="px-5 py-4 border-t border-slate-100 shrink-0 bg-white space-y-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Gợi ý câu hỏi nhanh
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {quickPrompts.map((qp, idx) => {
                const Icon = qp.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(qp.prompt)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer bg-gradient-to-br ${qp.color}`}
                  >
                    <Icon className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold block">{qp.label}</span>
                      <span className="text-[10px] opacity-80 line-clamp-2 mt-0.5">{qp.prompt}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Chat input form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputValue);
          }}
          className="p-4 border-t border-slate-100 bg-white flex gap-3 shrink-0"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={sending ? 'Trợ lý đang suy nghĩ...' : 'Hỏi về dự án quá hạn, doanh thu đơn hàng...'}
            disabled={sending}
            className="flex-1 px-4 py-3 text-sm rounded-xl transition-all duration-200 focus:outline-none bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={!inputValue.trim() || sending}
            className="rounded-xl aspect-square flex items-center justify-center shrink-0 w-[46px] h-[46px] p-0"
          >
            <Send className="w-4.5 h-4.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
