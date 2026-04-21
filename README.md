# SplitIt MVP

Production-ready mobile-first MVP for a banking feature called SplitIt.

## What is included

- SplitIt landing page
- Create Bill page
- Transaction history selector
- Participant picker with suggestions, search, and QR placeholder flow
- Expanded More Details page with receipt placeholder and custom split
- Review summary
- Participant notification/request view
- Typed mock data and mock API layer
- Draft persistence in `localStorage`

## File structure

```text
src/
  app/
    App.tsx
    routes.tsx
    features/
      splitit/
        api.ts
        context.tsx
        mockData.ts
        types.ts
        utils.ts
        components/
          LiveSplitSummary.tsx
          SectionCard.tsx
          SplitItLayout.tsx
        pages/
          CreateBillPage.tsx
          MoreDetailsPage.tsx
          ParticipantPickerPage.tsx
          ParticipantRequestPage.tsx
          ReviewSummaryPage.tsx
          SplitItLandingPage.tsx
          TransactionHistoryPage.tsx
```

## Architecture

- `features/splitit/types.ts`: shared models and interfaces
- `features/splitit/mockData.ts`: mock users, transactions, and default draft state
- `features/splitit/api.ts`: async mock data access, request sending, and `localStorage` persistence
- `features/splitit/context.tsx`: SplitIt draft state and actions shared across screens
- `features/splitit/utils.ts`: currency formatting, calculations, and validation
- `features/splitit/components/*`: reusable mobile UI building blocks
- `features/splitit/pages/*`: route-level screens for the end-to-end SplitIt MVP flow

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Build for production

```bash
npm run build
```
