
import { ChecklistItem, AspectRatio } from './types';

export const INITIAL_CHECKLIST_ITEMS: Omit<ChecklistItem, 'status'>[] = [
  // --- CHECKLIST DIÁRIO (28 ITENS) ---
  { id: 'd1', label: 'DOCUMENTOS DO VEÍCULO E A FICHA DE COMBUSTÍVEL (CLRV, RIV, FCOMB, FCT)', frequency: 'Diário' },
  { id: 'd2', label: 'MANUTENÇÃO DE OPERAÇÃO DIÁRIA E SEMANAL', frequency: 'Diário' },
  { id: 'd3', label: 'CONFERIR SELOS DE INSPEÇÃO DE FREIOS E TROCAS DE ÓLEOS', frequency: 'Diário' },
  { id: 'd4', label: 'PLANO DE MANUTENÇÃO PREVENTIVA', frequency: 'Diário' },
  { id: 'd5', label: 'DOCUMENTAÇÃO DO MOTORISTA', frequency: 'Diário' },
  { id: 'd6', label: 'NÍVEL DE ÓLEO DO CARTER, DIREÇÃO HIDRÁULICA, SISTEMA HIDRÁULICO E CÂMBIO AUTOMÁTICO', frequency: 'Diário' },
  { id: 'd7', label: 'NÍVEIS DE ÁGUA (COMPLETANDO SE NECESSÁRIO)', frequency: 'Diário' },
  { id: 'd8', label: 'NÍVEL DE FLUÍDO DE FREIO', frequency: 'Diário' },
  { id: 'd9', label: 'VERIFICAR VAZAMENTOS EM GERAL', frequency: 'Diário' },
  { id: 'd10', label: 'ESTADO E TENSÃO DAS CORREIAS', frequency: 'Diário' },
  { id: 'd11', label: 'FIXAÇÃO DA BATERIA E RESPECTIVOS BORNES', frequency: 'Diário' },
  { id: 'd12', label: 'FUNCIONAR O VEÍCULO, VERIFICANDO BARULHOS ANORMAIS NO MOTOR', frequency: 'Diário' },
  { id: 'd13', label: 'FUNCIONAMENTO DOS MARCADORES E ALARMES DO PAINEL (TEMP, ÓLEO, AR FREIO, ETC)', frequency: 'Diário' },
  { id: 'd14', label: 'COMANDOS DO ACELERADOR', frequency: 'Diário' },
  { id: 'd15', label: 'EMBREAGEM E CÂMBIO/TRANSMISSÃO', frequency: 'Diário' },
  { id: 'd16', label: 'FUNCIONAMENTO DOS LIMPADORES DE PÁRA-BRISA E ESTADO DAS PALHETAS', frequency: 'Diário' },
  { id: 'd17', label: 'FUNCIONAMENTO DOS FREIOS', frequency: 'Diário' },
  { id: 'd18', label: 'SISTEMA ELÉTRICO (LANTERNA, SETA, FAROL, FREIO, EMERGÊNCIA, RÉ, BUZINA)', frequency: 'Diário' },
  { id: 'd19', label: 'PORTAS, FECHADURAS E MÁQUINAS DE VIDRO', frequency: 'Diário' },
  { id: 'd20', label: 'ESTADO DAS RODAS, PRISIONEIROS E PNEUS (PRESSÃO, DESGASTES E CORTES)', frequency: 'Diário' },
  { id: 'd21', label: 'VERIFICAR PNEU SOBRESSALENTE E SUAS CONDIÇÕES (QUANDO HOUVER)', frequency: 'Diário' },
  { id: 'd22', label: 'EQUIPAMENTOS OBRIGATÓRIOS (TRIÂNGULO, MACACO, CHAVE DE RODA)', frequency: 'Diário' },
  { id: 'd23', label: 'VERIFICAR A CARROCERIA QUANTO À AVARIAS E FIXAÇÃO DE PLACAS', frequency: 'Diário' },
  { id: 'd24', label: 'VERIFICAR O ESTADO DO CINTO DE SEGURANÇA', frequency: 'Diário' },
  { id: 'd25', label: 'VERIFICAR O ESTADO DO ESTOFAMENTO, DO FORRO E TAPETES', frequency: 'Diário' },
  { id: 'd26', label: 'ESPELHOS RETROVISORES INTERNOS E EXTERNOS', frequency: 'Diário' },
  { id: 'd27', label: 'EQUIPAMENTOS OPERACIONAIS ESPECÍFICOS (BOMBA, ESCADA, GERADOR, ETC)', frequency: 'Diário' },
  { id: 'd28', label: 'COMPLETAR O COMBUSTÍVEL SE NECESSÁRIO', frequency: 'Diário' },

  // --- CHECKLIST SEMANAL (18 ITENS) ---
  { id: 's1', label: 'REALIZAR INSPEÇÃO CONSTANTE NO CHECK LIST DIÁRIO', frequency: 'Semanal' },
  { id: 's2', label: 'CONFERIR SELOS DE TROCA DE ÓLEO E INSPEÇÃO DE FREIOS (DATA E KM VENCIMENTOS)', frequency: 'Semanal' },
  { id: 's3', label: 'VERIFICAR O ESTADO E FIXAÇÃO DOS EXTINTORES', frequency: 'Semanal' },
  { id: 's4', label: 'EFETUAR LIMPEZA E FIXAÇÃO DOS TERMINAIS DAS BATERIAS', frequency: 'Semanal' },
  { id: 's5', label: 'COMPLETAR ÓLEO DA SIRENE BITONAL (2 GOTAS SAE 10W30 A CADA 15 DIAS)', frequency: 'Semanal' },
  { id: 's6', label: 'INSPECIONAR PARAFUSOS DAS FLANGES DO CARDAN E ENGRAXAR CRUZETAS', frequency: 'Semanal' },
  { id: 's7', label: 'INSPECIONAR AS CINTAS PROTETORAS DO CARDAN', frequency: 'Semanal' },
  { id: 's8', label: 'INSPECIONAR MOLAS, AMORTECEDORES, COXINS, COIFAS, CATRACAS E BATENTES', frequency: 'Semanal' },
  { id: 's9', label: 'TESTAR VÁLVULA DE DESCARGA AUTOMÁTICA DO RESERVATÓRIO DE AR (SE HOUVER)', frequency: 'Semanal' },
  { id: 's10', label: 'DRENAR O DECANTADOR DO ÓLEO DIESEL - DECANTADOR RACCOR (SE NECESSÁRIO)', frequency: 'Semanal' },
  { id: 's11', label: 'INSPECIONAR TUBULAÇÕES E MANGUEIRAS DE AR DO FREIO (VAZAMENTOS)', frequency: 'Semanal' },
  { id: 's12', label: 'APERTAR PARAFUSOS DA CARROÇARIA, ACESSÓRIOS, PARA-CHOQUE, COXIM E ESCAPE', frequency: 'Semanal' },
  { id: 's13', label: 'COMPLETAR ÓLEO LUBRIFICANTE DA BOMBA INJETORA (SE NECESSÁRIO)', frequency: 'Semanal' },
  { id: 's14', label: 'VERIFICAR SUPORTE DO MOTOR (TRAVESSA), ANALISANDO DANOS E TRINCAS', frequency: 'Semanal' },
  { id: 's15', label: 'INSPECIONAR FIXAÇÃO DA CÂMARA DE FREIOS', frequency: 'Semanal' },
  { id: 's16', label: 'TESTAR FUNCIONAMENTO DOS CONJUNTOS IMPLEMENTADOS (CARACTERÍSTICAS OPERACIONAIS)', frequency: 'Semanal' },
  { id: 's17', label: 'ATUALIZAR LANÇAMENTOS DE SERVICHOS, PEÇAS E ALTERAÇÕES NO RIV DA VTR', frequency: 'Semanal' },
  { id: 's18', label: 'LIMPEZA GERAL DA VIATURA COM APLICAÇÃO DE CERA SILICONE', frequency: 'Semanal' },
];

export const INITIAL_VEHICLE_IMAGES: string[] = [
  '', '', '', '', ''
];

export const INITIAL_VEHICLE_RATIOS: AspectRatio[] = [
  'landscape', 'landscape', 'landscape', 'landscape', 'landscape'
];
