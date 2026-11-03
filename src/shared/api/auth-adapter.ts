import type {
  AcceptedInvite,
  Approval,
  InvitedMember,
  Me,
  SignInResult,
  StaffMember,
} from "./contract";

/** A change that either happened, or is waiting for a second approver (HTTP 202). */
export type Outcome<T> = { status: "done"; value: T } | { status: "pending_approval"; approval: Approval };

/**
 * Every write the console makes: sign-in, MFA, invitations, sessions, staff and
 * approvals. The API has NO idempotency key. Staff writes carry a `reason`.
 * Failures throw ApiError (the API's own message is shown).
 */
export interface AuthAdapter {
  /** Step 1. The server keeps a pending-MFA cookie; there is no challenge id. */
  signIn(input: { email: string; password: string }): Promise<SignInResult>;
  /** Step 2. Swaps the pending cookie for a full session and returns who signed in. */
  verifyMfa(input: { code: string }): Promise<Me>;
  signOut(): Promise<void>;
  /** The first authenticator code then goes to `verifyMfa`: there is no separate enrol call. */
  acceptInvite(input: { token: string; name: string; password: string }): Promise<AcceptedInvite>;
  revokeSession(input: { sessionId: string }): Promise<void>;

  inviteStaff(input: {
    email: string;
    name: string;
    roleKey: string;
    reason: string;
  }): Promise<Outcome<InvitedMember>>;
  changeRole(input: { staffId: string; roleKey: string; reason: string }): Promise<Outcome<StaffMember>>;
  deactivateStaff(input: { staffId: string; reason: string }): Promise<StaffMember>;
  reissueInvitation(input: { staffId: string; reason: string }): Promise<InvitedMember>;
  resetCredentials(input: { staffId: string; reason: string }): Promise<InvitedMember>;

  approve(input: { approvalId: string; reason?: string }): Promise<Approval>;
  reject(input: { approvalId: string; reason?: string }): Promise<Approval>;
  cancel(input: { approvalId: string }): Promise<Approval>;
}
