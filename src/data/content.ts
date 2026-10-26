// Conteúdo editorial da landing. Todas as afirmações sobre a MSSERVER vêm das
// páginas publicadas em msserver.com.br (fonte indicada em cada bloco).

import type { Workload } from '../simulator/types';

export const HERO_PROOF = [
  // Fonte: páginas de produto ("Garantia padrão de 1 ano. Extensão de garantia disponível até 5 anos.")
  { icon: 'shield-check', title: 'Garantia de até 5 anos', text: '1 ano padrão + extensão' },
  // Fonte: landing atual e Quem Somos (venda e locação; nuvem privada em data center)
  { icon: 'layers', title: 'Compra, locação ou data center', text: 'Na modalidade que fizer sentido' },
  // Fonte: /cases-de-sucesso/ ("+15 Anos no Mercado")
  { icon: 'badge-check', title: '+15 anos no mercado', text: 'Infraestrutura para empresas' },
  // Fonte: home ("Fornecimento de servidores e peças para empresas e datacenters em todo o Brasil")
  { icon: 'truck', title: 'Envio para todo o Brasil', text: 'Estoque pronto para montagem' },
];

export interface Application {
  workload: Workload;
  icon: string;
  title: string;
  text: string;
  priorities: string[];
}

export const APPLICATIONS: Application[] = [
  {
    workload: 'erp',
    icon: 'layout-dashboard',
    title: 'ERP e sistemas de gestão',
    text: 'Faturamento, fiscal, estoque e CRM em um servidor exclusivo da empresa, sem disputar recursos com outros clientes.',
    priorities: ['Memória', 'Disco SSD', 'Backup'],
  },
  {
    workload: 'database',
    icon: 'database',
    title: 'Bancos de dados',
    text: 'Consultas e gravações constantes pedem memória para cache e discos de baixa latência.',
    priorities: ['Memória', 'SSD ou NVMe', 'Núcleos'],
  },
  {
    workload: 'virtualization',
    icon: 'layers',
    title: 'Virtualização',
    text: 'Consolide vários servidores virtuais em um único equipamento, com recursos reservados para cada máquina.',
    priorities: ['Núcleos', 'Memória', 'Redundância'],
  },
  {
    workload: 'web',
    icon: 'globe',
    title: 'Aplicações e sites',
    text: 'Sistemas web, portais e APIs com hardware exclusivo e controle total do ambiente.',
    priorities: ['Núcleos', 'IPs dedicados', 'SSD'],
  },
  {
    workload: 'files',
    icon: 'folder-archive',
    title: 'Arquivos e backup',
    text: 'Compartilhamento de arquivos e retenção de cópias de segurança, com capacidade para crescer.',
    priorities: ['Capacidade', 'RAID', 'Cópia externa'],
  },
];

export interface ModalityCard {
  modality: 'buy' | 'rent' | 'datacenter';
  icon: string;
  kicker: string;
  title: string;
  text: string;
  points: string[];
  cta: string;
  link?: { href: string; label: string };
}

export const MODALITY_CARDS: ModalityCard[] = [
  {
    modality: 'buy',
    icon: 'server',
    kicker: 'Compra',
    title: 'O servidor passa a ser da sua empresa',
    // Fontes: home ("usados e seminovos"), páginas de produto (garantia, selo, checklist, stress), Quem Somos (recompra)
    text: 'Servidores Dell, HP e IBM seminovos, testados e com garantia padrão de 1 ano, extensível até 5 anos.',
    points: ['Preços de referência publicados no catálogo', 'Selo de garantia, checklist e teste de stress', 'Recompra do seu equipamento atual'],
    cta: 'Simular compra',
  },
  {
    modality: 'rent',
    icon: 'calendar-sync',
    kicker: 'Locação',
    title: 'Capacidade dedicada sem imobilizar capital',
    // Fonte: landing atual e Quem Somos ("Venda e locação de servidores com suporte")
    text: 'Use servidores físicos na sua empresa por locação. Prazo, valores e condições são definidos na proposta.',
    points: ['Sem comprar o equipamento', 'Suporte técnico especializado', 'Condições ajustadas ao projeto'],
    cta: 'Simular locação',
  },
  {
    modality: 'datacenter',
    icon: 'cloud',
    kicker: 'Data center',
    title: 'Hardware exclusivo, fora do escritório',
    // Fontes: /servidores-dedicados/ (IPs, console KVM, VLAN/VPN/firewall/backup como adicionais) e /nuvem-privada/
    text: 'Servidor dedicado hospedado em data center ou nuvem privada sob medida para a sua operação.',
    points: ['IPs dedicados e acesso remoto por console', 'VLAN, VPN e firewall como serviços adicionais', 'Backup diário opcional'],
    cta: 'Simular data center',
    link: { href: 'https://msserver.com.br/nuvem-privada/', label: 'Conheça a nuvem privada' },
  },
];

export const DIFFERENTIATORS = {
  // Fonte: /extencao-de-garantia
  warranty: {
    title: 'Garantia padrão de 1 ano, com extensão até 5 anos',
    text: 'O plano Non-Stop prevê a substituição antecipada do servidor em caso de problema, e a extensão cobre componentes como discos, fonte e placa-mãe.',
    link: { href: 'https://msserver.com.br/extencao-de-garantia', label: 'Como funciona a extensão' },
  },
  items: [
    {
      icon: 'clipboard-check',
      title: 'Testado antes de sair',
      // Fonte: páginas de produto + landing atual ("Estoque imediato e pronto para envio")
      text: 'Cada equipamento sai com selo de garantia, checklist e teste de stress. Estoque pronto para montagem e envio para todo o Brasil.',
    },
    {
      icon: 'headset',
      title: 'Suporte humano e pró-ativo',
      // Fonte: landing atual ("Você fala com especialistas de verdade. Nada de robôs.") e home (suporte on-site)
      text: 'Você fala com especialistas, não com robôs. Atendimento técnico especializado, inclusive on-site.',
    },
    {
      icon: 'compass',
      title: 'Consultoria de implantação',
      // Fonte: landing atual e /consultoria-em-implantacao-de-servidores/
      text: 'Não é só hardware: a equipe desenha o projeto certo para o seu cenário, local ou em nuvem.',
    },
    {
      icon: 'repeat',
      title: 'Recompra do equipamento atual',
      // Fonte: landing atual ("Garantimos a recompra com um preço justo") e Quem Somos
      text: 'Preço justo pelo seu servidor usado na troca por um novo, em upgrades ou na migração para a nuvem.',
    },
  ],
  // Fonte: /aplicativo-ms-server/ e home (app gratuito)
  app: {
    title: 'App MSSERVER',
    text: 'Gratuito para iOS e Android: monitore servidores, acione o suporte, acompanhe backups e contrate a extensão de garantia pelo celular.',
  },
};

export const PROCESS = [
  { title: 'Configure ou descreva', text: 'Use o simulador ou conte a sua necessidade pelo WhatsApp.' },
  { title: 'Validação técnica', text: 'Um especialista revisa o cenário, confirma compatibilidades e ajusta o dimensionamento.' },
  { title: 'Proposta', text: 'Você recebe as opções de compra, locação ou data center para a configuração validada.' },
  { title: 'Montagem e testes', text: 'O servidor é montado e passa por checklist e teste de stress antes do envio.' },
  { title: 'Implantação e suporte', text: 'Implantação opcional pela equipe, suporte especializado e acompanhamento pelo app.' },
];

// Fonte: /cases-de-sucesso/ (indicadores publicados pela MSSERVER)
export const STATS = [
  { value: '+15', label: 'anos no mercado' },
  { value: '+250', label: 'projetos entregues' },
];

// Fonte: depoimentos publicados em /sobre/ (pequenas correções de digitação).
export const TESTIMONIALS = [
  {
    quote:
      'Sempre que precisamos, adquirimos os equipamentos com a MSServer. Temos um excelente atendimento, nos é ofertado nada mais do que precisamos, gerando economia para a nossa empresa, sem contar o pós-venda mais ágil que o das próprias fabricantes.',
    name: 'Fernando',
    company: 'Perfilados Nardi',
  },
  {
    quote:
      'A MSServer fez o serviço de implantação de servidores. O que surpreendeu foi a agilidade em realizar essa implantação, que facilitou muito a nossa rotina, além de garantir a alta disponibilidade da nossa operação.',
    name: 'Sara',
    company: 'RD Concretos',
  },
  {
    quote:
      'A MSServer presta serviço de consultoria e suporte para nós há cerca de 2 anos. Desde então, nosso processo melhorou muito com as implantações de servidores e incidentes atendidos de forma rápida e eficaz.',
    name: 'Jessica',
    company: 'Senior Engenharia',
  },
  {
    quote:
      'A MSServer nos ajudou na migração de todas as aplicações da empresa para a nuvem após a pandemia. Conseguimos manter a operação ativa e ainda reduzir custos com equipamentos e com o operacional.',
    name: 'Pedro Hermano',
    company: 'Attri',
  },
];

// Fonte: /cases-de-sucesso/
export const CASES = [
  { client: 'Lumiar', sector: 'Saúde', text: 'Cluster de alta disponibilidade integrado a LTO para retenção de longo prazo de dados clínicos.' },
  { client: 'Datasafer', sector: 'Tecnologia', text: 'Dezenas de servidores com 12 baias e discos de 20 TB para alta demanda de armazenamento.' },
  { client: 'Rumo', sector: 'Logística', text: 'Ambiente em cluster com IA para leitura e análise de vagões ferroviários.' },
  { client: 'Ourominas', sector: 'Financeiro', text: 'Hardware corporativo com implantação estruturada para sistemas financeiros.' },
  { client: 'Terracom', sector: 'Indústria', text: 'Upgrades, servidores e extensão de garantia para modernizar o parque tecnológico.' },
  { client: 'Forças Armadas', sector: 'Setor público', text: 'Suporte especializado em hardware legado e recuperação de dados estratégicos.' },
];

export const FAQ = [
  {
    q: 'O que é um servidor dedicado?',
    a: 'É um servidor físico usado por uma única empresa: processador, memória e discos não são divididos com outros clientes. Ele pode ficar na sua empresa, comprado ou alugado, ou hospedado em data center.',
  },
  {
    q: 'Quando vale a pena escolher um servidor dedicado?',
    a: 'Quando a operação depende de sistemas que precisam de desempenho constante, controle do ambiente e custo previsível. ERP, bancos de dados, virtualização e servidores de arquivos são os casos mais comuns. Para cargas pequenas ou muito variáveis, outras soluções podem bastar, e o especialista ajuda a comparar.',
  },
  {
    q: 'É melhor comprar ou alugar um servidor?',
    a: 'Na compra, o equipamento passa a ser da empresa e o investimento acontece de uma vez. Na locação, você usa o servidor sem imobilizar capital, com condições definidas em contrato. A escolha depende do horizonte do projeto, do orçamento e da política da empresa. No simulador, marque "quero comparar" para receber as duas opções.',
  },
  {
    q: 'Os servidores são novos?',
    a: 'A MSSERVER trabalha com servidores usados e seminovos das linhas Dell PowerEdge, HP ProLiant e IBM System x. Todos saem com selo de garantia, checklist e teste de stress.',
  },
  {
    q: 'Como funciona a garantia?',
    a: 'Os servidores têm garantia padrão de 1 ano. A extensão de garantia amplia a cobertura para até 5 anos, inclui componentes como discos, fonte e placa-mãe e segue o plano Non-Stop de substituição antecipada. A extensão também pode ser contratada pelo App MSSERVER.',
  },
  {
    q: 'Como escolher processador, memória e armazenamento?',
    a: 'Comece pelo uso: virtualização pede mais núcleos e memória, bancos de dados se beneficiam de memória e de discos SSD ou NVMe, e arquivos e backup pedem capacidade. O simulador traz orientações em cada etapa e aceita "não sei". Um especialista valida tudo antes da proposta.',
  },
  {
    q: 'Os preços do simulador são finais?',
    a: 'Não. Na compra, o simulador mostra os preços publicados no catálogo do site para o equipamento na memória escolhida. Processadores, discos, extensão de garantia e serviços são definidos na proposta, que também considera a disponibilidade de estoque. Locação e data center são sempre orçados pela equipe.',
  },
  {
    q: 'A MSSERVER oferece suporte técnico?',
    a: 'Sim. O suporte é feito por especialistas, inclusive com atendimento on-site, e também pode ser acionado pelo App MSSERVER. O atendimento comercial funciona das 8h às 18h.',
  },
  {
    q: 'Vocês atendem empresas fora de São Paulo?',
    a: 'Sim. A MSSERVER fornece servidores e peças para empresas e data centers em todo o Brasil.',
  },
  {
    q: 'É possível montar uma configuração específica?',
    a: 'Sim. Além das opções do simulador, a equipe monta configurações específicas e nuvens privadas sob medida. Descreva os detalhes no campo de observações ao enviar a simulação.',
  },
];
