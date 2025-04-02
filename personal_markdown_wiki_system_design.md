# Personal Markdown Wiki System Design

## Implementation approach

Based on the PRD requirements, we will implement a modern web application with the following technology stack:

1. Frontend:
   - React (SPA framework)
   - Tailwind CSS (styling)
   - marked.js (markdown parsing)
   - vis.js (graph visualization)
   - Zustand (state management)
   - React Query (server state management)

2. Backend:
   - Supabase (Backend as a Service)
   - PostgreSQL (database)
   - Supabase Auth (authentication)
   - Supabase Realtime (sync)

3. Key Implementation Points:
   - Offline-first architecture using localStorage
   - Real-time sync with Supabase
   - Optimistic updates for better UX
   - Responsive 3-panel layout
   - Client-side markdown parsing and preview

## Data structures and interfaces

Class diagram will be written in a separate file.

## Program call flow

Sequence diagram will be written in a separate file.

## Technical Considerations

### 1. State Management Strategy
- Zustand for global UI state
- React Query for server state
- Local state for component-specific data

### 2. Data Sync Mechanism
1. Local-first approach:
   - All changes are first saved to localStorage
   - Background sync with Supabase
   - Conflict resolution using timestamp-based strategy

2. Sync Process:
   - Debounced auto-save (3s after last change)
   - Queue-based sync system
   - Offline support with sync queue

### 3. Performance Optimizations
- Lazy loading of graph view
- Virtualized lists for document tree
- Debounced markdown preview
- Cached search results

### 4. Security Considerations
- JWT-based authentication
- Row Level Security in Supabase
- Client-side encryption for sensitive data
- XSS prevention in markdown rendering

## API Endpoints (Supabase)

### Auth Endpoints
- POST /auth/signin (Google OAuth)
- POST /auth/signout
- GET /auth/user

### Document Endpoints
- GET /documents (list all)
- GET /documents/:id (get one)
- POST /documents (create)
- PUT /documents/:id (update)
- DELETE /documents/:id (soft delete)
- GET /documents/search (search)

### Tags Endpoints
- GET /tags (list all)
- POST /tags (create)
- DELETE /tags/:id (delete)

### Graph Endpoints
- GET /graph/nodes (get all nodes)
- GET /graph/edges (get all connections)

## Anything UNCLEAR

1. Data Migration:
   - Need to specify the format for importing data from other platforms
   - Need to define the export format standard

2. Scaling Considerations:
   - Graph view performance with large number of documents
   - Search performance optimization strategy

3. Plugin System:
   - Need to define plugin API structure
   - Security implications of plugin system