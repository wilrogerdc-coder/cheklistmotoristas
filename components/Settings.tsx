
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppSettings, ChecklistItem, ItemFrequency, AspectRatio, LogEntry } from '../types';
import { 
  Trash2, 
  Plus, 
  ArrowLeft, 
  CheckCircle, 
  Image as ImageIcon, 
  Palette, 
  ListChecks,
  Lock,
  Search,
  RefreshCw,
  FileText,
  LayoutDashboard,
  Calendar,
  X,
  Eye as ViewIcon,
  AlertTriangle,
  Activity,
  Wifi,
  WifiOff,
  Clock,
  UserCheck,
  ClipboardList,
  ClipboardCheck,
  FileSearch,
  BookOpen,
  Tag,
  Printer,
  RectangleHorizontal,
  RectangleVertical,
  Camera,
  Info,
  TrendingUp,
  BarChart3,
  Users,
  Car,
  PieChart,
  ShieldCheck,
  Zap,
  Key,
  ShieldAlert,
  Save,
  UserPlus
} from 'lucide-react';
import { Header } from './Header';
import { Footer } from './Footer';

// URL unificada com App.tsx para garantir que a auditoria consulte o mesmo banco de dados dos logs
const FIXED_GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbz4tRvSdFPBJH5F8RBBg-30Br4e1-Ut4dxFSFejKvJtR8sgxgx5lZ25xHAvz_Z-4rK1/exec';

interface AuditUser {
  username: string;
  password?: string;
  createdAt?: string;
}

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
  const [localSettings, setLocalSettings] = useState<AppSettings>(() => ({
    ...settings,
    googleSheetUrl: settings.googleSheetUrl || FIXED_GOOGLE_SHEET_URL,
    vehicleImageRatios: settings.vehicleImageRatios || ['landscape', 'landscape', 'landscape', 'landscape', 'landscape']
  }));
  
  const [newItem, setNewItem] = useState({ label: '', frequency: 'Diário' as ItemFrequency });
  
  // Auth State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [currentAuditUser, setCurrentAuditUser] = useState<string | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Data States
  const [adminSubTab, setAdminSubTab] = useState<'dashboard' | 'logs' | 'users'>('dashboard');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [usersList, setUsersList] = useState<AuditUser[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [logFilter, setLogFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  
  // User Management Form
  const [newUser, setNewUser] = useState<AuditUser>({ username: '', password: '' });
  
  const printMirrorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Efeito para carregar usuários sempre que a sub-aba de usuários for aberta ou quando entrar na auditoria
  useEffect(() => {
    if (activeTab === 'admin') {
      if (adminSubTab === 'users' && currentAuditUser === 'CAVALIERI') {
        fetchUsers();
      } else if (!isAdminAuthenticated) {
        fetchUsers();
      }
    }
  }, [activeTab, adminSubTab, isAdminAuthenticated, currentAuditUser]);

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
      }
    } catch (err) {
      console.error("Erro fetch logs", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const fetchUsers = async (): Promise<AuditUser[]> => {
    const targetUrl = localSettings.googleSheetUrl || FIXED_GOOGLE_SHEET_URL;
    try {
      const response = await fetch(`${targetUrl}?action=getUsers`);
      const result = await response.json();
      if (Array.isArray(result)) {
        // Filtra para garantir que os dados são válidos
        const validUsers = result.filter(u => u && u.username);
        setUsersList(validUsers);
        return validUsers;
      }
    } catch (e) {
      console.error("Erro fetch users", e);
    }
    return [];
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      alert("Informe usuário e senha.");
      return;
    }

    setIsLoggingIn(true);
    const targetUrl = localSettings.googleSheetUrl || FIXED_GOOGLE_SHEET_URL;
    
    // Check Super User (CAVALIERI)
    if (loginUsername.toUpperCase() === 'CAVALIERI' && loginPassword.toLowerCase() === 'tricolor') {
      setIsAdminAuthenticated(true);
      setCurrentAuditUser('CAVALIERI');
      setIsLoggingIn(false);
      fetchLogs();
      fetchUsers();
      return;
    }

    // Sincronização em tempo real no momento do login para garantir novos usuários
    try {
      const response = await fetch(`${targetUrl}?action=getUsers`);
      const updatedUsers = await response.json();
      if (Array.isArray(updatedUsers)) {
        setUsersList(updatedUsers);
        
        const match = updatedUsers.find((u: any) => 
          u && u.username && u.username.toString().toLowerCase() === loginUsername.toLowerCase() && 
          u.password && u.password.toString() === loginPassword
        );

        if (match) {
          setIsAdminAuthenticated(true);
          setCurrentAuditUser(match.username.toUpperCase());
          setAdminSubTab('dashboard');
          fetchLogs();
        } else {
          alert("CREDENCIAS INVÁLIDAS: Usuário não cadastrado ou senha incorreta.");
        }
      } else {
        throw new Error("Resposta inválida do servidor");
      }
    } catch (err) {
      alert("ERRO DE COMUNICAÇÃO: Não foi possível validar as credenciais com o servidor.");
      console.error("Login Validation Error:", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSaveUser = async () => {
    if (!newUser.username || !newUser.password) {
      alert("Preencha Username e Senha para o novo auditor.");
      return;
    }
    
    setIsSavingUser(true);
    const targetUrl = localSettings.googleSheetUrl || FIXED_GOOGLE_SHEET_URL;
    
    try {
      // Envio via POST (no-cors)
      await fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveUser', ...newUser }) as any
      });
      
      alert("Registro de usuário enviado com sucesso.");
      setNewUser({ username: '', password: '' });
      
      // Delay de propagação no Google Sheets antes de atualizar a lista local
      setTimeout(() => {
        fetchUsers();
        setIsSavingUser(false);
      }, 2500);
      
    } catch (e) {
      alert("Erro ao gravar usuário no banco.");
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (username.toUpperCase() === 'CAVALIERI') return;
    if (!confirm(`Confirma a EXCLUSÃO do usuário auditor: ${username}?`)) return;
    
    const targetUrl = localSettings.googleSheetUrl || FIXED_GOOGLE_SHEET_URL;
    try {
      await fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteUser', username }) as any
      });
      
      alert("Comando de exclusão enviado.");
      setTimeout(fetchUsers, 2000);
    } catch (e) {
      alert("Erro ao excluir usuário.");
    }
  };

  const getFullData = (log: LogEntry): any => {
    // Suporte para chaves com diferentes capitalizações (fullData ou fulldata)
    const rawData = log.fullData || (log as any).fulldata;
    
    if (rawData && String(rawData).trim().startsWith('{')) {
      try { 
        return JSON.parse(String(rawData)); 
      } catch (e) {
        console.error("Erro parse fullData", e);
      }
    }
    return null;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('pt-BR');
    } catch (e) { return dateStr; }
  };

  const stats = useMemo(() => {
    if (!Array.isArray(logs) || logs.length === 0) return { 
      total: 0, withIssues: 0, diario: 0, semanal: 0, conformityRate: 0,
      topInspectors: [], topVehicles: []
    };

    const diario = logs.filter(l => l.checklistType === 'Diário').length;
    const semanal = logs.filter(l => l.checklistType === 'Semanal').length;
    const withIssues = logs.filter(l => String(l.itemsStatus).includes('CN') && !String(l.itemsStatus).includes('0 CN')).length;
    const conformityRate = ((logs.length - withIssues) / logs.length) * 100;

    const inspectorsMap: Record<string, number> = {};
    const vehiclesMap: Record<string, number> = {};
    
    logs.forEach(l => {
      const insp = String(l.inspector || 'NÃO IDENTIFICADO').toUpperCase().trim();
      const vtr = String(l.prefix || 'N/A').toUpperCase().trim();
      inspectorsMap[insp] = (inspectorsMap[insp] || 0) + 1;
      vehiclesMap[vtr] = (vehiclesMap[vtr] || 0) + 1;
    });

    return { 
      total: logs.length, 
      withIssues, 
      diario, 
      semanal,
      conformityRate,
      topInspectors: Object.entries(inspectorsMap).sort((a,b) => b[1]-a[1]).slice(0,5).map(([name, count]) => ({ name, count })),
      topVehicles: Object.entries(vehiclesMap).sort((a,b) => b[1]-a[1]).slice(0,5).map(([name, count]) => ({ name, count }))
    };
  }, [logs]);

  const handleAddItem = () => {
    if (!newItem.label.trim()) return;
    const newItemObj = { id: crypto.randomUUID(), label: newItem.label, frequency: newItem.frequency };
    setLocalSettings({ ...localSettings, defaultItems: [...localSettings.defaultItems, newItemObj] });
    setNewItem({ label: '', frequency: 'Diário' });
  };

  const removeItem = (id: string) => {
    setLocalSettings({ ...localSettings, defaultItems: localSettings.defaultItems.filter(i => i.id !== id) });
  };

  const handleLogoUpload = (key: 'headerLogoUrl1' | 'headerLogoUrl2', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLocalSettings({ ...localSettings, [key]: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handlePrintMirror = () => { if (printMirrorRef.current) window.print(); };

  // Função disparada ao trocar abas para garantir sincronização
  const handleTabChange = (tabId: typeof activeTab) => {
    setActiveTab(tabId);
    if (tabId === 'admin') {
      fetchUsers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors no-print"><ArrowLeft className="w-5 h-5" /></button>
          <h2 className="text-xl font-bold text-gray-800">Centro de Inteligência de Frota</h2>
        </div>
        <button onClick={() => onSave(localSettings)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold no-print shadow-lg">Aplicar Ajustes</button>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-2 no-print">
        {[
          { id: 'manual', label: 'Manual', icon: BookOpen },
          { id: 'items', label: 'Itens', icon: ListChecks },
          { id: 'images', label: 'Plantas', icon: ImageIcon },
          { id: 'style', label: 'Estilo', icon: Palette },
          { id: 'admin', label: 'Auditoria', icon: Lock },
          { id: 'about', label: 'SOBRE', icon: Info }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => handleTabChange(tab.id as any)} 
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="bg-white border rounded-3xl overflow-hidden min-h-[500px] shadow-sm">
        {activeTab === 'manual' && (
          <div className="p-8 space-y-6">
            <h3 className="text-2xl font-black text-gray-900 uppercase">Manual de Operação Técnica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-2xl space-y-2 border">
                <h4 className="font-black text-xs text-blue-600 uppercase">1. Identificação</h4>
                <p className="text-[11px] text-gray-600 font-medium">Preencha Prefixo, Placa e KM. Escolha o ciclo de inspeção (Diário ou Semanal).</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl space-y-2 border">
                <h4 className="font-black text-xs text-orange-600 uppercase">2. Mapeamento</h4>
                <p className="text-[11px] text-gray-600 font-medium">Toque nas plantas da viatura para marcar pontos de avaria externa.</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl space-y-2 border">
                <h4 className="font-black text-xs text-green-600 uppercase">3. Checklist</h4>
                <p className="text-[11px] text-gray-600 font-medium">Marque SN (Sem Novidade) ou CN (Com Novidade) para cada item técnico.</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl space-y-2 border">
                <h4 className="font-black text-xs text-purple-600 uppercase">4. Finalização</h4>
                <p className="text-[11px] text-gray-600 font-medium">Assine digitalmente e gere o PDF para protocolo oficial.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'items' && (
          <div className="p-6 space-y-4">
            <div className="flex gap-2 bg-gray-50 p-3 rounded-2xl border">
              <input type="text" placeholder="Nome do item..." value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} className="flex-1 bg-white border rounded-xl px-4 py-2 text-xs font-bold outline-none" />
              <select value={newItem.frequency} onChange={e => setNewItem({...newItem, frequency: e.target.value as any})} className="bg-white border rounded-xl px-3 py-2 text-xs font-black uppercase">
                <option value="Diário">Diário</option>
                <option value="Semanal">Semanal</option>
                <option value="Ambos">Ambos</option>
              </select>
              <button onClick={handleAddItem} className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-all"><Plus className="w-6 h-6" /></button>
            </div>
            <div className="max-h-[400px] overflow-y-auto divide-y border rounded-2xl">
              {localSettings.defaultItems.map(item => (
                <div key={item.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-[11px] font-bold text-gray-800">{item.label}</p>
                    <span className="text-[9px] font-black uppercase text-blue-500">{item.frequency}</span>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'images' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {localSettings.vehicleImages.map((img, idx) => (
              <div key={idx} className="border p-4 rounded-2xl space-y-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase text-gray-500">Vista {idx + 1}</h4>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      const nr = [...(localSettings.vehicleImageRatios || [])];
                      nr[idx] = nr[idx] === 'landscape' ? 'portrait' : 'landscape';
                      setLocalSettings({...localSettings, vehicleImageRatios: nr as AspectRatio[]});
                    }} className="p-1.5 bg-white border rounded-lg text-gray-400 hover:text-blue-500">
                      {localSettings.vehicleImageRatios?.[idx] === 'landscape' ? <RectangleVertical className="w-4 h-4" /> : <RectangleHorizontal className="w-4 h-4" />}
                    </button>
                    <label className="p-1.5 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"><Camera className="w-4 h-4" /><input type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if(file) {
                        const r = new FileReader();
                        r.onloadend = () => {
                          const ni = [...localSettings.vehicleImages];
                          ni[idx] = r.result as string;
                          setLocalSettings({...localSettings, vehicleImages: ni});
                        };
                        r.readAsDataURL(file);
                      }
                    }} /></label>
                  </div>
                </div>
                <div className={`relative bg-white border rounded-lg overflow-hidden flex items-center justify-center ${localSettings.vehicleImageRatios?.[idx] === 'landscape' ? 'aspect-video' : 'aspect-[3/4]'}`}>
                  {img ? <img src={img} className="w-full h-full object-contain" /> : <ImageIcon className="w-8 h-8 text-gray-200" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'style' && (
          <div className="p-8 space-y-8">
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-gray-400">Identidade da Organização</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500">Título do Cabeçalho</label>
                  <input type="text" value={localSettings.headerTitle} onChange={e => setLocalSettings({...localSettings, headerTitle: e.target.value})} className="w-full border rounded-xl p-3 text-xs font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500">Cor Institucional</label>
                  <input type="color" value={localSettings.headerBgColor || '#b91c1c'} onChange={e => setLocalSettings({...localSettings, headerBgColor: e.target.value})} className="w-full h-11 p-1 bg-white border rounded-xl cursor-pointer" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500">Brasão 1</label>
                <div className="border-2 border-dashed p-4 rounded-2xl flex flex-col items-center gap-3 bg-gray-50">
                  {localSettings.headerLogoUrl1 && <img src={localSettings.headerLogoUrl1} className="h-20 object-contain" />}
                  <label className="bg-white border px-4 py-2 rounded-xl text-[10px] font-black uppercase cursor-pointer hover:bg-gray-100 shadow-sm">Alterar Logo 1 <input type="file" className="hidden" onChange={e => handleLogoUpload('headerLogoUrl1', e)} /></label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500">Brasão 2</label>
                <div className="border-2 border-dashed p-4 rounded-2xl flex flex-col items-center gap-3 bg-gray-50">
                  {localSettings.headerLogoUrl2 && <img src={localSettings.headerLogoUrl2} className="h-20 object-contain" />}
                  <label className="bg-white border px-4 py-2 rounded-xl text-[10px] font-black uppercase cursor-pointer hover:bg-gray-100 shadow-sm">Alterar Logo 2 <input type="file" className="hidden" onChange={e => handleLogoUpload('headerLogoUrl2', e)} /></label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="p-6 h-full flex flex-col">
            {!isAdminAuthenticated ? (
              <form onSubmit={handleLogin} className="max-w-xs mx-auto text-center space-y-4 pt-10">
                <div className="bg-blue-600 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-xl mb-4">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-black text-gray-900 uppercase">Audit Portal</h3>
                <div className="space-y-2">
                  <div className="relative">
                    <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="USUÁRIO" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} className="w-full border rounded-xl p-4 pl-12 text-xs font-black outline-none focus:border-blue-500 transition-all bg-gray-50" />
                  </div>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="password" placeholder="SENHA" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full border rounded-xl p-4 pl-12 text-xs font-black outline-none focus:border-blue-500 transition-all bg-gray-50" />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={isLoggingIn}
                  className="w-full bg-blue-600 text-white p-4 rounded-xl font-black text-xs shadow-lg hover:bg-blue-700 uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Entrar na Auditoria"}
                </button>
                <p className="text-[9px] font-black text-gray-400 uppercase">Sincronização Ativa com o Banco de Dados</p>
              </form>
            ) : (
              <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b pb-2">
                   <div className="flex items-center gap-2 overflow-x-auto">
                     <button onClick={() => setAdminSubTab('dashboard')} className={`text-[10px] font-black uppercase px-4 py-2 rounded-lg transition-all ${adminSubTab === 'dashboard' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-100'}`}>Dashboard Gerencial</button>
                     <button onClick={() => setAdminSubTab('logs')} className={`text-[10px] font-black uppercase px-4 py-2 rounded-lg transition-all ${adminSubTab === 'logs' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-100'}`}>Histórico de Registros</button>
                     {currentAuditUser === 'CAVALIERI' && (
                       <button onClick={() => setAdminSubTab('users')} className={`text-[10px] font-black uppercase px-4 py-2 rounded-lg transition-all ${adminSubTab === 'users' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-100'}`}>Gestão de Acesso</button>
                     )}
                   </div>
                   <div className="flex items-center gap-3">
                     <span className="text-[9px] font-black text-gray-400 uppercase hidden sm:block">Logado como: <span className="text-blue-600">{currentAuditUser}</span></span>
                     <button onClick={() => { fetchLogs(); fetchUsers(); }} className="text-[9px] font-black uppercase text-blue-600 flex items-center gap-1 hover:underline">
                       <RefreshCw className={`w-3 h-3 ${(isLoadingLogs || isSavingUser)?'animate-spin':''}`} /> Sincronizar Tudo
                     </button>
                   </div>
                </div>

                {adminSubTab === 'dashboard' && (
                  <div className="flex-1 overflow-y-auto pt-4 space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100 flex flex-col justify-between">
                        <BarChart3 className="w-5 h-5 text-blue-600 mb-2" />
                        <div>
                          <div className="text-2xl font-black text-blue-900">{stats.total}</div>
                          <p className="text-[9px] font-bold text-blue-500 uppercase">Inspeções Totais</p>
                        </div>
                      </div>
                      <div className="bg-red-50 p-4 rounded-3xl border border-red-100 flex flex-col justify-between">
                        <AlertTriangle className="w-5 h-5 text-red-600 mb-2" />
                        <div>
                          <div className="text-2xl font-black text-red-900">{stats.withIssues}</div>
                          <p className="text-[9px] font-bold text-red-500 uppercase">Viaturas com Avarias</p>
                        </div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-3xl border border-green-100 flex flex-col justify-between">
                        <ShieldCheck className="w-5 h-5 text-green-600 mb-2" />
                        <div>
                          <div className="text-2xl font-black text-green-900">{stats.conformityRate.toFixed(1)}%</div>
                          <p className="text-[9px] font-bold text-green-500 uppercase">Conformidade</p>
                        </div>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-3xl border border-orange-100 flex flex-col justify-between">
                        <Zap className="w-5 h-5 text-orange-600 mb-2" />
                        <div>
                          <div className="text-2xl font-black text-orange-900">{stats.diario}</div>
                          <p className="text-[9px] font-bold text-orange-500 uppercase">Ciclos Atuais</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                       <div className="bg-gray-50 border rounded-3xl p-6">
                          <div className="flex items-center gap-2 mb-4">
                             <Users className="w-4 h-4 text-blue-600" />
                             <h4 className="text-xs font-black uppercase text-gray-800">Conferentes Ativos</h4>
                          </div>
                          <div className="space-y-3">
                             {stats.topInspectors.map((item, i) => (
                               <div key={i} className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-gray-700 uppercase truncate max-w-[140px]">{item.name}</span>
                                    <span className="text-[10px] font-black text-blue-600">{item.count}</span>
                                  </div>
                                  <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600" style={{ width: `${(item.count / stats.total) * 100}%` }}></div>
                                  </div>
                               </div>
                             ))}
                          </div>
                       </div>

                       <div className="bg-gray-50 border rounded-3xl p-6">
                          <div className="flex items-center gap-2 mb-4">
                             <Car className="w-4 h-4 text-orange-600" />
                             <h4 className="text-xs font-black uppercase text-gray-800">Ranking Frota (Uso)</h4>
                          </div>
                          <div className="space-y-3">
                             {stats.topVehicles.map((item, i) => (
                               <div key={i} className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-gray-700 uppercase">{item.name}</span>
                                    <span className="text-[10px] font-black text-orange-600">{item.count}</span>
                                  </div>
                                  <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-600" style={{ width: `${(item.count / stats.total) * 100}%` }}></div>
                                  </div>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {adminSubTab === 'logs' && (
                  <div className="flex-1 flex flex-col min-h-0 bg-gray-50 rounded-2xl border overflow-hidden">
                    <div className="bg-white p-2 border-b flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-gray-400" />
                      <input type="text" placeholder="Filtrar por Viatura ou Placa..." value={logFilter} onChange={e => setLogFilter(e.target.value)} className="bg-transparent text-xs font-bold outline-none flex-1" />
                    </div>
                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-[10px] text-left border-collapse">
                        <thead className="sticky top-0 bg-gray-100 z-10 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b">
                          <tr><th className="p-3">Data/Hora</th><th className="p-3">Viatura</th><th className="p-3">Inspetor</th><th className="p-3">Status</th><th className="p-3 text-right">Relatório</th></tr>
                        </thead>
                        <tbody className="divide-y bg-white">
                          {logs.filter(l => String(l.prefix).toLowerCase().includes(logFilter.toLowerCase()) || String(l.plate).toLowerCase().includes(logFilter.toLowerCase())).map(log => (
                            <tr key={log.id} className="hover:bg-blue-50/50 transition-colors">
                              <td className="p-3 font-mono text-gray-500">{formatDate(log.date)}</td>
                              <td className="p-3 font-black text-gray-800 uppercase">{log.prefix} <span className="text-[8px] font-normal opacity-50 block">{log.plate}</span></td>
                              <td className="p-3 uppercase truncate max-w-[150px] font-bold text-gray-600">{log.inspector}</td>
                              <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${String(log.itemsStatus).includes('CN') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{log.itemsStatus}</span></td>
                              <td className="p-3 text-right"><button onClick={() => setSelectedLog(log)} className="p-2 bg-gray-100 hover:bg-blue-600 hover:text-white rounded-lg transition-all shadow-sm"><FileSearch className="w-4 h-4" /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {adminSubTab === 'users' && currentAuditUser === 'CAVALIERI' && (
                  <div className="flex-1 flex flex-col gap-6 pt-4 overflow-hidden">
                    <div className="bg-red-50 p-6 rounded-3xl border border-red-100 flex items-start gap-4">
                       <div className="bg-red-600 p-3 rounded-2xl text-white shadow-lg">
                          <ShieldAlert className="w-6 h-6" />
                       </div>
                       <div>
                          <h4 className="text-xs font-black uppercase text-red-900 mb-1">Painel de Controle de Acesso</h4>
                          <p className="text-[10px] text-red-700 font-medium leading-relaxed">Área restrita ao Superusuário. Aqui você pode cadastrar outros auditores que terão acesso limitado à aba Auditoria. O usuário CAVALIERI é o único mestre e não pode ser editado ou excluído.</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                       <div className="bg-white border rounded-3xl p-6 space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                             <UserPlus className="w-4 h-4 text-blue-600" />
                             <h4 className="text-xs font-black uppercase text-gray-800">Novo Auditor</h4>
                          </div>
                          <div className="space-y-3">
                             <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase">Username</label>
                                <input type="text" placeholder="Ex: Auditor01" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full border rounded-xl p-3 text-xs font-bold outline-none focus:border-blue-500" />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase">Senha de Acesso</label>
                                <input type="password" placeholder="••••••••" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full border rounded-xl p-3 text-xs font-bold outline-none focus:border-blue-500" />
                             </div>
                             <button onClick={handleSaveUser} disabled={isSavingUser} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all">
                                {isSavingUser ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Salvar Credenciais
                             </button>
                          </div>
                       </div>

                       <div className="bg-gray-50 border rounded-3xl p-4 flex flex-col min-h-0">
                          <div className="flex items-center gap-2 mb-3">
                             <ShieldCheck className="w-4 h-4 text-green-600" />
                             <h4 className="text-xs font-black uppercase text-gray-800">Auditores Cadastrados</h4>
                          </div>
                          <div className="flex-1 overflow-auto space-y-2">
                             {usersList.length === 0 && <div className="text-center py-10 text-[10px] text-gray-300 font-black uppercase">Nenhum auditor adicional.</div>}
                             {usersList.map((u, i) => (
                               u && u.username ? (
                               <div key={i} className="bg-white border p-3 rounded-2xl flex items-center justify-between shadow-sm group">
                                  <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">
                                        {u.username.substring(0,1).toUpperCase()}
                                     </div>
                                     <div>
                                        <p className="text-[11px] font-black text-gray-800 uppercase">{u.username}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">Acesso Autorizado</p>
                                     </div>
                                  </div>
                                  <button onClick={() => handleDeleteUser(u.username)} className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                     <Trash2 className="w-4 h-4" />
                                  </button>
                               </div>
                               ) : null
                             ))}
                          </div>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-blue-200">
              <ClipboardCheck className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 uppercase">CHECKLIST VIATURA</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em]">Versão 3.7.0 Auditoria</p>
            <div className="max-w-md bg-gray-50 p-6 rounded-3xl border border-gray-100">
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                Desenvolvido para gestão técnica de frotas de emergência e operacionais. 
                Sistema resiliente de auditoria com reconstrução dinâmica de relatórios espelho e controle de acessos multinível.
              </p>
            </div>
            <div className="pt-8 border-t w-full max-w-xs border-gray-100">
               <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Desenvolvido por CAVALIERI</p>
            </div>
          </div>
        )}
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-[200] bg-gray-900/90 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 no-print overflow-y-auto">
           <div className="bg-white w-full max-w-5xl rounded-none sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col min-h-screen sm:min-h-0 sm:max-h-[96vh]">
              <div className="bg-gray-900 p-4 flex items-center justify-between text-white shrink-0 no-print">
                 <div className="flex items-center gap-3">
                    <div><h3 className="font-black text-xs uppercase tracking-widest">Relatório de Auditoria</h3><p className="text-[8px] text-gray-400">Protocolo: {selectedLog.id}</p></div>
                 </div>
                 <div className="flex items-center gap-2">
                    <button onClick={handlePrintMirror} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all"><Printer className="w-4 h-4" /> Re-Imprimir PDF</button>
                    <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-red-500 rounded-full transition-all"><X className="w-6 h-6" /></button>
                 </div>
              </div>
              
              <div ref={printMirrorRef} className="flex-1 overflow-auto bg-white p-2 sm:p-4 print:p-0 print:overflow-visible">
                 <div className="max-w-4xl mx-auto space-y-4 print:space-y-4">
                    {(() => {
                        const mirrorData = getFullData(selectedLog);
                        if (!mirrorData) return <div className="p-10 text-center font-bold text-red-500 uppercase">Erro: Dados íntegros não encontrados no banco.</div>;
                        
                        const originalInspectionDateTime = formatDate(selectedLog.date);
                        const inspectionImages = mirrorData.vehicleImages || [];
                        const inspectionRatios = mirrorData.vehicleImageRatios || [];
                        const hasInspectionImages = inspectionImages.some((img: string) => img && img !== "");

                        return (
                          <div className="flex flex-col gap-4">
                            <Header 
                                title={mirrorData.headerTitle || "Checklist de Viatura"}
                                date={mirrorData.date || ""}
                                onDateChange={() => {}}
                                logoUrl1={mirrorData.headerLogoUrl1}
                                logoUrl2={mirrorData.headerLogoUrl2}
                                bgColor={mirrorData.headerBgColor}
                            />

                            <div className="px-4 py-2 space-y-6">
                                <section className="bg-gray-50 p-4 rounded-2xl border grid grid-cols-4 gap-4 print:grid-cols-4 shadow-inner">
                                    <div className="flex flex-col"><span className="text-[8px] font-black text-gray-400 uppercase">Viatura</span><span className="text-[11px] font-black uppercase text-gray-800">{selectedLog.prefix || mirrorData.prefix}</span></div>
                                    <div className="flex flex-col"><span className="text-[8px] font-black text-gray-400 uppercase">Placa</span><span className="text-[11px] font-black uppercase text-gray-800">{selectedLog.plate || mirrorData.plate}</span></div>
                                    <div className="flex flex-col"><span className="text-[8px] font-black text-gray-400 uppercase">Ciclo</span><span className="text-[11px] font-black uppercase text-blue-600">{selectedLog.checklistType || mirrorData.checklistType}</span></div>
                                    <div className="flex flex-col"><span className="text-[8px] font-black text-gray-400 uppercase">Odômetro</span><span className="text-[11px] font-black uppercase text-gray-800">{selectedLog.km || mirrorData.km} KM</span></div>
                                </section>

                                {hasInspectionImages && (
                                <section className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase text-gray-400 border-b pb-1">Mapeamento Visual de Avarias</h4>
                                    <div className="grid grid-cols-3 gap-3 print:grid-cols-3">
                                        {inspectionImages.map((img: string, idx: number) => {
                                            if (!img || img === "") return null;
                                            const dmgs = (mirrorData.damages || []).filter((d: any) => d.imageIndex === idx);
                                            const ratio = inspectionRatios[idx] || 'landscape';
                                            return (
                                                <div key={idx} className={`relative bg-gray-50 border rounded-xl overflow-hidden shadow-sm ${ratio === 'landscape' ? 'aspect-video' : 'aspect-[3/4]'}`}>
                                                    <img src={img} className="w-full h-full object-contain" alt={`Vista ${idx}`} />
                                                    {dmgs.map((d: any) => (
                                                        <div 
                                                            key={d.id} 
                                                            className="absolute w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white shadow-sm -translate-x-1/2 -translate-y-1/2" 
                                                            style={{ left: `${d.x}%`, top: `${d.y}%` }} 
                                                        />
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                                )}

                                <section className="border rounded-2xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left text-[10px] border-collapse">
                                      <thead className="bg-gray-100 uppercase font-black text-gray-500">
                                        <tr><th className="p-3">Item de Controle</th><th className="p-3 text-center">Status</th><th className="p-3">Observações / Evidências</th></tr>
                                      </thead>
                                      <tbody className="divide-y">{ (mirrorData.items || []).map((it:any, i:number) => (
                                        <tr key={i} className={it.status==='CN'?'bg-red-50/50':''}>
                                            <td className="p-3 font-bold text-gray-700">{it.label}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-white font-black text-[9px] uppercase ${it.status==='CN'?'bg-red-600' : it.status === 'OK' || it.status === 'SN' ? 'bg-green-600' : 'bg-gray-300'}`}>
                                                    {it.status === 'OK' ? 'SN' : it.status}
                                                </span>
                                            </td>
                                            <td className="p-3 italic text-gray-500">
                                                {it.observation || '-'}
                                                {it.photos?.length > 0 && <span className="ml-2 inline-flex items-center text-blue-600 font-bold text-[8px] uppercase tracking-tighter">[+ FOTOS]</span>}
                                            </td>
                                        </tr>
                                    ))}</tbody></table>
                                </section>

                                {(selectedLog.generalObservation || mirrorData.generalObservation) && (
                                    <section className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-inner">
                                        <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">Informações Gerais / Parecer do Inspetor</span>
                                        <p className="text-[11px] italic leading-relaxed text-gray-700 font-medium">
                                            "{selectedLog.generalObservation || mirrorData.generalObservation}"
                                        </p>
                                    </section>
                                )}

                                <Footer 
                                  signatureName={mirrorData.signatureName || selectedLog.inspector} 
                                  signatureRank={mirrorData.signatureRank || ""} 
                                  date={mirrorData.date} 
                                />
                                
                                <div className="text-center pt-2">
                                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Data/Hora Original da Inspeção: </span>
                                  <span className="text-[10px] font-black text-gray-700">{originalInspectionDateTime}</span>
                                </div>

                                <section className="space-y-4 pt-6 border-t break-before-page">
                                    <h4 className="text-[10px] font-black uppercase text-gray-400 text-center tracking-widest">Anexo de Evidências Fotográficas</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 print:grid-cols-2 gap-4">
                                        {(mirrorData.items || []).filter((i: any) => i.photos && i.photos.length > 0).map((item: any) => 
                                            item.photos.map((p: string, idx: number) => (
                                                <div key={`${item.id}-${idx}`} className="flex flex-col gap-1 break-inside-avoid">
                                                    <div className="relative aspect-square border-2 border-gray-100 rounded-2xl overflow-hidden bg-gray-50 shadow-sm">
                                                        <img src={p} className="w-full h-full object-contain" alt={`Foto Item ${item.label}`} />
                                                    </div>
                                                    <div className="bg-gray-800 text-white text-[8px] p-2 rounded-lg font-black truncate uppercase tracking-tighter">
                                                        Item: {item.label}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        {(mirrorData.photos || []).map((p: string, i: number) => (
                                            <div key={`g-${i}`} className="flex flex-col gap-1 break-inside-avoid">
                                                <div className="relative aspect-square border-2 border-gray-100 rounded-2xl overflow-hidden bg-gray-50 shadow-sm">
                                                    <img src={p} className="w-full h-full object-contain" alt="Evidência Geral" />
                                                </div>
                                                <div className="bg-blue-600 text-white text-[8px] p-2 rounded-lg font-black uppercase text-center tracking-tighter">
                                                    Evidência Geral {i + 1}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {(!(mirrorData.items?.some((i: any) => i.photos?.length)) && !(mirrorData.photos?.length)) && (
                                        <div className="p-10 border-2 border-dashed rounded-3xl text-center text-[10px] font-black text-gray-300 uppercase">
                                            Nenhuma evidência fotográfica anexada a este protocolo.
                                        </div>
                                    )}
                                </section>
                            </div>
                          </div>
                        );
                    })()}
                 </div>

                 <div className="hidden print:print-footer">
                    <span className="page-number"></span>
                    <span className="font-bold">Protocolo Auditoria: {selectedLog.id}</span>
                    <span className="italic">Documento Gerado em: {new Date().toLocaleString('pt-BR')}</span>
                 </div>

                 <div className="flex print:hidden justify-between text-[8px] font-black text-gray-400 uppercase p-6 border-t mt-4 bg-gray-50">
                    <span>ID Transação: {selectedLog.id}</span>
                    <span>Reimpressão via Auditoria: {new Date().toLocaleString('pt-BR')}</span>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
