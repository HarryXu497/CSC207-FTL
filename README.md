# ReCall — MVP

Minimum working slice of our **FERN** stack (Firebase · Express · React · Node) +
TypeScript + Tailwind, for CSC207.

It does one thing, through every layer of the stack: **list calls from a database,
and add a new one.** That is deliberately small — the point is that all four
pieces are talking to each other, not that the product is finished.

```
Browser (React + Tailwind)  ──HTTP/JSON──►  Express on Node  ──►  database
         port 5173            /api proxy        port 4000        memory │ Firestore
                └──────── both import packages/shared (the types) ────────┘
```

## Run it

Needs **Node 20+** (`node -v`). Nothing else — no database to install, no cloud
account.

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. Two demo calls are loaded; add one with the form.

|                   |                                    |
| ----------------- | ---------------------------------- |
| Web app           | <http://localhost:5173>            |
| API               | <http://localhost:4000/api/calls>  |
| Is the API alive? | <http://localhost:4000/api/health> |

## Commands

| Command             | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `npm run dev`       | API + web app together                                |
| `npm test`          | Run the tests                                         |
| `npm run lint`      | ESLint                                                |
| `npm run format`    | Prettier                                              |
| `npm run typecheck` | TypeScript, no output emitted                         |
| `npm run check`     | format + lint + typecheck + test — run before pushing |
| `npm run build`     | Production web bundle into `packages/web/dist/`       |

## Layout

```
packages/
  shared/   the TypeScript types both sides import — the API contract
  server/   Express API + the two storage implementations
  web/      React UI (one component)
```

## Storage

Defaults to an in-memory `Map`, so the app runs with no setup and resets on
restart. Both implementations satisfy the same `CallRepository` interface, so
switching is one environment variable and no code change:

```bash
cp packages/server/.env.example packages/server/.env
# then set DATA_BACKEND=firestore and add your Firebase project id + key path
```

## API

| Method | Path          | Body                             | Returns               |
| ------ | ------------- | -------------------------------- | --------------------- |
| GET    | `/api/health` | —                                | `{ status, backend }` |
| GET    | `/api/calls`  | —                                | `{ calls: Call[] }`   |
| POST   | `/api/calls`  | `{ customerName, topic, score }` | `201 { call }`        |

## Sentiment Analysis

We are evaluating two Hugging Face transformer models for emotion classification of call transcripts:

- [thomasrenault/emotion](https://huggingface.co/thomasrenault/emotion)
- [djonuzi/goemotions-emotion-model](https://huggingface.co/djonuzi/goemotions-emotion-model)

Both models are candidates for identifying emotions expressed during calls. The final model will be selected based on classification quality and accuracy.
The selected model will be integrated into the backend to analyze call transcripts and make emotion predictions available to the application.

## User Interface

- [https://www.figma.com/proto/n3EWZRzY69BQXncX9dd25C/Mockups?node-id=143-376&p=f&viewport=-1008%2C235%2C0.19&t=xCFmZmMd4YGIehRA-0&scaling=min-zoom&content-scaling=fixed&starting-point-node-id=156%3A439]
