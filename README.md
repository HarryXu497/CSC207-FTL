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

| Method | Path                                             | Body                                         | Returns                                                                                      |
| ------ | ------------------------------------------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| GET    | `/api/health`                                    | —                                            | `{ status, backend }`                                                                        |
| GET    | `/api/calls`                                     | —                                            | `{ calls: Call[] }`                                                                          |
| POST   | `/api/calls`                                     | `{ customerName, topic, score }`             | `201 { call }`                                                                               |
| POST   | `/api/accuracy/analyze`                          | `{ messages, topic? }`                       | `200 { accuracy }` (`503` if not configured, `502` on unusable model output)                 |
| POST   | `/api/documents`                                 | Multipart form data: `file`                  | `201 { document }`                                                                           |
| POST   | `/api/calls/:callId/accuracy`                    | none (analyzes the stored transcript)        | `200 { accuracy }`, saved under the call (`404` unknown call, `503`, `502` as above)         |
| GET    | `/api/calls/:callId/accuracy`                    | none                                         | `200 { accuracy }`, or `404` if the call has not been analyzed                               |
| POST   | `/api/calls/:callId/sentiment`                   | none (analyzes the stored transcript)        | `200 { messageSentiments }`, saved under the call (`404` unknown call, `503` without models) |
| GET    | `/api/calls/:callId/sentiment`                   | none                                         | `200 { messageSentiments }`, or `404` if the call has not been analyzed                      |
| POST   | `/api/calls/:callId/branches/:branchId/accuracy` | none (analyzes the stored branch transcript) | `200 { accuracy }`, saved under the branch (`404` unknown branch, `503`, `502` as above)     |
| GET    | `/api/calls/:callId/branches/:branchId/accuracy` | none                                         | `200 { accuracy }`, or `404` if the branch has not been analyzed                             |

## Document uploads

`POST /api/documents` accepts one file as `multipart/form-data`, using the field
name `file`.

Allowed filename extensions are `.txt`, `.md`, and `.pdf` (case-insensitive).
The maximum file size is **10 MiB (10,485,760 bytes)**.

Set `RAG_ENABLED=true` and `OPENAI_API_KEY` in `packages/server/.env` and start
Chroma (`CHROMA_URL` defaults to `http://localhost:8000`). Successful uploads are
ingested before `201` is returned; `document.chunksStored` reports the chunk count.

Multer receives and saves the file. `DocumentsController` maps the upload to
plain input data for `UploadDocumentInteractor`, which uses an output boundary
to pass the result to `UploadDocumentPresenter`. The presenter sends the HTTP
response. The use case's input, output, interactor, and presenter are in
`packages/server/src/service/documents/UploadDocument/`.

### Upload errors

| Status | Meaning                                                           |
| ------ | ----------------------------------------------------------------- |
| 400    | Missing or invalid upload, or a document with no ingestible text. |
| 413    | File exceeds the 10 MiB size limit.                               |
| 415    | Unsupported filename extension.                                   |
| 503    | Document ingestion is disabled.                                   |
| 500    | Unexpected server or storage failure.                             |

Errors use the shape `{ "error": { "message": "..." } }`.

## Customer simulation

Simulation generates the next customer message in a practice branch. The user plays
the agent. The server loads the saved branch history, retrieves relevant company
documents, asks the LLM for a customer reply, and saves that reply to the branch.

Open **Simulate a branch** from Call Analysis to choose a point on the timeline and
preview the messages that will be copied. **Start practice** takes you to the saved
branch, where you can reply, reopen the conversation, and run accuracy and sentiment
analysis. Accuracy uses the same Chroma collection and embeddings as simulation.

### Run practice with both analyses

Use Node 24 for the full flow. From the repo root, run `npm ci`. Copy
`packages/server/.env.example` to `packages/server/.env` if you don't already have it.
Set `OPENAI_API_KEY`, `SIMULATION_ENABLED=true`, and `SIMULATION_MODEL` to a chat
model available to your OpenAI project. With the Hugging Face `hf` CLI installed,
run `npm run models:download` and set `MODEL_DIR=models` in the server's `.env`.

With the Chroma CLI installed, start it in a separate terminal from the repo root.
Set `CHROMA_URL=http://127.0.0.1:8000` in the server's `.env` for this local instance.

```sh
chroma run --path ./chroma-data --host 127.0.0.1 --port 8000
```

From the repo root, replace the sample path below with a directory containing
your `.txt`, `.md`, or `.pdf` company policy documents. The command uses the same
collection and embedding settings as the server.

```sh
cd packages/server
node --env-file=.env --import tsx --input-type=module - "/path/to/policies" <<'JS'
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ChromaIngestor } from './src/repository/rag/ingestor/ChromaIngestor.ts';

const { CHROMA_COLLECTION, CHROMA_URL, RAG_EMBEDDING_MODEL } = process.env;
const ingestor = new ChromaIngestor(
  new OpenAIEmbeddings({ model: RAG_EMBEDDING_MODEL?.trim() || 'text-embedding-3-small' }),
  new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 }),
  CHROMA_URL?.trim() || 'http://127.0.0.1:8000',
  CHROMA_COLLECTION?.trim() || 'documents',
);
console.log('Indexed', await ingestor.ingest(process.argv[2]), 'chunks');
JS
```

From the repo root, run `npm run dev`. Import a transcript, choose **Simulate a
branch** from Call Analysis, and select the agent reply to replace. Send a new
reply containing a statement covered by a policy document. After the customer
replies, select **Analyze sentiment** and **Analyze accuracy**. Expand **Claim
feedback** to see supporting evidence. Reopen the branch to see the saved results.

Create a practice branch before the selected original response:

```http
POST /api/calls/:callId/branches
Content-Type: application/json

{ "branchIndex": 1 }
```

`branchIndex` is the selected message's zero-based index. Only earlier messages are
copied, so index `0` starts an empty practice conversation. Write a new agent reply
to replace the selected response and continue the practice conversation.

Save the user's agent message to the branch, then send its saved message ID:

```http
POST /api/calls/:callId/branches/:branchId/simulate
Content-Type: application/json

{ "expectedLastMessageId": "saved-agent-message-id" }
```

Success returns `201 { message }`, including the saved customer message's ID and
timestamp. The original call transcript is unchanged. A stale expected message or a
conversation changed during generation returns `409`. Disabled simulation returns
`503`; no external API calls are made until a simulation request is processed.

Overlapping requests for the same saved agent message share one pending generation
within a server instance. Success and failure both release that pending request, so
a failed generation can be retried. This does not coordinate model calls across
multiple server instances; the database guard still prevents duplicate customer saves.

## Sentiment Analysis

ReCall runs GoEmotions and VAD-BERT locally on transcript text. GoEmotions
classifies emotion cues, and VAD-BERT estimates valence and arousal. The app
plots the resulting sentiment score per message from −1 to +1 for each speaker.

`POST /api/calls/:callId/sentiment` analyzes a stored call and saves the result (Firestore `sentiment/{callId}`, or memory), and `GET` on the same path reads it back; deleting a call deletes its result. Set `MODEL_DIR` to enable analysis; without it the `POST` answers `503`. The Call Analysis page reads the saved result and re-analyzes only when it is missing messages.

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

- **Input:** the call's `messages` (each a `{ role, content }` with role `agent` or `customer`) and an optional `topic`.
- **Output:** an `Accuracy` object (see [Database Structure](#accuracy-1)).
- **RAG interaction:** read-only. It calls `search(query, limit)` on a `Retriever` and never writes to the knowledge base, so `ChromaRetriever` or `InMemoryRetriever` both work.
- **Endpoint:** `POST /api/accuracy/analyze` takes a transcript and returns the result without storing it. `POST /api/calls/:callId/accuracy` analyzes a stored call and saves the result (Firestore `accuracy/{callId}`, or memory), and `GET` on the same path reads it back; deleting a call deletes its result. Branches work the same way under `/api/calls/:callId/branches/:branchId/accuracy` (stored under `accuracy/{branchId}`), using the same use case with the branch's message collection. If no accuracy repository is configured, the saved-result routes answer `503`. Set `OPENAI_API_KEY` (and the `CHROMA_*` settings) in `packages/server/.env` to enable it; without a key it answers `503`.
- **Limits:** at most 200 messages and 30,000 characters of message text per request (`400` otherwise). JSON bodies over 100 KB get `413`, and unreadable JSON gets `400`.

### Code

The metric follows the same layers as the rest of the server:

| Layer        | Where                                     | What                                                                                        |
| ------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `entities`   | `entities/accuracy/`                      | Claim and result types, and `scoring.ts` (the scoring rules)                                |
| `repository` | `repository/llm/`                         | `LlmClient` port, its LangChain adapter, and `completeJson` (validated JSON)                |
| `repository` | `repository/accuracy/`                    | `AccuracyAnalyzer` port and `LlmAccuracyAnalyzer`: prompts, schemas, RAG lookups            |
| `service`    | `service/accuracy/AnalyzeAccuracy/`       | The use case: input/output boundaries, the interactor (scoring) and the presenter           |
| `service`    | `service/accuracy/AnalyzeStoredAccuracy/` | The use case for a stored call or branch: loads it, checks the transcript, saves the result |
| `service`    | `service/accuracy/controller.ts`          | Request parsing and routing                                                                 |
| `server`     | `routes.ts`, `index.ts`                   | Mounts the controller; builds the OpenAI and Chroma adapters from the environment           |

All prompts are in `repository/accuracy/prompts.ts` and carry a `PROMPT_VERSION`.

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

| Field     | Type      | Description               |
| --------- | --------- | ------------------------- |
| `speaker` | string    | Who sent the message      |
| `text`    | string    | The message content       |
| `time`    | timestamp | When the message was sent |

#### Sentiment

Defined in `packages/server/src/entities/sentiment`. Saved in Firestore as `sentiment/{callId}` with one field, `messageSentiments`.

`MessageSentiment`: `messageId` (string) and `result`, which is either `{ ok: true, sentiment: SentimentScore }` or `{ ok: false, reason }` (`empty` \| `not_a_string` \| `too_long`).

#### Accuracy

Defined in `packages/server/src/entities/accuracy`. `score` can be `null`.

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

The analysed transcript is a list of `TranscriptMessage`: the `role` and `content` of a `Message`.

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
