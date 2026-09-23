# LegalSync Product Design

## Design Direction
LegalSync should feel calm, precise, and dependable. The interface is for deadline-sensitive legal work, so clarity and confidence matter more than decoration.

## Visual Language
- Primary: deep navy `#10233f` for trust and structure.
- Accent: aqua `#159b89` and `#56d8c0` for sync and success.
- Supporting accent: sky `#72b9ff` for connected calendar states.
- Surface: paper white over a pale blue-gray background.
- Error: restrained red with strong contrast and plain language.

## Typography
Use the existing Geist font setup. Use heavy, tight headings for product moments and regular, readable body text for workflow details. Avoid oversized type inside forms, dashboards, or tables.

## Layout Principles
- Prefer constrained content widths and generous breathing room.
- Use cards only for forms, repeated records, and genuinely framed tools.
- Keep primary actions visually dominant and close to the relevant content.
- Use responsive grids that collapse cleanly to one column.
- Never let dynamic text resize a button, table row, calendar tile, or navigation item.

## Interaction States
Every async action should have:
- idle state,
- loading state,
- success confirmation,
- actionable error state.

Calendar and sync surfaces should distinguish connected, syncing, delayed, conflicted, and disconnected states without relying on color alone.

## Motion
Motion communicates system health and continuity:
- subtle calendar drift and event float on marketing/auth surfaces,
- staggered entry for calendar dates and repeated cards,
- gentle status transitions after sync.

Animations must stop or simplify under `prefers-reduced-motion: reduce`.

## Key Screens

### Landing
Explain the product immediately with a calendar-centered visual, clear integration story, and direct trial CTA.

### Login and Signup
Use a focused form card paired with an animated calendar illustration on wide screens. On small screens, keep the form first and preserve the same brand hierarchy.

### Onboarding
Show progress across Clio connection, calendar connection, and calendar selection. Keep one primary next action per step.

### Dashboard
Prioritize sync health, connection status, recent activity, unresolved conflicts, and trial/subscription status. Use dense, scannable layouts rather than marketing sections.

## Accessibility
- Use semantic headings and labels.
- Keep contrast compliant.
- Make all actions keyboard reachable.
- Never communicate status by color alone.
- Respect reduced motion and text zoom.
