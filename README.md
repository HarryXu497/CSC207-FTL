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

## Server Architecture

The server is split into three layers:

1. `repository`
2. `service`
3. `server`

The full request-logic-response flow is as follows.

```
Express req ─► controller parses ─► input model (plain object)
                                                       │
                                                       ▼
                                              service.handle(input)   ◄─►   repositories   ◄─►   data
                                                       │
                                                       ▼
res.json(...) ◄─ controller serializes ◄─ output model (plain data)
```

A note about `index.ts`. There are many `index.ts` files that reexport things from other files. This is for convenience.

Usually, you import from files like

```ts
// imports from 'src/repository/database/calls/CallRepository.ts'
import { CallRepository } from 'src/repository/database/calls/CallRepository';
```

`index.ts` is a special file; it is what is imported when you write

```ts
// imports from 'src/repository/database/calls/index.ts', if it exists
import { CallRepository } from 'src/repository/database/calls';
```

Therefore, it should exports or reexport all classes, types, objects, that should be available to the rest of the app.
By having many `index.ts` that reexport things, it basically "flattens/combines" the import tree so you can do

```ts
import { CallRepository } from 'src/repository';
```

instead. It is important that when you add new files, to update these `index.ts` files accordingly.

### `repository`

The `repository` folder contains classes with low-level data logic, grouped by entity, called **repositories**. Repositories are how the application interfaces with sources of data (e.g. databases, external API class).

Each **repository** corresponds to a folder containing the following files:

1. **Repository Interface**. An interface that defines the available operations (e.g. `getCalls`, `getCall`, `deleteCall`)
2. **Repository Implementations**. At least 1 implementation of the interface (e.g. Firebase-backed implementation, in-memory implementation)
3. **Repository Tests**.
4. **Repository Exports**. An `index.ts` file that exports all classes, types, objects, that should be available to the rest of the app

We organize **repositories** in folders by component and entity (e.g. `database/calls`, `rag/ingestor`, etc). Repositories can rely on other repositories if necessary. Use your judgement when grouping repositories.

### `service`

The `service` subfolder contains classes, called **services** or **interactors**. Each service corresponds to **one** route/use case and contains the decoupled business logic for the route. These should take in plain objects, perform their logic, and return plain objects back as outputs. **There should be NO EXPRESS.JS-specific logic here; it should be framework-agnostic**.

They should be grouped by "related routes" (e.g. the service classes for `GET /call`, `POST /call`, and `GET /call/:id` would be grouped together). **Each such group has its own folder**, which should contain

1. All related service classes
2. An index.ts file that combines all the service classes into one singleton object

Each service can declare any dependencies (i.e. repositories) that it needs in the constructor; these should be passed in when the service is created as a form of manual **dependency injection**.

### `server`

The `server` subfolder contains the actual routing logic.

The routers are in `routers` and are once again grouped into routers by relatedness (e.g. `GET /call`, `POST /call`, `GET /call/:id` would be in the `call` folder). **Each group has its own file** (not its own folder)

The `app.ts` and `routes.ts` are responsible for merging all the routers into one and creating all the appropriate repository objects, etc.

## Accuracy

The accuracy metric answers: **did the agent say things that agree with our knowledge base?** It checks what the agent said against the RAG documents. It does not check whether those documents are true in the real world, so it is only as good as the knowledge base behind it.

### Flow

```
transcript ──► 1. Extract   LLM lists the checkable claims the agent made
                    │
                    ▼
               2. Retrieve  RAG returns knowledge-base chunks for each claim
                    │       (and for each customer question, to find documents the agent should have used)
                    ▼
               3. Judge     LLM rules on each claim using ONLY those chunks.
                    │       supported / contradicted / unsupported / not_verifiable, with a quote.
                    │       Code checks the quote really appears in the chunk, otherwise the
                    │       verdict is downgraded to unsupported.
                    ▼
               4. Classify  LLM sorts the retrieved documents into required / recommended
                    │
                    ▼
               5. Score     plain code, no LLM: a 0-100 weighted average of the verdicts
```

- **Input:** the call's `messages` (each tagged `agent` or `customer`) and an optional `topic`.
- **Output:** an `Accuracy` object (see [Database Structure](#accuracy-1)).
- **RAG interaction:** read-only. It calls `search(query, limit)` on a retriever and never writes to the knowledge base. Any retriever with that method works, e.g. the Chroma one from the RAG retrieval work.
- **Endpoint:** `POST /api/accuracy/analyze` takes a transcript and returns the result. Nothing is stored yet; saving a result against a call comes once `Call` carries its `messages`.
- **Limits:** at most 200 messages and 30,000 characters of message text per request (over that is a `400` explaining why). The server rejects any JSON body over 100 KB with `413`, and unreadable JSON with `400`.
- **Code:** `packages/server/src/service/accuracy/`. All prompts are in `prompts.ts` and carry a `PROMPT_VERSION`.

### Scoring

| Verdict          | Credit | Meaning                                                    |
| ---------------- | ------ | ---------------------------------------------------------- |
| `supported`      | 1      | The documents clearly confirm the claim                    |
| `unsupported`    | 0.5    | The documents neither confirm nor contradict it            |
| `contradicted`   | 0      | The documents say something different                      |
| `not_verifiable` | -      | Not a checkable fact (or could not be judged); not counted |

`score` is the weighted average of the credits, scaled to 0-100. A claim backed by a **required** document counts double. If the agent made no checkable claims, `score` is `null` (nothing to score), not 0.

### Required and recommended documents

For every call, the documents the knowledge base returns are sorted by how much the agent needed them. This is judged from what the **customer asked for**, not from what the agent happened to say.

| Role           | Meaning                                                                                                                                   | Effect                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `required`     | The agent must state this document's content correctly to resolve the customer's issue (the governing policy, price, rule, or procedure). | Claims backed by it weigh double in the score             |
| `recommended`  | Relevant and useful (background, related options, tips), but the issue can be resolved without it.                                        | Reported as coaching suggestions; never changes the score |
| _(irrelevant)_ | Not useful for this customer's issue.                                                                                                     | Dropped from the result                                   |

Each listed document also has `usedByAgent`: whether at least one of the agent's claims was supported or contradicted by it. A **required document with `usedByAgent: false`** means the agent never touched something they needed to, which is the clearest signal for coaching.

#### What a company should put in the knowledge base

The analysis can only find documents that were ingested, so coverage matters.

| Priority    | Document types                                                                                                                                                                                 | Why                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Required    | Policies (returns, refunds, cancellations, privacy), pricing and fees, eligibility rules, procedures and SOPs, product or service specifications, compliance scripts and mandatory disclosures | Facts the agent must get right; errors cause real harm        |
| Recommended | FAQs, troubleshooting guides, escalation paths, tone and style guides, promotions, past resolved cases                                                                                         | Improve answers and coaching, but are not the source of truth |

Prefer one topic per file and descriptive file names, because the file path is what is shown as the evidence source.

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

| Field     | Type                      | Description               |
| --------- | ------------------------- | ------------------------- |
| `speaker` | `'agent'` \| `'customer'` | Who sent the message      |
| `text`    | string                    | The message content       |
| `time`    | timestamp (optional)      | When the message was sent |

#### Sentiment

_TBD_

#### Accuracy

Required fields unless marked optional. `score` can be `null`.

| Field             | Type                 | Description                                                                  |
| ----------------- | -------------------- | ---------------------------------------------------------------------------- |
| `score`           | number \| null       | 0-100, or `null` when the agent made no checkable claims                     |
| `counts`          | `Record<Verdict, n>` | How many claims got each verdict                                             |
| `claims`          | `ClaimResult[]`      | One entry per checked agent claim                                            |
| `documents`       | `AccuracyDocuments`  | `{ required: DocumentFinding[], recommended: DocumentFinding[] }`            |
| `claimsTruncated` | boolean              | `true` if the call had more claims than the limit (20), so some were skipped |
| `promptVersion`   | string               | Version of the prompts that produced this result                             |
| `analyzedAt`      | string               | ISO 8601 timestamp                                                           |

`ClaimResult`: `messageIndex` (number), `text` (string), `verdict` (`supported` \| `contradicted` \| `unsupported` \| `not_verifiable`), `confidence` (0-1), `explanation` (string), `evidence` (`{ source, quote }` or `null`; present only when the quote was verified in the retrieved document).

`DocumentFinding`: `source` (file path), `reason` (string), `usedByAgent` (boolean).

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
