# Event Management System

## Beginner Edition Product Requirements

### Product overview

The Event Management System is a beginner-friendly frontend prototype for managing events, participants, registrations, attendance, and simple dashboard statistics. It is built incrementally with Codex using the 16-step Core Free MVP Path.

### Target users

- Event organisers
- Lecturers and trainers
- Student committees
- Small organisations
- Beginners learning frontend CRUD and Vibe Coding

### Product goals

1. Demonstrate a real CRUD workflow.
2. Demonstrate browser `localStorage` persistence.
3. Demonstrate relationships between events, participants, registrations, and attendance.
4. Demonstrate client-side validation and business rules.
5. Provide a clean responsive dashboard.
6. Deploy the static prototype to GitHub Pages.

### Technical scope

Required:

- Frontend only
- Existing React/Vite project where practical
- Browser `localStorage`
- Responsive UI
- Client-side validation
- Static GitHub Pages deployment

Do not use:

- Supabase
- Firebase
- Backend services
- External databases
- APIs
- OAuth
- Payment services
- Email or SMS services

### Core workflow

`IDEA → BRIEF → CONTEXT → DESIGN → BUILD → VERIFY → FIX → REFINE → SHIP`

Use the loop for every feature:

`PROMPT → RUN → CHECK → FIX → NEXT`

### Core Free MVP Path

The beginner edition focuses on these 16 steps:

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

### Functional requirements

#### Login

- Demo username: `admin`
- Demo password: `admin123`
- Login and logout
- Persist demo authentication state in `localStorage`
- Protect application pages from unauthenticated users

This is demo authentication only and is not production security.

#### Dashboard

Show values calculated from stored data:

- Total Events
- Upcoming Events
- Total Participants
- Total Registrations
- Attendance Rate

Include useful sections such as upcoming events, recent registrations, and quick actions.

#### Events

Fields:

- Event ID
- Event Name
- Description
- Date
- Time
- Location
- Organizer
- Capacity
- Status

Required operations:

- Create
- Read
- Update
- Delete
- Search
- Status filter
- Date sorting

Statuses: Draft, Upcoming, Ongoing, Completed, Cancelled.

#### Participants

Fields:

- Participant ID
- Name
- Email
- Phone
- Organisation

Required operations:

- Create
- Read
- Update
- Delete
- Search

Participant email must be valid and unique.

#### Registration

Each registration contains:

- Registration ID
- Event ID
- Participant ID
- Registration date
- Registration status

Rules:

- Event must exist.
- Participant must exist.
- Duplicate registration is not allowed.
- Registration cannot exceed event capacity.

#### Attendance

Attendance applies only to registered participants. Statuses are Present and Absent.

Show:

- Total Registered
- Total Present
- Total Absent
- Attendance Rate

`Attendance Rate = (Total Present / Total Registered) × 100`

Return `0%` when there are no registrations.

### Persistence

Use clear localStorage keys for users, events, participants, registrations, attendance, and authentication state. Data must survive browser refresh.

### Acceptance checklist

- [ ] Login and logout work
- [ ] Dashboard statistics use real stored data
- [ ] Event CRUD works
- [ ] Participant CRUD works
- [ ] Registration rules work
- [ ] Attendance works and calculates correctly
- [ ] Data persists after refresh
- [ ] Validation messages are clear
- [ ] Mobile layout works
- [ ] Production build succeeds
- [ ] GitHub Pages deployment works

### Out of scope

Real authentication, cloud databases, multi-user access, payments, notifications, QR scanning, real-time collaboration, calendar integrations, and custom backend hosting are outside this beginner MVP.
