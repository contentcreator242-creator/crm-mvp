import { Suspense } from "react";
import {
  AcceptOrganizationInvitation,
  AcceptOrganizationInvitationChrome,
} from "./AcceptOrganizationInvitation";

export default function AcceptInvitationPage() {
  return (
    <AcceptOrganizationInvitationChrome>
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-600">
            Loading invitation…
          </div>
        }
      >
        <AcceptOrganizationInvitation />
      </Suspense>
    </AcceptOrganizationInvitationChrome>
  );
}
