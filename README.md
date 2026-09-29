# Bruna Docs

O **Bruna Docs** é um assistente de consulta documental com inteligência artificial. A aplicação permite adicionar documentos, fazer perguntas em linguagem natural e receber respostas fundamentadas exclusivamente no conteúdo selecionado, acompanhadas dos trechos utilizados como fonte.

**Aplicação:** [bruna-docs.brunaedna68.workers.dev](https://bruna-docs.brunaedna68.workers.dev/)

## Funcionalidades

- Upload de arquivos PDF, Word (`.docx`), TXT e Markdown.
- Consulta de um documento específico ou de toda a biblioteca.
- Respostas no mesmo idioma da pergunta.
- Identificação e exibição das fontes utilizadas.
- Extração de texto de documentos Word diretamente no navegador.
- Processamento de PDFs pelo Gemini.
- Limites de tamanho e quantidade de documentos para proteger a demonstração.
- Controle de requisições para reduzir o uso indevido da API.
- Arquivos mantidos somente durante a sessão atual, sem armazenamento permanente.

## Como funciona

```text
Documento selecionado
        ↓
Pergunta do usuário
        ↓
Processamento seguro no servidor
        ↓
Análise com Google Gemini
        ↓
Resposta + trechos usados como fonte
```

## Tecnologias utilizadas

- **Next.js 16**, **React 19** e **TypeScript**
- **Vinext** e **Vite**
- **Cloudflare Workers** para execução e publicação
- **Cloudflare D1** para limitar requisições de forma consistente entre instâncias
- **Google Gemini API** para interpretação e resposta documental
- **Mammoth.js** para extração de texto de arquivos `.docx`
- **Tailwind CSS** para estilização responsiva
- **Lucide React** e componentes baseados em **shadcn/ui**

## Organização do código

- `app/`: composição das páginas e rotas HTTP.
- `components/knowledge/`: componentes específicos da experiência documental.
- `hooks/`: estado e orquestração do workspace no navegador.
- `lib/knowledge/`: contratos, leitura de arquivos e cliente da API.
- `lib/gemini-document-client.ts`: integração e fallback dos modelos Gemini.

Essa separação mantém interface, regras de negócio e integrações independentes, facilitando testes e manutenção.

## Execução local

Requisitos: Node.js `22.13.0` ou superior.

```bash
npm ci
```

Copie `.env.example` para `.env.local` e informe sua chave:

```env
GEMINI_API_KEY=sua_chave_do_google_ai_studio
```

Depois execute:

```bash
npm run dev
```

## Testes

```bash
npm test
npm run format:check
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

O teste de interface adiciona um documento e valida uma resposta com fonte usando uma API simulada, sem consumir a cota do Gemini.

## Rate limit em produção

Associe um banco Cloudflare D1 ao Worker usando o nome de binding `DB` e aplique a migração presente em `drizzle/`. Com o binding disponível, o limite de consultas passa a ser compartilhado entre todas as instâncias do Worker. Sem o D1, a aplicação mantém um fallback em memória apenas para desenvolvimento local.

## Privacidade e limitações

Os documentos enviados não são salvos pelo Bruna Docs e desaparecem quando a página é atualizada. Por ser uma demonstração de portfólio, as consultas dependem da cota disponível na API do Gemini e podem ficar temporariamente indisponíveis quando o limite gratuito é atingido.

## Objetivo do projeto

O projeto demonstra integração com modelos de IA, processamento de diferentes formatos de arquivo, respostas fundamentadas em fontes, proteção de credenciais no servidor e desenvolvimento de uma interface web responsiva.
