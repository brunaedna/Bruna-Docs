import type { KnowledgeDocument, Message } from "./types";

export const INITIAL_DOCUMENTS: KnowledgeDocument[] = [
  {
    id: "onboarding",
    title: "Manual de onboarding",
    type: "PDF",
    pages: 18,
    updated: "Hoje, 09:42",
    accent: "#6E65F7",
    content:
      "O onboarding dura duas semanas. No primeiro dia, a pessoa recebe os acessos essenciais, conhece sua liderança e revisa o plano de 30 dias. Na primeira semana, participa de sessões com Produto, Engenharia e Suporte. O buddy acompanha dúvidas operacionais e realiza checkpoints nos dias 3, 7 e 14. Ao final da segunda semana, liderança e colaborador revisam entregas iniciais, bloqueios e próximos objetivos.",
  },
  {
    id: "remote",
    title: "Política de trabalho remoto",
    type: "DOCX",
    pages: 9,
    updated: "Ontem, 16:18",
    accent: "#38A5FF",
    content:
      "O trabalho remoto é permitido em todo o território nacional. Cada equipe define uma janela de colaboração de quatro horas entre 10h e 17h no horário de Brasília. Reuniões devem ter pauta, responsável e registro de decisões. Despesas de internet podem ser reembolsadas em até R$ 150 por mês mediante comprovante. Equipamentos corporativos devem usar autenticação multifator e bloqueio automático.",
  },
  {
    id: "product",
    title: "Guia de produto — Q3",
    type: "PDF",
    pages: 24,
    updated: "12 set, 11:30",
    accent: "#B64DFF",
    content:
      "As prioridades do terceiro trimestre são reduzir o tempo até o primeiro valor, melhorar a busca e aumentar a confiança nas respostas. O indicador principal é a taxa de respostas úteis. Metas: reduzir o onboarding de 12 para 7 minutos, alcançar 85% de avaliações positivas e exibir fontes em 100% das respostas. A equipe também acompanhará tempo de resposta e custo por consulta.",
  },
];

export const SUGGESTED_QUESTIONS = [
  "Quanto tempo dura o onboarding?",
  "Qual é o limite de reembolso da internet?",
  "Quais são as metas do terceiro trimestre?",
];

export const UPLOADED_DOCUMENT_QUESTIONS = [
  "Faça um resumo deste documento",
  "Quais são os pontos principais?",
  "Em que idioma ele está escrito?",
];

export const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Olá! Posso localizar informações nos documentos e mostrar exatamente de onde cada resposta veio. O que você quer descobrir?",
};

export const MAX_UPLOAD_BYTES = 6_000_000;
