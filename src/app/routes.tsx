import { Navigate, createBrowserRouter } from "react-router";
import { Home } from "./pages/Home";
import { SplitItLandingPage } from "./features/splitit/pages/SplitItLandingPage";
import { CreateBillPage } from "./features/splitit/pages/CreateBillPage";
import { TransactionHistoryPage } from "./features/splitit/pages/TransactionHistoryPage";
import { ParticipantPickerPage } from "./features/splitit/pages/ParticipantPickerPage";
import { MoreDetailsPage } from "./features/splitit/pages/MoreDetailsPage";
import { ReviewSummaryPage } from "./features/splitit/pages/ReviewSummaryPage";
import { ParticipantRequestPage } from "./features/splitit/pages/ParticipantRequestPage";
import { SplitBillDashboardPage } from "./features/splitit/pages/SplitBillDashboardPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/splitit",
    Component: () => <Navigate to="/splitit/create" replace />,
  },
  {
    path: "/splitit/create",
    Component: CreateBillPage,
  },
  {
    path: "/splitit/transactions",
    Component: TransactionHistoryPage,
  },
  {
    path: "/splitit/participants",
    Component: ParticipantPickerPage,
  },
  {
    path: "/splitit/more-details",
    Component: MoreDetailsPage,
  },
  {
    path: "/splitit/review",
    Component: ReviewSummaryPage,
  },
  {
    path: "/splitit/requests",
    Component: ParticipantRequestPage,
  },
  {
    path: "/splitit/dashboard",
    Component: SplitBillDashboardPage,
  },
]);
