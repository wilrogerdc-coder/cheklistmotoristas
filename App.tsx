
import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ChecklistTable } from './components/ChecklistTable';
import { DamageCanvas } from './components/DamageCanvas';
import { Settings } from './components/Settings';
import { 
  INITIAL_CHECKLIST_ITEMS, 
  INITIAL_VEHICLE_IMAGES,
  INITIAL_VEHICLE_RATIOS
} from './constants';
import { 
  InspectionData, 
  ItemStatus, 
  DamagePoint,
  AppSettings,
  AspectRatio
} from './types';
import { 
  Printer, 
  Settings as SettingsIcon,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Loader2,
  Map,
  EyeOff,
  Save,
  Upload
} from 'lucide-react';

const FIXED_GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbz4tRvSdFPBJH5F8RBBg-30Br4e1-Ut4dxFSFejKvJtR8sgxgx5lZ25xHAvz_Z-4rK1/exec';

const App: React.FC = () => {
  const [view, setView] = useState<'checklist' | 'settings'>('checklist');
  const [activeTabInSettings, setActiveTabInSettings] = useState<'items' | 'images' | 'style' | 'about' | 'admin' | 'manual'>('items');
  const [showDamageMap, setShowDamageMap] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [printTimestamp, setPrintTimestamp] = useState<string>('');
  const checklistRef = useRef<HTMLDivElement>(null);
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('checkviatura_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AppSettings;
        if (!parsed.googleSheetUrl) parsed.googleSheetUrl = FIXED_GOOGLE_SHEET_URL;
        return parsed;
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    return {
      vehicleImages: INITIAL_VEHICLE_IMAGES,
      vehicleImageRatios: INITIAL_VEHICLE_RATIOS,
      defaultItems: INITIAL_CHECKLIST_ITEMS,
      headerTitle: 'Checklist de viatura',
      headerBgColor: undefined,
      headerLogoUrl1: undefined,
      headerLogoUrl2: undefined,
      printScale: 1.0,
      googleSheetUrl: FIXED_GOOGLE_SHEET_URL
    };
  });

  const [data, setData] = useState<InspectionData>(() => {
    const initialFreq = 'Diário';
    const filteredDefaults = settings.defaultItems.filter(i => 
      i.frequency === initialFreq || i.frequency === 'Ambos'
    );
    
    return {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      prefix: '',
      plate: '',
      checklistType: initialFreq,
      km: '',
      items: filteredDefaults.map(i => ({ ...i, status: 'PENDING' as ItemStatus, photos: [] })),
      damages: [],
      photos: [],
      vehicleImages: [...settings.vehicleImages],
      vehicleImageRatios: [...(settings.vehicleImageRatios || INITIAL_VEHICLE_RATIOS)],
      generalObservation: '',
      signatureName: '',
      signatureRank: ''
    };
  });

  const themeColor = settings.headerBgColor || '#b91c1c';
  const printScale = settings.printScale || 1.0;

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      if (!base64Str || !base64Str.startsWith('data:image')) {
        resolve(base64Str);
        return;
      }
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  useEffect(() => {
    const filteredDefaults = settings.defaultItems.filter(i => 
      i.frequency === data.checklistType || i.frequency === 'Ambos'
    );
    
    setData(prev => ({
      ...prev,
      items: filteredDefaults.map(i => {
        const existing = prev.items.find(pi => pi.id === i.id);
        return existing 
          ? { ...i, status: existing.status, observation: existing.observation, photos: existing.photos || [] } 
          : { ...i, status: 'PENDING' as ItemStatus, photos: [] };
      })
    }));
  }, [data.checklistType, settings.defaultItems]);

  const handleStatusChange = (id: string, status: ItemStatus) => {
    setData(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, status } : item)
    }));
  };

  const handleObservationChange = (id: string, observation: string) => {
    setData(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, observation } : item)
    }));
  };

  const handleItemPhotoUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result as string);
      setData(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.id === id 
            ? { ...item, photos: [...(item.photos || []), compressed] }
            : item
        )
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveToGeneralNotes = (id: string) => {
    const item = data.items.find(i => i.id === id);
    if (!item || !item.observation) return;
    const textToAdd = `${item.label}: ${item.observation}`;
    setData(prev => ({
      ...prev,
      generalObservation: prev.generalObservation 
        ? `${prev.generalObservation}\n${textToAdd}` 
        : textToAdd
    }));
  };

  const handleVehicleImageUpload = async (index: number, base64: string) => {
    const compressed = await compressImage(base64);
    const newImages = [...data.vehicleImages];
    newImages[index] = compressed;
    setData(prev => ({ ...prev, vehicleImages: newImages }));
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('checkviatura_settings', JSON.stringify(newSettings));
    setView('checklist');
  };

  const handleExportModel = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `modelo_${data.prefix || 'viatura'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportModel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (importedData.items && importedData.checklistType) {
          setData({ 
            ...importedData, 
            id: crypto.randomUUID(),
            date: new Date().toISOString().split('T')[0] // Mantém a data de hoje ao importar
          });
          alert("Modelo importado com sucesso!");
        } else {
          throw new Error("Formato inválido");
        }
      } catch (err) {
        alert("Erro ao importar modelo. Verifique se o arquivo é um JSON de checklist válido.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input para permitir nova importação do mesmo arquivo se necessário
  };

  const saveLogToGoogleSheets = async () => {
    const targetUrl = settings.googleSheetUrl || FIXED_GOOGLE_SHEET_URL;
    if (!targetUrl) return;
    
    const itemsOk = data.items.filter(i => i.status === 'OK').length;
    const itemsCn = data.items.filter(i => i.status === 'CN').length;
    const inspectorFullName = `${data.signatureRank || ''} ${data.signatureName || ''}`.trim() || 'NÃO IDENTIFICADO';

    const itemsDetailArray = data.items.map(i => ({
      label: i.label,
      status: i.status === 'OK' ? 'SN' : i.status === 'CN' ? 'CN' : 'Pendente',
      observation: i.observation || ''
    }));

    const dataForMirror = {
      ...data,
      signatureFull: inspectorFullName,
      headerTitle: settings.headerTitle,
      headerBgColor: settings.headerBgColor,
      headerLogoUrl1: settings.headerLogoUrl1,
      headerLogoUrl2: settings.headerLogoUrl2
    };

    const brDateStr = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const logData = {
      action: 'saveLog',
      id: data.id,
      date: brDateStr, 
      prefix: String(data.prefix || 'N/A').trim(),
      plate: String(data.plate || 'N/A').trim(),
      checklistType: data.checklistType,
      km: String(data.km || '0'), 
      inspector: inspectorFullName,
      itemsStatus: `${itemsOk} SN / ${itemsCn} CN`,
      itemsDetail: JSON.stringify(itemsDetailArray),
      fullData: JSON.stringify(dataForMirror),
      generalObservation: data.generalObservation,
      screenshot: "" 
    };

    try {
      await fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData) as any
      });
    } catch (err) {
      console.error("Erro fatal ao sincronizar com o banco:", err);
    }
  };

  const handleVisualizarPdf = async () => {
    if (data.items.some(item => item.status === 'PENDING')) {
      alert("BLOQUEIO: Existem itens pendentes.");
      return;
    }
    if (!data.prefix.trim() || !data.plate.trim() || !data.km.trim() || !data.signatureName?.trim()) {
      alert("DADOS INCOMPLETOS: Prefixo, Placa, KM e Nome do Conferente são obrigatórios.");
      return;
    }

    setPrintTimestamp(new Date().toLocaleString('pt-BR'));
    setShowExportMenu(false);
    setIsSaving(true);
    await saveLogToGoogleSheets();
    setIsSaving(false);
    
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const hasVehicleImages = data.vehicleImages.some(img => img && img !== "");

  return (
    <div className="min-h-screen max-w-5xl mx-auto pt-24 pb-4 px-4 sm:px-6 print:pt-0 print:pb-0 print:px-0 transition-all">
      {isSaving && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center flex-col text-white gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
          <div className="text-center">
            <h3 className="font-black text-lg uppercase tracking-widest">Gravando Conferência</h3>
            <p className="text-xs text-blue-200 font-bold opacity-70">Sincronizando protocolo digital...</p>
          </div>
        </div>
      )}

      <div 
        ref={checklistRef}
        style={{ transform: `scale(${printScale})`, transformOrigin: 'top center', width: printScale !== 1 ? `${100 / printScale}%` : '100%', maxWidth: '100%' }}
        className="bg-white shadow-2xl rounded-xl overflow-hidden print:shadow-none print:rounded-none border border-gray-100 transition-transform relative"
      >
        <Header 
          title={settings.headerTitle || 'Checklist de viatura'}
          date={data.date} 
          onDateChange={(newDate) => setData({ ...data, date: newDate })}
          logoUrl1={settings.headerLogoUrl1}
          logoUrl2={settings.headerLogoUrl2}
          bgColor={settings.headerBgColor}
        />
        <main className="p-4 print:p-2 space-y-4 print:space-y-3">
          {view === 'settings' ? (
            <Settings 
              settings={settings} 
              onSave={handleSaveSettings} 
              onClose={() => setView('checklist')} 
              initialTab={activeTabInSettings} 
            />
          ) : (
            <>
              <section className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-4 print:p-2 print:bg-transparent print:border-none">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 gap-4 print:gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Prefixo</label>
                    <input type="text" value={data.prefix} onChange={(e) => setData({...data, prefix: e.target.value})} className="w-full border rounded-lg p-2 text-xs font-bold uppercase" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Placa</label>
                    <input type="text" value={data.plate} onChange={(e) => setData({...data, plate: e.target.value.toUpperCase()})} className="w-full border rounded-lg p-2 font-mono text-xs font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Ciclo</label>
                    <div className="flex bg-white border rounded-lg p-1 h-9 no-print">
                      <button onClick={() => setData({...data, checklistType: 'Diário'})} className={`flex-1 text-[10px] font-black uppercase rounded-md ${data.checklistType === 'Diário' ? 'text-white' : 'text-gray-400'}`} style={{ backgroundColor: data.checklistType === 'Diário' ? themeColor : undefined }}>Diário</button>
                      <button onClick={() => setData({...data, checklistType: 'Semanal'})} className={`flex-1 text-[10px] font-black uppercase rounded-md ${data.checklistType === 'Semanal' ? 'text-white' : 'text-gray-400'}`} style={{ backgroundColor: data.checklistType === 'Semanal' ? themeColor : undefined }}>Semanal</button>
                    </div>
                    <div className="hidden print:block border rounded-lg p-2 bg-white text-xs font-black uppercase text-center">{data.checklistType}</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Odômetro (KM)</label>
                    <input type="number" value={data.km} onChange={(e) => setData({...data, km: e.target.value})} className="w-full border rounded-lg p-2 text-xs font-bold text-blue-700" />
                  </div>
                </div>
              </section>

              {showDamageMap && (
                <section className={`bg-white rounded-xl p-3 border shadow-sm print:p-2 ${!hasVehicleImages ? 'print:hidden' : ''}`}>
                  <DamageCanvas 
                    images={data.vehicleImages || []} 
                    ratios={data.vehicleImageRatios || INITIAL_VEHICLE_RATIOS} 
                    damages={data.damages} 
                    onAddDamage={(x, y, i) => setData(prev => ({ ...prev, damages: [...prev.damages, { id: crypto.randomUUID(), x, y, imageIndex: i, description: 'Dano' }] }))} 
                    onRemoveDamage={(id) => setData(prev => ({ ...prev, damages: prev.damages.filter(d => d.id !== id) }))} 
                    onUpdateImage={handleVehicleImageUpload} 
                    onUpdateRatio={(i, r) => setData(prev => { const n = [...(prev.vehicleImageRatios || INITIAL_VEHICLE_RATIOS)]; n[i] = r; return { ...prev, vehicleImageRatios: n }; })} 
                  />
                </section>
              )}

              <section className="space-y-3">
                <ChecklistTable items={data.items} onStatusChange={handleStatusChange} onObservationChange={handleObservationChange} onSaveToGeneralNotes={handleSaveToGeneralNotes} onAddPhoto={handleItemPhotoUpload} />
              </section>

              {/* Seção de Observações Gerais - Editável (no-print) */}
              <section className="space-y-1 no-print">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Observações Gerais</label>
                <textarea 
                  rows={3} 
                  value={data.generalObservation} 
                  onChange={(e) => setData({...data, generalObservation: e.target.value})} 
                  placeholder="Anotações adicionais do conferente..." 
                  className="w-full border rounded-lg p-2 bg-gray-50 outline-none text-xs focus:ring-1 focus:ring-blue-500" 
                />
              </section>

              {/* Seção de Observações Gerais - Somente Impressão (PDF) */}
              {data.generalObservation && (
                <section className="hidden print:block space-y-1 pt-2 border-t mt-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Observações Gerais</label>
                  <div className="text-[10px] text-gray-700 whitespace-pre-wrap bg-gray-50 p-2 rounded-lg border italic leading-tight">
                    {data.generalObservation}
                  </div>
                </section>
              )}

              <Footer 
                signatureName={data.signatureName} 
                signatureRank={data.signatureRank} 
                date={data.date} 
                onSignatureNameChange={(v) => setData({ ...data, signatureName: v })} 
                onSignatureRankChange={(v) => setData({ ...data, signatureRank: v })} 
              />
              
              <section className="space-y-2 pt-2 border-t">
                 <div className="grid grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-3">
                  {data.items.filter(i => i.photos?.length).map(item => item.photos?.map((p, idx) => (
                    <div key={`${item.id}-${idx}`} className="relative aspect-square border rounded-lg overflow-hidden bg-gray-100 shadow-sm break-inside-avoid">
                      <img src={p} className="w-full h-full object-contain" alt={item.label} />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] p-1 font-bold truncate">ITEM: {item.label}</div>
                    </div>
                  )))}
                  {data.photos.map((p, i) => (
                    <div key={`g-${i}`} className="relative aspect-square border rounded-lg overflow-hidden bg-gray-100 shadow-sm break-inside-avoid">
                      <img src={p} className="w-full h-full object-contain" alt="Geral" />
                      <div className="absolute bottom-0 left-0 right-0 bg-blue-600/80 text-white text-[8px] p-1 font-bold uppercase text-center">Evidência Geral</div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
        <div className="hidden print:flex absolute bottom-4 left-4 right-4 items-center justify-between text-[8px] font-black text-gray-300 uppercase tracking-widest border-t border-gray-100 pt-2">
           <span>Realização da Inspeção: {printTimestamp || new Date().toLocaleString('pt-BR')}</span>
           <span>Protocolo: {data.id}</span>
        </div>
      </div>

      <div className="fixed top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-2xl px-5 py-3 rounded-2xl no-print z-[100]">
        {view === 'checklist' ? (
          <>
            <button onClick={() => { setActiveTabInSettings('items'); setView('settings'); }} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-xl text-blue-600 transition-colors"><SettingsIcon className="w-5 h-5 text-blue-500" /><span className="text-xs font-bold hidden sm:inline">Ajustes</span></button>
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            
            <button 
              onClick={handleExportModel} 
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-xl text-green-600 transition-colors"
              title="Exportar Salvar modelo"
            >
              <Save className="w-5 h-5 text-green-500" />
              <span className="text-xs font-bold hidden sm:inline">Salvar Modelo</span>
            </button>

            <label 
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-xl text-purple-600 transition-colors cursor-pointer"
              title="Importar Modelo"
            >
              <Upload className="w-5 h-5 text-purple-500" />
              <span className="text-xs font-bold hidden sm:inline">Importar</span>
              <input type="file" accept=".json" className="hidden" onChange={handleImportModel} />
            </label>

            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            
            <button 
              onClick={() => setShowDamageMap(!showDamageMap)} 
              className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-xl transition-colors ${showDamageMap ? 'text-orange-600' : 'text-gray-400'}`}
              title={showDamageMap ? "Ocultar Mapa de Avarias" : "Mostrar Mapa de Avarias"}
            >
              {showDamageMap ? <Map className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              <span className="text-xs font-bold hidden sm:inline">{showDamageMap ? 'Ocultar Mapa' : 'Mostrar Mapa'}</span>
            </button>
            
            <div className="w-px h-6 bg-gray-200 mx-1"></div>

            <button onClick={() => setShowExportMenu(!showExportMenu)} className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 ${showExportMenu ? 'bg-gray-800 text-white' : 'bg-blue-600 text-white'}`}>Finalizar</button>
            {showExportMenu && (
              <div className="absolute top-full mt-3 left-0 bg-white border rounded-xl shadow-2xl p-2 w-56 z-[110]">
                <button onClick={handleVisualizarPdf} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-green-50 text-gray-700 rounded-lg text-xs font-bold"><Printer className="w-4 h-4" /> Visualizar e Imprimir</button>
              </div>
            )}
          </>
        ) : (
          <button onClick={() => setView('checklist')} className="px-6 py-2 bg-gray-800 text-white rounded-xl text-sm font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Voltar ao Checklist</button>
        )}
      </div>
    </div>
  );
};

export default App;
