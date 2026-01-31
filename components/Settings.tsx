
import React, { useState, useEffect, useMemo } from 'react';
import { AppSettings, ChecklistItem, ItemFrequency, AspectRatio, LogEntry, InspectionData } from '../types';
// Import Tag from lucide-react to fix "Cannot find name 'Tag'" error
import { 
  Trash2, 
  Plus, 
  ArrowLeft, 
  CheckCircle, 
  Image as ImageIcon, 
  Upload, 
  Palette, 
  Type,
  ListChecks,
  Pencil,
  Info,
  RectangleHorizontal,
  RectangleVertical,
  CarFront,
  Maximize,
  Lock,
  Database,
  Search,
  RefreshCw,
  FileText,
  Key,
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Calendar,
  X,
  Truck,
  Eye as ViewIcon,
  AlertTriangle,
  History,
  ShieldCheck,
  Activity,
  Wifi,
  WifiOff,
  Download,
  Clock,
  UserCheck,
  Zap,
  BarChart,
  Trophy,
  ArrowUpRight,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Hash,
  Fingerprint,
  Gauge,
  ClipboardCheck,
  Settings as SettingsIcon,
  Camera,
  FileSearch,
  Stamp,
  CheckSquare,
  ImagePlus,
  Scale,
  BookOpen,
  MousePointer2,
  HelpCircle,
  Tag
} from 'lucide-react';

const FIXED_GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzfcjGUbSvHrWUPQjMZeE1_ndzSjYhKQQMaQGU1e2KcAZfTJVLkfiG4vJFudJV5VL_t/exec';

interface SettingsProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onClose: () => void;
  initialTab?: 'items' | 'images' | 'style' | 'about' | 'admin' | 'manual';
}

export const Settings: React.FC<SettingsProps> = ({ 
  settings, 
  onSave, 
  onClose, 
  initialTab = 'items'
}) => {
  const [activeTab, setActiveTab] = useState<'items' | 'images' | 'style' | 'about' | 'admin' | 'manual'>(initialTab);
  const [localSettings, setLocalSettings] = useState<AppSettings>(() => {
    return {
      ...settings,
      googleSheetUrl: settings.googleSheetUrl || FIXED_GOOGLE_SHEET_URL,
      vehicleImageRatios: settings.vehicleImageRatios || ['landscape', 'landscape', 'landscape', 'landscape', 'landscape']
    };
  });
  
  const [newItem, setNewItem] = useState({ label: '', frequency: 'Diário' as ItemFrequency });

  // Admin states
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminSubTab, setAdminSubTab] = useState<'dashboard' | 'logs'>('dashboard');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [lastConnectionStatus, setLastConnectionStatus] = useState<'online' | 'offline' | 'unknown'>('unknown');
  const [logFilter, setLogFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const formatDisplayDate = (dateStr: any) => {
    if (!dateStr) return 'N/A';
    const s = String(dateStr);
    if (s.length < 5) return 'N/A';
    if (s.match(/^\d{2}\/\d{2}\/\d{4}/)) return s;
    
    try {
        const date = new Date(s);
        if (!isNaN(date.getTime())) {
            return date.toLocaleString('pt-BR', { 
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        }
    } catch (e) {}
    return s;
  };

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword.toLowerCase() === 'tricolor') {
      setIsAdminAuthenticated(true);
    } else {
      alert('Acesso Negado: Senha mestra incorreta.');
    }
  };

  const fetchLogs = async () => {
    const targetUrl = localSettings.googleSheetUrl || FIXED_GOOGLE_SHEET_URL;
    if (!targetUrl) return;
    setIsLoadingLogs(true);
    try {
      const response = await fetch(`${targetUrl}?action=getLogs`);
      if (!response.ok) throw new Error('Servidor indisponível');
      const result = await response.json();
      if (Array.isArray(result)) {
        setLogs(result);
        setLastConnectionStatus('online');
      } else {
        setLogs([]);
        setLastConnectionStatus('offline');
      }
    } catch (err) {
      console.error("Erro na busca de logs:", err);
      setLogs([]);
      setLastConnectionStatus('offline');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin' && isAdminAuthenticated && logs.length === 0) {
      fetchLogs();
    }
  }, [activeTab, isAdminAuthenticated]);

  const getField = (log: any, keys: string[]) => {
    for (const key of keys) {
      if (log[key] !== undefined && log[key] !== null && log[key] !== "") {
        return log[key];
      }
    }
    return "N/A";
  };

  const getViatura = (log: LogEntry) => getField(log, ['prefix', 'viatura', 'prefixo']);
  const getPlaca = (log: LogEntry) => getField(log, ['plate', 'placa']);
  const getCiclo = (log: LogEntry) => getField(log, ['checklistType', 'periodicidade', 'ciclo', 'tipo']);
  const getKm = (log: LogEntry) => getField(log, ['km', 'quilometragem']);
  const getInspector = (log: LogEntry) => String(getField(log, ['inspector', 'conferente', 'inspetor'])).toUpperCase();
  const getStatusSummary = (log: LogEntry) => getField(log, ['itemsStatus', 'resumo_status', 'status']);

  const getItemsList = (log: LogEntry) => {
    if (log.itemsDetail && String(log.itemsDetail).trim().startsWith('[')) {
      try {
        const items = JSON.parse(String(log.itemsDetail));
        if (Array.isArray(items) && items.length > 0) return items;
      } catch (e) {}
    }
    if (log.fullData && String(log.fullData).trim().startsWith('{')) {
      try {
        const fd = JSON.parse(String(log.fullData));
        if (fd.items && Array.isArray(fd.items)) return fd.items;
      } catch (e) {}
    }
    return [];
  };

  const stats = useMemo(() => {
    if (!Array.isArray(logs) || logs.length === 0) {
      return { total: 0, withIssues: 0, uniqueInspectors: 0, avgKm: 0, sortedVehicles: [], sortedInspectors: [], topIssues: [] };
    }

    const total = logs.length;
    const withIssues = logs.filter(l => {
        const st = String(getStatusSummary(l));
        return st.includes('CN') && !st.includes('0 CN');
    }).length;

    const uniqueInspectors = new Set(logs.map(l => getInspector(l))).size;
    const avgKm = Math.round(logs.reduce((acc, l) => acc + (parseInt(String(getKm(l))) || 0), 0) / total);
    
    const vehicleCounts: Record<string, number> = {};
    const inspectorCounts: Record<string, number> = {};
    const itemIssueCounts: Record<string, number> = {};

    logs.forEach(l => {
      const v = String(getViatura(l));
      const insp = getInspector(l);
      
      vehicleCounts[v] = (vehicleCounts[v] || 0) + 1;
      inspectorCounts[insp] = (inspectorCounts[insp] || 0) + 1;
      
      const items = getItemsList(l);
      items.forEach((it: any) => {
          if (it.status === 'CN') {
              itemIssueCounts[it.label] = (itemIssueCounts[it.label] || 0) + 1;
          }
      });
    });

    const sortedVehicles = Object.entries(vehicleCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const sortedInspectors = Object.entries(inspectorCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const topIssues = Object.entries(itemIssueCounts).sort((a,b) => b[1] - a[1]).slice(0, 3);

    return { total, withIssues, uniqueInspectors, avgKm, sortedVehicles, sortedInspectors, topIssues };
  }, [logs]);

  const filteredLogs = logs.filter(l => 
    String(getViatura(l)).toLowerCase().includes(logFilter.toLowerCase()) || 
    String(getPlaca(l)).toLowerCase().includes(logFilter.toLowerCase()) ||
    getInspector(l).toLowerCase().includes(logFilter.toLowerCase())
  );

  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImages = [...localSettings.vehicleImages];
        newImages[index] = reader.result as string;
        setLocalSettings({ ...localSettings, vehicleImages: newImages });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleRatio = (index: number) => {
    const newRatios = [...(localSettings.vehicleImageRatios || [])];
    newRatios[index] = newRatios[index] === 'landscape' ? 'portrait' : 'landscape';
    setLocalSettings({ ...localSettings, vehicleImageRatios: newRatios as AspectRatio[] });
  };

  const handleLogoUpload = (logoKey: 'headerLogoUrl1' | 'headerLogoUrl2', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalSettings({ ...localSettings, [logoKey]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SETTINGS */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors no-print">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-xl font-bold text-gray-800">Centro de Inteligência de Frota</h2>
        </div>
        <button onClick={() => onSave(localSettings)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-100 no-print">
          <CheckCircle className="w-4 h-4" /> Aplicar Configurações
        </button>
      </div>

      {/* NAV TABS */}
      <nav className="flex gap-2 overflow-x-auto pb-2 no-print">
        {[
          { id: 'manual', label: 'Manual do Usuário', icon: BookOpen },
          { id: 'items', label: 'Itens de Controle', icon: ListChecks },
          { id: 'images', label: 'Plantas de Inspeção', icon: ImageIcon },
          { id: 'style', label: 'Identidade Visual', icon: Palette },
          { id: 'admin', label: 'Auditoria', icon: Lock },
          { id: 'about', label: 'Informações', icon: Info }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="bg-white border rounded-3xl overflow-hidden min-h-[500px] shadow-sm">
        {/* MANUAL TAB */}
        {activeTab === 'manual' && (
          <div className="p-8 space-y-8 h-full flex flex-col overflow-y-auto max-h-[75vh]">
             <div className="flex items-center gap-4 border-b pb-6">
                <div className="p-4 bg-blue-600 rounded-[2rem] shadow-xl shadow-blue-100">
                    <BookOpen className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Manual de Operação Técnica</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Guia passo-a-passo para conferência de frota</p>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* CARD 1: IDENTIFICAÇÃO */}
                <div className="bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100"><Tag className="w-5 h-5 text-blue-600" /></div>
                        <h4 className="font-black text-xs uppercase tracking-widest text-gray-800">1. Identificação Inicial</h4>
                    </div>
                    <p className="text-[11px] text-gray-500 font-bold leading-relaxed">Preencha obrigatoriamente o <span className="text-blue-600">Prefixo</span>, <span className="text-blue-600">Placa</span> e a <span className="text-blue-600">Quilometragem (KM)</span> atual do veículo. Escolha entre o ciclo Diário ou Semanal conforme a programação.</p>
                </div>

                {/* CARD 2: MAPA DE AVARIAS */}
                <div className="bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100"><Maximize className="w-5 h-5 text-orange-600" /></div>
                        <h4 className="font-black text-xs uppercase tracking-widest text-gray-800">2. Mapeamento de Danos</h4>
                    </div>
                    <p className="text-[11px] text-gray-500 font-bold leading-relaxed">Clique nas miniaturas das vistas (Dianteira, Traseira, etc.) para ampliar. No modo ampliado, <span className="text-orange-600">toque na imagem</span> para marcar o local exato de uma avaria visual encontrada.</p>
                </div>

                {/* CARD 3: MALHA DE ITENS */}
                <div className="bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
                        <h4 className="font-black text-xs uppercase tracking-widest text-gray-800">3. Conferência de Itens</h4>
                    </div>
                    <p className="text-[11px] text-gray-500 font-bold leading-relaxed">Para cada item, selecione <span className="text-green-600">OK</span> (Sem Novidades) ou <span className="text-red-600">CN</span> (Com Novidades). Caso selecione CN, é recomendado adicionar uma observação e anexo fotográfico usando o ícone de câmera.</p>
                </div>

                {/* CARD 4: FINALIZAÇÃO */}
                <div className="bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100"><ShieldCheck className="w-5 h-5 text-purple-600" /></div>
                        <h4 className="font-black text-xs uppercase tracking-widest text-gray-800">4. Validação e Protocolo</h4>
                    </div>
                    <p className="text-[11px] text-gray-500 font-bold leading-relaxed">Após preencher todos os campos, informe seu Nome e Graduação/RE. Clique em <span className="text-purple-600 font-black">FINALIZAR</span>. O sistema validará se todos os itens foram conferidos antes de gerar o relatório oficial.</p>
                </div>
             </div>

             <div className="bg-blue-900 p-8 rounded-[3rem] text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Info className="w-32 h-32" /></div>
                <div className="relative z-10 space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-300">Dicas de Alta Performance</h4>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3">
                            <Zap className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-bold">Use o ícone "Importar" para carregar dados salvos de uma inspeção anterior e agilizar o preenchimento.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <MousePointer2 className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-bold">O botão de seta ao lado da observação de cada item move o texto automaticamente para as Notas Gerais do relatório.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-bold">Certifique-se de estar conectado à internet no momento da finalização para garantir a sincronização do protocolo digital.</p>
                        </li>
                    </ul>
                </div>
             </div>
          </div>
        )}

        {/* ADMIN TAB */}
        {activeTab === 'admin' && (
          <div className="p-6 h-full flex flex-col">
            {!isAdminAuthenticated ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-6 max-w-sm mx-auto text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center border-4 border-white shadow-xl">
                  <Lock className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Cripto-Acesso Auditor</h3>
                    <p className="text-xs text-gray-400 font-medium px-4">Área reservada para conferência técnica de registros e análise de dados operacionais.</p>
                </div>
                <form onSubmit={handleAdminAuth} className="w-full space-y-3">
                  <input type="password" placeholder="DIGITE A SENHA MESTRA" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full border-2 rounded-2xl p-4 text-center text-sm font-black tracking-[0.4em] outline-none focus:border-blue-500 transition-all uppercase" />
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-100">Desbloquear Relatórios</button>
                </form>
              </div>
            ) : (
              <div className="space-y-6 flex-1 flex flex-col animate-in fade-in duration-500 overflow-y-auto max-h-[75vh] pr-2">
                <div className="flex items-center justify-between border-b pb-4 sticky top-0 bg-white z-20">
                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setAdminSubTab('dashboard')} className={`flex items-center gap-2 text-[10px] font-black uppercase px-4 py-2 rounded-lg transition-all ${adminSubTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><LayoutDashboard className="w-3.5 h-3.5" /> Estatísticas</button>
                    <button onClick={() => setAdminSubTab('logs')} className={`flex items-center gap-2 text-[10px] font-black uppercase px-4 py-2 rounded-lg transition-all ${adminSubTab === 'logs' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><ClipboardList className="w-3.5 h-3.5" /> Auditoria</button>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100">
                        {lastConnectionStatus === 'online' ? <Wifi className="w-3.5 h-3.5 text-green-500" /> : <WifiOff className="w-3.5 h-3.5 text-red-500" />}
                        <span className={`text-[9px] font-black uppercase ${lastConnectionStatus === 'online' ? 'text-green-600' : 'text-red-600'}`}>
                            {lastConnectionStatus === 'online' ? 'Conectado' : 'Offline'}
                        </span>
                    </div>
                    <button onClick={fetchLogs} className="flex items-center gap-2 text-[9px] font-black uppercase text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-all"><RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} /> Atualizar</button>
                  </div>
                </div>

                {adminSubTab === 'dashboard' ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-5 rounded-3xl text-white shadow-xl shadow-blue-100 group">
                        <div className="flex justify-between items-start mb-4">
                          <BarChart3 className="w-6 h-6 opacity-60" />
                          <span className="bg-white/20 text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Total</span>
                        </div>
                        <div className="text-4xl font-black">{stats.total}</div>
                        <p className="text-[10px] uppercase font-bold opacity-60 mt-1">Registros na Base</p>
                      </div>

                      <div className="bg-white border-2 border-red-50 p-5 rounded-3xl shadow-sm border-l-4 border-l-red-500">
                        <div className="flex justify-between items-start mb-4">
                          <AlertTriangle className="w-6 h-6 text-red-500" />
                          <span className="text-gray-300 text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Críticos</span>
                        </div>
                        <div className="text-4xl font-black text-gray-900">{stats.withIssues}</div>
                        <p className="text-[10px] uppercase font-bold text-red-600 mt-1">Veículos com CN</p>
                      </div>

                      <div className="bg-white border-2 border-blue-50 p-5 rounded-3xl shadow-sm border-l-4 border-l-blue-500">
                        <div className="flex justify-between items-start mb-4">
                          <Activity className="w-6 h-6 text-blue-600" />
                          <span className="text-gray-300 text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Média KM</span>
                        </div>
                        <div className="text-4xl font-black text-gray-900">{stats.avgKm} <span className="text-sm text-gray-400">KM</span></div>
                        <p className="text-[10px] uppercase font-bold text-blue-600 mt-1">Média de Rodagem</p>
                      </div>

                      <div className="bg-white border-2 border-purple-50 p-5 rounded-3xl shadow-sm border-l-4 border-l-purple-500">
                        <div className="flex justify-between items-start mb-4">
                          <UserCheck className="w-6 h-6 text-purple-600" />
                          <span className="text-gray-300 text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Efetivo</span>
                        </div>
                        <div className="text-4xl font-black text-gray-900">{stats.uniqueInspectors}</div>
                        <p className="text-[10px] uppercase font-bold text-purple-600 mt-1">Inspetores Ativos</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 bg-gray-50 rounded-2xl border overflow-hidden">
                    <div className="bg-white p-3 border-b flex items-center gap-3">
                      <div className="flex-1 flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="Pesquisar Viatura, Placa ou Conferente..." value={logFilter} onChange={e => setLogFilter(e.target.value)} className="bg-transparent text-xs font-bold outline-none flex-1 placeholder:text-gray-300" />
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-gray-50 z-10 border-b text-[9px] font-black text-gray-400 uppercase tracking-widest">
                          <tr>
                            <th className="p-4">Data/Hora</th>
                            <th className="p-4">Viatura</th>
                            <th className="p-4">Conferente</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Relatório</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-[10px] bg-white">
                          {filteredLogs.map(log => {
                            const inspector = getInspector(log);
                            const itemsStatus = getStatusSummary(log);
                            return (
                              <tr key={log.id} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="p-4 font-mono font-bold text-gray-500">{formatDisplayDate(log.date)}</td>
                                <td className="p-4">
                                  <div className="font-black text-gray-800 uppercase tracking-tighter">{getViatura(log)}</div>
                                  <div className="text-[9px] font-bold text-gray-400">{getPlaca(log)} • {getKm(log)} KM</div>
                                </td>
                                <td className="p-4 font-black uppercase text-gray-600 truncate max-w-[200px]">{inspector}</td>
                                <td className="p-4">
                                  <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter ${
                                    String(itemsStatus).includes('CN') && !String(itemsStatus).includes('0 CN') 
                                      ? 'bg-red-50 text-red-600' 
                                      : 'bg-green-50 text-green-600'
                                  }`}>{itemsStatus}</span>
                                </td>
                                <td className="p-4 text-right">
                                  <button onClick={() => setSelectedLog(log)} className="p-2.5 bg-gray-100 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm" title="Abrir Relatório">
                                      <FileSearch className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ITEMS TAB */}
        {activeTab === 'items' && (
          <div className="p-6 space-y-6 flex flex-col h-full">
            <div className="bg-gray-50 p-5 rounded-3xl border border-dashed border-gray-200 shadow-inner">
              <h3 className="font-black text-gray-800 uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" /> Adicionar Novo Item à Base de Controle
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-7">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Descrição</label>
                  <input type="text" value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} className="w-full border-2 border-gray-100 rounded-2xl p-3 text-xs font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all" placeholder="Ex: Nível de Óleo do Motor" />
                </div>
                <div className="sm:col-span-4">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Frequência</label>
                  <select value={newItem.frequency} onChange={e => setNewItem({...newItem, frequency: e.target.value as ItemFrequency})} className="w-full border-2 border-gray-100 rounded-2xl p-3 text-xs font-bold outline-none bg-white">
                    <option value="Diário">Exibir no Diário</option>
                    <option value="Semanal">Exibir no Semanal</option>
                    <option value="Ambos">Exibir em Ambos</option>
                  </select>
                </div>
                <button 
                  onClick={() => {
                    if (!newItem.label.trim()) return;
                    const item: Omit<ChecklistItem, 'status'> = { id: crypto.randomUUID(), label: newItem.label, frequency: newItem.frequency };
                    setLocalSettings({ ...localSettings, defaultItems: [...localSettings.defaultItems, item] });
                    setNewItem({ label: '', frequency: 'Diário' });
                  }} 
                  className="sm:col-span-1 bg-blue-600 text-white p-3 rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center shadow-xl shadow-blue-100 h-[48px]"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col border border-gray-100 rounded-[2.5rem] bg-gray-50/30">
              <div className="p-4 bg-white border-b flex items-center justify-between">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Base de Itens Cadastrados ({localSettings.defaultItems.length})</h4>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {localSettings.defaultItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-100 shadow-sm group hover:border-blue-200 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${item.frequency === 'Diário' ? 'bg-blue-500' : item.frequency === 'Semanal' ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                      <div>
                        <div className="text-xs font-bold text-gray-800 uppercase leading-tight">{item.label}</div>
                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mt-0.5">{item.frequency}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setLocalSettings({ ...localSettings, defaultItems: localSettings.defaultItems.filter(i => i.id !== item.id) })}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* IMAGES TAB */}
        {activeTab === 'images' && (
          <div className="p-6 space-y-6 h-full flex flex-col overflow-y-auto max-h-[75vh]">
            <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100">
                <h3 className="font-black text-blue-900 uppercase text-[10px] tracking-widest mb-2">Plantas de Inspeção Padrão</h3>
                <p className="text-[11px] text-blue-700/70 font-bold">Configure as imagens que aparecerão por padrão no mapa de avarias de cada nova inspeção.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {['Dianteira', 'Traseira', 'Lateral Motorista', 'Lateral Comandante', 'Superior'].map((label, idx) => (
                <div key={idx} className="bg-white border-2 border-gray-100 rounded-[2.5rem] p-5 shadow-sm space-y-4 hover:border-blue-200 transition-all flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
                    <button 
                      onClick={() => handleToggleRatio(idx)}
                      className={`p-2 rounded-xl transition-all flex items-center gap-2 text-[9px] font-black uppercase ${localSettings.vehicleImageRatios?.[idx] === 'portrait' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}
                    >
                      {localSettings.vehicleImageRatios?.[idx] === 'portrait' ? <RectangleVertical className="w-3.5 h-3.5" /> : <RectangleHorizontal className="w-3.5 h-3.5" />}
                      {localSettings.vehicleImageRatios?.[idx] === 'portrait' ? 'Vertical' : 'Horizontal'}
                    </button>
                  </div>

                  <div className={`relative flex-1 bg-gray-50 rounded-3xl overflow-hidden border-2 border-dashed border-gray-200 group flex items-center justify-center ${localSettings.vehicleImageRatios?.[idx] === 'portrait' ? 'aspect-[3/4]' : 'aspect-video'}`}>
                    {localSettings.vehicleImages[idx] ? (
                      <img src={localSettings.vehicleImages[idx]} className="w-full h-full object-contain" alt={label} />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-300">
                        <ImagePlus className="w-8 h-8 opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Nenhuma Imagem</span>
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-[2px]">
                      <div className="bg-white p-3 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-800 shadow-xl">
                        <Upload className="w-4 h-4 text-blue-600" /> Alterar
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(idx, e)} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STYLE TAB */}
        {activeTab === 'style' && (
          <div className="p-8 space-y-10 h-full flex flex-col overflow-y-auto max-h-[75vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100"><Type className="w-5 h-5 text-white" /></div>
                    <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Textos e Identificação</h4>
                </div>
                
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Título do Cabeçalho</label>
                    <input 
                      type="text" 
                      value={localSettings.headerTitle} 
                      onChange={e => setLocalSettings({...localSettings, headerTitle: e.target.value})}
                      className="w-full border-2 border-gray-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Cor de Destaque (Fundo)</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="color" 
                        value={localSettings.headerBgColor || '#b91c1c'} 
                        onChange={e => setLocalSettings({...localSettings, headerBgColor: e.target.value})}
                        className="w-16 h-16 rounded-2xl border-4 border-white shadow-xl cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="text-xs font-black text-gray-800 uppercase tracking-tighter">{localSettings.headerBgColor || '#b91c1c'}</div>
                        <p className="text-[10px] text-gray-400 font-bold">Cor aplicada no cabeçalho e botões.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 flex items-center justify-between">
                       Escala de Impressão
                       <span className="text-blue-600 font-black">{Math.round((localSettings.printScale || 1.0) * 100)}%</span>
                    </label>
                    <input 
                        type="range" min="0.5" max="1.5" step="0.1" 
                        value={localSettings.printScale || 1.0} 
                        onChange={e => setLocalSettings({...localSettings, printScale: parseFloat(e.target.value)})}
                        className="w-full accent-blue-600 cursor-pointer h-2 bg-gray-100 rounded-full appearance-none mt-2"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-600 rounded-2xl shadow-lg shadow-orange-100"><ImageIcon className="w-5 h-5 text-white" /></div>
                    <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Logotipos Institucionais</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                   {[1, 2].map((num) => {
                     const key = `headerLogoUrl${num}` as 'headerLogoUrl1' | 'headerLogoUrl2';
                     return (
                        <div key={key} className="space-y-3">
                           <div className="relative aspect-square bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-100 overflow-hidden flex items-center justify-center group">
                              {localSettings[key] ? (
                                <img src={localSettings[key]} className="w-full h-full object-contain p-4" alt={`Logo ${num}`} />
                              ) : (
                                <div className="text-center p-4">
                                  <Upload className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                  <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Logo {num}</span>
                                </div>
                              )}
                              <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer backdrop-blur-[2px]">
                                 <div className="bg-white px-4 py-2 rounded-2xl text-[9px] font-black uppercase text-gray-800">Alterar</div>
                                 <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(key, e)} />
                              </label>
                           </div>
                           <button onClick={() => setLocalSettings({...localSettings, [key]: undefined})} className="w-full text-[8px] font-black uppercase text-red-400 hover:text-red-600 transition-colors">Remover Logo {num}</button>
                        </div>
                     );
                   })}
                </div>
              </section>
            </div>

            <section className="bg-gray-900 p-8 rounded-[3rem] text-white space-y-6 shadow-2xl">
               <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20"><Database className="w-5 h-5 text-blue-400" /></div>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em]">Infraestrutura de Dados (Cloud)</h4>
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-500 uppercase block ml-1">URL do Google Apps Script (Webhook)</label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <input 
                            type="text" 
                            value={localSettings.googleSheetUrl || ''} 
                            onChange={e => setLocalSettings({...localSettings, googleSheetUrl: e.target.value})}
                            className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-4 text-xs font-mono text-blue-300 outline-none focus:border-blue-500 transition-all placeholder:text-gray-700"
                            placeholder="https://script.google.com/macros/s/..."
                        />
                        <Wifi className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                     <Info className="w-3 h-3" /> ATENÇÃO: Verifique as permissões do script antes de alterar esta URL.
                  </p>
               </div>
            </section>
          </div>
        )}

        {/* ABOUT TAB */}
        {activeTab === 'about' && (
          <div className="p-12 h-full flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-blue-200 rotate-12">
               <Stamp className="w-12 h-12 text-white" />
            </div>
            <div className="max-w-md">
                <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-2">CheckViatura Pro</h3>
                <p className="text-xs font-black text-blue-600 uppercase tracking-[0.5em] mb-6">Inspeção Operacional e controle de viaturas</p>
                <div className="h-1 w-20 bg-gray-100 mx-auto rounded-full mb-8"></div>
                <div className="space-y-4 text-xs font-bold text-gray-500 leading-relaxed uppercase tracking-widest px-6">
                    <p>Desenvolvido para agilidade operacional.</p>
                    <div className="text-[10px] border-t pt-4 border-gray-100 space-y-1">
                        <p>Versão: 3.6.5 (Build Auditor)</p>
                        <p>Desenvolvido por Cavalieri</p>
                    </div>
                    <p className="text-[9px] text-gray-300">© 2026 Todos os Direitos Reservados</p>
                </div>
            </div>
          </div>
        )}
      </div>

      {/* RELATÓRIO DE CONFERÊNCIA TÉCNICA (Modal) */}
      {selectedLog && (
        <div className="fixed inset-0 z-[200] bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[96vh] border-8 border-white">
              {/* Header Relatório */}
              <div className="bg-gray-900 p-6 flex items-center justify-between text-white shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-2xl border border-white/20"><FileText className="w-7 h-7 text-blue-400" /></div>
                    <div>
                      <h3 className="font-black text-sm uppercase tracking-[0.3em]">Relatório Técnico de Inspeção</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Protocolo Digital de Auditoria de Frota</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedLog(null)} className="p-2.5 bg-white/10 hover:bg-red-500 hover:text-white rounded-2xl transition-all"><X className="w-6 h-6" /></button>
              </div>
              
              {/* Corpo Relatório */}
              <div className="flex-1 overflow-auto p-6 sm:p-10 space-y-10">
                 {/* Protocolo e Identificação Robusta */}
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-1 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-gray-400">
                            <Hash className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Protocolo</span>
                        </div>
                        <div className="bg-gray-50 border p-4 rounded-3xl">
                            <span className="text-[10px] font-black text-gray-800 break-all">{selectedLog.id}</span>
                        </div>
                    </div>

                    <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100 flex flex-col gap-1">
                           <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1"><Truck className="w-3 h-3" /> Viatura</span>
                           <div className="text-sm font-black text-blue-900 uppercase">{getViatura(selectedLog)}</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 flex flex-col gap-1">
                           <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Fingerprint className="w-3 h-3" /> Placa</span>
                           <div className="text-sm font-black text-gray-800 uppercase">{getPlaca(selectedLog)}</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 flex flex-col gap-1">
                           <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Gauge className="w-3 h-3" /> Odômetro</span>
                           <div className="text-sm font-black text-gray-800 uppercase">{getKm(selectedLog)} <span className="text-[9px] opacity-50">KM</span></div>
                        </div>
                        <div className="bg-orange-50/50 p-4 rounded-3xl border border-orange-100 flex flex-col gap-1">
                           <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-1"><Calendar className="w-3 h-3" /> Ciclo</span>
                           <div className="text-sm font-black text-orange-900 uppercase">{getCiclo(selectedLog)}</div>
                        </div>
                    </div>
                 </div>

                 {/* Detalhes de Data e Conferente */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex items-center gap-4 bg-gray-900/5 p-5 rounded-[2.5rem] border border-gray-100">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100"><Clock className="w-6 h-6 text-gray-400" /></div>
                        <div>
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Data e Hora do Registro</span>
                            <span className="text-xs font-black text-gray-700 uppercase">{formatDisplayDate(selectedLog.date)}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-blue-600 p-5 rounded-[2.5rem] shadow-xl shadow-blue-100">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30"><UserCheck className="w-6 h-6 text-white" /></div>
                        <div>
                            <span className="text-[8px] font-black text-white/60 uppercase tracking-widest block">Responsável Conferente</span>
                            <span className="text-xs font-black text-white uppercase">{getInspector(selectedLog)}</span>
                        </div>
                    </div>
                 </div>

                 {/* Registro Visual Se existir */}
                 {selectedLog.screenshot && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                               <Camera className="w-4 h-4 text-blue-500" /> Evidência Visual Digital
                            </h4>
                            <span className="text-[8px] font-black text-gray-300 uppercase italic">Captura Automática v3.6</span>
                        </div>
                        <div className="border-[12px] border-gray-50 rounded-[3rem] overflow-hidden shadow-inner bg-white">
                            <img src={selectedLog.screenshot} alt="Visual Record" className="w-full h-auto hover:scale-105 transition-transform duration-700" />
                        </div>
                    </div>
                 )}

                 {/* Itens Conferidos */}
                 <div className="space-y-5">
                    <div className="flex items-center justify-between border-b pb-3">
                        <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                           <ClipboardCheck className="w-5 h-5 text-green-500" /> Malha de Inspeção e Conformidade
                        </h4>
                        <div className="flex gap-3">
                            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm border ${
                                String(getStatusSummary(selectedLog)).includes('CN') && !String(getStatusSummary(selectedLog)).includes('0 CN')
                                ? 'bg-red-50 text-red-600 border-red-100'
                                : 'bg-green-50 text-green-600 border-green-100'
                            }`}>
                                {getStatusSummary(selectedLog)}
                            </span>
                        </div>
                    </div>
                    
                    <div className="border-2 border-gray-50 rounded-[2.5rem] overflow-hidden bg-white shadow-sm">
                       <table className="w-full text-left">
                          <thead className="bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
                              <tr>
                                  <th className="p-5">Verificação Operacional</th>
                                  <th className="p-5 text-right">Resultado</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 text-xs">
                             {getItemsList(selectedLog).map((item: any, i: number) => (
                               <tr key={i} className={`transition-colors group ${item.status === 'CN' ? 'bg-red-50/30' : 'hover:bg-gray-50/40'}`}>
                                  <td className="p-5">
                                     <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full ${item.status === 'CN' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="font-black text-gray-700 uppercase text-[10px] tracking-tight">{item.label}</div>
                                            {item.observation && (
                                                <div className="bg-white/60 p-2 rounded-xl border border-dashed mt-1.5">
                                                    <span className="text-[9px] text-gray-400 font-bold uppercase italic flex items-center gap-1"><Info className="w-3 h-3" /> Nota Auditoria:</span>
                                                    <p className="text-[10px] font-bold text-gray-600 mt-0.5">{item.observation}</p>
                                                </div>
                                            )}
                                        </div>
                                     </div>
                                  </td>
                                  <td className="p-5 text-right">
                                     <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm border ${
                                         item.status === 'SN' || item.status === 'OK' 
                                         ? 'bg-green-600 text-white border-green-500' 
                                         : 'bg-red-600 text-white border-red-500'
                                     }`}>
                                        {item.status === 'SN' || item.status === 'OK' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                        {item.status === 'SN' || item.status === 'OK' ? 'CONFORME' : 'AVARIA'}
                                     </div>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>

                 {/* Observações Gerais Parecer */}
                 {getField(selectedLog, ['generalObservation', 'observacoes']) !== "N/A" && (
                   <div className="space-y-4 bg-gray-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Stamp className="w-32 h-32" /></div>
                      <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] flex items-center gap-2 relative z-10">
                        <Info className="w-4 h-4" /> Parecer Técnico de Conclusão
                      </h4>
                      <div className="text-xs font-medium italic leading-relaxed text-gray-300 relative z-10 border-l-2 border-blue-500/30 pl-6">
                         "{getField(selectedLog, ['generalObservation', 'observacoes'])}"
                      </div>
                   </div>
                 )}
              </div>

              {/* Footer Modal */}
              <div className="p-8 bg-gray-50 flex gap-4 border-t shrink-0">
                 <button onClick={() => setSelectedLog(null)} className="flex-1 bg-gray-900 hover:bg-black text-white p-5 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3">
                    <CheckSquare className="w-5 h-5 text-green-500" /> Encerrar Consulta Auditoria
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
