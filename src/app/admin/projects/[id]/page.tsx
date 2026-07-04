'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Button,
  Input,
  Select,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  showToast,
  Dialog,
  PageHeader,
  StatusBadge,
  EmptyState,
  LoadingSkeleton,
  Textarea,
} from '@/components/ui';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  FolderGit2,
  ListTodo,
  Layers,
  Layout,
  Clock,
  CheckSquare,
  AlertTriangle,
  FileText,
  MousePointerClick,
  PlusCircle,
  HelpCircle,
  AlertCircle,
  User,
  Tag as TagIcon,
  ExternalLink,
} from 'lucide-react';
import { ProjectCategoryAvatar } from '@/components/ProjectCategoryAvatar';

interface Project {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  progress: number;
  budget: number;
  categoryId: string | null;
  category: { id: string; name: string; icon: string | null; color: string | null } | null;
  customerId: string | null;
  customer: { id: string; name: string; phone: string; email: string | null; zalo: string | null; facebook: string | null; note: string | null } | null;
  columns: TaskColumn[];
  websiteCosts: WebsiteCost[];
  toolCosts: ToolCost[];
  requirementNotes: any[];
}

interface TaskColumn {
  id: string;
  name: string;
  position: number;
  tasks: Task[];
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee: string | null;
  deadline: string | null;
  priority: string; // low, medium, high
  tags: string | null;
  position: number;
  columnId: string;
}

interface WebsiteCost {
  id: string;
  name: string;
  type: string; // thiết kế, hosting, domain, lập trình, khác
  amount: number;
  date: string;
  note: string | null;
}

interface ToolCost {
  id: string;
  name: string;
  purpose: string | null;
  plan: string;
  cost: number;
  billingCycle: string; // month, year, one-time
  nextRenewal: string | null;
  note: string | null;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: projectId } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'kanban' | 'website' | 'tools' | 'customer' | 'requirements'>('kanban');

  // Requirement Notes states
  const [requirementNotes, setRequirementNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteLinks, setNoteLinks] = useState<{ label: string; url: string }[]>([{ label: '', url: '' }]);
  const [noteDate, setNoteDate] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [deletingNote, setDeletingNote] = useState(false);

  // Kanban Drag states
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Column modal states
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editColumnId, setEditColumnId] = useState<string | null>(null);
  const [columnName, setColumnName] = useState('');

  // Task modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskTags, setTaskTags] = useState('');
  const [taskColumnId, setTaskColumnId] = useState('');

  // Website Cost modal states
  const [isWebCostModalOpen, setIsWebCostModalOpen] = useState(false);
  const [editWebCostId, setEditWebCostId] = useState<string | null>(null);
  const [webCostName, setWebCostName] = useState('');
  const [webCostType, setWebCostType] = useState('lập trình');
  const [webCostAmount, setWebCostAmount] = useState('');
  const [webCostDate, setWebCostDate] = useState('');
  const [webCostNote, setWebCostNote] = useState('');

  // Tool Cost modal states
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  const [editToolId, setEditToolId] = useState<string | null>(null);
  const [toolName, setToolName] = useState('');
  const [toolPurpose, setToolPurpose] = useState('');
  const [toolPlan, setToolPlan] = useState('pro');
  const [toolCostAmount, setToolCostAmount] = useState('');
  const [toolCycle, setToolCycle] = useState('month');
  const [toolRenewal, setToolRenewal] = useState('');
  const [toolNote, setToolNote] = useState('');

  // General Deletes
  const [deleteType, setDeleteType] = useState<'column' | 'task' | 'webcost' | 'tool' | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProjectDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
      } else {
        showToast('Không tìm thấy dự án.', 'error');
        router.push('/admin/projects');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetail();
    fetchRequirementNotes();
  }, [projectId]);

  // ==========================================
  // REQUIREMENT TIMELINE NOTES ACTIONS
  // ==========================================
  const fetchRequirementNotes = async () => {
    setLoadingNotes(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/requirement-notes`);
      if (res.ok) {
        const data = await res.json();
        setRequirementNotes(data.notes || []);
      }
    } catch (err) {
      console.error('Fetch notes error:', err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) {
      showToast('Tiêu đề ghi chú là bắt buộc.', 'error');
      return;
    }
    setSavingNote(true);
    try {
      const url = editingNote
        ? `/api/admin/projects/${projectId}/requirement-notes/${editingNote.id}`
        : `/api/admin/projects/${projectId}/requirement-notes`;
      const method = editingNote ? 'PUT' : 'POST';

      const validLinks = noteLinks.filter((l) => l.url.trim() !== '');
      const linkValue = validLinks.length > 0 ? JSON.stringify(validLinks) : null;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteTitle,
          content: noteContent,
          date: noteDate,
          link: linkValue,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(editingNote ? 'Cập nhật ghi chú thành công!' : 'Thêm ghi chú thành công!', 'success');
        setIsNoteModalOpen(false);
        fetchRequirementNotes();
      } else {
        showToast(data.error || 'Lỗi khi lưu ghi chú.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteId) return;
    setDeletingNote(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/requirement-notes/${deleteNoteId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Xóa ghi chú thành công!', 'success');
        setRequirementNotes((prev) => prev.filter((n) => n.id !== deleteNoteId));
      } else {
        const data = await res.json();
        showToast(data.error || 'Lỗi khi xóa ghi chú.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setDeletingNote(false);
      setDeleteNoteId(null);
    }
  };

  // ==========================================
  // COLUMN ACTIONS
  // ==========================================
  const handleOpenAddColumn = () => {
    setEditColumnId(null);
    setColumnName('');
    setIsColumnModalOpen(true);
  };

  const handleOpenEditColumn = (col: TaskColumn) => {
    setEditColumnId(col.id);
    setColumnName(col.name);
    setIsColumnModalOpen(true);
  };

  const handleColumnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!columnName) return;

    try {
      const url = editColumnId
        ? `/api/admin/projects/${projectId}/columns/${editColumnId}`
        : `/api/admin/projects/${projectId}/columns`;
      const method = editColumnId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: columnName }),
      });

      if (res.ok) {
        showToast(editColumnId ? 'Đổi tên cột thành công!' : 'Thêm cột thành công!', 'success');
        setIsColumnModalOpen(false);
        fetchProjectDetail();
      } else {
        showToast('Có lỗi xảy ra.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối.', 'error');
    }
  };

  // ==========================================
  // TASK ACTIONS
  // ==========================================
  const handleOpenAddTask = (columnId: string) => {
    setEditTaskId(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskAssignee('');
    setTaskDeadline('');
    setTaskPriority('medium');
    setTaskTags('');
    setTaskColumnId(columnId);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (t: Task) => {
    setEditTaskId(t.id);
    setTaskTitle(t.title);
    setTaskDescription(t.description || '');
    setTaskAssignee(t.assignee || '');
    setTaskDeadline(t.deadline ? t.deadline.split('T')[0] : '');
    setTaskPriority(t.priority);
    setTaskTags(t.tags || '');
    setTaskColumnId(t.columnId);
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskColumnId) return;

    try {
      const url = editTaskId
        ? `/api/admin/projects/${projectId}/tasks/${editTaskId}`
        : `/api/admin/projects/${projectId}/tasks`;
      const method = editTaskId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDescription,
          assignee: taskAssignee,
          deadline: taskDeadline || null,
          priority: taskPriority,
          tags: taskTags,
          columnId: taskColumnId,
        }),
      });

      if (res.ok) {
        showToast(editTaskId ? 'Cập nhật công việc thành công!' : 'Thêm công việc thành công!', 'success');
        setIsTaskModalOpen(false);
        fetchProjectDetail();
      } else {
        showToast('Có lỗi xảy ra.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối.', 'error');
    }
  };

  // ==========================================
  // WEBSITE COSTS ACTIONS
  // ==========================================
  const handleOpenAddWebCost = () => {
    setEditWebCostId(null);
    setWebCostName('');
    setWebCostType('lập trình');
    setWebCostAmount('');
    setWebCostDate(new Date().toISOString().split('T')[0]);
    setWebCostNote('');
    setIsWebCostModalOpen(true);
  };

  const handleOpenEditWebCost = (wc: WebsiteCost) => {
    setEditWebCostId(wc.id);
    setWebCostName(wc.name);
    setWebCostType(wc.type);
    setWebCostAmount(String(wc.amount));
    setWebCostDate(wc.date.split('T')[0]);
    setWebCostNote(wc.note || '');
    setIsWebCostModalOpen(true);
  };

  const handleWebCostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webCostName || !webCostType || !webCostAmount) return;

    try {
      const url = editWebCostId
        ? `/api/admin/projects/${projectId}/website-costs/${editWebCostId}`
        : `/api/admin/projects/${projectId}/website-costs`;
      const method = editWebCostId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: webCostName,
          type: webCostType,
          amount: parseFloat(webCostAmount),
          date: webCostDate || null,
          note: webCostNote,
        }),
      });

      if (res.ok) {
        showToast(editWebCostId ? 'Cập nhật chi phí thành công!' : 'Thêm khoản chi phí thành công!', 'success');
        setIsWebCostModalOpen(false);
        fetchProjectDetail();
      } else {
        showToast('Có lỗi xảy ra.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối.', 'error');
    }
  };

  // ==========================================
  // TOOL COSTS ACTIONS
  // ==========================================
  const handleOpenAddTool = () => {
    setEditToolId(null);
    setToolName('');
    setToolPurpose('');
    setToolPlan('pro');
    setToolCostAmount('');
    setToolCycle('month');
    setToolRenewal('');
    setToolNote('');
    setIsToolModalOpen(true);
  };

  const handleOpenEditTool = (tc: ToolCost) => {
    setEditToolId(tc.id);
    setToolName(tc.name);
    setToolPurpose(tc.purpose || '');
    setToolPlan(tc.plan);
    setToolCostAmount(String(tc.cost));
    setToolCycle(tc.billingCycle);
    setToolRenewal(tc.nextRenewal ? tc.nextRenewal.split('T')[0] : '');
    setToolNote(tc.note || '');
    setIsToolModalOpen(true);
  };

  const handleToolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolName || !toolCostAmount || !toolCycle) return;

    try {
      const url = editToolId
        ? `/api/admin/projects/${projectId}/tool-costs/${editToolId}`
        : `/api/admin/projects/${projectId}/tool-costs`;
      const method = editToolId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: toolName,
          purpose: toolPurpose,
          plan: toolPlan,
          cost: parseFloat(toolCostAmount),
          billingCycle: toolCycle,
          nextRenewal: toolRenewal || null,
          note: toolNote,
        }),
      });

      if (res.ok) {
        showToast(editToolId ? 'Cập nhật công cụ thành công!' : 'Thêm công cụ thành công!', 'success');
        setIsToolModalOpen(false);
        fetchProjectDetail();
      } else {
        showToast('Có lỗi xảy ra.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối.', 'error');
    }
  };

  // ==========================================
  // DELETE TRIGGERS & ACTIONS
  // ==========================================
  const triggerDelete = (type: 'column' | 'task' | 'webcost' | 'tool', id: string) => {
    setDeleteType(type);
    setDeleteTargetId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteType || !deleteTargetId) return;

    setDeleting(true);
    try {
      let url = '';
      if (deleteType === 'column') {
        url = `/api/admin/projects/${projectId}/columns/${deleteTargetId}`;
      } else if (deleteType === 'task') {
        url = `/api/admin/projects/${projectId}/tasks/${deleteTargetId}`;
      } else if (deleteType === 'webcost') {
        url = `/api/admin/projects/${projectId}/website-costs/${deleteTargetId}`;
      } else if (deleteType === 'tool') {
        url = `/api/admin/projects/${projectId}/tool-costs/${deleteTargetId}`;
      }

      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        showToast('Xóa dữ liệu thành công!', 'success');
        setDeleteType(null);
        setDeleteTargetId(null);
        fetchProjectDetail();
      } else {
        showToast('Lỗi khi xóa dữ liệu.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ==========================================
  // DRAG & DROP KANBAN
  // ==========================================
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, destColumnId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId || !project) return;

    // Find the task inside current project columns
    let foundTask: Task | null = null;
    let sourceColId = '';
    project.columns.forEach((col) => {
      const t = col.tasks.find((task) => task.id === taskId);
      if (t) {
        foundTask = t;
        sourceColId = col.id;
      }
    });

    if (!foundTask || sourceColId === destColumnId) {
      setDraggedTaskId(null);
      return;
    }

    // Pessimistic update: Reorder tasks locally for instant visual feedback
    const updatedCols = project.columns.map((col) => {
      if (col.id === sourceColId) {
        return {
          ...col,
          tasks: col.tasks.filter((t) => t.id !== taskId),
        };
      }
      if (col.id === destColumnId) {
        const taskObj = foundTask as Task;
        const newTask = { ...taskObj, columnId: destColumnId };
        return {
          ...col,
          tasks: [...col.tasks, newTask],
        };
      }
      return col;
    });

    setProject({ ...project, columns: updatedCols });

    // Call API to save in DB
    try {
      // Get all task IDs in destination column to save positions
      const destCol = updatedCols.find((col) => col.id === destColumnId);
      const taskIds = destCol ? destCol.tasks.map((t) => t.id) : [];

      const res = await fetch(`/api/admin/projects/${projectId}/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          sourceColumnId: sourceColId,
          destColumnId,
          taskIds,
        }),
      });

      if (!res.ok) {
        showToast('Không lưu được vị trí công việc mới.', 'error');
        fetchProjectDetail(); // Revert
      } else {
        // Update stats progress dynamically
        fetchProjectDetail();
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
      fetchProjectDetail();
    } finally {
      setDraggedTaskId(null);
    }
  };

  const handleCardDrop = async (e: React.DragEvent, targetTaskId: string, destColumnId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId || !project || taskId === targetTaskId) return;

    let foundTask: Task | null = null;
    let sourceColId = '';
    project.columns.forEach((col) => {
      const t = col.tasks.find((task) => task.id === taskId);
      if (t) {
        foundTask = t;
        sourceColId = col.id;
      }
    });

    if (!foundTask) {
      setDraggedTaskId(null);
      return;
    }

    // local optimistic updates
    const sourceCol = project.columns.find((c) => c.id === sourceColId);
    const destCol = project.columns.find((c) => c.id === destColumnId);
    if (!sourceCol || !destCol) return;

    let sourceTasks = [...sourceCol.tasks];
    let destTasks = sourceColId === destColumnId ? sourceTasks : [...destCol.tasks];

    // Remove from source
    sourceTasks = sourceTasks.filter((t) => t.id !== taskId);

    // Insert into dest
    const targetIdx = destTasks.findIndex((t) => t.id === targetTaskId);
    const taskObj = foundTask as Task;
    const updatedTask = { ...taskObj, columnId: destColumnId };

    if (sourceColId === destColumnId) {
      // Re-order in same column
      const cleanTasks = destTasks.filter((t) => t.id !== taskId);
      cleanTasks.splice(targetIdx, 0, updatedTask);
      destTasks = cleanTasks;
    } else {
      destTasks.splice(targetIdx, 0, updatedTask);
    }

    const updatedCols = project.columns.map((col) => {
      if (col.id === sourceColId) {
        return { ...col, tasks: sourceTasks };
      }
      if (col.id === destColumnId) {
        return { ...col, tasks: destTasks };
      }
      return col;
    });

    setProject({ ...project, columns: updatedCols });

    // Call API
    try {
      const taskIds = destTasks.map((t) => t.id);
      const res = await fetch(`/api/admin/projects/${projectId}/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          sourceColumnId: sourceColId,
          destColumnId,
          taskIds,
        }),
      });

      if (!res.ok) {
        showToast('Không thể lưu vị trí công việc.', 'error');
        fetchProjectDetail();
      } else {
        fetchProjectDetail();
      }
    } catch {
      showToast('Lỗi kết nối.', 'error');
      fetchProjectDetail();
    } finally {
      setDraggedTaskId(null);
    }
  };

  // ==========================================
  // FORMATTING & HELPERS
  // ==========================================
  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Chưa xác định';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="danger">Cao</Badge>;
      case 'medium':
        return <Badge variant="warning">Trung bình</Badge>;
      case 'low':
        return <Badge variant="info">Thấp</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  // renewal days left calculator
  const getRenewalDaysLeft = (renewalStr: string | null) => {
    if (!renewalStr) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const renewal = new Date(renewalStr);
    renewal.setHours(0, 0, 0, 0);
    const diffMs = renewal.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getRenewalBadge = (renewalStr: string | null) => {
    const days = getRenewalDaysLeft(renewalStr);
    if (days === null) return null;
    if (days < 0) {
      return (
        <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-650 uppercase animate-pulse border border-red-200">
          <AlertCircle className="w-3 h-3" />
          <span>Quá hạn {Math.abs(days)} ngày</span>
        </span>
      );
    }
    if (days <= 7) {
      return (
        <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-750 uppercase animate-pulse border border-amber-200">
          <AlertTriangle className="w-3 h-3" />
          <span>Hạn còn {days} ngày</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded bg-green-100 text-green-700 uppercase border border-green-200">
        <span>An toàn ({days} ngày)</span>
      </span>
    );
  };

  if (loading && !project) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="table" />
      </div>
    );
  }

  if (!project) return null;

  // Dynamic calculations for project
  const totalTasks = project.columns.reduce((sum, col) => sum + col.tasks.length, 0);
  const completedTasks = (() => {
    const doneCol = project.columns.find((col) => col.name.toLowerCase() === 'hoàn thành');
    return doneCol ? doneCol.tasks.length : 0;
  })();
  const computedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100 * 10) / 10 : 0;

  const totalWebsiteCost = project.websiteCosts.reduce((sum, item) => sum + item.amount, 0);
  const totalToolCost = project.toolCosts.reduce((sum, item) => sum + item.cost, 0);
  const totalProjectCost = totalWebsiteCost + totalToolCost;

  // Software tools quy đổi chi phí
  // Monthly equivalent
  const toolCostMonthly = project.toolCosts.reduce((sum, tc) => {
    if (tc.billingCycle === 'month') return sum + tc.cost;
    if (tc.billingCycle === 'year') return sum + tc.cost / 12;
    // one-time cost is ignored for recurring monthly comparison, or divided by 12. Let's do simple recurring.
    return sum;
  }, 0);

  const toolCostYearly = project.toolCosts.reduce((sum, tc) => {
    if (tc.billingCycle === 'month') return sum + tc.cost * 12;
    if (tc.billingCycle === 'year') return sum + tc.cost;
    return sum;
  }, 0);

  // Website cost category breakdown for visual display
  const webCostTypes = ['thiết kế', 'hosting', 'domain', 'lập trình', 'khác'];
  const webCostBreakdown = webCostTypes.map((type) => {
    const sum = project.websiteCosts.filter((wc) => wc.type === type).reduce((s, wc) => s + wc.amount, 0);
    const pct = totalWebsiteCost > 0 ? Math.round((sum / totalWebsiteCost) * 100) : 0;
    return { type, sum, pct };
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Breadcrumb back */}
      <div className="flex items-center justify-between">
        <Link href="/admin/projects" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Danh sách Dự án</span>
        </Link>
        <div className="flex items-center gap-2">
          <StatusBadge status={project.status} />
        </div>
      </div>

      {/* Project info card */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-500 to-primary" />
        <CardContent className="p-7 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">{project.name}</h1>
                {project.category && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-100 text-slate-655 border border-slate-200 text-xs font-bold">
                    <ProjectCategoryAvatar iconName={project.category.icon} size="sm" />
                    {project.category.name}
                  </span>
                )}
                {project.customer && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    KH: {project.customer.name}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 max-w-3xl leading-relaxed">{project.description || 'Chưa có mô tả chi tiết cho dự án này.'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500 shrink-0 border border-slate-200/60 p-4 rounded-xl bg-slate-50/50">
              <div className="space-y-1">
                <span className="block font-bold text-[9px] uppercase tracking-wider text-slate-400">Thời gian</span>
                <span className="block font-extrabold text-slate-700">
                  {formatDate(project.startDate)} — {project.endDate ? formatDate(project.endDate) : 'Chưa thiết lập'}
                </span>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="space-y-1">
                <span className="block font-bold text-[9px] uppercase tracking-wider text-slate-400">Tổng chi phí dự án</span>
                <span className="block text-sm font-black text-rose-600">{formatVND(totalProjectCost)}</span>
              </div>
              {project.customer && (
                <>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="space-y-1">
                    <span className="block font-bold text-[9px] uppercase tracking-wider text-slate-400">Khách hàng</span>
                    <span className="block font-extrabold text-slate-700">
                      {project.customer.name}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5 pt-3 border-t border-slate-100">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-550 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-green-500" />
                <span>Tiến độ tổng thể: {completedTasks}/{totalTasks} công việc hoàn thành</span>
              </span>
              <span className="text-primary text-sm font-extrabold">{computedProgress}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${computedProgress}%`,
                  background: 'linear-gradient(90deg,#c060c8 0%,#a145ab 100%)',
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 gap-1.5 overflow-x-auto shrink-0">
        <button
          onClick={() => setActiveTab('kanban')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'kanban'
              ? 'border-primary text-primary bg-primary/5 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layout className="w-4.5 h-4.5" />
          Tiến độ công việc (Kanban)
        </button>
        <button
          onClick={() => setActiveTab('website')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'website'
              ? 'border-primary text-primary bg-primary/5 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4.5 h-4.5" />
          Chi phí làm Website ({formatVND(totalWebsiteCost)})
        </button>
        <button
          onClick={() => setActiveTab('tools')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'tools'
              ? 'border-primary text-primary bg-primary/5 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4.5 h-4.5" />
          Chi phí Công cụ hỗ trợ ({formatVND(totalToolCost)})
        </button>
        {project.customer && (
          <button
            onClick={() => setActiveTab('customer')}
            className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'customer'
                ? 'border-primary text-primary bg-primary/5 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <User className="w-4.5 h-4.5" />
            Khách hàng
          </button>
        )}
        <button
          onClick={() => {
            setActiveTab('requirements');
            fetchRequirementNotes();
          }}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'requirements'
              ? 'border-primary text-primary bg-primary/5 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4.5 h-4.5" />
          Yêu cầu & Timeline ({requirementNotes.length})
        </button>
      </div>

      {/* TAB CONTENT: CUSTOMER INFO */}
      {activeTab === 'customer' && project.customer && (
        <Card className="max-w-2xl">
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Thông tin chi tiết Khách hàng
            </CardTitle>
            <Link href={`/admin/customers`}>
              <Button variant="outline" size="sm">
                Đến quản lý khách hàng
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Họ và tên</span>
                <span className="font-extrabold text-slate-700">{project.customer.name}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Số điện thoại</span>
                <span className="font-extrabold text-slate-700">{project.customer.phone}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Email</span>
                <span className="font-extrabold text-slate-700">{project.customer.email || 'Chưa cập nhật'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Zalo</span>
                <span className="font-extrabold text-slate-700">{project.customer.zalo || 'Chưa cập nhật'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Facebook Link</span>
                <span className="font-extrabold text-slate-700">
                  {project.customer.facebook ? (
                    <a
                      href={project.customer.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-semibold"
                    >
                      Mở liên kết Facebook
                    </a>
                  ) : (
                    'Chưa cập nhật'
                  )}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Ghi chú</span>
                <span className="font-extrabold text-slate-700">{project.customer.note || 'Không có ghi chú'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: REQUIREMENTS & TIMELINE */}
      {activeTab === 'requirements' && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Timeline Yêu cầu & Ghi chú từ Khách hàng
            </CardTitle>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingNote(null);
                setNoteTitle('');
                setNoteContent('');
                setNoteLinks([{ label: '', url: '' }]);
                setNoteDate(new Date().toISOString().split('T')[0]);
                setIsNoteModalOpen(true);
              }}
              className="flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Thêm ghi chú</span>
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            {loadingNotes ? (
              <LoadingSkeleton className="h-40 w-full" />
            ) : requirementNotes.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Chưa có ghi chú yêu cầu nào"
                description="Lưu lại các mốc thời gian khách hàng gửi yêu cầu, phản hồi hoặc tài liệu để dễ dàng theo dõi."
                action={
                  <Button
                    onClick={() => {
                      setEditingNote(null);
                      setNoteTitle('');
                      setNoteContent('');
                      setNoteLinks([{ label: '', url: '' }]);
                      setNoteDate(new Date().toISOString().split('T')[0]);
                      setIsNoteModalOpen(true);
                    }}
                  >
                    Tạo ghi chú đầu tiên
                  </Button>
                }
              />
            ) : (
              <div className="relative border-l-2 border-slate-150 ml-4 pl-6 space-y-6">
                {requirementNotes.map((note) => (
                  <div key={note.id} className="relative group">
                    {/* Timeline Node dot */}
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-primary border-4 border-white shadow-sm ring-1 ring-primary/20" />

                    <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-150/80 rounded-2xl p-5 transition-all">
                      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            {formatDate(note.date)}
                          </span>
                          <h4 className="text-sm font-black text-slate-800">{note.title}</h4>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              let parsedLinks = [{ label: '', url: '' }];
                              if (note.link) {
                                try {
                                  const parsed = JSON.parse(note.link);
                                  if (Array.isArray(parsed)) {
                                    parsedLinks = parsed;
                                  } else {
                                    parsedLinks = [{ label: 'Liên kết', url: note.link }];
                                  }
                                } catch {
                                  parsedLinks = [{ label: 'Liên kết', url: note.link }];
                                }
                              }
                              setEditingNote(note);
                              setNoteTitle(note.title);
                              setNoteContent(note.content || '');
                              setNoteLinks(parsedLinks);
                              setNoteDate(new Date(note.date).toISOString().split('T')[0]);
                              setIsNoteModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-primary transition-colors cursor-pointer"
                            title="Sửa ghi chú"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteNoteId(note.id)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Xóa ghi chú"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-650 leading-relaxed whitespace-pre-line font-medium">
                        {note.content || 'Không có mô tả chi tiết.'}
                      </p>
                      {(() => {
                        if (!note.link) return null;
                        let links: { label: string; url: string }[] = [];
                        try {
                          const parsed = JSON.parse(note.link);
                          if (Array.isArray(parsed)) {
                            links = parsed;
                          } else {
                            links = [{ label: 'Mở liên kết đính kèm', url: note.link }];
                          }
                        } catch {
                          links = [{ label: 'Mở liên kết đính kèm', url: note.link }];
                        }

                        if (links.length === 0) return null;

                        return (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {links.map((lnk, lIdx) => (
                              <a
                                key={lIdx}
                                href={lnk.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 px-2.5 py-1.2 rounded-lg transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                                {lnk.label || 'Mở liên kết'}
                              </a>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: KANBAN PROGRESS */}
      {activeTab === 'kanban' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
              <MousePointerClick className="w-4 h-4 text-primary" />
              <span>Kéo thả công việc giữa các cột để thay đổi trạng thái và thứ tự.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleOpenAddColumn} className="flex items-center gap-1 text-xs py-2 px-3">
                <PlusCircle className="w-4 h-4" />
                Thêm cột Kanban
              </Button>
            </div>
          </div>

          {/* Kanban board scrollable container */}
          <div className="flex gap-5 overflow-x-auto pb-4 items-start min-h-[500px]">
            {project.columns.map((col) => (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className="w-80 shrink-0 bg-slate-100/90 border border-slate-200/60 rounded-2xl flex flex-col max-h-[700px]"
                style={{ boxShadow: '0 4px 12px rgba(108,117,147,0.02)' }}
              >
                {/* Column header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-extrabold text-sm text-slate-700 truncate">{col.name}</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500">
                      {col.tasks.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditColumn(col)}
                      className="p-1 rounded text-slate-400 hover:bg-slate-200 hover:text-slate-655 transition-colors cursor-pointer"
                      title="Sửa tên cột"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {/* Default columns cannot be deleted to avoid empty boards, but allow if desired */}
                    {['cần làm', 'đang làm', 'hoàn thành'].includes(col.name.toLowerCase()) ? null : (
                      <button
                        onClick={() => triggerDelete('column', col.id)}
                        className="p-1 rounded text-rose-455 hover:bg-rose-50 hover:text-rose-655 transition-colors cursor-pointer"
                        title="Xóa cột"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Column cards body */}
                <div className="p-3 overflow-y-auto space-y-3 flex-1 min-h-[150px]">
                  {col.tasks.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-slate-400 italic">Kéo thả công việc vào đây</div>
                  ) : (
                    col.tasks.map((task) => (
                      <div
                        key={task.id}
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleCardDrop(e, task.id, col.id)}
                        className="bg-white border border-slate-200 p-4 rounded-xl space-y-3 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all shadow-sm hover:shadow"
                      >
                        {/* Task priority and options */}
                        <div className="flex items-center justify-between">
                          {getPriorityBadge(task.priority)}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditTask(task)}
                              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded transition-colors cursor-pointer"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => triggerDelete('task', task.id)}
                              className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <div className="font-extrabold text-xs text-slate-850 leading-snug">{task.title}</div>

                        {/* Description */}
                        {task.description && (
                          <p className="text-[11px] text-slate-455 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Tags */}
                        {task.tags && (
                          <div className="flex flex-wrap gap-1">
                            {task.tags.split(',').map((tag, tIdx) => (
                              <span key={tIdx} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/10">
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Assignee & Deadline footer */}
                        {(task.assignee || task.deadline) && (
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                            {task.assignee ? (
                              <span className="font-bold flex items-center gap-1 text-slate-500">
                                <User className="w-3 h-3 text-slate-400" />
                                <span className="truncate max-w-[100px]">{task.assignee}</span>
                              </span>
                            ) : (
                              <span />
                            )}
                            {task.deadline && (
                              <span className={`font-semibold flex items-center gap-1 ${
                                new Date(task.deadline) < new Date() && col.name.toLowerCase() !== 'hoàn thành'
                                  ? 'text-red-500 font-extrabold'
                                  : ''
                              }`}>
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(task.deadline)}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Add task footer */}
                <div className="p-3 border-t border-slate-200/60 bg-slate-50/50 rounded-b-2xl">
                  <button
                    onClick={() => handleOpenAddTask(col.id)}
                    className="w-full py-1.5 flex items-center justify-center gap-1 text-xs font-bold text-primary border border-dashed border-primary/20 hover:border-primary/45 rounded-xl hover:bg-white transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm công việc
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: WEBSITE COSTS */}
      {activeTab === 'website' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Expenses table (2 cols) */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-700">Liệt kê chi phí vận hành & xây dựng</h2>
              <Button variant="primary" size="sm" onClick={handleOpenAddWebCost} className="flex items-center gap-1 text-xs py-2 px-3">
                <Plus className="w-4 h-4" />
                Thêm khoản chi
              </Button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200 tracking-wider">
                    <th className="px-6 py-4">Tên khoản chi</th>
                    <th className="px-6 py-4">Phân loại</th>
                    <th className="px-6 py-4">Số tiền</th>
                    <th className="px-6 py-4">Ngày phát sinh</th>
                    <th className="px-6 py-4">Ghi chú</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {project.websiteCosts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 italic">Chưa có khoản chi phí website nào được tạo.</td>
                    </tr>
                  ) : (
                    project.websiteCosts.map((wc) => (
                      <tr key={wc.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{wc.name}</td>
                        <td className="px-6 py-4">
                          <Badge variant="info" className="scale-90">{wc.type}</Badge>
                        </td>
                        <td className="px-6 py-4 font-extrabold text-slate-800">{formatVND(wc.amount)}</td>
                        <td className="px-6 py-4 text-slate-500">{formatDate(wc.date)}</td>
                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={wc.note || ''}>
                          {wc.note || '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditWebCost(wc)}
                              className="p-1 rounded text-slate-450 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => triggerDelete('webcost', wc.id)}
                              className="p-1 rounded text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {project.websiteCosts.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50/50 border-t-2 border-slate-200 font-extrabold text-xs">
                      <td colSpan={2} className="px-6 py-4 text-slate-600">Tổng chi phí website:</td>
                      <td colSpan={4} className="px-6 py-4 text-rose-600 text-sm font-black">{formatVND(totalWebsiteCost)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Breakdown cards (1 col) */}
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Phân bổ chi phí theo loại</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {totalWebsiteCost === 0 ? (
                  <p className="text-xs text-slate-400 italic py-6 text-center">Chưa có dữ liệu chi phí để phân tích.</p>
                ) : (
                  webCostBreakdown.map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-500 uppercase tracking-wider text-[10px]">{item.type}</span>
                        <span className="text-slate-700">{formatVND(item.sum)} ({item.pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${item.pct}%`,
                            background: idx === 0
                              ? 'linear-gradient(90deg,#a145ab,#c060c8)'
                              : idx === 1
                              ? 'linear-gradient(90deg,#3b82f6,#60a5fa)'
                              : idx === 2
                              ? 'linear-gradient(90deg,#22c55e,#4ade80)'
                              : idx === 3
                              ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                              : 'linear-gradient(90deg,#64748b,#94a3b8)',
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SOFTWARE TOOLS */}
      {activeTab === 'tools' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 text-xs">
              <div className="border border-slate-200 bg-slate-50 p-2.5 rounded-xl">
                <span className="text-slate-400 block font-bold text-[9px] uppercase tracking-wider">Ước lượng theo Tháng</span>
                <strong className="text-slate-700 text-sm font-black">{formatVND(toolCostMonthly)}</strong>
              </div>
              <div className="border border-slate-200 bg-slate-50 p-2.5 rounded-xl">
                <span className="text-slate-400 block font-bold text-[9px] uppercase tracking-wider">Ước lượng theo Năm</span>
                <strong className="text-slate-700 text-sm font-black">{formatVND(toolCostYearly)}</strong>
              </div>
            </div>
            <Button variant="primary" size="sm" onClick={handleOpenAddTool} className="flex items-center gap-1 text-xs py-2 px-3">
              <Plus className="w-4 h-4" />
              Thêm công cụ
            </Button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200 tracking-wider">
                  <th className="px-6 py-4">Tên công cụ</th>
                  <th className="px-6 py-4">Mục đích</th>
                  <th className="px-6 py-4">Gói cước</th>
                  <th className="px-6 py-4">Chi phí</th>
                  <th className="px-6 py-4">Chu kỳ</th>
                  <th className="px-6 py-4">Ngày gia hạn tiếp</th>
                  <th className="px-6 py-4">Tình trạng hạn</th>
                  <th className="px-6 py-4">Ghi chú</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {project.toolCosts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 italic">Chưa có công cụ hỗ trợ nào được liệt kê.</td>
                  </tr>
                ) : (
                  project.toolCosts.map((tc) => (
                    <tr key={tc.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{tc.name}</td>
                      <td className="px-6 py-4 text-slate-500">{tc.purpose || '—'}</td>
                      <td className="px-6 py-4">
                        <Badge variant="primary" className="scale-90">{tc.plan}</Badge>
                      </td>
                      <td className="px-6 py-4 font-extrabold text-slate-800">{formatVND(tc.cost)}</td>
                      <td className="px-6 py-4 text-slate-500 font-semibold uppercase tracking-wide text-[10px]">
                        {tc.billingCycle === 'month' ? 'Tháng' : tc.billingCycle === 'year' ? 'Năm' : 'Một lần'}
                      </td>
                      <td className="px-6 py-4 text-slate-500">{tc.nextRenewal ? formatDate(tc.nextRenewal) : '—'}</td>
                      <td className="px-6 py-4">{tc.nextRenewal ? getRenewalBadge(tc.nextRenewal) : '—'}</td>
                      <td className="px-6 py-4 max-w-xs">
                        {tc.note ? (
                          <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 text-[10.5px] leading-relaxed break-words font-medium text-slate-600 whitespace-pre-wrap">
                            {tc.note}
                          </div>
                        ) : (
                          <span className="text-slate-350 italic">Chưa có note</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditTool(tc)}
                            className="p-1 rounded text-slate-450 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                            title="Sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => triggerDelete('tool', tc.id)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {project.toolCosts.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50/50 border-t-2 border-slate-200 font-extrabold text-xs">
                    <td colSpan={3} className="px-6 py-4 text-slate-600">Tổng chi phí công cụ hiện tại:</td>
                    <td colSpan={6} className="px-6 py-4 text-rose-600 text-sm font-black">{formatVND(totalToolCost)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          MODALS & DIALOGS
      ========================================== */}

      {/* Modal Cột Kanban */}
      {isColumnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base">
                {editColumnId ? 'Chỉnh sửa tên cột 📝' : 'Thêm cột Kanban mới 🚀'}
              </h3>
              <button onClick={() => setIsColumnModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg focus:outline-none cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleColumnSubmit}>
              <div className="px-6 py-6">
                <Input
                  label="Tên cột *"
                  placeholder="Ví dụ: Đang kiểm thử, Tạm hoãn..."
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  required
                />
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-3 rounded-b-2xl">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsColumnModalOpen(false)}>
                  Hủy bỏ
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Lưu lại
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Công việc */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base">
                {editTaskId ? 'Cập nhật công việc 📝' : 'Thêm công việc mới 🚀'}
              </h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg focus:outline-none cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleTaskSubmit}>
              <div className="px-6 py-6 space-y-4">
                <Input
                  label="Tiêu đề công việc *"
                  placeholder="Ví dụ: Thiết kế trang chủ"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
                <Textarea
                  label="Mô tả công việc"
                  placeholder="Nhập yêu cầu chi tiết hoặc mô tả..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={3}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Người phụ trách"
                    placeholder="Tên nhân viên..."
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                  />
                  <Input
                    label="Hạn hoàn thành (Deadline)"
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Độ ưu tiên"
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    options={[
                      { value: 'low', label: 'Thấp' },
                      { value: 'medium', label: 'Trung bình' },
                      { value: 'high', label: 'Cao' },
                    ]}
                  />
                  <Input
                    label="Nhãn màu (Tags - phân cách bởi dấu phẩy)"
                    placeholder="Ví dụ: Design, Bug, UI..."
                    value={taskTags}
                    onChange={(e) => setTaskTags(e.target.value)}
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-3 rounded-b-2xl">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsTaskModalOpen(false)}>
                  Hủy bỏ
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Lưu lại
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chi phí Website */}
      {isWebCostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base">
                {editWebCostId ? 'Sửa khoản chi phí 📝' : 'Thêm khoản chi phí website 💰'}
              </h3>
              <button onClick={() => setIsWebCostModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg focus:outline-none cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleWebCostSubmit}>
              <div className="px-6 py-6 space-y-4">
                <Input
                  label="Tên khoản chi *"
                  placeholder="Ví dụ: Thuê hosting gia hạn 1 năm"
                  value={webCostName}
                  onChange={(e) => setWebCostName(e.target.value)}
                  required
                />
                <Select
                  label="Phân loại chi phí *"
                  value={webCostType}
                  onChange={(e) => setWebCostType(e.target.value)}
                  options={[
                    { value: 'thiết kế', label: 'Thiết kế (Design)' },
                    { value: 'hosting', label: 'Hosting / Server' },
                    { value: 'domain', label: 'Domain (Tên miền)' },
                    { value: 'lập trình', label: 'Lập trình / Code' },
                    { value: 'khác', label: 'Khác' },
                  ]}
                />
                <Input
                  label="Số tiền (VNĐ) *"
                  type="number"
                  placeholder="Ví dụ: 1200000"
                  value={webCostAmount}
                  onChange={(e) => setWebCostAmount(e.target.value)}
                  required
                />
                <Input
                  label="Ngày phát sinh *"
                  type="date"
                  value={webCostDate}
                  onChange={(e) => setWebCostDate(e.target.value)}
                  required
                />
                <Textarea
                  label="Ghi chú"
                  placeholder="Thêm chi tiết về nhà cung cấp, hóa đơn..."
                  value={webCostNote}
                  onChange={(e) => setWebCostNote(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-3 rounded-b-2xl">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsWebCostModalOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Lưu lại
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chi phí Công cụ */}
      {isToolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base">
                {editToolId ? 'Sửa thông tin công cụ 📝' : 'Thêm phần mềm/công cụ 🛠️'}
              </h3>
              <button onClick={() => setIsToolModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg focus:outline-none cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleToolSubmit}>
              <div className="px-6 py-6 space-y-4">
                <Input
                  label="Tên phần mềm/công cụ *"
                  placeholder="Ví dụ: Figma Pro, Ahrefs Standard"
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  required
                />
                <Input
                  label="Mục đích sử dụng"
                  placeholder="Ví dụ: Thiết kế UI/UX, phân tích từ khóa..."
                  value={toolPurpose}
                  onChange={(e) => setToolPurpose(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Gói đăng ký"
                    placeholder="Ví dụ: Pro, Agency, Free..."
                    value={toolPlan}
                    onChange={(e) => setToolPlan(e.target.value)}
                  />
                  <Select
                    label="Chu kỳ thanh toán *"
                    value={toolCycle}
                    onChange={(e) => setToolCycle(e.target.value)}
                    options={[
                      { value: 'month', label: 'Hàng tháng' },
                      { value: 'year', label: 'Hàng năm' },
                      { value: 'one-time', label: 'Một lần' },
                    ]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Chi phí (VNĐ) *"
                    type="number"
                    placeholder="Ví dụ: 350000"
                    value={toolCostAmount}
                    onChange={(e) => setToolCostAmount(e.target.value)}
                    required
                  />
                  <Input
                    label="Ngày gia hạn tiếp theo"
                    type="date"
                    value={toolRenewal}
                    onChange={(e) => setToolRenewal(e.target.value)}
                  />
                </div>
                <Textarea
                  label="Ghi chú chi tiết (Tài khoản, link đăng ký, lý do chọn...)"
                  placeholder="Tài khoản đăng nhập: user@example.com / link đăng ký..."
                  value={toolNote}
                  onChange={(e) => setToolNote(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-3 rounded-b-2xl">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsToolModalOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Lưu lại
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog xác nhận xóa chung */}
      <Dialog
        isOpen={deleteType !== null}
        onClose={() => {
          setDeleteType(null);
          setDeleteTargetId(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa dữ liệu ⚠️"
        description="Hành động này sẽ xóa vĩnh viễn mục đã chọn và không thể khôi phục lại. Bạn có chắc chắn muốn tiếp tục?"
        confirmText="Xóa dữ liệu"
        cancelText="Hủy bỏ"
        isDanger={true}
        isLoading={deleting}
      />
      {/* TIMELINE NOTE CREATE/EDIT MODAL */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base">
                {editingNote ? 'Chỉnh sửa ghi chú yêu cầu' : 'Thêm ghi chú yêu cầu khách hàng'} 📝
              </h3>
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg focus:outline-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveNote}>
              <div className="px-6 py-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <Input
                  label="Tiêu đề yêu cầu *"
                  placeholder="Ví dụ: Gửi tài liệu API, Yêu cầu đổi màu sắc giao diện..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  required
                />
                <Input
                  label="Thời gian mốc yêu cầu"
                  type="date"
                  value={noteDate}
                  onChange={(e) => setNoteDate(e.target.value)}
                  required
                />
                
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Danh sách liên kết đính kèm (Figma, Drive, Trello...)
                  </label>
                  <div className="space-y-2">
                    {noteLinks.map((lnk, lIdx) => (
                      <div key={lIdx} className="flex gap-2 items-center">
                        <Input
                          placeholder="Tên hiển thị (ví dụ: Figma, Trello...)"
                          value={lnk.label}
                          onChange={(e) => {
                            const newLinks = [...noteLinks];
                            newLinks[lIdx].label = e.target.value;
                            setNoteLinks(newLinks);
                          }}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Đường dẫn URL (https://...)"
                          value={lnk.url}
                          onChange={(e) => {
                            const newLinks = [...noteLinks];
                            newLinks[lIdx].url = e.target.value;
                            setNoteLinks(newLinks);
                          }}
                          className="flex-2"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setNoteLinks(noteLinks.filter((_, i) => i !== lIdx));
                          }}
                          disabled={noteLinks.length === 1}
                          className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer shrink-0"
                          title="Xóa liên kết"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => setNoteLinks([...noteLinks, { label: '', url: '' }])}
                    className="mt-1 flex items-center gap-1 py-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm liên kết</span>
                  </Button>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <Textarea
                    label="Nội dung yêu cầu / Phản hồi chi tiết"
                    placeholder="Mô tả cụ thể nội dung khách hàng gửi hoặc yêu cầu..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={8}
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-3 rounded-b-2xl">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNoteModalOpen(false)}
                  disabled={savingNote}
                >
                  Hủy bỏ
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={savingNote} className="cursor-pointer">
                  Lưu lại
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE NOTE CONFIRM DIALOG */}
      <Dialog
        isOpen={!!deleteNoteId}
        onClose={() => setDeleteNoteId(null)}
        title="Xác nhận xóa ghi chú yêu cầu ⚠️"
        description="Bạn có chắc chắn muốn xóa ghi chú timeline này không? Hành động này không thể hoàn tác."
        confirmText="Xóa ghi chú"
        cancelText="Hủy bỏ"
        isDanger={true}
        onConfirm={handleDeleteNote}
        isLoading={deletingNote}
      />
    </div>
  );
}
