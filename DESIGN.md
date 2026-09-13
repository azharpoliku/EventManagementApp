# Event Management System

## Beginner Edition Design System

### Design direction

Create a simple, credible, and learnable admin dashboard. The interface should be professional enough to demonstrate, but straightforward enough for a beginner to understand and modify.

### Visual principles

- Clear before clever
- Content before decoration
- One focused action at a time
- Consistent spacing and alignment
- Real application states instead of fake statistics
- Verify desktop, tablet, and mobile layouts

### Colour

Primary accent: emerald green.

Base colours: charcoal, near-black, white, and off-white.

Use blue, orange, warning, and error colours only when they communicate a real state. Avoid gradients, neon effects, glassmorphism, and decorative colour changes.

### Typography

Use one readable sans-serif family. Establish a simple hierarchy:

- Page title: prominent and clear
- Section heading: strong but compact
- Card title: medium emphasis
- Body: comfortable reading size
- Supporting label: quiet and concise

Use monospace only for code, technical values, and copy-ready prompts.

### Layout

Use a responsive admin layout:

```text
Navigation → Header → Page content → Cards, tables, or forms
```

Desktop should feel spacious without leaving large empty areas. Mobile should use single-column forms, readable tables or horizontal scrolling, and tap-friendly controls.

### Navigation

Suggested navigation:

- Dashboard
- Events
- Participants
- Registrations
- Attendance
- Logout

Make the current page obvious. Keep navigation predictable.

### Components

Use cards only when they group related information. Do not put every paragraph in a card.

Cards should have:

- Consistent spacing
- Subtle borders
- Limited corner radius
- Minimal shadow
- Clear labels and values

Buttons should be purposeful. Emerald is for primary actions. Destructive actions must be clear and require confirmation.

### Forms

- Use visible labels.
- Mark required fields.
- Use date, time, number, and email input types appropriately.
- Show specific, actionable validation messages.
- Keep related fields grouped.

### Tables and empty states

Tables should be easy to scan, responsive, and action-oriented. Empty states should explain what the user can do next. Error states should explain the problem in plain language and suggest the next action.

### Status and feedback

Use clear status indicators for Draft, Upcoming, Ongoing, Completed, Cancelled, Present, and Absent. Do not rely on colour alone.

Provide feedback after create, update, delete, registration, attendance, and validation actions.

### Anti AI-slop rules

Do not add generic AI illustrations, robot graphics, decorative emojis, excessive rounded containers, decorative gradients, fake charts, unnecessary animations, random icons, or visual effects without a usability purpose.

Before accepting a screen, ask:

- Does the UI look intentional?
- Is spacing consistent?
- Is typography strong?
- Are interactions meaningful?
- Is anything unnecessary?

### Beginner implementation rule

Prefer clear components, small functions, simple state management, meaningful names, and the existing project architecture. A beginner should be able to explain every major UI and data-flow decision.
