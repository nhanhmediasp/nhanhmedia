import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const startDate = startDateStr ? new Date(startDateStr) : null;
    const endDate = endDateStr ? new Date(endDateStr) : null;

    const prevStartDateStr = searchParams.get('prevStartDate');
    const prevEndDateStr = searchParams.get('prevEndDate');
    const prevStartDate = prevStartDateStr ? new Date(prevStartDateStr) : null;
    const prevEndDate = prevEndDateStr ? new Date(prevEndDateStr) : null;

    // Build date filters for relations
    // WebsiteCost has a 'date' field
    const websiteCostDateFilter: any = {};
    if (startDate) websiteCostDateFilter.gte = startDate;
    if (endDate) websiteCostDateFilter.lte = endDate;

    // ToolCost has a 'createdAt' field
    const toolCostDateFilter: any = {};
    if (startDate) toolCostDateFilter.gte = startDate;
    if (endDate) toolCostDateFilter.lte = endDate;

    // Project has a 'startDate' or 'createdAt' field
    const projectDateFilter: any = {};
    if (startDate) projectDateFilter.startDate = { gte: startDate };
    if (endDate) {
      if (!projectDateFilter.startDate) projectDateFilter.startDate = {};
      projectDateFilter.startDate.lte = endDate;
    }

    // 1. Fetch all projects
    const projects = await prisma.project.findMany({
      where: startDate || endDate ? projectDateFilter : {},
      include: {
        tasks: {
          include: {
            column: true,
          },
        },
        websiteCosts: {
          where: startDate || endDate ? { date: websiteCostDateFilter } : {},
        },
        toolCosts: {
          where: startDate || endDate ? { createdAt: toolCostDateFilter } : {},
        },
        customer: true,
      },
    });

    // 2. Count by status
    const statusCounts = {
      running: 0,
      completed: 0,
      paused: 0,
    };
    projects.forEach((p) => {
      if (p.status === 'running') statusCounts.running++;
      else if (p.status === 'completed') statusCounts.completed++;
      else if (p.status === 'paused') statusCounts.paused++;
    });

    // 3. Cost and Profit calculations
    let totalWebsiteCost = 0;
    let totalToolCost = 0;
    let totalBudget = 0;

    const customerBudgets: Record<string, { id: string, name: string, totalBudget: number }> = {};

    const costByProject = projects.map((p) => {
      const pWebsite = p.websiteCosts.reduce((sum, item) => sum + item.amount, 0);
      const pTool = p.toolCosts.reduce((sum, item) => sum + item.cost, 0);
      totalWebsiteCost += pWebsite;
      totalToolCost += pTool;
      totalBudget += p.budget || 0;

      if (p.customer) {
        if (!customerBudgets[p.customer.id]) {
          customerBudgets[p.customer.id] = { id: p.customer.id, name: p.customer.name, totalBudget: 0 };
        }
        customerBudgets[p.customer.id].totalBudget += (p.budget || 0);
      }

      return {
        id: p.id,
        name: p.name,
        websiteCost: pWebsite,
        toolCost: pTool,
        totalCost: pWebsite + pTool,
        budget: p.budget || 0,
        profit: (p.budget || 0) - (pWebsite + pTool),
      };
    });

    const totalCost = totalWebsiteCost + totalToolCost;
    const totalProfit = totalBudget - totalCost;

    let topCustomerByBudget = null;
    let maxBudget = -1;
    for (const cid in customerBudgets) {
      if (customerBudgets[cid].totalBudget > maxBudget) {
        maxBudget = customerBudgets[cid].totalBudget;
        topCustomerByBudget = customerBudgets[cid];
      }
    }

    const topCustomers = Object.values(customerBudgets)
      .sort((a, b) => b.totalBudget - a.totalBudget)
      .slice(0, 5);

    // Top tools
    const toolFreq: Record<string, { id: string, name: string, count: number, totalCost: number }> = {};
    projects.forEach(p => {
      p.toolCosts.forEach(tc => {
        if (!toolFreq[tc.name]) toolFreq[tc.name] = { id: tc.name, name: tc.name, count: 0, totalCost: 0 };
        toolFreq[tc.name].count += 1;
        toolFreq[tc.name].totalCost += tc.cost;
      });
    });
    const topTools = Object.values(toolFreq)
      .sort((a, b) => b.count - a.count || b.totalCost - a.totalCost)
      .slice(0, 5);

    // Previous Stats Calculation
    let prevTotalBudget = 0;
    let prevTotalCost = 0;
    let prevTotalProfit = 0;

    if (prevStartDate || prevEndDate) {
      const prevWebsiteCostDateFilter: any = {};
      if (prevStartDate) prevWebsiteCostDateFilter.gte = prevStartDate;
      if (prevEndDate) prevWebsiteCostDateFilter.lte = prevEndDate;

      const prevToolCostDateFilter: any = {};
      if (prevStartDate) prevToolCostDateFilter.gte = prevStartDate;
      if (prevEndDate) prevToolCostDateFilter.lte = prevEndDate;

      const prevProjectDateFilter: any = {};
      if (prevStartDate) prevProjectDateFilter.startDate = { gte: prevStartDate };
      if (prevEndDate) {
        if (!prevProjectDateFilter.startDate) prevProjectDateFilter.startDate = {};
        prevProjectDateFilter.startDate.lte = prevEndDate;
      }

      const prevProjects = await prisma.project.findMany({
        where: prevStartDate || prevEndDate ? prevProjectDateFilter : {},
        include: {
          websiteCosts: { where: prevStartDate || prevEndDate ? { date: prevWebsiteCostDateFilter } : {} },
          toolCosts: { where: prevStartDate || prevEndDate ? { createdAt: prevToolCostDateFilter } : {} },
        },
      });

      prevProjects.forEach(p => {
        const pWebsite = p.websiteCosts.reduce((sum, item) => sum + item.amount, 0);
        const pTool = p.toolCosts.reduce((sum, item) => sum + item.cost, 0);
        prevTotalBudget += p.budget || 0;
        prevTotalCost += pWebsite + pTool;
      });
      prevTotalProfit = prevTotalBudget - prevTotalCost;
    }

    // 4. Average progress of running projects
    const runningProjects = projects.filter((p) => p.status === 'running');
    let totalProgress = 0;
    runningProjects.forEach((p) => {
      const totalTasks = p.tasks.length;
      if (totalTasks > 0) {
        const completed = p.tasks.filter((t) => {
          const colName = t.column.name.toLowerCase();
          return colName === 'hoàn thành' || colName === 'đã làm';
        }).length;
        totalProgress += (completed / totalTasks) * 100;
      }
    });
    const avgProgress = runningProjects.length > 0 ? Math.round((totalProgress / runningProjects.length) * 10) / 10 : 0;

    // 5. Overdue / Upcoming tasks
    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Fetch tasks across projects
    const tasks = await prisma.task.findMany({
      where: {
        deadline: { not: null },
        column: {
          name: { notIn: ['Hoàn thành', 'Đã làm', 'hoàn thành', 'đã làm'] },
        },
      },
      include: {
        project: true,
        column: true,
      },
      orderBy: { deadline: 'asc' },
    });

    const overdueTasks = tasks
      .filter((t) => t.deadline && new Date(t.deadline) < now)
      .slice(0, 10)
      .map((t) => ({
        id: t.id,
        title: t.title,
        deadline: t.deadline,
        assignee: t.assignee,
        priority: t.priority,
        project: { id: t.project.id, name: t.project.name },
        columnName: t.column.name,
      }));

    const upcomingTasks = tasks
      .filter((t) => t.deadline && new Date(t.deadline) >= now && new Date(t.deadline) <= next7Days)
      .slice(0, 10)
      .map((t) => ({
        id: t.id,
        title: t.title,
        deadline: t.deadline,
        assignee: t.assignee,
        priority: t.priority,
        project: { id: t.project.id, name: t.project.name },
        columnName: t.column.name,
      }));

    // 6. Upcoming tools to renew (in next 7 days)
    const tools = await prisma.toolCost.findMany({
      where: {
        nextRenewal: { not: null },
      },
      include: {
        project: true,
      },
      orderBy: { nextRenewal: 'asc' },
    });

    const upcomingTools = tools
      .filter((tc) => tc.nextRenewal && new Date(tc.nextRenewal) >= now && new Date(tc.nextRenewal) <= next7Days)
      .slice(0, 10)
      .map((tc) => ({
        id: tc.id,
        name: tc.name,
        cost: tc.cost,
        billingCycle: tc.billingCycle,
        nextRenewal: tc.nextRenewal,
        project: { id: tc.project.id, name: tc.project.name },
      }));

    return NextResponse.json({
      statusCounts,
      totalCosts: {
        total: totalCost,
        website: totalWebsiteCost,
        tools: totalToolCost,
      },
      totalBudget,
      totalProfit,
      previousStats: { budget: prevTotalBudget, cost: prevTotalCost, profit: prevTotalProfit },
      topCustomerByBudget,
      topCustomers,
      topTools,
      costByProject,
      avgProgress,
      overdueTasks,
      upcomingTasks,
      upcomingTools,
    });
  } catch (error) {
    console.error('GET project dashboard admin error:', error);
    return NextResponse.json({ error: 'Lỗi tải báo cáo tổng quan.' }, { status: 500 });
  }
}
