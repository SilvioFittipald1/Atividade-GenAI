# Frontend - Agente E-commerce GenAI

UI em **React 19 + Vite 8 + TypeScript 6 + Tailwind 3** para o agente
conversacional Text-to-SQL. Organizado em Atomic Design
(`atoms → molecules → organisms → templates → pages`), com hooks para estado
(`useChat`, `useConversations`, `useHealth`, `useHotkeys`, `useTheme`) e
services isolados (`api.ts`, `storage.ts`).

## Scripts

```powershell
pnpm install   # instala dependencias (1x)
pnpm dev       # vite dev server em http://127.0.0.1:5173
pnpm build     # tsc -b && vite build
pnpm lint      # eslint .
pnpm preview   # vite preview do build
```

## Documentacao

- [../README.md](../README.md) — visao geral do projeto e passo a passo de execucao.
- [./ExplicacaoFrontend.md](./ExplicacaoFrontend.md) — guia detalhado da UI, modulo
  a modulo, com diagramas.
- [../backend/ExplicacaoBackend.md](../backend/ExplicacaoBackend.md) — o backend que
  essa UI consome.

## Requisitos

O frontend sozinho nao faz nada util — ele depende do backend FastAPI
rodando em `http://127.0.0.1:8000`. Veja o [README principal](../README.md).
