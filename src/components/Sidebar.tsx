import React from 'react';
import { 
  Play, 
  Layers, 
  BarChart2, 
  History as HistoryIcon, 
  PlusCircle, 
  Settings,
  ChevronRight,
  Code,
  Users
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ViewType = 'single' | 'batch' | 'stats' | 'history' | 'candidates';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  historyItems: any[];
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onViewChange, 
  historyItems 
}) => {
  const menuItems = [
    { id: 'single', label: 'Single Run', icon: Play },
    { id: 'batch', label: 'Batch Runner', icon: Layers },
    { id: 'stats', label: 'Statistics', icon: BarChart2 },
    { id: 'candidates', label: 'Candidates', icon: Users },
  ];

  return (
    <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-screen flex flex-col sticky top-0">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Code className="text-white" size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight">Assessor</span>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as ViewType)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                currentView === item.id
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">History</h3>
          <HistoryIcon size={14} className="text-zinc-400" />
        </div>
        <div className="space-y-1">
          {historyItems.length === 0 ? (
            <p className="text-xs text-zinc-400 italic px-3">No recent assessments</p>
          ) : (
            historyItems.map((item) => (
              <button
                key={item._id}
                onClick={() => onViewChange('single')} // Simplified for now
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <span className="truncate">{item.thingName}</span>
                <ChevronRight size={12} className="opacity-0 group-hover:opacity-100" />
              </button>
            ))
          )}
        </div>
      </div>

      <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
          <Settings size={18} />
          Settings
        </button>
      </div>
    </div>
  );
};

