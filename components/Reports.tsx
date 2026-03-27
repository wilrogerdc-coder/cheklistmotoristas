
import React, { useState, useMemo } from 'react';
import { LogEntry, AppSettings } from '../types';
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  Filter, 
  ChevronRight, 
  AlertCircle,
  BarChart,
  List,
  Search,
  ChevronLeft,
  X,
  Eye,
  Clock
} from 'lucide-react';

interface ReportsProps {
  logs: LogEntry[];
  settings: AppSettings;
  onFetch: (prefix?: string, month?: string) => Promise<void>;
  isLoading?: boolean;
}

type ReportType = 'novelties' | 'synthetic' | 'analytical' | 'full' | 'monthly_grouped' | 'history' | null;

export const Reports: React.FC<ReportsProps> = ({ logs, settings, onFetch, isLoading }) => {
  const [activeReport, setActiveReport] = useState<ReportType>(null);
  const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [selectedPrefixes, setSelectedPrefixes] = useState<Set<string>>(new Set());
  const [prefixSearch, setPrefixSearch] = useState<string>('');
  
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    date: true,
    prefix: true,
    plate: true,
    km: true,
    type: true,
    inspector: true,
    status: true,
    obs: true,
    id: false,
    details: false
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'cn'>('all');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const normalizePrefix = (p: string) => (p || '').replace(/[-\s]/g, '').toUpperCase();

  const getInspector = (log: LogEntry) => {
    return (log.inspector || log.Inspetor || log.inspetor || log.conferente || 'NÃO IDENTIFICADO').trim();
  };

  const uniquePrefixes = useMemo(() => {
    const prefixes = new Set<string>();
    logs.forEach(log => {
      const norm = normalizePrefix(log.prefix);
      if (norm) prefixes.add(norm);
    });
    return Array.from(prefixes).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const logDate = new Date(log.date).toISOString().substring(0, 7);
      const matchesMonth = !monthFilter || logDate === monthFilter;
      
      const normLogPrefix = normalizePrefix(log.prefix);
      
      // Se não houver nada selecionado, mostra tudo (ou nada? O usuário pediu para selecionar. Geralmente se nada selecionado = tudo ou nada. Vamos assumir que se o set estiver vazio, mostra tudo, a menos que o usuário explicitamente desmarque tudo)
      // Mas o usuário quer selecionar. Então se o set tiver itens, filtra por eles.
      const matchesPrefix = selectedPrefixes.size === 0 || selectedPrefixes.has(normLogPrefix);
      
      return matchesMonth && matchesPrefix;
    });
  }, [logs, monthFilter, selectedPrefixes]);

  const togglePrefix = (prefix: string) => {
    const newSelected = new Set(selectedPrefixes);
    if (newSelected.has(prefix)) {
      newSelected.delete(prefix);
    } else {
      newSelected.add(prefix);
    }
    setSelectedPrefixes(newSelected);
  };

  const selectAllPrefixes = () => {
    setSelectedPrefixes(new Set(uniquePrefixes));
  };

  const deselectAllPrefixes = () => {
    setSelectedPrefixes(new Set());
  };

  const handlePrint = () => {
    window.print();
  };

  const renderNoveltiesReport = () => {
    const novelties = filteredLogs.filter(log => (log.itemsStatus || '').includes('CN') || (log.generalObservation && log.generalObservation.trim() !== ''));

    let totalCnItems = 0;
    novelties.forEach(log => {
      try {
        if (log.itemsDetail) {
          const details = JSON.parse(log.itemsDetail);
          totalCnItems += details.filter((d: any) => d.status === 'CN').length;
        }
      } catch (e) {}
    });

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b pb-4 print:pb-2">
          <div>
            <h3 className="text-xl font-black uppercase text-gray-900 text-red-600">Relatório de Novidades Constatadas</h3>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Filtro: {selectedPrefixes.size > 0 ? Array.from(selectedPrefixes).join(', ') : 'Todas as Viaturas'} | {monthFilter}
            </p>
          </div>
          <div className="text-right hidden print:block">
             <p className="text-[10px] font-black uppercase text-gray-400">Página <span className="page-number"></span></p>
          </div>
        </div>

        {/* Resumo de Novidades */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 no-print">
          <div className="bg-red-50 border-2 border-red-100 p-4 rounded-3xl flex items-center gap-4">
            <div className="bg-red-600 p-3 rounded-2xl text-white shadow-lg">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-red-500 uppercase">Viaturas com Novidades</p>
              <p className="text-xl font-black text-red-900">{novelties.length}</p>
            </div>
          </div>
          <div className="bg-orange-50 border-2 border-orange-100 p-4 rounded-3xl flex items-center gap-4">
            <div className="bg-orange-600 p-3 rounded-2xl text-white shadow-lg">
              <List className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-orange-500 uppercase">Total de Itens "CN"</p>
              <p className="text-xl font-black text-orange-900">{totalCnItems}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {novelties.map(log => {
            let cnItems: any[] = [];
            try {
              if (log.itemsDetail) {
                const details = JSON.parse(log.itemsDetail);
                cnItems = details.filter((d: any) => d.status === 'CN');
              }
            } catch (e) {}

            return (
              <div key={log.id} className="border-2 rounded-[2rem] p-6 space-y-4 bg-white print:break-inside-avoid shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-600 text-white p-2 rounded-xl shadow-md">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase text-gray-900 tracking-tight">{log.prefix} <span className="text-gray-400 font-bold ml-1">({log.plate})</span></h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">{new Date(log.date).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black uppercase text-red-600 bg-red-50 border border-red-100 px-3 py-1 rounded-full">
                      {cnItems.length} Itens com Avaria
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-[11px]">
                  <div>
                    <p className="font-black uppercase text-gray-400 text-[8px] tracking-widest mb-1">Conferente</p>
                    <p className="font-bold uppercase text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl inline-block">{getInspector(log)}</p>
                  </div>
                  <div>
                    <p className="font-black uppercase text-gray-400 text-[8px] tracking-widest mb-1">Tipo de Checklist</p>
                    <p className="font-bold text-gray-700 uppercase">{log.checklistType}</p>
                  </div>
                  <div>
                    <p className="font-black uppercase text-gray-400 text-[8px] tracking-widest mb-1">Odômetro</p>
                    <p className="font-bold text-gray-700 uppercase">{log.km} KM</p>
                  </div>
                </div>

                {cnItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-black uppercase text-gray-400 text-[8px] tracking-widest">Detalhamento de Itens "CN"</p>
                    <div className="grid grid-cols-1 gap-2">
                      {cnItems.map((d: any, i: number) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between bg-red-50/30 p-3 rounded-2xl border border-red-100/50 gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                            <span className="font-black text-[10px] uppercase text-red-900">{d.label}</span>
                          </div>
                          <div className="flex-1 sm:text-right">
                            <span className="text-[10px] text-red-600 font-medium italic bg-white px-3 py-1 rounded-lg border border-red-50 shadow-sm">
                              {d.observation || 'Sem observação específica'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {log.generalObservation && (
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                    <p className="font-black uppercase text-gray-400 text-[8px] tracking-widest mb-2">Observações Gerais do Conferente</p>
                    <p className="text-[11px] font-medium text-gray-700 italic leading-relaxed">"{log.generalObservation}"</p>
                  </div>
                )}
                
                <div className="pt-2 flex justify-end">
                   <p className="text-[8px] font-mono text-gray-300 uppercase">Protocolo: {log.id}</p>
                </div>
              </div>
            );
          })}
          {novelties.length === 0 && (
            <div className="text-center py-32 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
              <AlertCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-xs font-black uppercase text-gray-400 tracking-widest">Nenhuma novidade registrada no período e filtros selecionados.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSyntheticReport = () => {
    const stats = {
      total: filteredLogs.length,
      diario: filteredLogs.filter(l => l.checklistType === 'Diário').length,
      semanal: filteredLogs.filter(l => l.checklistType === 'Semanal').length,
      withIssues: filteredLogs.filter(l => (l.itemsStatus || '').includes('CN')).length,
      ok: filteredLogs.filter(l => !(l.itemsStatus || '').includes('CN')).length,
    };

    const vehiclesMap: Record<string, number> = {};
    const inspectorsMap: Record<string, number> = {};
    const canonicalPrefixes: Record<string, string> = {};
    
    filteredLogs.forEach(l => {
      const norm = normalizePrefix(l.prefix);
      if (!canonicalPrefixes[norm]) canonicalPrefixes[norm] = l.prefix;
      
      const inspName = getInspector(l);
      vehiclesMap[norm] = (vehiclesMap[norm] || 0) + 1;
      inspectorsMap[inspName] = (inspectorsMap[inspName] || 0) + 1;
    });

    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center border-b pb-4 print:pb-2">
          <div>
            <h3 className="text-xl font-black uppercase text-gray-900">Relatório Sintético de Gerenciamento</h3>
            <p className="text-xs font-bold text-gray-500 uppercase">Período: {monthFilter} | {selectedPrefixes.size > 0 ? `${selectedPrefixes.size} Viaturas Selecionadas` : 'Geral'}</p>
          </div>
          <div className="text-right hidden print:block">
             <p className="text-[10px] font-black uppercase text-gray-400">Página <span className="page-number"></span></p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100">
            <p className="text-[9px] font-black text-blue-500 uppercase">Total Inspeções</p>
            <p className="text-2xl font-black text-blue-900">{stats.total}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-3xl border border-green-100">
            <p className="text-[9px] font-black text-green-500 uppercase">Total SN (OK)</p>
            <p className="text-2xl font-black text-green-900">{stats.ok}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-3xl border border-red-100">
            <p className="text-[9px] font-black text-red-500 uppercase">Total CN (Avarias)</p>
            <p className="text-2xl font-black text-red-900">{stats.withIssues}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-3xl border border-orange-100">
            <p className="text-[9px] font-black text-orange-500 uppercase">Conformidade</p>
            <p className="text-2xl font-black text-orange-900">{stats.total ? ((stats.ok / stats.total) * 100).toFixed(1) : 0}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-2xl overflow-hidden">
            <div className="bg-gray-100 p-3 text-[10px] font-black uppercase">Uso da Frota (Top 10)</div>
            <table className="w-full text-[10px] text-left">
              <tbody className="divide-y">
                {Object.entries(vehiclesMap).sort((a,b) => b[1]-a[1]).slice(0, 10).map(([norm, count]) => (
                  <tr key={norm}>
                    <td className="p-2 font-bold uppercase">{canonicalPrefixes[norm]}</td>
                    <td className="p-2 text-right font-black text-blue-600">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border rounded-2xl overflow-hidden">
            <div className="bg-gray-100 p-3 text-[10px] font-black uppercase">Atividade por Conferente (Top 10)</div>
            <table className="w-full text-[10px] text-left">
              <tbody className="divide-y">
                {Object.entries(inspectorsMap).sort((a,b) => b[1]-a[1]).slice(0, 10).map(([name, count]) => (
                  <tr key={name}>
                    <td className="p-2 font-bold uppercase">{name}</td>
                    <td className="p-2 text-right font-black text-green-600">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderAnalyticalReport = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b pb-4 print:pb-2">
          <div>
            <h3 className="text-xl font-black uppercase text-gray-900">Relatório Analítico Detalhado</h3>
            <p className="text-xs font-bold text-gray-500 uppercase">Filtro: {selectedPrefixes.size > 0 ? `${selectedPrefixes.size} Viaturas Selecionadas` : 'Geral'} | {monthFilter}</p>
          </div>
          <div className="text-right hidden print:block">
             <p className="text-[10px] font-black uppercase text-gray-400">Página <span className="page-number"></span></p>
          </div>
        </div>

        <div className="overflow-x-auto border rounded-2xl">
          <table className="w-full text-[9px] text-left border-collapse">
            <thead className="bg-gray-100 font-black uppercase text-gray-400 border-b sticky top-0">
              <tr>
                <th className="p-2">Data/Hora</th>
                <th className="p-2">Viatura</th>
                <th className="p-2">KM</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">Conferente</th>
                <th className="p-2">Status</th>
                <th className="p-2">Obs.</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-white">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="p-2 whitespace-nowrap">{new Date(log.date).toLocaleString('pt-BR')}</td>
                  <td className="p-2 font-bold uppercase">{log.prefix}</td>
                  <td className="p-2">{log.km}</td>
                  <td className="p-2 uppercase">{log.checklistType}</td>
                  <td className="p-2 uppercase font-medium break-words min-w-[150px]">{getInspector(log)}</td>
                  <td className={`p-2 font-black uppercase ${(log.itemsStatus || '').includes('CN') ? 'text-red-600' : 'text-green-600'}`}>{log.itemsStatus || 'SN'}</td>
                  <td className="p-2 italic text-gray-500 truncate max-w-[150px]">{log.generalObservation || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderFullReport = () => {
    const columns = [
      { id: 'date', label: 'Data/Hora' },
      { id: 'prefix', label: 'Viatura' },
      { id: 'plate', label: 'Placa' },
      { id: 'km', label: 'KM' },
      { id: 'type', label: 'Tipo' },
      { id: 'inspector', label: 'Conferente' },
      { id: 'status', label: 'Status' },
      { id: 'obs', label: 'Observações' },
      { id: 'id', label: 'Protocolo' },
      { id: 'details', label: 'Detalhes Itens' },
    ];

    const toggleColumn = (id: string) => {
      setVisibleColumns(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const filteredByStatus = filteredLogs.filter(log => {
      if (statusFilter === 'all') return true;
      const status = (log.itemsStatus || '').toUpperCase();
      if (statusFilter === 'ok') return !status.includes('CN');
      if (statusFilter === 'cn') return status.includes('CN');
      return true;
    });

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b pb-4 print:pb-2">
          <div>
            <h3 className="text-xl font-black uppercase text-gray-900">Relatório Completo Personalizável</h3>
            <p className="text-xs font-bold text-gray-500 uppercase">Filtro: {selectedPrefixes.size > 0 ? `${selectedPrefixes.size} Viaturas Selecionadas` : 'Geral'} | {monthFilter} | Status: {statusFilter.toUpperCase()}</p>
          </div>
          <div className="text-right hidden print:block">
             <p className="text-[10px] font-black uppercase text-gray-400">Página <span className="page-number"></span></p>
          </div>
        </div>

        <div className="no-print space-y-4">
          <div className="bg-gray-50 p-4 rounded-2xl border space-y-3">
            <p className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2">
              <Filter className="w-3 h-3" /> Selecionar Colunas Visíveis
            </p>
            <div className="flex flex-wrap gap-2">
              {columns.map(col => (
                <button
                  key={col.id}
                  onClick={() => toggleColumn(col.id)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all border ${
                    visibleColumns[col.id] 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                      : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {col.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-[10px] font-black uppercase text-gray-400">Filtrar Status:</p>
            <div className="flex bg-gray-100 p-1 rounded-xl border">
              {(['all', 'ok', 'cn'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                    statusFilter === s ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {s === 'all' ? 'Todos' : s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border rounded-2xl">
          <table className="w-full text-[9px] text-left border-collapse">
            <thead className="bg-gray-100 font-black uppercase text-gray-400 border-b sticky top-0">
              <tr>
                {visibleColumns.date && <th className="p-2">Data/Hora</th>}
                {visibleColumns.prefix && <th className="p-2">Viatura</th>}
                {visibleColumns.plate && <th className="p-2">Placa</th>}
                {visibleColumns.km && <th className="p-2">KM</th>}
                {visibleColumns.type && <th className="p-2">Tipo</th>}
                {visibleColumns.inspector && <th className="p-2">Conferente</th>}
                {visibleColumns.status && <th className="p-2">Status</th>}
                {visibleColumns.obs && <th className="p-2">Obs.</th>}
                {visibleColumns.id && <th className="p-2">Protocolo</th>}
                {visibleColumns.details && <th className="p-2">Detalhes</th>}
                <th className="p-2 no-print">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-white">
              {filteredByStatus.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  {visibleColumns.date && <td className="p-2 whitespace-nowrap">{new Date(log.date).toLocaleString('pt-BR')}</td>}
                  {visibleColumns.prefix && <td className="p-2 font-bold uppercase">{log.prefix}</td>}
                  {visibleColumns.plate && <td className="p-2 font-mono uppercase">{log.plate}</td>}
                  {visibleColumns.km && <td className="p-2">{log.km}</td>}
                  {visibleColumns.type && <td className="p-2 uppercase">{log.checklistType}</td>}
                  {visibleColumns.inspector && <td className="p-2 uppercase font-medium break-words min-w-[150px]">{getInspector(log)}</td>}
                  {visibleColumns.status && (
                    <td className={`p-2 font-black uppercase ${(log.itemsStatus || '').includes('CN') ? 'text-red-600' : 'text-green-600'}`}>
                      {log.itemsStatus || 'SN'}
                    </td>
                  )}
                  {visibleColumns.obs && <td className="p-2 italic text-gray-500 truncate max-w-[150px]">{log.generalObservation || '-'}</td>}
                  {visibleColumns.id && <td className="p-2 font-mono text-[8px] text-gray-400">{log.id}</td>}
                  {visibleColumns.details && (
                    <td className="p-2 text-[8px] text-gray-400 truncate max-w-[150px]">
                      {log.itemsDetail || '-'}
                    </td>
                  )}
                  <td className="p-2 no-print">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                      title="Ver Detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedLog && (
          <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 no-print">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="bg-blue-600 p-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5" />
                  <h3 className="font-bold text-sm uppercase tracking-widest">Detalhes da Inspeção</h3>
                </div>
                <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase">Viatura</p>
                    <p className="text-sm font-bold uppercase">{selectedLog.prefix} ({selectedLog.plate})</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase">Data/Hora</p>
                    <p className="text-sm font-bold">{new Date(selectedLog.date).toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase">Conferente</p>
                    <p className="text-sm font-black uppercase text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg inline-block break-words max-w-full">{getInspector(selectedLog)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase">KM</p>
                    <p className="text-sm font-bold">{selectedLog.km} KM</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase">Status dos Itens</p>
                  <p className={`text-xs font-black uppercase ${(selectedLog.itemsStatus || '').includes('CN') ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedLog.itemsStatus}
                  </p>
                  {selectedLog.itemsDetail && (
                    <div className="bg-gray-50 p-3 rounded-xl border text-[10px] font-medium text-gray-600 whitespace-pre-wrap">
                      {selectedLog.itemsDetail}
                    </div>
                  )}
                </div>

                {selectedLog.generalObservation && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Observações Gerais</p>
                    <div className="bg-gray-50 p-3 rounded-xl border italic text-xs text-gray-600 leading-relaxed">
                      {selectedLog.generalObservation}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t text-[8px] text-gray-400 font-mono">
                  Protocolo: {selectedLog.id}
                </div>
              </div>
              <div className="bg-gray-50 p-4 border-t flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="bg-white border px-6 py-2 rounded-xl text-xs font-bold uppercase hover:bg-gray-100 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMonthlyGroupedReport = () => {
    // Agrupar por prefixo normalizado
    const groupedData: Record<string, { canonicalPrefix: string, logs: LogEntry[] }> = {};
    
    filteredLogs.forEach(log => {
      const norm = normalizePrefix(log.prefix);
      if (!groupedData[norm]) {
        groupedData[norm] = { canonicalPrefix: log.prefix, logs: [] };
      }
      groupedData[norm].logs.push(log);
    });

    // Ordenar logs dentro de cada grupo por data
    Object.values(groupedData).forEach(group => {
      group.logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    const sortedGroups = Object.entries(groupedData).sort((a, b) => a[0].localeCompare(b[0]));

    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center border-b pb-4 print:pb-2">
          <div>
            <h3 className="text-xl font-black uppercase text-gray-900">Relatório Mensal Agrupado por Viatura</h3>
            <p className="text-xs font-bold text-gray-500 uppercase">Mês: {monthFilter} | {selectedPrefixes.size > 0 ? `${selectedPrefixes.size} Viaturas Selecionadas` : 'Todas as Viaturas'}</p>
          </div>
          <div className="text-right hidden print:block">
             <p className="text-[10px] font-black uppercase text-gray-400">Página <span className="page-number"></span></p>
          </div>
        </div>

        {sortedGroups.length === 0 ? (
          <div className="text-center py-20 text-gray-400 font-black uppercase">Nenhum dado encontrado para o período.</div>
        ) : (
          <div className="space-y-10">
            {sortedGroups.map(([norm, group]) => (
              <div key={norm} className="space-y-4 print:break-inside-avoid">
                <div className="bg-gray-900 text-white px-6 py-3 rounded-2xl flex justify-between items-center shadow-lg">
                  <h4 className="font-black uppercase tracking-widest text-sm">Viatura: {group.canonicalPrefix}</h4>
                  <span className="text-[10px] font-bold opacity-70 uppercase">{group.logs.length} Inspeções no mês</span>
                </div>

                <div className="overflow-x-auto border rounded-2xl shadow-sm">
                  <table className="w-full text-[10px] text-left border-collapse">
                    <thead className="bg-gray-50 font-black uppercase text-gray-400 border-b">
                      <tr>
                        <th className="p-3">Data</th>
                        <th className="p-3">KM</th>
                        <th className="p-3">Tipo</th>
                        <th className="p-3">Conferente</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Observações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y bg-white">
                      {group.logs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 font-bold">{new Date(log.date).toLocaleDateString('pt-BR')}</td>
                          <td className="p-3 font-mono">{log.km}</td>
                          <td className="p-3 uppercase">{log.checklistType}</td>
                          <td className="p-3 uppercase font-medium">{getInspector(log)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full font-black uppercase text-[9px] ${(log.itemsStatus || '').includes('CN') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {log.itemsStatus || 'SN'}
                            </span>
                          </td>
                          <td className="p-3 italic text-gray-500 max-w-[200px] truncate">{log.generalObservation || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderHistoryReport = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b pb-4 print:pb-2">
          <div>
            <h3 className="text-xl font-black uppercase text-gray-900">Histórico de Registros (Auditoria)</h3>
            <p className="text-xs font-bold text-gray-500 uppercase">Filtro: {selectedPrefixes.size > 0 ? `${selectedPrefixes.size} Viaturas Selecionadas` : 'Geral'} | {monthFilter}</p>
          </div>
          <div className="text-right hidden print:block">
             <p className="text-[10px] font-black uppercase text-gray-400">Página <span className="page-number"></span></p>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-gray-50 rounded-2xl border overflow-hidden">
          <div className="bg-white p-2 border-b flex items-center gap-2 no-print">
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Filtrar por Viatura ou Placa..." 
              value={prefixSearch} 
              onChange={e => setPrefixSearch(e.target.value)} 
              className="bg-transparent text-xs font-bold outline-none flex-1" 
            />
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-[10px] text-left border-collapse">
              <thead className="sticky top-0 bg-gray-100 z-10 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b">
                <tr>
                  <th className="p-3">Data/Hora</th>
                  <th className="p-3">Viatura</th>
                  <th className="p-3">Inspetor</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Relatório</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {filteredLogs
                  .filter(l => 
                    !prefixSearch || 
                    String(l.prefix).toLowerCase().includes(prefixSearch.toLowerCase()) || 
                    String(l.plate).toLowerCase().includes(prefixSearch.toLowerCase())
                  )
                  .map(log => (
                  <tr key={log.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-3 font-mono text-gray-500">{new Date(log.date).toLocaleString('pt-BR')}</td>
                    <td className="p-3 font-black text-gray-800 uppercase">
                      {log.prefix} 
                      <span className="text-[8px] font-normal opacity-50 block">{log.plate}</span>
                    </td>
                    <td className="p-3 uppercase font-bold text-gray-600 break-words">{getInspector(log)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${String(log.itemsStatus).includes('CN') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {log.itemsStatus}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => setSelectedLog(log)} 
                        className="p-2 bg-gray-100 hover:bg-blue-600 hover:text-white rounded-lg transition-all shadow-sm no-print"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  if (activeReport) {
    return (
      <div className="p-6 space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between no-print">
          <button 
            onClick={() => setActiveReport(null)}
            className="flex items-center gap-2 text-xs font-black uppercase text-gray-400 hover:text-blue-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar aos Relatórios
          </button>
          <button 
            onClick={handlePrint}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg hover:bg-blue-700"
          >
            <Printer className="w-4 h-4" /> Imprimir Relatório
          </button>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm print:p-0 print:border-0 print:shadow-none relative">
          {activeReport === 'novelties' && renderNoveltiesReport()}
          {activeReport === 'synthetic' && renderSyntheticReport()}
          {activeReport === 'analytical' && renderAnalyticalReport()}
          {activeReport === 'full' && renderFullReport()}
          {activeReport === 'monthly_grouped' && renderMonthlyGroupedReport()}
          {activeReport === 'history' && renderHistoryReport()}
          
          {/* Print Footer for Page Numbering */}
          <div className="hidden print:flex fixed bottom-0 left-0 right-0 h-8 items-center justify-between px-8 text-[8px] text-gray-400 border-t border-gray-100 bg-white">
            <span className="font-black uppercase">Relatório Gerencial - CheckViatura Pro</span>
            <span className="page-number font-black uppercase"></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="grid grid-cols-1 gap-4 no-print">
        <div className="bg-gray-50 p-6 rounded-3xl border space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h4 className="text-xs font-black uppercase text-gray-400 flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filtros de Relatório
            </h4>
            <div className="flex gap-2">
              <button 
                onClick={() => onFetch(Array.from(selectedPrefixes).join(','), monthFilter)}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 active:scale-95"
              >
                {isLoading ? <BarChart className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Sincronizar Dados
              </button>
              <button 
                onClick={() => {
                  setMonthFilter(new Date().toISOString().substring(0, 7));
                  setSelectedPrefixes(new Set());
                  setPrefixSearch('');
                  onFetch('', '');
                }}
                disabled={isLoading}
                className="bg-white border hover:bg-gray-100 text-gray-600 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center transition-all disabled:opacity-50"
                title="Limpar Filtros"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Mês de Referência</label>
              <input 
                type="month" 
                value={monthFilter} 
                onChange={e => setMonthFilter(e.target.value)}
                className="w-full border-2 rounded-2xl p-3 text-sm font-bold outline-none focus:border-blue-500 bg-white shadow-sm"
              />
            </div>

            <div className="lg:col-span-9 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Seleção de Viaturas ({selectedPrefixes.size} selecionadas)</label>
                <div className="flex gap-2">
                  <button 
                    onClick={selectAllPrefixes}
                    className="text-[9px] font-black uppercase text-blue-600 hover:underline"
                  >
                    Selecionar Todas
                  </button>
                  <span className="text-gray-300">|</span>
                  <button 
                    onClick={deselectAllPrefixes}
                    className="text-[9px] font-black uppercase text-red-600 hover:underline"
                  >
                    Desmarcar Todas
                  </button>
                </div>
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Pesquisar viatura na lista..." 
                  value={prefixSearch}
                  onChange={e => setPrefixSearch(e.target.value)}
                  className="w-full border-2 rounded-2xl p-3 pl-12 text-sm font-bold outline-none focus:border-blue-500 bg-white shadow-sm"
                />
              </div>

              <div className="bg-white border-2 rounded-2xl p-4 max-h-48 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 shadow-inner">
                {uniquePrefixes
                  .filter(p => !prefixSearch || p.includes(normalizePrefix(prefixSearch)))
                  .map(prefix => (
                  <button
                    key={prefix}
                    onClick={() => togglePrefix(prefix)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border-2 text-center truncate ${
                      selectedPrefixes.has(prefix)
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                        : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    {prefix}
                  </button>
                ))}
                {uniquePrefixes.length === 0 && (
                  <div className="col-span-full py-4 text-center text-[10px] font-bold text-gray-400 uppercase">
                    Nenhuma viatura encontrada no banco.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-600 p-6 rounded-[2rem] text-white shadow-xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md shadow-inner">
            <BarChart className="w-8 h-8" />
          </div>
          <div className="text-center md:text-left">
            <h4 className="text-lg font-black uppercase tracking-tight">Central de Inteligência e Relatórios</h4>
            <p className="text-xs text-blue-100 font-medium opacity-90 max-w-md">Selecione as viaturas e o período acima para gerar documentos analíticos e estatísticos de alta precisão.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 no-print">
        {[
          { id: 'novelties', title: 'Relatório de Novidades', desc: 'Avarias e observações críticas.', icon: AlertCircle, color: 'bg-red-500' },
          { id: 'synthetic', title: 'Relatório Sintético', desc: 'Resumo estatístico e conformidade.', icon: PieChart, color: 'bg-green-500' },
          { id: 'analytical', title: 'Relatório Analítico', desc: 'Dados detalhados de todos os registros.', icon: List, color: 'bg-purple-500' },
          { id: 'full', title: 'Relatório Completo', desc: 'Todos os dados com seleção de colunas.', icon: FileText, color: 'bg-orange-600' },
          { id: 'monthly_grouped', title: 'Relatório Mensal Agrupado', desc: 'Agrupado por viatura (ABS20109 = ABS-20109).', icon: BarChart, color: 'bg-blue-600' },
          { id: 'history', title: 'Histórico de Registros', desc: 'Histórico completo vindo da Auditoria.', icon: Clock, color: 'bg-indigo-600' },
        ].map(report => (
          <button 
            key={report.id}
            onClick={() => setActiveReport(report.id as ReportType)}
            className="bg-white border p-6 rounded-3xl flex items-center gap-4 hover:border-blue-500 hover:shadow-md transition-all group text-left"
          >
            <div className={`${report.color} p-4 rounded-2xl text-white shadow-lg group-hover:scale-110 transition-transform`}>
              <report.icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h5 className="text-sm font-black uppercase text-gray-900">{report.title}</h5>
              <p className="text-[10px] text-gray-400 font-medium">{report.desc}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
          </button>
        ))}
      </div>

      <div className="bg-gray-50 p-6 rounded-3xl border border-dashed text-center no-print">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selecione um relatório acima para visualizar e imprimir</p>
      </div>
    </div>
  );
};

const PieChart = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
);
