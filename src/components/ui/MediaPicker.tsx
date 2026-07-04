'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Trash2, Upload, X, Check, Image as ImageIcon } from 'lucide-react';
import { Button, Dialog, showToast } from './index';

interface MediaFile {
  name: string;
  url: string;
  size: number;
  createdAt: string;
}

interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  title?: string;
}

export const MediaPicker: React.FC<MediaPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  title = 'Thư viện Media',
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [deletingFile, setDeletingFile] = useState<MediaFile | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/upload');
      const data = await res.json();
      if (res.ok && data.files) {
        setFiles(data.files);
      } else {
        showToast(data.error || 'Không thể tải danh sách ảnh.', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ khi tải danh sách ảnh.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
      setSelectedUrl(null);
      setActiveTab('library');
    }
  }, [isOpen]);

  const handleUploadFile = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      showToast('Kích thước ảnh không được vượt quá 2MB.', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        showToast('Tải ảnh lên thành công!', 'success');
        // Fetch files list again
        await fetchFiles();
        // Automatically select the new uploaded image and switch tab
        setSelectedUrl(data.url);
        setActiveTab('library');
      } else {
        showToast(data.error || 'Lỗi khi tải ảnh lên.', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ khi upload.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, file: MediaFile) => {
    e.stopPropagation();
    setDeletingFile(file);
  };

  const confirmDelete = async () => {
    if (!deletingFile) return;
    setDeletingLoading(true);
    try {
      const res = await fetch(`/api/admin/upload?name=${encodeURIComponent(deletingFile.name)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Xóa ảnh thành công!', 'success');
        setFiles(files.filter(f => f.name !== deletingFile.name));
        if (selectedUrl === deletingFile.url) {
          setSelectedUrl(null);
        }
      } else {
        showToast(data.error || 'Không thể xóa ảnh.', 'error');
      }
    } catch (err) {
      showToast('Lỗi máy chủ khi xóa ảnh.', 'error');
    } finally {
      setDeletingLoading(false);
      setDeletingFile(null);
    }
  };

  const handleConfirmSelect = () => {
    if (selectedUrl) {
      onSelect(selectedUrl);
      onClose();
    }
  };

  // Filter files by search query
  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-4xl h-[600px] flex flex-col rounded-2xl overflow-hidden bg-white shadow-2xl border border-slate-100 animate-scale-in">
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#a145ab]" />
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex gap-1 py-2">
              <button
                onClick={() => setActiveTab('library')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'library'
                    ? 'bg-white text-[#a145ab] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Chọn từ thư viện
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-white text-[#a145ab] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Tải ảnh mới
              </button>
            </div>

            {activeTab === 'library' && (
              <div className="relative flex items-center w-64 my-2">
                <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm tên ảnh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-[#a145ab] focus:ring-2 focus:ring-[#a145ab]/10 transition-all text-slate-800"
                />
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden p-6">
            {activeTab === 'library' ? (
              loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-3 border-slate-200 border-t-[#a145ab] rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-400 font-semibold">Đang tải danh sách ảnh...</span>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 mb-1">Không tìm thấy ảnh</h4>
                  <p className="text-xs text-slate-400 max-w-xs">
                    {searchQuery ? 'Không có ảnh nào khớp với từ khóa tìm kiếm.' : 'Thư viện chưa có ảnh nào. Vui lòng chuyển sang tab tải ảnh mới.'}
                  </p>
                </div>
              ) : (
                <div className="h-full overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredFiles.map((file) => {
                      const isSelected = selectedUrl === file.url;
                      return (
                        <div
                          key={file.name}
                          onClick={() => setSelectedUrl(file.url)}
                          onDoubleClick={() => {
                            setSelectedUrl(file.url);
                            onSelect(file.url);
                            onClose();
                          }}
                          className={`group relative aspect-square rounded-xl overflow-hidden border bg-slate-50 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                            isSelected
                              ? 'border-[#a145ab] ring-3 ring-[#a145ab]/15'
                              : 'border-slate-150'
                          }`}
                        >
                          {/* Image */}
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />

                          {/* Hover Overlay & Actions */}
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                            <div className="flex justify-end">
                              <button
                                onClick={(e) => handleDeleteClick(e, file)}
                                className="p-1.5 rounded-lg bg-rose-500/90 text-white hover:bg-rose-600 transition-colors cursor-pointer shadow-sm"
                                title="Xóa ảnh"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="text-[10px] text-white font-medium truncate drop-shadow-sm bg-black/30 px-1.5 py-0.5 rounded backdrop-blur-[2px]">
                              {file.name}
                            </div>
                          </div>

                          {/* Select Checkmark Badge */}
                          {isSelected && (
                            <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-[#a145ab] text-white flex items-center justify-center shadow-sm">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}

                          {/* File Details (Size) */}
                          <div className="absolute bottom-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/45 text-white backdrop-blur-[1px] group-hover:hidden transition-all">
                            {formatSize(file.size)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`h-full flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-all ${
                  dragActive
                    ? 'border-[#a145ab] bg-[#a145ab]/5 scale-[0.99]'
                    : 'border-slate-200 bg-slate-50/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {uploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-slate-100 border-t-[#a145ab] rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-slate-700">Đang tải lên...</p>
                    <p className="text-xs text-slate-400">Vui lòng chờ trong giây lát</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center p-8">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-[#a145ab] shadow-sm mb-4">
                      <Upload className="w-6 h-6 animate-pulse" />
                    </div>
                    <h4 className="text-base font-bold text-slate-800 mb-1">
                      Kéo thả ảnh vào đây để tải lên
                    </h4>
                    <p className="text-xs text-slate-400 mb-5 max-w-xs leading-relaxed">
                      Hoặc nhấp vào nút bên dưới để chọn file từ máy tính của bạn. Định dạng hỗ trợ: PNG, JPG, JPEG, SVG, WebP. Tối đa 2MB.
                    </p>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer"
                    >
                      Chọn từ máy tính
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
            <div className="text-xs text-slate-400 font-medium">
              {activeTab === 'library' && selectedUrl && 'Đã chọn 1 ảnh.'}
            </div>
            <div className="flex gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Đóng
              </Button>
              {activeTab === 'library' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmSelect}
                  disabled={!selectedUrl}
                >
                  Xác nhận chọn
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={!!deletingFile}
        onClose={() => setDeletingFile(null)}
        onConfirm={confirmDelete}
        title="Xác nhận xóa ảnh"
        description={`Bạn có chắc chắn muốn xóa vĩnh viễn ảnh "${deletingFile?.name}" khỏi hệ thống? Hành động này không thể hoàn tác.`}
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy bỏ"
        isDanger={true}
        isLoading={deletingLoading}
      />
    </>
  );
};
