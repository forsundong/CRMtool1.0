import React from 'react';
import { Box, Settings, LayoutGrid, UserPlus, Layers, RefreshCw, FileSearch, CopyPlus, FilePlus } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const menuItems = [
    { id: 'create-class', label: '快速建班', icon: <Box size={20} /> },
    { id: 'create-level', label: '快速创建关卡', icon: <Layers size={20} /> },
    { id: 'course-creator', label: '课程快速创建', icon: <CopyPlus size={20} /> },
    { id: 'template-creator', label: '课程模板创建', icon: <FilePlus size={20} /> },
    { id: 'template-validator', label: '课程模板校验', icon: <FileSearch size={20} /> },
    { id: 'course-updater', label: '课程更新', icon: <RefreshCw size={20} /> },
    { id: 'fast-join', label: '快速进班', icon: <UserPlus size={20} /> },
    { id: 'settings', label: '全局配置', icon: <Settings size={20} /> },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 flex items-center gap-3 text-white border-b border-slate-800">
        <LayoutGrid className="text-sky-400" />
        <h1 className="font-bold text-lg tracking-tight">CRM 工具箱</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium
              ${currentTab === item.id 
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/20' 
                : 'hover:bg-slate-800 hover:text-white'}`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <p className="text-xs text-slate-500 text-center">版本 1.4.1</p>
      </div>
    </aside>
  );
};