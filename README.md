# Apex Aora Real Estate — ERP

Back-office system for Apex Aora Real Estate (Dubai): secondary sales, leasing, off-plan and property management.

## Modules
- **Dashboard** — commission income (GCI), deals closed, leads, outstanding commissions, upcoming viewings, top brokers and communities
- **Sales** — leads pipeline (Kanban), deals from offer to transfer / Ejari, viewings calendar, clients (buyers, sellers, landlords, tenants, investors, developers)
- **Marketing** — campaigns and ROI, Property Finder / Bayut / Dubizzle performance
- **Services** — listings, off-plan projects, developers, communities, property management (tenancies, rent cheques, maintenance), valuations & mortgage referrals, vendors
- **Projects & Tasks** — initiatives and task boards
- **Events** — open houses, project launches, expos and roadshows
- **Accounts & Finance** — commission invoices (printable tax invoices), payments, expenses, broker commission payouts, P&L reports
- **HR** — employees and brokers (BRN, RERA card expiry), attendance, leave, payroll with commissions
- **Settings** — company profile, commission rates, users & permissions, currencies & VAT

## Tech stack
React 18 · TypeScript · Vite · Tailwind CSS v4 · TanStack Router & Query · Redux Toolkit · Recharts

## Getting started
```bash
npm install
npm run dev        # http://localhost:5280
npm run build      # production build in dist/
npm run typecheck
```

The app currently runs on realistic demo data stored in the browser (Settings → Data → Reset demo data restores it).
The data layer lives in `src/api` and can be switched to a real backend without changing the screens.

## Project structure
```
src/
  routes/       pages (file-based routing)
  features/     module screens, forms and logic
  components/   shared UI, layout and charts
  mocks/        demo data and resources
  api/          data layer
  types/        domain types
  lib/          formatting, labels, navigation, helpers
  store/        UI state (theme, sidebar)
```
