import { createBrowserRouter } from "react-router";
import { Welcome } from "./screens/Welcome";
import { SignIn } from "./screens/SignIn";
import { Onboarding } from "./screens/Onboarding";
import { Dashboard } from "./screens/Dashboard";
import { Contacts } from "./screens/Contacts";
import { AddContact } from "./screens/AddContact";
import { Activity } from "./screens/Activity";
import { SendConfirmation } from "./screens/SendConfirmation";
import { SwapConfirmation } from "./screens/SwapConfirmation";
import { Success } from "./screens/Success";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Welcome,
  },
  {
    path: "/signin",
    Component: SignIn,
  },
  {
    path: "/onboarding",
    Component: Onboarding,
  },
  {
    path: "/dashboard",
    Component: Dashboard,
  },
  {
    path: "/contacts",
    Component: Contacts,
  },
  {
    path: "/add-contact",
    Component: AddContact,
  },
  {
    path: "/activity",
    Component: Activity,
  },
  {
    path: "/send-confirmation",
    Component: SendConfirmation,
  },
  {
    path: "/swap-confirmation",
    Component: SwapConfirmation,
  },
  {
    path: "/success",
    Component: Success,
  },
]);
