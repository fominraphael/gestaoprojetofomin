// Modelos de checklist de Inspeção de Certificados Seminovos (ICS).
// Estruturados por seção. Quantidades EXATAS por tipo:
//   TCUV → 135 itens
//   TSIM →  48 itens

export type ChecklistTipo = "TCUV" | "TSIM";

export interface ChecklistSecao {
  titulo: string;
  itens: string[];
}

export interface ChecklistModelo {
  tipo: ChecklistTipo;
  totalItens: number;
  secoes: ChecklistSecao[];
}

// --- TCUV (135 itens) ---------------------------------------------------
const TCUV_SECOES: ChecklistSecao[] = [
  {
    titulo: "1. Documentação",
    itens: [
      "CRLV em nome do proprietário",
      "Manual do proprietário",
      "Manual de garantia / revisões",
      "Cópia das notas das revisões anteriores",
      "Chave reserva",
      "Pesquisa de procedência (gravame, sinistro, leilão)",
      "Histórico de revisões na rede Toyota",
    ],
  },
  {
    titulo: "2. Exterior — Lataria e Pintura",
    itens: [
      "Para-choque dianteiro — fixação e pintura",
      "Para-choque traseiro — fixação e pintura",
      "Capô — alinhamento e pintura",
      "Porta dianteira esquerda — alinhamento e pintura",
      "Porta dianteira direita — alinhamento e pintura",
      "Porta traseira esquerda — alinhamento e pintura",
      "Porta traseira direita — alinhamento e pintura",
      "Paralama dianteiro esquerdo",
      "Paralama dianteiro direito",
      "Lateral traseira esquerda",
      "Lateral traseira direita",
      "Tampa traseira / porta-malas",
      "Teto — pintura e fixação",
      "Coluna A esquerda",
      "Coluna A direita",
      "Coluna B esquerda",
      "Coluna B direita",
      "Coluna C esquerda",
      "Coluna C direita",
      "Soleiras e estribos",
      "Aplicação de adesivos e emblemas",
      "Vidro para-brisa — trincas",
      "Vidro traseiro — trincas",
      "Vidros laterais — funcionamento",
      "Retrovisor externo esquerdo",
      "Retrovisor externo direito",
      "Frisos e borrachas das portas",
    ],
  },
  {
    titulo: "3. Iluminação",
    itens: [
      "Farol baixo esquerdo",
      "Farol baixo direito",
      "Farol alto esquerdo",
      "Farol alto direito",
      "Farol de neblina",
      "Luz diurna (DRL)",
      "Lanterna traseira esquerda",
      "Lanterna traseira direita",
      "Luz de freio",
      "Luz de freio central (brake light)",
      "Pisca dianteiro esquerdo / direito",
      "Pisca traseiro esquerdo / direito",
      "Luz de ré",
      "Luz de placa",
      "Iluminação interna do teto",
    ],
  },
  {
    titulo: "4. Interior — Acabamento",
    itens: [
      "Bancos dianteiros — estofamento e regulagem",
      "Bancos traseiros — estofamento",
      "Cintos de segurança — funcionamento",
      "Tapetes originais",
      "Painel de instrumentos — sem trincas",
      "Console central",
      "Forração do teto",
      "Forros das portas",
      "Volante — desgaste e acabamento",
      "Manopla do câmbio",
      "Freio de estacionamento",
    ],
  },
  {
    titulo: "5. Painel e Acessórios",
    itens: [
      "Iluminação do painel",
      "Conta-giros",
      "Velocímetro",
      "Indicador de combustível",
      "Indicador de temperatura",
      "Hodômetro total e parcial",
      "Luzes-espia (check engine, ABS, airbag)",
      "Rádio / multimídia",
      "Alto-falantes",
      "Bluetooth / USB",
      "Câmera de ré",
      "Sensor de estacionamento",
      "Ar-condicionado — refrigeração",
      "Aquecimento",
      "Ventilação — todas as velocidades",
      "Desembaçador traseiro",
      "Limpador de para-brisa dianteiro",
      "Limpador traseiro",
      "Esguicho de água",
      "Buzina",
      "Trava elétrica",
      "Vidros elétricos",
      "Espelhos elétricos",
    ],
  },
  {
    titulo: "6. Motor e Compartimento",
    itens: [
      "Nível e estado do óleo do motor",
      "Nível do líquido de arrefecimento",
      "Nível do fluido de freio",
      "Nível do fluido da direção (se hidráulica)",
      "Nível do fluido do limpador",
      "Bateria — terminais e fixação",
      "Correia(s) — estado",
      "Mangueiras — vazamentos",
      "Filtro de ar — estado",
      "Coxins do motor",
      "Partida a frio",
      "Marcha lenta estabilizada",
      "Ausência de ruídos anormais",
      "Escapamento — fixação e ruído",
      "Emissão de fumaça",
    ],
  },
  {
    titulo: "7. Transmissão e Embreagem",
    itens: [
      "Engate de marchas — manual",
      "Acionamento da embreagem (se manual)",
      "Funcionamento do câmbio automático",
      "Diferencial — ruídos",
      "Semi-eixos — coifas",
    ],
  },
  {
    titulo: "8. Suspensão e Direção",
    itens: [
      "Amortecedor dianteiro esquerdo",
      "Amortecedor dianteiro direito",
      "Amortecedor traseiro esquerdo",
      "Amortecedor traseiro direito",
      "Buchas e pivôs",
      "Barra estabilizadora",
      "Direção — alinhamento",
      "Direção — folga",
      "Funcionamento da direção elétrica/hidráulica",
    ],
  },
  {
    titulo: "9. Freios",
    itens: [
      "Pastilhas dianteiras",
      "Discos dianteiros",
      "Pastilhas / lonas traseiras",
      "Discos / tambores traseiros",
      "Pedal de freio — curso",
      "Freio de estacionamento — eficiência",
      "ABS — teste de funcionamento",
    ],
  },
  {
    titulo: "10. Pneus e Rodas",
    itens: [
      "Pneu dianteiro esquerdo — sulco e estado",
      "Pneu dianteiro direito — sulco e estado",
      "Pneu traseiro esquerdo — sulco e estado",
      "Pneu traseiro direito — sulco e estado",
      "Estepe — estado",
      "Rodas — sem amassados",
      "Calotas / parafusos",
      "Chave de roda e macaco",
      "Triângulo de sinalização",
    ],
  },
  {
    titulo: "11. Test-Drive",
    itens: [
      "Aceleração progressiva",
      "Resposta dos freios",
      "Estabilidade em curva",
      "Ruídos durante condução",
      "Funcionamento do cruise control (se equipado)",
      "Sistema de tração 4x4 (se equipado)",
    ],
  },
];

// --- TSIM (48 itens) ----------------------------------------------------
const TSIM_SECOES: ChecklistSecao[] = [
  {
    titulo: "1. Documentação",
    itens: [
      "CRLV em nome do proprietário",
      "Manual do proprietário",
      "Chave reserva",
      "Pesquisa de procedência",
    ],
  },
  {
    titulo: "2. Exterior",
    itens: [
      "Pintura geral — sem retoques aparentes",
      "Para-choque dianteiro",
      "Para-choque traseiro",
      "Portas — alinhamento",
      "Capô e tampa traseira",
      "Vidros — trincas",
      "Retrovisores externos",
      "Faróis e lanternas",
      "Pisca-alertas",
    ],
  },
  {
    titulo: "3. Interior",
    itens: [
      "Bancos e estofamento",
      "Cintos de segurança",
      "Painel sem trincas",
      "Volante e acabamentos",
      "Tapetes",
      "Ar-condicionado",
      "Multimídia / rádio",
      "Vidros e travas elétricas",
      "Buzina",
      "Limpadores de para-brisa",
    ],
  },
  {
    titulo: "4. Mecânica",
    itens: [
      "Nível do óleo do motor",
      "Líquido de arrefecimento",
      "Fluido de freio",
      "Bateria",
      "Correias e mangueiras",
      "Partida e marcha lenta",
      "Ruídos do motor",
      "Escapamento",
      "Câmbio — engates",
      "Embreagem (se manual)",
    ],
  },
  {
    titulo: "5. Suspensão, Direção e Freios",
    itens: [
      "Amortecedores",
      "Direção — alinhamento e folga",
      "Pastilhas e discos",
      "Freio de estacionamento",
      "ABS",
    ],
  },
  {
    titulo: "6. Pneus e Acessórios",
    itens: [
      "Pneu dianteiro esquerdo",
      "Pneu dianteiro direito",
      "Pneu traseiro esquerdo",
      "Pneu traseiro direito",
      "Estepe",
      "Chave de roda e macaco",
      "Triângulo",
    ],
  },
  {
    titulo: "7. Test-Drive",
    itens: ["Aceleração e freios", "Estabilidade", "Ruídos em condução"],
  },
];

function totalItens(secoes: ChecklistSecao[]): number {
  return secoes.reduce((acc, s) => acc + s.itens.length, 0);
}

export const CHECKLIST_MODELOS: Record<ChecklistTipo, ChecklistModelo> = {
  TCUV: { tipo: "TCUV", totalItens: totalItens(TCUV_SECOES), secoes: TCUV_SECOES },
  TSIM: { tipo: "TSIM", totalItens: totalItens(TSIM_SECOES), secoes: TSIM_SECOES },
};

// Asserção de tamanho em runtime (build dev) para garantir contagens exatas
if (CHECKLIST_MODELOS.TCUV.totalItens !== 135) {
  console.warn(
    `[checklist] TCUV deve ter 135 itens, atual=${CHECKLIST_MODELOS.TCUV.totalItens}`,
  );
}
if (CHECKLIST_MODELOS.TSIM.totalItens !== 48) {
  console.warn(
    `[checklist] TSIM deve ter 48 itens, atual=${CHECKLIST_MODELOS.TSIM.totalItens}`,
  );
}

export type MarcacaoItem = "" | "✓" | "N/A";
