# Lattice Sheets

A spreadsheet-style SaaS application exploring optimistic state management, mutation queues, and UX-driven data modeling at scale.

## What This Project Demonstrates
- Complex client-side state partitioning (structure vs view vs transient UI)
- Optimistic updates with server reconciliation
- Asynchronous mutation queues (batched + idempotent)
- Referential stability under heavy re-renders
- Row-level virtualization (2–5k rows smooth at 60fps on M1 hardware)
- View systems treated as first-class persisted entities

Built with Next.js, tRPC, Prisma, and PostgreSQL.

### Main table interface

<img width="2146" height="1750" alt="table_state" src="https://github.com/user-attachments/assets/96eef5b1-303f-4805-94dd-10ca342c1e50" />

### Table state changes (sorting, filtering, pinning) & View Configurations (saved vs draft)

![view_config_table](https://github.com/user-attachments/assets/824ac96c-a9b9-4a27-b6cc-8cfaf2057cd0)

### Keyboard navigation & inline editing

![key_nav_table](https://github.com/user-attachments/assets/0b6eeef5-c99f-4f69-beb8-ae6306b00b5b)

## 1. Why Spreadsheet UIs Are Non-Trivial

Spreadsheet-like interfaces combine:
- High-frequency granular edits
- Cross-cutting view configuration (sorting, filtering, pinning)
- Keyboard-driven interaction
- Optimistic persistence requirements
- Referential stability constraints

Small architectural mistakes compound quickly:
- Focus loss during reconciliation
- ID mismatches during optimistic creation
- Invalid view configs after structural mutation
- Infinite update loops between UI and persistence layers

This project intentionally explores those failure modes and formalizes solutions.

## 2. Motivation & goals

Spreadsheet applications appear simple on the surface, but involve significant hidden complexity: fine-grained state updates, optimistic persistence, focus management, and synchronization between UI state and backend data.

The system was built to formalize solutions to these problems in a controlled environment, prioritizing architectural clarity over feature breadth.

Priorities:
- UX-driven data modeling
- Predictable state partitioning
- Non-blocking optimistic updates
- Explicit separation of structure, view config, and transient UI state

**Key learnings**

Building spreadsheet-like interactions revealed how quickly complexity compounds across UI, state, and persistence layers. Optimistic updates, focus management, and view consistency required careful separation of concerns and repeated architectural refinement.

## 3. Core features

### Data model

- Bases containing multiple tables
- Tables composed of columns, rows, and cells
- Multiple saved views per table

### Table interactions

- Inline cell editing with keyboard navigation
- Column resizing, pinning, sorting, and filtering
- Global search (case-insensitive)
- Sticky headers and pinned columns

### Views

- Saved and draft view configurations
- Per-view sorting, filtering, pinning, and visibility
- Default view enforcement and auto-creation

### Performance & UX

- Row-level virtualization (2–5k rows smooth)
- Optimistic updates with batched persistence
- Debounced caching of per-table UI state

## 4. High-level architecture

The system is designed around a UI-first architecture.

Table interactions were prototyped and validated in the frontend before being formalized into persistent data models. This approach ensured that backend schemas and APIs reflected real UX requirements rather than theoretical abstractions.

At a high level, responsibilities are separated into:

- Table structure: columns, rows, and ordering invariants

- View configuration: sorting, filtering, pinning, visibility, and defaults

- Transient UI state: active cell, focus, selection, and draft edits

Backend persistence is handled via tRPC with Prisma, using optimistic updates and mutation queues to keep the UI responsive while preserving correctness under concurrent or batched operations.

**High-level data and control flow for table interactions**
```
UI Components
   │
   ▼
Table Provider
   ├─ Table Structure State
   ├─ View State (saved + draft)
   ├─ Transient UI State
   │
   ▼
tRPC Procedures
   │
   ▼
Mutation Queues
   │
   ▼
PostgreSQL (Prisma)
```

## 5. Optimistic Updates & Mutation Queues

To maintain a spreadsheet-like editing experience, most mutations are applied optimistically on the client.

Writes to the database are processed through execution queues rather than synchronous transactions. This allows:

- Batched cell updates
- Idempotent row and column mutations
- Safe retries without locking tables
- UI interactions that do not block on database round-trips

Queue execution is intentionally asynchronous; callers must not depend on immediate persistence. Failures are handled internally, and UI state is reconciled through cache updates.

The queue design avoids DB-level locking and instead enforces correctness through ordered execution, idempotent mutations, and reconciliation-based cache updates.

## 6. Views System

Views are treated as first-class entities rather than derived UI state.

Each view stores configuration for sorting, filtering, search, column pinning, and visibility. The system distinguishes between:

- Saved views (persisted in the database)
- Draft views (local, autosaved, and overlaid on top of saved configs)

Structural changes (e.g. adding or deleting columns) trigger safeguards:

- Saved views auto-update
- Draft views must be saved before structure changes are allowed

This ensures consistency between table structure and view configuration without silent data loss.

## 7. Key technical challenges & solutions

### Cell focus loss during re-renders
Inline editing caused focus to be lost due to React reconciliation and component remounting during structural updates. This was resolved by enforcing referential stability and keeping editing elements permanently mounted.

### Optimistic ID replacement
Early iterations caused cell focus to break when optimistic IDs were replaced by server IDs, due to unstable key propagation. This required decoupling display keys from persistence identifiers and enforcing referential stability at the provider level.

Therefore, rows, columns, and views are created optimistically and later reconciled with server-generated IDs. Careful cache updating was required to avoid breaking keyboard navigation and selection state.

### View consistency under structure changes
Ensuring that filters, pinning, and sorting remained valid when columns were added or removed required normalization and guard logic to prevent infinite update loops.

### 7a. Design decisions and tradeoffs

#### Notable design decisions

- UI-first schema design to avoid premature abstractions

- Views treated as first-class persisted entities

- Optimistic updates prioritized over synchronous guarantees

- Execution queues used instead of DB-level locking

## 8. Tech stack

- Next.js (React, App Router)

- tRPC for type-safe API communication

- Prisma + PostgreSQL (Neon)

- Tailwind CSS

- Zod for schema validation

- TanStack Table & Virtual

- NextAuth (Google provider)

## 9. Out of scope

The following features were intentionally deferred:

- Formula evaluation and dependency graphs

- Undo/redo stacks

- Full DB-backed sorting and pagination

- Infinite scrolling

Each of these requires additional architectural guarantees and UX considerations that were outside the focus of this project’s goals.

### Constraints

- Write operations favor responsiveness over immediate consistency

- Some mutations are eventually consistent by design

- Mobile UX is limited to preserve desktop spreadsheet interactions

- The system currently assumes a single active editor per table. Multi-user concurrency would require conflict resolution semantics (e.g. OT/CRDT) layered on top of the existing mutation queue model.

> To maintain a responsive and consistent spreadsheet experience, the system enforces maximum limits on rows, columns, cells, and other entities. These limits apply to table creation, editing, and import operations.  

| Resource / Field          | Maximum Limit |
|---------------------------|---------------|
| Rows per table            | 1,000         |
| Columns per table         | 20            |
| Non-empty cells per table | 20,000        |
| Text length per cell      | 50 characters |
| Number length per cell    | 15 digits     |
| Views per table           | 5             |
| Tables per base           | 5             |
| Bases per user            | 2             |

> **Note:** Attempts to exceed these limits will be blocked by the backend to ensure data integrity and consistent UX.

## 10. Setup

- Clone the project
- Add in .env vars
- Prisma migrate
- Run dev server

## 11. Architectural Discussion Areas

If reviewing this project, interesting areas for discussion include:
- Alternative queue designs (CRDT vs ordered queue)
- Server-side pagination vs current limits
- Undo/redo implementation strategy
- Conflict resolution under multi-user editing (Operational Transformations)
- Migrating to eventual real-time sync (WebSockets)