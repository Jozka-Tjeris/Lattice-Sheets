# Lattice Sheets
An Airtable-inspired spreadsheet application focused on UX-driven architecture and optimistic state management.

**Main table interface**
[Image]

**Table state changes (sorting, filtering, pinning) & View Configurations (saved vs draft)**
[GIF]

**Keyboard navigation & inline editing**
[GIF]

**Intended audience**
This project is aimed at those interested in complex UI state management, optimistic updates, and UX-driven backend design.

## 1. Project overview

This project is an Airtable-inspired spreadsheet application built with the T3 stack.

It supports bases, tables, rows, columns, and cells, with a strong emphasis on spreadsheet-like UX: keyboard navigation, inline editing, column pinning, filtering, sorting, and multiple saved views per table.

Rather than aiming for full feature parity with Airtable, the project focuses on correctness, responsiveness, and architectural clarity when handling complex, state-heavy UI interactions backed by a database.

### 1a. Quick Tour

- Create a base from the dashboard

- Add or select a table within the base

- Edit cells directly using keyboard or mouse

- Pin columns, apply filters, or sort data

- Save the current configuration as a view for reuse or comparison

## 2. Motivation & goals

Spreadsheet applications appear simple on the surface, but involve significant hidden complexity: fine-grained state updates, optimistic persistence, focus management, and synchronization between UI state and backend data.

The goal of this project was to explore those challenges directly by building a spreadsheet-like interface from scratch, prioritizing:

UX-driven data modeling

Predictable and resilient state management

Optimistic updates without blocking the UI

Clear separation between table structure, view configuration, and transient UI state

This project intentionally avoids full feature parity in favor of architectural soundness and learning depth.

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
Rows, columns, and views are created optimistically and later reconciled with server-generated IDs. Careful cache updating was required to avoid breaking keyboard navigation and selection state.

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

Each of these requires additional architectural guarantees and UX considerations that were outside the scope of this project’s learning goals.

### Constraints

- Write operations favor responsiveness over immediate consistency

- Some mutations are eventually consistent by design

- Mobile UX is limited to preserve desktop spreadsheet interactions

## 10. Setup

This project was built primarily as an architectural and learning exercise rather than a production-ready deployment.

- Clone the project
- Add in .env vars
- Prisma migrate
- Run dev server