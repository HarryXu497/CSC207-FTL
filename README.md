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

## Database Structure

### Calls (Firestore / in-memory)

#### Call

| Field          | Type        | Description                            |
| -------------- | ----------- | -------------------------------------- |
| `title`        | string      | Short title of the call                |
| `desc`         | string      | Description of the call                |
| `messages`     | `Message[]` | The conversation in order              |
| `agent`        | `Agent`     | The agent who handled the call         |
| `sentiment`    | `Sentiment` | Sentiment analysis result for the call |
| `customerName` | string      | Name of the customer on the call       |
| `customerDesc` | string      | Description of the customer            |
| `accuracy`     | `Accuracy`  | Accuracy result for the call           |

#### Agent

| Field   | Type     | Description                  |
| ------- | -------- | ---------------------------- |
| `name`  | string   | Agent's name                 |
| `role`  | string   | Agent's role                 |
| `calls` | `Call[]` | Calls this agent has handled |

#### Message

| Field     | Type      | Description               |
| --------- | --------- | ------------------------- |
| `speaker` | string    | Who sent the message      |
| `text`    | string    | The message content       |
| `time`    | timestamp | When the message was sent |

#### Sentiment

_TBD_

#### Accuracy

_TBD_

#### Branch

| Field      | Type        | Description                                  |
| ---------- | ----------- | -------------------------------------------- |
| `call`     | `Call`      | The call this branch belongs to              |
| `title`    | string      | Short title of the branch                    |
| `desc`     | string      | Description of the branch                    |
| `start`    | int         | Index in the call's messages where it starts |
| `messages` | `Message[]` | The branch's messages                        |

### Documents (Chroma vector store)

Reference documents (`.txt`, `.md`, `.pdf`) are ingested by `ChromaIngestor` for retrieval (RAG). Each file in the source directory is split into chunks, embedded, and stored in a Chroma collection.

| Field       | Description                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------- |
| `id`        | `{source}::{n}`, where `source` is the file path and `n` is the chunk's index within that file |
| `document`  | The chunk's text                                                                               |
| `embedding` | Vector produced by the configured embeddings model                                             |
| `metadata`  | Loader metadata for the chunk, including `source` (the originating file path)                  |
