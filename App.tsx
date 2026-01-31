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
  Camera, 
  Trash2, 
  Settings as SettingsIcon,
  CalendarDays,
  CheckCircle2,
  Download,
  Upload,
  Image as ImageIcon,
  CarFront,
  Eye,
  EyeOff,
  ClipboardCheck,
  Fingerprint,
  Tag,
  Info,
  ChevronUp,
  ChevronDown,
  Loader2,
  AlertOctagon,
  Clock
} from 'lucide-react';

const FIXED_GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzfcjGUbSvHrWUPQjMZeE1_ndzSjYhKQQMaQGU1e2KcAZfTJVLkfiG4vJFudJV5VL_t/exec';

// Declarações globais para bibliotecas injetadas no index.html
declare const html2canvas: any;
declare const jspdf: any;

const App: React.FC = () => {
  const [view, setView] = useState<'checklist' | 'settings'>('checklist');
  const [activeTabInSettings, setActiveTabInSettings] = useState<'items' | 'images' | 'style' | 'about' | 'admin'>('items');
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
        if (!parsed.googleSheetUrl) {
          parsed.googleSheetUrl = FIXED_GOOGLE_SHEET_URL;
        }
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
    reader.onloadend = () => {
      const result = reader.result as string;
      setData(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.id === id 
            ? { ...item, photos: [...(item.photos || []), result] }
            : item
        )
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeItemPhoto = (itemId: string, photoIndex: number) => {
    setData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId
          ? { ...item, photos: item.photos?.filter((_, idx) => idx !== photoIndex) }
          : item
      )
    }));
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

  const addDamage = (x: number, y: number, imageIndex: number) => {
    const newDamage: DamagePoint = { id: crypto.randomUUID(), x, y, imageIndex, description: 'Dano' };
    setData(prev => ({ ...prev, damages: [...prev.damages, newDamage] }));
  };

  const removeDamage = (id: string) => {
    setData(prev => ({ ...prev, damages: prev.damages.filter(d => d.id !== id) }));
  };

  const handleVehicleImageUpload = (index: number, base64: string) => {
    const newImages = [...data.vehicleImages];
    newImages[index] = base64;
    setData(prev => ({ ...prev, vehicleImages: newImages }));
  };

  const handleVehicleImageRatioUpdate = (index: number, ratio: AspectRatio) => {
    const newRatios = [...(data.vehicleImageRatios || INITIAL_VEHICLE_RATIOS)];
    newRatios[index] = ratio;
    setData(prev => ({ ...prev, vehicleImageRatios: newRatios }));
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileList = Array.from(files) as File[];
    fileList.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setData(prev => ({ ...prev, photos: [...prev.photos, result] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('checkviatura_settings', JSON.stringify(newSettings));
  };

  const exportData = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `modelo_checklist_${data.prefix || 'vtr'}_${data.date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const saveLogToGoogleSheets = async () => {
    const targetUrl = settings.googleSheetUrl || FIXED_GOOGLE_SHEET_URL;
    if (!targetUrl) return;
    
    // Pequeno delay para garantir que o DOM refletiu os inputs antes do print/save
    await new Promise(resolve => setTimeout(resolve, 300));

    // Captura screenshot do checklist antes de salvar
    let screenshotBase64 = '';
    if (checklistRef.current) {
      try {
        const canvas = await html2canvas(checklistRef.current, {
          scale: 1,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: checklistRef.current.scrollWidth,
          windowHeight: checklistRef.current.scrollHeight
        });
        screenshotBase64 = canvas.toDataURL('image/jpeg', 0.6);
      } catch (e) {
        console.error("Falha ao capturar screenshot", e);
      }
    }

    const itemsOk = data.items.filter(i => i.status === 'OK').length;
    const itemsCn = data.items.filter(i => i.status === 'CN').length;
    
    const inspectorName = String(data.signatureName || '').trim();
    const inspectorRank = String(data.signatureRank || '').trim();
    const inspectorFullName = `${inspectorRank} ${inspectorName}`.trim() || 'NÃO IDENTIFICADO';

    const itemsDetailArray = data.items.map(i => ({
      label: i.label,
      status: i.status === 'OK' ? 'SN' : i.status === 'CN' ? 'CN' : 'Pendente',
      observation: i.observation || ''
    }));

    const dataForMirror = {
      ...data,
      signatureFull: inspectorFullName,
      items: data.items.map(item => ({ 
        ...item, 
        photos: [] 
      })),
      photos: []
    };

    const now = new Date();
    const brDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const formattedDateTime = `${String(brDate.getDate()).padStart(2, '0')}/${String(brDate.getMonth() + 1).padStart(2, '0')}/${brDate.getFullYear()} ${String(brDate.getHours()).padStart(2, '0')}:${String(brDate.getMinutes()).padStart(2, '0')}:${String(brDate.getSeconds()).padStart(2, '0')}`;

    const logData = {
      action: 'saveLog',
      id: data.id,
      date: formattedDateTime, 
      prefix: String(data.prefix || 'N/A').trim(),
      plate: String(data.plate || 'N/A').trim(),
      checklistType: data.checklistType,
      km: String(data.km || '0'), 
      inspector: inspectorFullName,
      itemsStatus: `${itemsOk} SN / ${itemsCn} CN`,
      itemsDetail: JSON.stringify(itemsDetailArray),
      fullData: JSON.stringify(dataForMirror),
      generalObservation: data.generalObservation,
      screenshot: screenshotBase64
    };

    try {
      await fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
    } catch (err) {
      console.error("Erro fatal ao sincronizar com o banco:", err);
    }
  };

  const handleVisualizarPdf = async () => {
    // VALIDAÇÃO DE ITENS OBRIGATÓRIOS
    const pendingItemsCount = data.items.filter(item => item.status === 'PENDING').length;
    if (pendingItemsCount > 0) {
      alert(`BLOQUEIO DE SEGURANÇA: Existem ${pendingItemsCount} itens com status "PENDENTE". Por favor, avalie todos os itens da malha técnica antes de finalizar o relatório.`);
      setShowExportMenu(false);
      return;
    }

    // VALIDAÇÃO DE DADOS DA VIATURA
    if (!data.prefix.trim() || !data.plate.trim() || !data.km.trim()) {
      alert("DADOS INCOMPLETOS: Prefixo, Placa e Quilometragem (KM) são campos de preenchimento obrigatório para a identificação do veículo.");
      setShowExportMenu(false);
      return;
    }

    // VALIDAÇÃO DO CONFERENTE
    if (!data.signatureName?.trim() || !data.signatureRank?.trim()) {
      alert("IDENTIFICAÇÃO DO CONFERENTE: O Nome e a Graduação/RE do conferente devem ser informados para a autenticação do protocolo digital.");
      setShowExportMenu(false);
      return;
    }

    const now = new Date();
    setPrintTimestamp(now.toLocaleString('pt-BR'));

    setShowExportMenu(false);
    setIsSaving(true);
    
    // Grava espelho no banco (incluindo a "foto" do relatório)
    await saveLogToGoogleSheets();
    
    setIsSaving(false);
    
    // Chama impressão
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const importedData = JSON.parse(json) as InspectionData;
        if (!importedData.items) throw new Error('Inválido');
        setData(importedData);
      } catch (err) {
        alert('Erro ao processar arquivo JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const hasPhotos = data.photos.length > 0 || data.items.some(i => i.photos && i.photos.length > 0);

  return (
    <div className="min-h-screen max-w-5xl mx-auto pt-24 pb-4 px-4 sm:px-6 print:pt-0 print:pb-0 print:px-0 transition-all">
      {isSaving && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center flex-col text-white gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
          <div className="text-center">
            <h3 className="font-black text-lg uppercase tracking-widest">Gravando Conferência</h3>
            <p className="text-xs text-blue-200 font-bold opacity-70">Sincronizando conferente, itens e foto com o banco...</p>
          </div>
        </div>
      )}

      <div 
        ref={checklistRef}
        style={{ 
          transform: `scale(${printScale})`, 
          transformOrigin: 'top center',
          width: printScale !== 1 ? `${100 / printScale}%` : '100%',
          maxWidth: '100%'
        }}
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
              initialTab={activeTabInSettings as any}
            />
          ) : (
            <>
              <section className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-4 print:p-2 print:bg-transparent print:border-none">
                <div className="flex items-center gap-2 mb-1 no-print">
                  <CarFront className="w-4 h-4 text-blue-600" />
                  <h2 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Identificação do Veículo</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 gap-4 print:gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Tag className="w-3 h-3" /> Prefixo</label>
                    <input 
                      type="text"
                      placeholder="Ex: VTR-01"
                      value={data.prefix}
                      onChange={(e) => setData({...data, prefix: e.target.value})}
                      className="w-full border rounded-lg p-2 bg-white focus:ring-1 focus:ring-blue-500 outline-none font-bold text-gray-800 text-xs shadow-sm uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Fingerprint className="w-3 h-3" /> Placa</label>
                    <input 
                      type="text"
                      placeholder="ABC-1234"
                      value={data.plate}
                      onChange={(e) => setData({...data, plate: e.target.value.toUpperCase()})}
                      className="w-full border rounded-lg p-2 bg-white focus:ring-1 focus:ring-blue-500 outline-none font-mono font-bold text-gray-800 text-xs shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Periodicidade</label>
                    <div className="flex bg-white border rounded-lg p-1 shadow-sm h-9 no-print">
                      <button 
                        onClick={() => setData({...data, checklistType: 'Diário'})}
                        className={`flex-1 text-[10px] font-black uppercase rounded-md transition-all ${data.checklistType === 'Diário' ? 'text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                        style={{ backgroundColor: data.checklistType === 'Diário' ? themeColor : undefined }}
                      >
                        Diário
                      </button>
                      <button 
                        onClick={() => setData({...data, checklistType: 'Semanal'})}
                        className={`flex-1 text-[10px] font-black uppercase rounded-md transition-all ${data.checklistType === 'Semanal' ? 'text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                        style={{ backgroundColor: data.checklistType === 'Semanal' ? themeColor : undefined }}
                      >
                        Semanal
                      </button>
                    </div>
                    <div className="hidden print:block border rounded-lg p-2 bg-white text-xs font-black uppercase text-center border-gray-200">
                      {data.checklistType}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">Odômetro (KM)</label>
                    <input 
                      type="number" 
                      placeholder="0" 
                      value={data.km} 
                      onChange={(e) => setData({...data, km: e.target.value})} 
                      className="w-full border rounded-lg p-2 bg-white outline-none text-xs font-bold text-blue-700 shadow-sm focus:ring-1 focus:ring-blue-500" 
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between no-print">
                   <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      <h2 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Inspeção Visual (Avarias)</h2>
                   </div>
                   <button 
                    onClick={() => setShowDamageMap(!showDamageMap)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                      showDamageMap 
                        ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                    }`}
                   >
                     {showDamageMap ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                     {showDamageMap ? 'Ocultar Mapa' : 'Exibir Mapa'}
                   </button>
                </div>

                {showDamageMap && (
                  <div className="bg-white rounded-xl p-3 border shadow-sm print:p-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <DamageCanvas 
                        images={data.vehicleImages || []}
                        ratios={data.vehicleImageRatios || INITIAL_VEHICLE_RATIOS}
                        damages={data.damages}
                        onAddDamage={addDamage}
                        onRemoveDamage={removeDamage}
                        onUpdateImage={handleVehicleImageUpload}
                        onUpdateRatio={handleVehicleImageRatioUpdate}
                    />
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-blue-600" />
                    <h2 className="text-sm font-bold text-gray-800 uppercase">Itens de Inspeção</h2>
                    <span 
                      className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest text-white shadow-sm"
                      style={{ backgroundColor: themeColor }}
                    >
                      <CalendarDays className="w-3 h-3" /> {data.checklistType}
                    </span>
                  </div>
                  <div className="text-[9px] font-medium text-gray-500 uppercase tracking-widest border px-1.5 py-0.5 rounded bg-gray-50">
                    <span className="text-green-600 font-bold">SN</span> (Normal) / <span className="text-red-500 font-bold">CN</span> (Alterado)
                  </div>
                </div>
                <ChecklistTable 
                  items={data.items} 
                  onStatusChange={handleStatusChange} 
                  onObservationChange={handleObservationChange} 
                  onSaveToGeneralNotes={handleSaveToGeneralNotes}
                  onAddPhoto={handleItemPhotoUpload}
                />
              </section>

              <section className="space-y-1">
                <h3 className="font-bold text-gray-800 uppercase text-[10px] tracking-widest">Notas Adicionais</h3>
                <textarea rows={3} value={data.generalObservation} onChange={(e) => setData({...data, generalObservation: e.target.value})} placeholder="Observações do inspetor..." className="w-full border rounded-lg p-2 bg-gray-50 outline-none text-xs" />
              </section>

              <Footer 
                signatureName={data.signatureName}
                signatureRank={data.signatureRank}
                date={data.date}
                onSignatureNameChange={(val) => setData({ ...data, signatureName: val })}
                onSignatureRankChange={(val) => setData({ ...data, signatureRank: val })}
              />

              <section className={`space-y-2 pt-2 border-t ${hasPhotos ? 'break-before-page' : ''}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 uppercase text-[10px] tracking-widest flex items-center gap-2">
                    <ImageIcon className="w-3 h-3" /> Anexo: Relatório Fotográfico
                  </h3>
                  <label className="cursor-pointer bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[10px] font-semibold no-print hover:bg-blue-100 transition-colors">
                    <Camera className="w-3 h-3 inline mr-1" /> Add Foto
                    <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>

                {!hasPhotos && (
                   <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-gray-400 text-xs">
                     Nenhuma foto anexada.
                   </div>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-3">
                  {data.items.filter(i => i.photos && i.photos.length > 0).map(item => (
                    item.photos?.map((photo, photoIndex) => (
                      <div key={`${item.id}-${photoIndex}`} className="relative aspect-square border rounded-lg overflow-hidden group bg-gray-100 shadow-sm break-inside-avoid">
                        <img src={photo} className="w-full h-full object-contain" alt={item.label} />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] p-1 font-bold truncate">
                          ITEM: {item.label}
                        </div>
                        <button onClick={() => removeItemPhoto(item.id, photoIndex)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 no-print transition-opacity">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  ))}

                  {data.photos.map((photo, i) => (
                    <div key={`general-${i}`} className="relative aspect-square border rounded-lg overflow-hidden group bg-gray-100 shadow-sm break-inside-avoid">
                      <img src={photo} className="w-full h-full object-contain" alt="Foto Geral" />
                      <div className="absolute bottom-0 left-0 right-0 bg-blue-600/80 text-white text-[9px] p-1 font-bold uppercase text-center">
                        Evidência Geral
                      </div>
                      <button onClick={() => setData(prev => ({ ...prev, photos: prev.photos.filter((_, idx) => idx !== i) }))} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 no-print transition-opacity">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
        
        {/* METADADOS DE IMPRESSÃO - Visível apenas no PDF/Papel */}
        <div className="hidden print:flex absolute bottom-4 left-4 right-4 items-center justify-between text-[8px] font-black text-gray-300 uppercase tracking-widest border-t border-gray-100 pt-2">
           <div className="flex items-center gap-2">
              <Clock className="w-2.5 h-2.5" />
              <span>Realização da Inspeção: {printTimestamp || new Date().toLocaleString('pt-BR')}</span>
           </div>
           <div className="flex items-center gap-4">
              <span>Protocolo: {data.id}</span>
              <span>Página 1</span>
           </div>
        </div>
      </div>

      <div className="fixed top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-2xl px-5 py-3 rounded-2xl no-print z-[100]">
        {view === 'checklist' ? (
          <>
            <button 
              onClick={exportData} 
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-xl text-gray-700 transition-colors" 
              title="Salvar modelo atual como JSON"
            >
              <Download className="w-5 h-5 text-gray-500" />
              <span className="text-xs font-bold hidden sm:inline">Salvar Modelo</span>
            </button>
            
            <label 
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-xl text-gray-700 transition-colors cursor-pointer" 
              title="Carregar modelo salvo"
            >
              <Upload className="w-5 h-5 text-gray-500" />
              <span className="text-xs font-bold hidden sm:inline">Importar</span>
              <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
            </label>

            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            
            <button 
              onClick={() => { setActiveTabInSettings('about'); setView('settings'); }} 
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-xl text-gray-700 transition-colors" 
              title="Sobre o sistema"
            >
              <Info className="w-5 h-5 text-gray-500" />
              <span className="text-xs font-bold hidden sm:inline">Sobre</span>
            </button>

            <div className="w-px h-6 bg-gray-200 mx-1"></div>

            <button 
              onClick={() => { setActiveTabInSettings('style'); setView('settings'); }} 
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-xl text-blue-600 transition-colors" 
              title="Configurações de Itens e Estilo"
            >
              <SettingsIcon className="w-5 h-5 text-blue-500" />
              <span className="text-xs font-bold hidden sm:inline">Ajustes</span>
            </button>

            <div className="w-px h-6 bg-gray-200 mx-1"></div>

            <div className="relative">
              {showExportMenu && (
                <div className="absolute top-full mt-3 left-0 bg-white border border-gray-100 rounded-xl shadow-2xl p-2 w-56 animate-in slide-in-from-top-2 duration-200 overflow-hidden z-[110]">
                  <button 
                    onClick={handleVisualizarPdf} 
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-green-50 text-gray-700 hover:text-green-700 rounded-lg transition-colors text-xs font-bold"
                  >
                    <Printer className="w-4 h-4" /> Visualizar e Imprimir
                  </button>
                </div>
              )}
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)} 
                className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 ${showExportMenu ? 'bg-gray-800 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'}`}
              >
                {showExportMenu ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} Finalizar
              </button>
            </div>
          </>
        ) : (
          <button onClick={() => setView('checklist')} className="px-6 py-2 bg-gray-800 text-white rounded-xl text-sm font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Voltar ao Checklist
          </button>
        )}
      </div>
    </div>
  );
};

export default App;