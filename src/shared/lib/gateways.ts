/**
 * Only the three launch gateways appear in the console. Anything else the API
 * sends is hidden, not shown (PLAN.md §1). This filters what is displayed;
 * it never reshapes a value.
 */
export const LAUNCH_GATEWAYS = ["paystack", "flutterwave", "interswitch"] as const;
export type LaunchGateway = (typeof LAUNCH_GATEWAYS)[number];

export const GATEWAY_LABEL: Record<LaunchGateway, string> = {
  paystack: "Paystack",
  flutterwave: "Flutterwave",
  interswitch: "Interswitch",
};

export function isLaunchGateway(value: unknown): value is LaunchGateway {
  return typeof value === "string" && (LAUNCH_GATEWAYS as readonly string[]).includes(value);
}

/** The label for a gateway id; a non-launch id is never shown by callers, but never crashes here. */
export function gatewayLabel(value: string): string {
  return isLaunchGateway(value) ? GATEWAY_LABEL[value] : value;
}
