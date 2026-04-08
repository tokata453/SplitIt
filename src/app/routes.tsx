import { createBrowserRouter } from "react-router";
import { Home } from "./pages/Home";
import { SplitItHome } from "./pages/SplitItHome";
import { CreateGroup } from "./pages/CreateGroup";
import { InvoiceEntry } from "./pages/InvoiceEntry";
import { BillSplitter } from "./pages/BillSplitter";
import { GroupDetail } from "./pages/GroupDetail";
import { PaymentReview } from "./pages/PaymentReview";
import { PaymentSuccess } from "./pages/PaymentSuccess";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/splitit",
    Component: SplitItHome,
  },
  {
    path: "/splitit/create-group",
    Component: CreateGroup,
  },
  {
    path: "/splitit/group/:groupId",
    Component: GroupDetail,
  },
  {
    path: "/splitit/group/:groupId/invoice",
    Component: InvoiceEntry,
  },
  {
    path: "/splitit/group/:groupId/split",
    Component: BillSplitter,
  },
  {
    path: "/splitit/group/:groupId/review/:userId",
    Component: PaymentReview,
  },
  {
    path: "/splitit/payment-success",
    Component: PaymentSuccess,
  },
]);
