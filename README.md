# DevBoard
# DevBoard — Full-Stack Project Management App
<img width="1866" height="881" alt="image" src="https://github.com/user-attachments/assets/2001462a-ce07-4d67-b8ea-d546d7963509" />

DevBoard is a project management tool for tracking software projects, their features, and tasks — built as a hands-on learning project to go from a pure frontend React app to a genuine full-stack application with a real database.

## Tech Stack

**Frontend:** React + TypeScript, using `useReducer` and Context API for local state, React Router for navigation, and TanStack Query for server state management (queries, mutations, and cache invalidation). Includes optimistic UI patterns like loading toasts, offline detection, and confirmation dialogs for destructive actions.

**Backend:** Node.js + Express REST API with nodemon for development. Handles full CRUD for projects, features, tasks, and tech stacks.

**Database:** PostgreSQL (hosted on Neon), accessed via the `pg` package with connection pooling. Schema uses proper relational design — `projects`, `features`, `tasks`, and `tech_stack` as separate tables linked with foreign keys, rather than nesting everything into JSON blobs. Multi-table writes (e.g. creating a project with its features and tasks in one go) are handled with SQL transactions and `RETURNING id` to chain foreign keys safely.

## Highlights

- Parameterized SQL queries throughout (no raw string interpolation)
- Transactional inserts across related tables with rollback on failure
- Nested data shaping on the backend to match frontend types
- Real-time UI updates via query invalidation after mutations
- Toggleable task/feature completion with cascading progress calculation

## About This Project

This project was built module-by-module as a learning exercise — starting with a localStorage-based frontend and progressively replacing it with a proper client-server-database architecture.
