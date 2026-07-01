# Guarantee Referral Portal — React front end

Production-ready React port of the opndoor Guarantee Referral Portal prototype
(`../portal/`). The prototype (plain HTML/CSS/JS) is the visual and functional
spec; this app reproduces all 12 screens faithfully and is structured so a
developer can wire a real back end by replacing one layer — `src/data/`.

British English throughout. Currency GBP. Dates dd/mm/yyyy.

## Stack

- **Vite + React 18 + TypeScript** (strict)
- **React Router** for the screens
- **Plain CSS** — `src/styles/portal.css` is ported verbatim from the
  prototype, every design token preserved under `:root`. Nothing is restyled.
  Page-specific styles are co-located CSS files with the same class names.
- **No UI component library** — components are built from the prototype markup.

## Commands

```bash
npm install
npm run dev        # start the dev server (http://localhost:5173)
npm run build      # type-check (tsc -b) + production build
npm run smoke      # jsdom render test: every route × every role, no crashes
npm run preview    # preview the production build
```

## The one thing to know: the data/service layer

**Screens never touch storage or mock data. They import only from `@/data`.**
This is the single seam between the UI and a back end. To integrate, replace the
bodies of the service functions with `fetch` calls — the screens do not change.

```
src/data/
  index.ts                 barrel — screens do `import { getApplications } from '@/data'`
  types.ts                 domain types (mirror HANDOFF §6)
  storage.ts               the ONLY module that touches localStorage
  mock/                    seed data + the parametric analytics model
    partners.ts  org.ts  applications.ts  help.ts  analyticsModel.ts
  partnersService.ts       getPartners, addPartner, updatePartner, getRatesFor, scopeFor, …
  orgService.ts            getAgencies, search*, add*, createAgency/BranchOnTheFly
  applicationsService.ts   getApplications, countByStatus, getApplicationDetail, createReferral, amendTenancyStart
  analyticsService.ts      getDashboardData, getMonthlyTrend, get/setSelectedPeriod
  exportsService.ts        buildPerformanceCsv, buildApplicationCsv, buildBordereauCsv, downloadCsv
  usersService.ts          getUsers, addUser, updateUserRole, deactivateUser, …
  reconciliationService.ts getQueue, confirmRecord, mergeRecord
  helpService.ts           getHelpContent + resource/FAQ/manager CRUD
  authService.ts           login, verify2fa, requestPasswordReset (mocked)
```

Every place a real back end / external system is required is marked with an
`// INTEGRATION:` comment (auth & 2FA, analytics, exports, Stripe payment,
PandaDoc deed generation, HubSpot reconciliation, per-partner commission
enforcement, notifications). These mirror HANDOFF sections 5 and 8.

### Session (role + partner scope)

`src/session/SessionContext.tsx` holds `{ role, partnerScope, period }` — the
"as if from an authenticated session" object. Management and Referrer are pinned
to their home partner; opndoor admin's scope follows the partner selector. The
demo role switcher (`setRole`) is kept for now; in production `verify2fa` seeds
the session and the switcher is removed. Role and partner/period persist to
localStorage so they survive a reload.

## Structure

```
src/
  main.tsx                 root: Router → SessionProvider → ToastProvider → App
  App.tsx                  route map (auth routes + AppShell layout + role guards)
  styles/portal.css        design system, ported verbatim
  session/                 SessionContext (role / partner scope / period)
  constants/               roles, sidebar nav
  components/
    layout/                AppShell, Sidebar, Topbar, menus, pageMeta
    guards/                RequireRole (opndoor-admin-only routes)
    ui/                    Button, Field, Pill, Tag, Card, Modal, Toast, Icon,
                           DataTable, FilterTabs, StatusTimeline, BarChart,
                           Select, TypeAhead, Eyebrow, RoleNote, RoleOnly
    AgentBranchPicker.tsx  the linked agent→branch select-or-add
  pages/                   one folder per screen (Component.tsx + Component.css)
  hooks/                   useOnClickOutside, useDocumentTitle
```

## Routes

| Route | Screen | Access |
|---|---|---|
| `/` | → `/login` | — |
| `/login` | Login (credentials → 6-digit 2FA) | pre-auth |
| `/forgot-password` | Forgot password | pre-auth |
| `/dashboard` | Dashboard | all roles |
| `/applications` | Applications (`?agency=` / `?branch=` / `?partner=`) | all roles |
| `/applications/:ref` | Application detail | all roles |
| `/new-application` | New application | all roles |
| `/agencies` | Agencies & branches | all roles |
| `/partners` | Partners | opndoor admin (guard) |
| `/users` | Users (`?partner=`, `?team=opndoor`) | opndoor admin + Management (guard) |
| `/reconciliation` | Reconciliation | opndoor admin (guard) |
| `/help` | Help & resources | all roles |

Nav visibility is role-filtered in the sidebar; the opndoor-admin-only routes
are additionally protected by `RequireRole`, which redirects other roles to the
dashboard. (The back end must still enforce every access rule independently.)

## Roles & multi-partner scoping (HANDOFF §2–3)

Three roles: **opndoor admin** (`superadmin` in code), **Management**,
**Referrer**. Role-based visibility is done with the `RoleOnly` component and a
`data-role` attribute on `<html>` for the few CSS-driven variations. Partner
isolation is resolved centrally in `partnersService.scopeFor` + the session and
applied inside the services. Commission rates are **per-partner**
(`partnerRate` / `agentRate` on each partner record) and never hard-coded.

## What is NOT built (left for the back end)

No real auth, 2FA, Stripe, PandaDoc or HubSpot. The service layer and the
`// INTEGRATION:` comments mark exactly where each belongs. Analytics and export
rows are still generated from the parametric model in
`src/data/mock/analyticsModel.ts`; replace `analyticsService` / `exportsService`
with real endpoints to retire it.
