import { PolishingDegree, VehicleSize } from '../types';

export interface PolishingPackage {
  grau: PolishingDegree;
  nome: string;
  subtitulo: string;
  tagline: string;
  descricao: string;
  indicacao: string;
  etapas: string[];
  duracaoEstimadaHoras: number;
  garantiaMeses: number;
  insumosUtilizados: {
    nome: string;
    quantidade: string;
    finalidade: string;
  }[];
  // Preços sugeridos de balcão por porte de veículo (R$)
  precosPorPorte: Record<VehicleSize, number>;
  // Horas de mão de obra por porte
  horasPorPorte: Record<VehicleSize, number>;
  // Custo médio de insumos por porte
  custoInsumosPorPorte: Record<VehicleSize, number>;
}

export const POLISHING_PACKAGES: Record<PolishingDegree, PolishingPackage> = {
  comercial: {
    grau: 'comercial',
    nome: 'Polimento Comercial',
    subtitulo: 'Corte Rápido & Realce de Brilho',
    tagline: 'Ideal para revenda, lojistas e rápida renovação visual',
    descricao: 'Procedimento ágil em etapa única (One-Step) focado em remover névoas de tinta, oxidações superficiais e micro-riscos leves, devolvendo o brilho e a vivacidade da pintura com excelente custo-benefício.',
    indicacao: 'Carros para venda, frotas ou veículos com verniz em bom estado que precisam apenas de renovação de brilho.',
    etapas: [
      'Lavagem detalhada de remoção de sujidades',
      'Desengraxe e isolamento de borrachas e plásticos',
      'Polimento One-Step (composto de corte moderado + lustro)',
      'Aplicação de Cera Protetiva de Carnaúba Premium',
      'Acabamento com microfibra e brilho final nos vidros e pneus'
    ],
    duracaoEstimadaHoras: 4,
    garantiaMeses: 3,
    insumosUtilizados: [
      { nome: 'Composto Polidor One-Step', quantidade: '120 ml', finalidade: 'Corte médio e lustro simultâneo' },
      { nome: 'Boina de Espuma Média', quantidade: '1 un (fração)', finalidade: 'Nivelamento rápido sem marcas profundas' },
      { nome: 'Cera de Carnaúba Protetiva', quantidade: '30 g', finalidade: 'Proteção hidrofóbica básica e brilho quente' },
      { nome: 'Fita Crepe Automotiva e Limpeza', quantidade: '1 rolo', finalidade: 'Mascaramento de frisos e borrachas' },
    ],
    precosPorPorte: {
      compacto: 280.0,
      medio: 350.0,
      grande: 450.0,
      especial: 580.0,
    },
    horasPorPorte: {
      compacto: 3.5,
      medio: 4.5,
      grande: 6.0,
      especial: 8.0,
    },
    custoInsumosPorPorte: {
      compacto: 35.0,
      medio: 45.0,
      grande: 60.0,
      especial: 80.0,
    },
  },

  tecnico: {
    grau: 'tecnico',
    nome: 'Polimento Técnico',
    subtitulo: 'Correção de Verniz Multi-Etapas (85% a 95%)',
    tagline: 'Eliminação profunda de riscos, teias de aranha (swirls) e hologramas',
    descricao: 'Tratamento de alta precisão técnica que avalia a espessura do verniz para realizar corte, refino e lustro minucioso. Remove marcas de lavagens erradas, manchas de chuva ácida leves e imperfeições, proporcionando reflexo nítido de espelho.',
    indicacao: 'Proprietários exigentes, carros pretos ou cores escuras que mostram hologramas, e veículos pós-funilaria.',
    etapas: [
      'Lavagem técnica e descontaminação química de partículas ferrosas',
      'Descontaminação mecânica profunda com Clay Bar (Barra de Argila)',
      'Medição e mapeamento do verniz em micras com inspeção de luz fria',
      'Isolamento completo de borrachas, emblemas e frisos cromados',
      '1ª Etapa: Corte técnico pesado para remoção de riscos médios',
      '2ª Etapa: Refino de precisão para eliminar marcas de corte',
      '3ª Etapa: Super-Lustro com composto anti-holograma',
      'Aplicação de Selante Sintético SiO2 de alta ancoragem (durabilidade até 6 meses)'
    ],
    duracaoEstimadaHoras: 10,
    garantiaMeses: 6,
    insumosUtilizados: [
      { nome: 'Clay Bar Descontaminante', quantidade: '50 g', finalidade: 'Eliminar pulverizações e contaminação áspera' },
      { nome: 'Composto de Corte de Alta Performance', quantidade: '150 ml', finalidade: 'Nivelamento de riscos profundos' },
      { nome: 'Composto de Refino Médio', quantidade: '120 ml', finalidade: 'Remoção de marcas de lixa e haze' },
      { nome: 'Lustrador Anti-Hologramas', quantidade: '100 ml', finalidade: 'Profundidade máxima de cor e reflexo espelho' },
      { nome: 'Boinas de Lã Híbrida e Espumas Macias', quantidade: '3 un (fração)', finalidade: 'Etapas consecutivas de acabamento' },
      { nome: 'Selante Sintético SiO2 Concentrado', quantidade: '40 ml', finalidade: 'Proteção UV e repelência de líquidos' },
    ],
    precosPorPorte: {
      compacto: 650.0,
      medio: 800.0,
      grande: 980.0,
      especial: 1250.0,
    },
    horasPorPorte: {
      compacto: 8.0,
      medio: 10.0,
      grande: 13.0,
      especial: 16.0,
    },
    custoInsumosPorPorte: {
      compacto: 75.0,
      medio: 95.0,
      grande: 125.0,
      especial: 160.0,
    },
  },

  cristalizado: {
    grau: 'cristalizado',
    nome: 'Polimento Cristalizado',
    subtitulo: 'Espelhamento & Vitrificação Cerâmica 9H',
    tagline: 'O mais alto nível de proteção, repelência e brilho espelhado do mercado',
    descricao: 'A experiência definitiva em estética automotiva. Une a correção técnica integral do verniz com a aplicação de Coating Cerâmico / Cristalizador de dureza 9H. Cria uma camada de vidro invisível de proteção contra raios solares, fezes de aves, maresia, sujeira e pequenas agressões, com efeito autolimpante e brilho ultra espelhado.',
    indicacao: 'Carros novos, seminovos de luxo, colecionadores ou proprietários que buscam proteção definitiva com garantia estendida.',
    etapas: [
      'Lavagem técnica extrema, limpeza de caixas de roda e descontaminação ferrosa',
      'Descontaminação minuciosa com Clay Bar em 100% da lataria',
      'Mapeamento micrométrico de verniz e isolamento técnico reforçado',
      'Correção completa do verniz em 3 a 4 etapas (Corte, Refino e Super-Lustro)',
      'Banho de Álcool Isopropílico (IPA / Revelador de Hologramas) para remoção de óleos',
      'Aplicação manual do Vitrificador Cerâmico / Cristalizador 9H painel a painel',
      'Tempo de cura controlada (Flash time) e remoção do excesso com microfibra a laser',
      'Emissão de Certificado de Garantia e manual de cuidados de lavagem'
    ],
    duracaoEstimadaHoras: 16,
    garantiaMeses: 18,
    insumosUtilizados: [
      { nome: 'Kit Vitrificador Cerâmico 9H (Coating)', quantidade: '30 a 50 ml', finalidade: 'Camada de vidro líquido e máxima proteção' },
      { nome: 'Revelador de Hologramas (IPA Puro)', quantidade: '250 ml', finalidade: 'Limpeza desengordurante para ancoragem do coating' },
      { nome: 'Bloco Aplicador & Panos de Suede', quantidade: '1 kit', finalidade: 'Aplicação uniforme sem riscar o verniz' },
      { nome: 'Kit Compostos Polidores Nobres', quantidade: '250 ml', finalidade: 'Corte, refino e lustro livre de silicones' },
      { nome: 'Microfibras Especiais Cortadas a Laser', quantidade: '4 un', finalidade: 'Remoção suave e nivelamento do vitrificador' },
    ],
    precosPorPorte: {
      compacto: 1100.0,
      medio: 1350.0,
      grande: 1680.0,
      especial: 2100.0,
    },
    horasPorPorte: {
      compacto: 12.0,
      medio: 16.0,
      grande: 20.0,
      especial: 25.0,
    },
    custoInsumosPorPorte: {
      compacto: 160.0,
      medio: 195.0,
      grande: 250.0,
      especial: 320.0,
    },
  },
};

export const POLISHING_ADDONS: {
  id: string;
  nome: string;
  descricao: string;
  precoPadrao: number;
}[] = [
  {
    id: 'addon_farois',
    nome: 'Revitalização e Polimento de Faróis (Par)',
    descricao: 'Lixamento técnico gradual, remoção de amarelado e aplicação de selante protetor UV',
    precoPadrao: 140.0,
  },
  {
    id: 'addon_parabrisa',
    nome: 'Cristalização de Vidros e Parabrisa',
    descricao: 'Descontaminação de manchas de chuva ácida e película super hidrofóbica (Water Off)',
    precoPadrao: 120.0,
  },
  {
    id: 'addon_oxisanitizacao',
    nome: 'Higienização e Oxi-sanitização Interna',
    descricao: 'Eliminação de fungos, ácaros e odores desagradáveis no ar-condicionado com gerador de Ozônio',
    precoPadrao: 150.0,
  },
  {
    id: 'addon_couro',
    nome: 'Higienização & Hidratação de Bancos de Couro',
    descricao: 'Limpeza profunda dos poros e hidratação com restaurador com toque acetinado',
    precoPadrao: 180.0,
  },
  {
    id: 'addon_rodas',
    nome: 'Descontaminação Ferrosa e Vitrificação de Rodas',
    descricao: 'Remoção de fuligem incrustada de pastilha de freio e proteção das 4 rodas',
    precoPadrao: 160.0,
  },
];
