# Event Management System

## Beginner Edition Agent Instructions

### Objective

Build and maintain the Event Management System as a beginner-friendly frontend prototype. The learning path is the 16-step Core Free MVP Path, not an invitation to build every possible feature at once.

### Core path

1. Understand PRD
2. Audit Existing Project
3. Create Implementation Plan
4. Define Data Model
5. Build Login
6. Build Dashboard
7. Build Events CRUD
8. Build Participants CRUD
9. Build Registration
10. Build Attendance
11. Connect Complete Workflow
12. Functional QA
13. Fix Current Error
14. UI/UX Audit
15. Anti-Slop Cleanup
16. Deploy to GitHub Pages

### Working method

Use one focused prompt at a time:

```text
PROMPT → RUN → CHECK → FIX → NEXT
```

Before coding:

1. Read `PRD.md`.
2. Read `DESIGN.md`.
3. Inspect the current architecture.
4. Identify reusable components and existing routes.
5. Describe the smallest change that satisfies the requirement.

After coding:

1. Run the application.
2. Check the changed feature.
3. Check related functionality for regressions.
4. Inspect the console for relevant errors.
5. Fix the root cause.
6. Verify again.

### Technical boundaries

Required:

- Frontend-only architecture
- Existing React/Vite stack where practical
- Browser `localStorage`
- Responsive UI
- Client-side validation
- Static GitHub Pages deployment

Do not introduce Supabase, Firebase, backend services, external databases, APIs, OAuth, payments, email services, SMS services, or unnecessary dependencies.

### Change discipline

- Preserve working functionality.
- Prefer small, reversible changes.
- Avoid large rewrites and speculative refactors.
- Keep code understandable for intermediate beginners.
- Reuse existing components and conventions.
- Do not leave TODO placeholders.
- Do not claim a feature works unless it was tested.

### Data and CRUD rules

Keep events, participants, registrations, attendance, users, and authentication state in separate, consistently named localStorage collections.

All CRUD operations must update both the UI and localStorage. Deleting an event or participant must not leave broken registration or attendance references. Ask for confirmation before destructive actions.

Registration must enforce:

- Existing event
- Existing participant
- No duplicate registration
- Event capacity limit

### Beginner communication

When reporting work, state:

- What changed
- Why it changed
- Which files changed
- What was tested
- Any limitation or unresolved issue

Use plain language. Explain unfamiliar code briefly instead of introducing abstractions that hide the data flow.

### Verification requirements

Always verify login, logout, dashboard statistics, event CRUD, participant CRUD, registration, capacity validation, duplicate prevention, attendance, calculations, localStorage persistence, responsive layout, navigation, and production build readiness before shipping.

### Deployment

Use the existing Vite configuration where applicable. Configure the correct GitHub Pages base path, use GitHub Actions when already supported by the project, build the production version, and verify assets, routing, login, CRUD, registration, attendance, localStorage, and responsive layout after deployment.

### Known limitations

localStorage is browser-specific and is not shared between users or devices. Demo login is not production authentication. GitHub Pages provides static hosting only; it does not provide a backend database.
