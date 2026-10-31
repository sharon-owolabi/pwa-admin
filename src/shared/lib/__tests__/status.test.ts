import { describe, expect, it } from "vitest";
import { isLaunchGateway, gatewayLabel } from "../gateways";
import { statusTone, titleCase } from "../status";

describe("statusTone", () => {
  it("maps known statuses", () => {
    expect(statusTone("succeeded")).toBe("success");
    expect(statusTone("failed")).toBe("danger");
    expect(statusTone("degraded")).toBe("signal");
  });
  it("gives an unknown status a neutral tone, never a crash", () => {
    expect(statusTone("pending_review")).toBe("muted");
    expect(statusTone("")).toBe("muted");
  });
});

describe("titleCase", () => {
  it("turns snake_case into a sentence", () => {
    expect(titleCase("pending_review")).toBe("Pending review");
    expect(titleCase("")).toBe("");
  });
});

describe("launch gateways", () => {
  it("accepts only the three launch gateways", () => {
    expect(isLaunchGateway("paystack")).toBe(true);
    expect(isLaunchGateway("flutterwave")).toBe(true);
    expect(isLaunchGateway("interswitch")).toBe(true);
    expect(isLaunchGateway("monnify")).toBe(false);
    expect(isLaunchGateway(undefined)).toBe(false);
  });
  it("labels a gateway", () => {
    expect(gatewayLabel("paystack")).toBe("Paystack");
  });
});
