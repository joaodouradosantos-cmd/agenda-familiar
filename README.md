# Agenda Familiar (Next.js + PWA)

Aplicação simples de **Tarefas** e **Calendário**, pensada para funcionar bem em telemóvel e **offline**.

## Como correr localmente

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Deploy (Vercel)

- Importar o repositório
- Build Command: `npm run build`
- Output: padrão do Next.js

Depois de publicar, no telemóvel pode ser instalada como app (PWA) via “Adicionar ao ecrã principal”.

## Notas

- Os dados são guardados em **localStorage** (no próprio dispositivo).
- O Service Worker encontra-se em `public/sw.js`.
