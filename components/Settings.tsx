
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { AppSettings, ChecklistItem, ItemFrequency, AspectRatio, LogEntry } from '../types';
import { FIXED_GOOGLE_SHEET_URL } from '../constants';
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

import { Reports } from './Reports';

interface AuditUser {
  username: string;
  password?: string;
  createdAt?: string;
}

interface SettingsProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onClose: () => void;
  initialTab?: 'items' | 'images' | 'style' | 'about' | 'admin' | 'manual' | 'reports';
}

export const Settings: React.FC<SettingsProps> = ({ 
  settings, 
  onSave, 
  onClose, 
  initialTab = 'items'
}) => {
  const [activeTab, setActiveTab] = useState<'items' | 'images' | 'style' | 'about' | 'admin' | 'manual' | 'reports'>(initialTab);
  const [localSettings, setLocalSettings] = useState<AppSettings>(() => {
    const s = { ...settings };
    // Se a URL estiver vazia ou for a URL antiga, forçamos a atualização para a nova URL fixa
    if (!s.googleSheetUrl || s.googleSheetUrl.includes('AKfycbz4tRvSdFPBJH5F8RBBg-30Br4e1-Ut4dxFSFejKvJtR8sgxgx5lZ25xHAvz_Z-4rK1')) {
      s.googleSheetUrl = FIXED_GOOGLE_SHEET_URL;
    }
    return {
      ...s,
      vehicleImageRatios: s.vehicleImageRatios || ['landscape', 'landscape', 'landscape', 'landscape', 'landscape']
    };
  });
  
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
  
  // User Management Form
  const [newUser, setNewUser] = useState<AuditUser>({ username: '', password: '' });
  
  const printMirrorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const hasAttemptedInitialFetch = useRef(false);

  // Efeito para carregar dados automaticamente ao entrar nas abas que dependem do banco
  useEffect(() => {
    if ((activeTab === 'admin' || activeTab === 'reports') && !hasAttemptedInitialFetch.current) {
      console.log(`Aba ${activeTab} ativada pela primeira vez. Disparando sincronização inicial...`);
      hasAttemptedInitialFetch.current = true;
      fetchLogs();
      fetchUsers();
    }
  }, [activeTab]);

  const fetchLogs = async (prefix?: string, month?: string, retryCount = 0) => {
    const rawUrl = localSettings.googleSheetUrl || FIXED_GOOGLE_SHEET_URL;
    const targetUrl = rawUrl?.trim();
    
    if (!targetUrl) {
      console.warn("URL do Google Sheets não configurada.");
      return;
    }
    
    if (isLoadingLogs && retryCount === 0) return;
    setIsLoadingLogs(true);
    
    const cleanPrefix = (prefix && prefix.trim() !== '') ? prefix.trim() : undefined;
    const cleanMonth = (month && month !== 'all' && month.trim() !== '') ? month.trim() : undefined;

    console.log(`[Tentativa ${retryCount + 1}] Buscando logs: ${targetUrl}`);
    
    try {
      let url = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=getLogs`;
      if (cleanPrefix) url += `&prefix=${encodeURIComponent(cleanPrefix)}`;
      if (cleanMonth) url += `&month=${encodeURIComponent(cleanMonth)}`;
      url += `&_t=${Date.now()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store'
      });

      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

      const result = await response.json();
      if (Array.isArray(result)) {
        setLogs(result.filter(log => log && (log.id || log.ID)));
      }
    } catch (err) {
      console.error(`Erro na tentativa ${retryCount + 1} ao buscar logs:`, err);
      if (retryCount < 2) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchLogs(prefix, month, retryCount + 1);
      }
      alert("ERRO AO BUSCAR LOGS: Não foi possível obter os dados.\n\nIsso geralmente ocorre se o Google Apps Script não estiver publicado como 'Qualquer pessoa' (Anyone) ou se a URL estiver incorreta.");
      setLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const fetchUsers = async (retryCount = 0): Promise<AuditUser[]> => {
    const rawUrl = localSettings.googleSheetUrl || FIXED_GOOGLE_SHEET_URL;
    const targetUrl = rawUrl?.trim();
    if (!targetUrl) return [];

    console.log(`[Tentativa ${retryCount + 1}] Buscando usuários: ${targetUrl}`);
    try {
      let url = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=getUsers&_t=${Date.now()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store'
      });

      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

      const result = await response.json();
      if (Array.isArray(result)) {
        const validUsers = result.filter(u => u && u.username);
        setUsersList(validUsers);
        return validUsers;
      }
      return [];
    } catch (err) {
      console.error(`Erro na tentativa ${retryCount + 1} ao buscar usuários:`, err);
      if (retryCount < 2) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchUsers(retryCount + 1);
      }
      alert("ERRO AO BUSCAR USUÁRIOS: Verifique as permissões do Google Apps Script (deve ser 'Qualquer pessoa').");
      return [];
    }
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
    const rawUrl = localSettings.googleSheetUrl || FIXED_GOOGLE_SHEET_URL;
    const targetUrl = rawUrl?.trim();
    
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({ action: 'saveUser', ...newUser })
      }).catch(err => {
        console.warn("Erro CORS ao salvar usuário, tentando no-cors...", err);
        return fetch(targetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify({ action: 'saveUser', ...newUser })
        });
      });
      
      if (response && response.type !== 'opaque') {
        const result = await response.json();
        if (result.result === 'success') {
          alert("Usuário cadastrado com sucesso!");
        } else {
          alert(`Erro: ${result.message}`);
        }
      } else {
        alert("Comando enviado ao servidor. Verifique a lista em instantes.");
      }
      
      setNewUser({ username: '', password: '' });
      
      setTimeout(() => {
        fetchUsers();
        setIsSavingUser(false);
      }, 2000);
      
    } catch (e) {
      console.error("Save User Error:", e);
      alert("Erro ao processar solicitação.");
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (username.toUpperCase() === 'CAVALIERI') return;
    if (!confirm(`Confirma a EXCLUSÃO do usuário auditor: ${username}?`)) return;
    
    const rawUrl = localSettings.googleSheetUrl || FIXED_GOOGLE_SHEET_URL;
    const targetUrl = rawUrl?.trim();
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({ action: 'deleteUser', username })
      }).catch(err => {
        console.warn("Erro CORS ao excluir usuário, tentando no-cors...", err);
        return fetch(targetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify({ action: 'deleteUser', username })
        });
      });
      
      if (response && response.type !== 'opaque') {
        const result = await response.json();
        if (result.result === 'success') {
          alert("Usuário excluído com sucesso!");
        } else {
          alert(`Erro: ${result.message}`);
        }
      } else {
        alert("Comando de exclusão enviado.");
      }
      
      setTimeout(fetchUsers, 2000);
    } catch (e) {
      console.error("Delete User Error:", e);
      alert("Erro ao processar exclusão.");
    }
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
      const insp = String(l.inspector || l.Inspetor || l.inspetor || l.conferente || 'NÃO IDENTIFICADO').toUpperCase().trim();
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

  // Função disparada ao trocar abas
  const handleTabChange = (tabId: typeof activeTab) => {
    setActiveTab(tabId);
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
          { id: 'reports', label: 'Relatórios', icon: FileText },
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
                     {currentAuditUser === 'CAVALIERI' && (
                       <button onClick={() => setAdminSubTab('users')} className={`text-[10px] font-black uppercase px-4 py-2 rounded-lg transition-all ${adminSubTab === 'users' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-100'}`}>Gestão de Acesso</button>
                     )}
                   </div>
                   <div className="flex items-center gap-3">
                     <span className="text-[9px] font-black text-gray-400 uppercase hidden sm:block">Logado como: <span className="text-blue-600">{currentAuditUser}</span></span>
                     <button 
                       onClick={async () => {
                         const targetUrl = localSettings.googleSheetUrl || FIXED_GOOGLE_SHEET_URL;
                         try {
                           const res = await fetch(`${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=test&_t=${Date.now()}`, {
                             method: 'GET',
                             mode: 'cors',
                             cache: 'no-store'
                           });
                           
                           if (res.ok) {
                             const data = await res.json();
                             if (data.result === 'success') {
                               alert(`CONEXÃO OK!\nServidor respondeu com sucesso.\nHorário do Servidor: ${data.timestamp}`);
                             } else {
                               alert(`ERRO NO SCRIPT: ${data.message}`);
                             }
                           } else {
                             alert(`ERRO HTTP: ${res.status}\nO script pode não estar publicado corretamente.`);
                           }
                         } catch (e) {
                           console.error("Test Connection Error:", e);
                           alert("ERRO DE CONEXÃO: O script parece estar exigindo LOGIN ou está inacessível.\n\nCertifique-se de que em 'Quem tem acesso' esteja selecionado 'Qualquer pessoa' (Anyone).");
                         }
                       }} 
                       className="text-[9px] font-black uppercase text-green-600 flex items-center gap-1 hover:underline"
                     >
                       <Activity className="w-3 h-3" /> Testar Conexão
                     </button>
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

        {activeTab === 'reports' && (
          <ErrorBoundary>
            <Reports 
              logs={logs} 
              settings={localSettings} 
              onFetch={fetchLogs}
              isLoading={isLoadingLogs}
            />
          </ErrorBoundary>
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
    </div>
  );
};
