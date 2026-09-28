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
- **Google Gemini API** para interpretação e resposta documental
- **Mammoth.js** para extração de texto de arquivos `.docx`
- **Tailwind CSS** para estilização responsiva
- **Lucide React** e componentes baseados em **shadcn/ui**

## Execução local

Requisitos: Node.js `22.13.0` ou superior.

```bash
npm ci
```

Crie um arquivo `.env.local` na raiz do projeto:

```env
GEMINI_API_KEY=sua_chave_do_google_ai_studio
```

Depois execute:

```bash
npm run dev
```

## Privacidade e limitações

Os documentos enviados não são salvos pelo Bruna Docs e desaparecem quando a página é atualizada. Por ser uma demonstração de portfólio, as consultas dependem da cota disponível na API do Gemini e podem ficar temporariamente indisponíveis quando o limite gratuito é atingido.

## Objetivo do projeto

O projeto demonstra integração com modelos de IA, processamento de diferentes formatos de arquivo, respostas fundamentadas em fontes, proteção de credenciais no servidor e desenvolvimento de uma interface web responsiva.
