import type {
  Me,
  StaffList,
  StaffSession,
  TotpEnrolment,
} from "./contract.draft";

/**
 * The write side the UI needs: sign-in, MFA, invitations, sessions and staff
 * management. Narrow on purpose. The API team has not decided Better Auth
 * routes vs custom routes (Q1), so the screens talk to this interface and one
 * file changes when they do. Staff writes take a reason and an idempotency key.
 */
export type SignInResult = { status: "mfa_required"; challengeId: string };

export type AcceptInviteResult = { enrolment: TotpEnrolment };

export type ChangeRoleResult = { status: "changed" } | { status: "pending_approval" };

export interface AuthAdapter {
  signIn(input: { email: string; password: string }): Promise<SignInResult>;
  verifyTotp(input: { challengeId: string; code: string }): Promise<Me>;
  signOut(): Promise<void>;
  acceptInvite(input: { token: string; password: string }): Promise<AcceptInviteResult>;
  enrolTotp(input: { enrolmentId: string; code: string }): Promise<Me>;
  listSessions(): Promise<StaffSession[]>;
  revokeSession(input: { sessionId: string }): Promise<void>;
  listStaff(): Promise<StaffList>;
  inviteStaff(input: { email: string; roleKey: string; idempotencyKey: string }): Promise<void>;
  changeRole(input: {
    staffId: string;
    roleKey: string;
    reason: string;
    idempotencyKey: string;
  }): Promise<ChangeRoleResult>;
  deactivateStaff(input: {
    staffId: string;
    reason: string;
    idempotencyKey: string;
  }): Promise<void>;
}
