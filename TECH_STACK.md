# Tech Stack Overview

- **Front-end:** React with TypeScript, bundled via Vite. Client entrypoint lives in `client/src/main.tsx` and uses JSX/TSX modules.
- **Routing & Data:** The app uses Wouter for routing and @tanstack/react-query for data fetching (`client/src/App.tsx`).
- **Tooling:** TypeScript configuration spans client, server, and shared packages (`tsconfig.json`), with Vite React plugin in `vite.config.ts`.
- **Back-end:** Express server written in TypeScript (see `server/index.ts` and route setup in `server/routes.ts`).
