/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Droplets, 
  Car, 
  Plus, 
  Search, 
  Clock, 
  ChevronRight,
  Home,
  ExternalLink,
  Trash2,
  Filter,
  CheckCircle2,
  AlertTriangle,
  X,
  Upload,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MaintenanceItem, Category, MaintenanceState } from './types.ts';
import { loadData, saveData, calculateNextChangeDate, getStatus } from './lib/storage.ts';
import { cn, formatDate } from './lib/utils.ts';
import { FREQUENCY_OPTIONS } from './constants.ts';
import { analyzeItemImage } from './services/geminiService.ts';

export default function App() {
  const [state, setState] = useState<MaintenanceState>(loadData());
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MaintenanceItem | null>(null);
  const [isGlobalOffline, setIsGlobalOffline] = useState(!navigator.onLine);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    setIsInIframe(window.self !== window.top);
    const handleOnline = () => setIsGlobalOffline(false);
    const handleOffline = () => setIsGlobalOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Persistence
  useEffect(() => {
    saveData(state);
  }, [state]);

  const itemsWithDates = useMemo(() => {
    return state.items.map(item => {
      const nextDate = calculateNextChangeDate(item.lastChangeDate, item.frequencyMonths);
      return {
        ...item,
        nextDate,
        status: getStatus(nextDate)
      };
    }).sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
  }, [state.items]);

  const stats = useMemo(() => {
    const overdue = itemsWithDates.filter(i => i.status === 'overdue').length;
    const soon = itemsWithDates.filter(i => i.status === 'soon').length;
    const ok = itemsWithDates.filter(i => i.status === 'ok').length;
    return { overdue, soon, ok };
  }, [itemsWithDates]);

  const addItem = (item: Omit<MaintenanceItem, 'id'>) => {
    const newItem = { ...item, id: crypto.randomUUID() };
    setState(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setIsModalOpen(false);
  };

  const updateItem = (item: MaintenanceItem) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === item.id ? item : i)
    }));
    setEditingItem(null);
    setIsModalOpen(false);
  };

  const deleteItem = (id: string) => {
    if (confirm('Are you sure you want to delete this tracker?')) {
      setState(prev => ({
        ...prev,
        items: prev.items.filter(i => i.id !== id)
      }));
    }
  };

  const markAsChanged = (item: MaintenanceItem) => {
    const updated = {
      ...item,
      lastChangeDate: new Date().toISOString()
    };
    updateItem(updated);
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const id = newCategoryName.trim().toLowerCase().replace(/\s+/g, '-');
      setState(prev => ({
        ...prev,
        categories: [...prev.categories, { id, name: newCategoryName.trim(), icon: 'Home' }]
      }));
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  const filteredItems = itemsWithDates.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'dashboard' || item.categoryId === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8F9FA] text-[#1A1C1E] font-sans">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-[#E1E2E4] bg-white p-6 flex flex-col gap-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-[#E3E3E3] rounded-xl flex items-center justify-center">
             <Home size={24} className="text-[#1A1C1E] font-bold" />
          </div>
          <span className="text-xl font-bold tracking-tight">NestCare</span>
        </div>

        <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
          <NavItem 
            icon={<Clock size={20} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <div className="hidden lg:block mt-8 mb-2 px-3 text-[11px] uppercase font-bold tracking-widest text-[#5F6368] opacity-60">
            Care Zones
          </div>
          {state.categories.map(cat => (
            <div key={cat.id} className="group relative">
              <NavItem 
                icon={cat.id === 'water' ? <Droplets size={20} /> : cat.id === 'car' ? <Car size={20} /> : <Home size={20} />} 
                label={cat.name} 
                active={activeTab === cat.id} 
                onClick={() => setActiveTab(cat.id)} 
              />
              {!['water', 'car'].includes(cat.id) && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete the "${cat.name}" zone and all trackers inside it?`)) {
                      setState(prev => ({
                        categories: prev.categories.filter(c => c.id !== cat.id),
                        items: prev.items.filter(i => i.categoryId !== cat.id)
                      }));
                      if (activeTab === cat.id) setActiveTab('dashboard');
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-[#FCE8E6] hover:text-[#EA4335] rounded-lg transition-all text-[#5F6368]"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {isAddingCategory ? (
            <div className="flex flex-col gap-2 mt-2 p-2 bg-[#F1F3F4]/50 rounded-xl border border-[#E1E2E4]">
              <input 
                autoFocus
                type="text" 
                placeholder="Zone name..."
                className="w-full px-3 py-1.5 text-sm bg-white border border-[#E1E2E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1C1E]"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCategory();
                  if (e.key === 'Escape') setIsAddingCategory(false);
                }}
              />
              <div className="flex gap-2">
                <button 
                  onClick={handleAddCategory}
                  className="flex-1 px-3 py-1.5 bg-[#1A1C1E] text-white text-[10px] font-bold uppercase rounded-lg shadow-sm"
                >
                  Add
                </button>
                <button 
                  onClick={() => setIsAddingCategory(false)}
                  className="flex-1 px-3 py-1.5 bg-white text-[#5F6368] text-[10px] font-bold uppercase rounded-lg border border-[#E1E2E4]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button 
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#5F6368] hover:bg-[#F1F3F4] transition-colors mt-2 text-sm whitespace-nowrap"
              onClick={() => setIsAddingCategory(true)}
            >
              <Plus size={20} />
              <span className="hidden lg:inline">Add Zone</span>
            </button>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-12">
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-12">
          <div className="flex items-start justify-between w-full xl:w-auto">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                {activeTab === 'dashboard' ? 'Overview' : state.categories.find(c => c.id === activeTab)?.name}
              </h1>
              <p className="text-[#5F6368]">Welcome back, handle your home maintenance with ease.</p>
              {isInIframe && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-[#E8F0FE] text-[#1A73E8] rounded-lg text-xs font-medium border border-[#D2E3FC]">
                  <Sparkles size={14} />
                  <span>To install as mobile app: Open in a new tab first</span>
                </div>
              )}
            </div>
            {isGlobalOffline && (
              <div className="flex items-center gap-2 px-3 py-1 bg-[#FCE8E6] text-[#EA4335] rounded-full text-[10px] font-bold uppercase tracking-wider h-fit mt-2 border border-[#F8D7D4]">
                <WifiOff size={14} />
                <span>Offline</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5F6368]" size={18} />
              <input 
                type="text" 
                placeholder="Search items..."
                className="pl-10 pr-4 py-2 bg-white border border-[#E1E2E4] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1C1E] w-full sm:w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={() => {
                setEditingItem(null);
                setIsModalOpen(true);
              }}
              className="w-full sm:w-auto px-6 py-2 bg-[#1A1C1E] text-white rounded-full font-medium hover:bg-[#2D2F31] transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus size={18} />
              <span>Add Item</span>
            </button>
          </div>
        </header>

        {/* Dashboard Stats */}
        {activeTab === 'dashboard' && !searchQuery && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <StatCard 
              label="Overdue Actions" 
              value={stats.overdue} 
              icon={<AlertTriangle className="text-[#EA4335]" size={24} />} 
              bgColor="bg-[#FCE8E6]"
            />
            <StatCard 
              label="Due Soon" 
              value={stats.soon} 
              icon={<Clock className="text-[#FBBC04]" size={24} />} 
              bgColor="bg-[#FEF7E0]"
            />
            <StatCard 
              label="All Systems OK" 
              value={stats.ok} 
              icon={<CheckCircle2 className="text-[#34A853]" size={24} />} 
              bgColor="bg-[#E6F4EA]"
            />
          </section>
        )}

        {/* Table/List View */}
        <section className="bg-white rounded-2xl border border-[#E1E2E4] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E1E2E4]">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#5F6368] opacity-60">Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#5F6368] opacity-60">Item Name</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#5F6368] opacity-60">Type</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#5F6368] opacity-60">Last Change</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#5F6368] opacity-60">Next Cycle</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#5F6368] opacity-60 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E2E4]">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#5F6368]">
                      <div className="flex flex-col items-center gap-3">
                        <Filter size={40} className="opacity-20" />
                        <p>No maintenance items found. Add your first tracker!</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => (
                    <tr 
                      key={item.id} 
                      className="group hover:bg-[#F8F9FA] transition-colors cursor-pointer" 
                      onClick={() => {
                        setEditingItem(item);
                        setIsModalOpen(true);
                      }}
                    >
                      <td className="px-6 py-4">
                        <StatusBadge status={item.status as any} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#5F6368] text-sm font-mono">{item.type}</td>
                      <td className="px-6 py-4 text-[#5F6368] text-sm">{formatDate(item.lastChangeDate)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className={cn(
                            "text-sm font-bold",
                            item.status === 'overdue' ? 'text-[#EA4335]' : 
                            item.status === 'soon' ? 'text-[#FBBC04]' : 'text-[#1A1C1E]'
                          )}>
                            {formatDate(item.nextDate)}
                          </span>
                          <span className="text-[10px] text-[#5F6368] opacity-60 uppercase tracking-tighter font-bold">Every {item.frequencyMonths}m</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => markAsChanged(item)}
                            className="p-2 text-[#34A853] hover:bg-[#E6F4EA] rounded-lg transition-colors"
                            title="Mark as Changed Today"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                          {item.referenceLink && (
                            <a 
                              href={item.referenceLink} 
                              target="_blank" 
                              rel="noreferrer"
                              className="p-2 text-[#1A73E8] hover:bg-[#E8F0FE] rounded-lg transition-colors"
                              title="Store Link"
                            >
                              <ExternalLink size={18} />
                            </a>
                          )}
                          <button 
                            onClick={() => deleteItem(item.id)}
                            className="p-2 text-[#EA4335] hover:bg-[#FCE8E6] rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-8 py-6 border-b border-[#E1E2E4] flex items-center justify-between">
                <h2 className="text-xl font-bold">{editingItem ? 'Edit Tracker' : 'New Tracker'}</h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-[#F1F3F4] rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8">
                <MaintenanceItemForm 
                  initialValues={editingItem || { 
                    name: '', 
                    type: '', 
                    categoryId: activeTab === 'dashboard' ? 'water' : activeTab, 
                    lastChangeDate: new Date().toISOString().split('T')[0], 
                    frequencyMonths: 6,
                    referenceLink: '',
                    notes: ''
                  } as any}
                  categories={state.categories}
                  onSubmit={(values) => {
                    if (editingItem) updateItem({ ...editingItem, ...values });
                    else addItem(values);
                  }}
                  onCancel={() => setIsModalOpen(false)}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void, key?: string | number }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium whitespace-nowrap",
        active 
          ? "bg-[#1A1C1E] text-white shadow-md shadow-black/10" 
          : "text-[#5F6368] hover:bg-[#F1F3F4] hover:text-[#1A1C1E]"
      )}
    >
      <span className={active ? "text-white" : "text-[#5F6368]"}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function StatCard({ label, value, icon, bgColor }: { label: string, value: number, icon: React.ReactNode, bgColor: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-[#E1E2E4] flex items-center gap-5 shadow-sm">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", bgColor)}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-xs text-[#5F6368] font-bold uppercase tracking-wider opacity-60">{label}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'overdue' | 'soon' | 'ok' }) {
  const configs = {
    overdue: { 
      label: 'Overdue', 
      bg: 'bg-[#FCE8E6]', 
      border: 'border-[#F8D7D4]', 
      dot: 'bg-[#EA4335]', 
      text: 'text-[#C5221F]' 
    },
    soon: { 
      label: 'Soon', 
      bg: 'bg-[#FEF7E0]', 
      border: 'border-[#FEEFC3]', 
      dot: 'bg-[#FBBC04]', 
      text: 'text-[#B06000]' 
    },
    ok: { 
      label: 'Good', 
      bg: 'bg-[#E6F4EA]', 
      border: 'border-[#CEEAD6]', 
      dot: 'bg-[#34A853]', 
      text: 'text-[#188038]' 
    }
  };

  const config = configs[status];

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
      config.bg, config.text, config.border
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

function MaintenanceItemForm({ initialValues, categories, onSubmit, onCancel }: { 
  initialValues: Omit<MaintenanceItem, 'id'>, 
  categories: Category[],
  onSubmit: (values: any) => void,
  onCancel: () => void 
}) {
  const [values, setValues] = useState(initialValues);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isOffline) {
      alert("AI analysis is not possible while offline. Please connect to the internet to use this feature.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setPreviewUrl(base64);
      await autoAnalyze(base64);
    };
    reader.readAsDataURL(file);
  };

  const autoAnalyze = async (base64: string) => {
    if (isOffline) {
      alert("You are currently offline. AI analysis requires an internet connection. You can still fill in the details manually.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const result = await analyzeItemImage(base64);
      setValues(prev => ({
        ...prev,
        name: result.name || prev.name,
        type: result.type || prev.type,
        frequencyMonths: result.suggestedFrequencyMonths || prev.frequencyMonths,
        referenceLink: result.referenceLink || prev.referenceLink,
        notes: result.notes || prev.notes
      }));
    } catch (error) {
      console.error("Analysis failed", error);
      alert("AI analysis failed. Please check your connection or try again later.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={(e) => {
      e.preventDefault();
      onSubmit(values);
    }}>
      {/* Image Upload Area */}
      <div className="relative group">
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "w-full h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all cursor-pointer relative overflow-hidden",
            previewUrl ? "border-transparent" : "border-[#E1E2E4] hover:border-[#1A1C1E] hover:bg-[#F8F9FA]"
          )}
        >
          {previewUrl ? (
            <>
              <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold uppercase tracking-widest">
                <Upload size={18} />
                Change Image
              </div>
            </>
          ) : (
            <>
              <div className={cn(
                "p-3 rounded-full",
                isOffline ? "bg-[#FCE8E6] text-[#EA4335]" : "bg-[#F1F3F4] text-[#5F6368]"
              )}>
                {isOffline ? <WifiOff size={24} /> : <Upload size={24} />}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{isOffline ? "Offline - AI Analysis Disabled" : "Upload photo for AI analysis"}</p>
                <p className="text-xs text-[#5F6368]">
                  {isOffline ? "Connect to internet for smart detection" : "Item name, type & cycle will be detected"}
                </p>
              </div>
            </>
          )}

          {isAnalyzing && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-[#1A1C1E]" size={32} />
              <div className="flex items-center gap-2 text-[#1A1C1E] font-bold text-xs uppercase tracking-widest">
                <Sparkles size={16} className="text-[#FBBC04]" />
                Analyzing with AI...
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#5F6368] opacity-60">Category</label>
          <select 
            className="w-full px-4 py-2 bg-[#F8F9FA] border border-[#E1E2E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1C1E]"
            value={values.categoryId}
            onChange={(e) => setValues({ ...values, categoryId: e.target.value })}
          >
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#5F6368] opacity-60">Frequency</label>
          <select 
            className="w-full px-4 py-2 bg-[#F8F9FA] border border-[#E1E2E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1C1E]"
            value={values.frequencyMonths}
            onChange={(e) => setValues({ ...values, frequencyMonths: parseInt(e.target.value) })}
          >
            {FREQUENCY_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-[#5F6368] opacity-60">Item Name</label>
        <input 
          type="text" 
          placeholder="e.g. Master Bath Shower"
          className="w-full px-4 py-2 bg-[#F8F9FA] border border-[#E1E2E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1C1E]"
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#5F6368] opacity-60">Type</label>
          <input 
            type="text" 
            placeholder="e.g. RO Filter"
            className="w-full px-4 py-2 bg-[#F8F9FA] border border-[#E1E2E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1C1E]"
            value={values.type}
            onChange={(e) => setValues({ ...values, type: e.target.value })}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#5F6368] opacity-60">Last Change</label>
          <input 
            type="date" 
            className="w-full px-4 py-2 bg-[#F8F9FA] border border-[#E1E2E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1C1E]"
            value={values.lastChangeDate.split('T')[0]}
            onChange={(e) => setValues({ ...values, lastChangeDate: new Date(e.target.value).toISOString() })}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-[#5F6368] opacity-60">Buy Link (Online Reference)</label>
        <input 
          type="url" 
          placeholder="https://amazon.com/..."
          className="w-full px-4 py-2 bg-[#F8F9FA] border border-[#E1E2E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1C1E]"
          value={values.referenceLink || ''}
          onChange={(e) => setValues({ ...values, referenceLink: e.target.value })}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
        <button 
          type="button"
          onClick={onCancel}
          className="w-full sm:flex-1 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-[#5F6368] hover:bg-[#F1F3F4] rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button 
          type="submit"
          className="w-full sm:flex-1 px-6 py-2.5 text-xs font-bold uppercase tracking-widest bg-[#1A1C1E] text-white rounded-xl shadow-lg shadow-black/10 hover:bg-[#2D2F31] transition-all"
        >
          Save Tracker
        </button>
      </div>
    </form>
  );
}

