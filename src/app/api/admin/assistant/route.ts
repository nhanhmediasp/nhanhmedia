import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// 1. Tool execution logic (Manipulating Database)
async function executeTool(name: string, args: any) {
  console.log(`[AI Assistant Agent] Executing tool "${name}" with args:`, args);
  try {
    if (name === 'createProject') {
      const { name: pName, description, startDate, endDate } = args;
      if (!pName || !startDate) {
        return { success: false, message: 'Thiếu tên dự án hoặc ngày bắt đầu.' };
      }

      const project = await prisma.$transaction(async (tx) => {
        const p = await tx.project.create({
          data: {
            name: pName.trim(),
            description: description ? description.trim() : null,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
            status: 'running',
            progress: 0,
            budget: 0,
          },
        });

        // Create default Kanban columns for projects
        await tx.taskColumn.createMany({
          data: [
            { projectId: p.id, name: 'Cần làm', position: 0 },
            { projectId: p.id, name: 'Đang làm', position: 1 },
            { projectId: p.id, name: 'Hoàn thành', position: 2 },
          ],
        });
        return p;
      });

      return {
        success: true,
        message: `Đã tạo thành công dự án "${project.name}" với ngày bắt đầu ${new Date(
          startDate
        ).toLocaleDateString('vi-VN')} và 3 cột Kanban mặc định (Cần làm, Đang làm, Hoàn thành).`,
      };
    }

    if (name === 'updateProjectProgress') {
      const { projectName, progress } = args;
      if (!projectName || progress === undefined) {
        return { success: false, message: 'Thiếu tên dự án hoặc phần trăm tiến độ.' };
      }

      const project = await prisma.project.findFirst({
        where: { name: { contains: projectName, mode: 'insensitive' } },
      });

      if (!project) {
        return { success: false, message: `Không tìm thấy dự án nào có tên chứa "${projectName}".` };
      }

      const updated = await prisma.project.update({
        where: { id: project.id },
        data: { progress: Number(progress) },
      });

      return {
        success: true,
        message: `Đã cập nhật thành công tiến độ của dự án "${updated.name}" thành ${progress}%.`,
      };
    }

    if (name === 'updateProjectStatus') {
      const { projectName, status } = args;
      if (!projectName || !status) {
        return { success: false, message: 'Thiếu tên dự án hoặc trạng thái mới.' };
      }

      const allowedStatuses = ['running', 'completed', 'paused'];
      if (!allowedStatuses.includes(status)) {
        return { success: false, message: `Trạng thái "${status}" không hợp lệ. Phải là: running, completed, paused.` };
      }

      const project = await prisma.project.findFirst({
        where: { name: { contains: projectName, mode: 'insensitive' } },
      });

      if (!project) {
        return { success: false, message: `Không tìm thấy dự án nào có tên chứa "${projectName}".` };
      }

      const updated = await prisma.project.update({
        where: { id: project.id },
        data: { status },
      });

      const statusLabel = status === 'running' ? 'Đang chạy' : status === 'completed' ? 'Hoàn thành' : 'Tạm dừng';
      return {
        success: true,
        message: `Đã chuyển đổi trạng thái của dự án "${updated.name}" thành "${statusLabel}" thành công.`,
      };
    }

    if (name === 'updateOrderStatus') {
      const { orderCode, status } = args;
      if (!orderCode || !status) {
        return { success: false, message: 'Thiếu mã đơn hàng hoặc trạng thái mới.' };
      }

      const allowedStatuses = ['running', 'expired', 'expired_soon', 'cancelled'];
      if (!allowedStatuses.includes(status)) {
        return { success: false, message: `Trạng thái "${status}" không hợp lệ cho đơn hàng.` };
      }

      const order = await prisma.order.findFirst({
        where: { orderCode: { contains: orderCode, mode: 'insensitive' } },
      });

      if (!order) {
        return { success: false, message: `Không tìm thấy đơn hàng nào có mã chứa "${orderCode}".` };
      }

      const updated = await prisma.order.update({
        where: { id: order.id },
        data: { status },
      });

      const statusLabel =
        status === 'running'
          ? 'Đang chạy'
          : status === 'expired'
          ? 'Đã hết hạn'
          : status === 'expired_soon'
          ? 'Sắp hết hạn'
          : 'Đã hủy';
      return {
        success: true,
        message: `Đã cập nhật trạng thái đơn hàng "${updated.orderCode}" thành "${statusLabel}" thành công.`,
      };
    }

    if (name === 'getRevenueReport') {
      const days = Number(args.days || 7);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      // Query orders in the last N days
      const orders = await prisma.order.findMany({
        where: {
          createdAt: { gte: startDate },
          status: { not: 'cancelled' }
        },
        select: {
          price: true,
          customPrice: true,
          createdAt: true,
          product: { select: { name: true } }
        }
      });

      // Query renewals in the last N days
      const renewals = await prisma.orderRenewal.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        select: {
          price: true,
          createdAt: true
        }
      });

      // Calculate daily breakdown
      const dailyData: Record<string, { date: string; ordersRevenue: number; renewalsRevenue: number; total: number; count: number }> = {};
      
      // Initialize days
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        dailyData[dateStr] = { date: dateStr, ordersRevenue: 0, renewalsRevenue: 0, total: 0, count: 0 };
      }

      // Populate orders
      orders.forEach(o => {
        const dateStr = new Date(o.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        if (dailyData[dateStr]) {
          const rev = o.customPrice !== null ? o.customPrice : o.price;
          dailyData[dateStr].ordersRevenue += rev;
          dailyData[dateStr].total += rev;
          dailyData[dateStr].count += 1;
        }
      });

      // Populate renewals
      renewals.forEach(r => {
        const dateStr = new Date(r.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        if (dailyData[dateStr]) {
          dailyData[dateStr].renewalsRevenue += r.price;
          dailyData[dateStr].total += r.price;
          dailyData[dateStr].count += 1;
        }
      });

      // Top selling products in this range
      const productCounts: Record<string, { name: string; revenue: number; count: number }> = {};
      orders.forEach(o => {
        const name = o.product.name;
        const rev = o.customPrice !== null ? o.customPrice : o.price;
        if (!productCounts[name]) {
          productCounts[name] = { name, revenue: 0, count: 0 };
        }
        productCounts[name].revenue += rev;
        productCounts[name].count += 1;
      });

      const topProducts = Object.values(productCounts)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const totalRevenue = Object.values(dailyData).reduce((sum, item) => sum + item.total, 0);
      const totalOrdersRevenue = Object.values(dailyData).reduce((sum, item) => sum + item.ordersRevenue, 0);
      const totalRenewalsRevenue = Object.values(dailyData).reduce((sum, item) => sum + item.renewalsRevenue, 0);

      // Return formatted breakdown list ordered by date ascending
      const breakdown = Object.values(dailyData).reverse();

      return {
        success: true,
        days,
        totalRevenue,
        totalOrdersRevenue,
        totalRenewalsRevenue,
        breakdown,
        topProducts,
        message: `Đã truy xuất báo cáo doanh thu ${days} ngày gần đây thành công.`
      };
    }
  } catch (err: any) {
    console.error(`Error executing tool ${name}:`, err);
    return { success: false, message: `Lỗi hệ thống khi thực hiện thao tác: ${err.message || String(err)}` };
  }
  return { success: false, message: `Công cụ "${name}" chưa được định nghĩa.` };
}

// 2. Tool Definitions for Gemini (standard OpenAI tool schema)
const geminiTools = [
  {
    type: 'function',
    function: {
      name: 'createProject',
      description: 'Tạo một dự án mới trên hệ thống với 3 cột Kanban mặc định (Cần làm, Đang làm, Hoàn thành).',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Tên dự án mới cần tạo' },
          description: { type: 'string', description: 'Mô tả chi tiết hoặc ghi chú về dự án (tùy chọn)' },
          startDate: { type: 'string', description: 'Ngày bắt đầu định dạng YYYY-MM-DD (bắt buộc)' },
          endDate: { type: 'string', description: 'Ngày kết thúc dự kiến định dạng YYYY-MM-DD (tùy chọn)' },
        },
        required: ['name', 'startDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateProjectProgress',
      description: 'Cập nhật tiến độ hoàn thành của một dự án bằng cách tìm theo tên dự án.',
      parameters: {
        type: 'object',
        properties: {
          projectName: { type: 'string', description: 'Tên hoặc một phần tên dự án cần cập nhật' },
          progress: { type: 'number', description: 'Phần trăm tiến độ mới cần thiết lập (từ 0 đến 100)' },
        },
        required: ['projectName', 'progress'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateProjectStatus',
      description: 'Cập nhật trạng thái của dự án (running, completed, paused).',
      parameters: {
        type: 'object',
        properties: {
          projectName: { type: 'string', description: 'Tên hoặc một phần tên dự án cần cập nhật' },
          status: {
            type: 'string',
            description: 'Trạng thái mới: running (Đang chạy), completed (Hoàn thành), paused (Tạm dừng)',
          },
        },
        required: ['projectName', 'status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateOrderStatus',
      description: 'Cập nhật trạng thái của một đơn hàng dịch vụ.',
      parameters: {
        type: 'object',
        properties: {
          orderCode: { type: 'string', description: 'Mã đơn hàng (ví dụ: ORD12345)' },
          status: {
            type: 'string',
            description: 'Trạng thái mới: running (Đang chạy), expired (Đã hết hạn), expired_soon (Sắp hết hạn), cancelled (Đã hủy)',
          },
        },
        required: ['orderCode', 'status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getRevenueReport',
      description: 'Lấy báo cáo doanh thu chi tiết (bao gồm doanh thu đơn hàng mới và gia hạn) và phân tích theo số ngày gần đây (ví dụ: 7 ngày hoặc 30 ngày gần đây).',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'Số ngày gần đây cần lấy báo cáo doanh thu (mặc định là 7)' }
        },
        required: []
      }
    }
  }
];

// Helper to call Official Native Gemini REST API (:generateContent?key=) with fallback to OpenAI endpoint
async function callGeminiWithRetry(geminiKey: string, payload: any) {
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
  let lastError: any = null;

  // 1. Primary: Official Native Gemini REST API
  for (const model of models) {
    try {
      const nativeUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`;
      
      const nativePayload: any = {
        generationConfig: { temperature: payload.temperature || 0.2 },
      };

      if (payload.messages) {
        const sysMsg = payload.messages.find((m: any) => m.role === 'system');
        if (sysMsg) {
          nativePayload.systemInstruction = { parts: [{ text: sysMsg.content }] };
        }

        const chatMsgs = payload.messages.filter((m: any) => m.role !== 'system');
        nativePayload.contents = chatMsgs.map((m: any) => {
          if (m.role === 'tool') {
            let parsedRes = {};
            try { parsedRes = JSON.parse(m.content); } catch { parsedRes = { result: m.content }; }
            return {
              role: 'function',
              parts: [{ functionResponse: { name: m.name || 'tool', response: parsedRes } }],
            };
          }
          if (m.tool_calls && m.tool_calls.length > 0) {
            const tc = m.tool_calls[0];
            let parsedArgs = {};
            try { parsedArgs = JSON.parse(tc.function.arguments); } catch { parsedArgs = {}; }
            return {
              role: 'model',
              parts: [{ functionCall: { name: tc.function.name, args: parsedArgs } }],
            };
          }
          return {
            role: m.role === 'assistant' ? 'model' : m.role,
            parts: [{ text: m.content || '' }],
          };
        });
      }

      if (payload.tools) {
        nativePayload.tools = [
          {
            functionDeclarations: payload.tools.map((t: any) => ({
              name: t.function.name,
              description: t.function.description,
              parameters: t.function.parameters,
            })),
          },
        ];
      }

      const res = await fetch(nativeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nativePayload),
      });

      if (res.ok) {
        const nativeData = await res.json();
        const candidate = nativeData.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const funcCallPart = parts.find((p: any) => p.functionCall);

        if (funcCallPart && funcCallPart.functionCall) {
          const fc = funcCallPart.functionCall;
          return {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: null,
                  tool_calls: [
                    {
                      id: `call_${Date.now()}`,
                      type: 'function',
                      function: {
                        name: fc.name,
                        arguments: JSON.stringify(fc.args || {}),
                      },
                    },
                  ],
                },
              },
            ],
          };
        }

        const textPart = parts.find((p: any) => p.text);
        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: textPart?.text || '',
              },
            },
          ],
        };
      }

      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${res.status}`;
      console.warn(`[Gemini Native REST API] Model ${model} returned ${res.status}: ${errMsg}. Trying fallback...`);
      lastError = new Error(errMsg);

      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  // 2. Secondary Fallback: OpenAI Compatibility Endpoint
  for (const model of models) {
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${geminiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...payload, model }),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Tất cả các endpoint và mô hình Gemini AI đều không thể kết nối.');
}

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    // 1. Fetch current projects context
    const projects = await prisma.project.findMany({
      where: {
        status: { in: ['running', 'paused'] },
      },
      include: {
        category: { select: { name: true } },
        customer: { select: { name: true, email: true, phone: true } },
        websiteCosts: { select: { name: true, amount: true } },
        toolCosts: { select: { name: true, cost: true } },
      },
    });

    // 2. Fetch active orders context
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ['running', 'expired_soon', 'new'] },
      },
      include: {
        customer: { select: { name: true, email: true } },
        product: { select: { name: true } },
      },
    });

    // 3. Simplify contexts for LLM
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const projectsContext = projects.map((p) => {
      const isOverdue = p.endDate && new Date(p.endDate) < today && p.status === 'running';
      return {
        id: p.id,
        name: p.name,
        status: p.status === 'running' ? (isOverdue ? 'Quá hạn' : 'Đang làm') : 'Tạm dừng',
        progress: `${p.progress}%`,
        budget: p.budget,
        startDate: p.startDate ? new Date(p.startDate).toLocaleDateString('vi-VN') : 'Không rõ',
        endDate: p.endDate ? new Date(p.endDate).toLocaleDateString('vi-VN') : 'Chưa xác định',
        category: p.category?.name || 'Không phân loại',
        customer: p.customer?.name || 'Không rõ',
        websiteCostsTotal: p.websiteCosts.reduce((sum, c) => sum + c.amount, 0),
        toolCostsTotal: p.toolCosts.reduce((sum, c) => sum + c.cost, 0),
        description: p.description || '',
      };
    });

    const ordersContext = orders.map((o) => ({
      orderCode: o.orderCode,
      product: o.product.name,
      customer: o.customer.name,
      price: o.price,
      startDate: o.startDate ? new Date(o.startDate).toLocaleDateString('vi-VN') : 'Không rõ',
      endDate: o.endDate ? new Date(o.endDate).toLocaleDateString('vi-VN') : 'Chưa xác định',
      status: o.status === 'running' ? 'Đang chạy' : o.status === 'expired_soon' ? 'Sắp hết hạn' : 'Đơn mới',
    }));

    // 4. Check for API key (Gemini)
    const settings = await prisma.websiteSettings.findUnique({ where: { id: 'default' } });
    const geminiKey = process.env.GEMINI_API_KEY || settings?.geminiApiKey;

    const { prompt, history } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Nội dung tin nhắn không được để trống.' }, { status: 400 });
    }

    const systemInstruction = `Bạn là Trợ lý của Nhanh Media 🤖. Nhiệm vụ của bạn là hỗ trợ ban quản trị phân tích dữ liệu và THỰC THI THAO TÁC tạo/cập nhật dữ liệu trực tiếp trên hệ thống thông qua các công cụ (tools) được cung cấp.
Dưới đây là dữ liệu thực tế trong hệ thống của chúng tôi hiện tại (dạng JSON):
--- DỰ ÁN ĐANG CHẠY HOẶC TẠM DỪNG ---
${JSON.stringify(projectsContext, null, 2)}

--- ĐƠN HÀNG ĐANG HOẠT ĐỘNG ---
${JSON.stringify(ordersContext, null, 2)}
---
LƯU Ý QUAN TRỌNG:
1. Khi người dùng yêu cầu thao tác (ví dụ: "Tạo dự án mới...", "Cập nhật tiến độ dự án...", "Đổi trạng thái đơn hàng..."), bạn BẮT BUỘC phải gọi công cụ (tool) tương ứng. Đừng chỉ trả lời bằng lời nói suông.
2. Trả lời câu hỏi một cách chính xác, ngắn gọn, súc tích và bằng tiếng Việt lịch sự, chuyên nghiệp. Sử dụng định dạng Markdown đẹp mắt.`;

    if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
      try {
        const geminiMessages = [
          { role: 'system', content: systemInstruction },
          ...(history
            ? history.map((msg: any) => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content,
              }))
            : []),
          { role: 'user', content: prompt },
        ];

        const data = await callGeminiWithRetry(geminiKey, {
          messages: geminiMessages,
          tools: geminiTools,
          tool_choice: 'auto',
          temperature: 0.2,
        });

        const message = data.choices[0].message;

        // Check if LLM requested a tool call
        if (message.tool_calls && message.tool_calls.length > 0) {
          const toolCall = message.tool_calls[0];
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          // Execute backend DB update
          const toolResult = await executeTool(functionName, functionArgs);

          // Feed result back to model for final summary
          const secondData = await callGeminiWithRetry(geminiKey, {
            messages: [
              ...geminiMessages,
              message,
              {
                role: 'tool',
                tool_call_id: toolCall.id,
                name: functionName,
                content: JSON.stringify(toolResult),
              },
            ],
            temperature: 0.2,
          });

          return NextResponse.json({ reply: secondData.choices[0].message.content });
        }

        return NextResponse.json({ reply: message.content });
      } catch (err: any) {
        console.error('Gemini Assistant Agent Error:', err);
        const isRateLimit = String(err.message).includes('429') || String(err.message).toLowerCase().includes('quota');
        const userReply = isRateLimit
          ? `⚠️ **API Key Gemini hiện đã vượt quá giới hạn lượt dùng (HTTP 429 - Rate Limit / Quota Exceeded).**\n\n` +
            `👉 **Cách khắc phục nhanh:**\n` +
            `1. Bạn vui lòng đợi khoảng 1 phút rồi gửi lại tin nhắn.\n` +
            `2. Hoặc tạo 1 API Key mới tại **[Google AI Studio](https://aistudio.google.com/)** và cập nhật vào mục **[Cài đặt Website](/admin/settings/website)** nhé!`
          : `Đã xảy ra lỗi khi thực thi lệnh qua máy chủ Gemini AI: ${err.message || String(err)}.`;

        return NextResponse.json({ reply: userReply });
      }
    } else {
      return NextResponse.json({
        reply: `Xin chào! Tôi là **Trợ lý của Nhanh Media** 🤖.

Hiện tại bạn chưa thiết lập khóa API Gemini để tôi hoạt động.

### Vui lòng cấu hình Gemini API (Hoàn toàn Miễn phí & Cực nhanh)
1. Truy cập **[Google AI Studio](https://aistudio.google.com/)** và đăng nhập bằng Google.
2. Bấm vào nút **Get API Key** -> **Create API Key**.
3. Copy khóa đó và dán vào file \`.env\`:
\`\`\`env
GEMINI_API_KEY="AIzaSy..."
\`\`\`

Sau khi điền khóa trên và lưu file \`.env\`, hãy tải lại trang này để bắt đầu sử dụng nhé!`,
      });
    }
  } catch (error: any) {
    console.error('API Assistant Agent Outer Error:', error);
    return NextResponse.json({
      reply: `Đã xảy ra lỗi hệ thống: ${error.message || String(error)}. Vui lòng thử lại sau!`,
    });
  }
}
