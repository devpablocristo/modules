// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { createPublicSchedulingClient, createSchedulingClient } from "./client";

describe("scheduling client compatibility", () => {
  it("normalizes deprecated appointments_enabled into scheduling_enabled for public info", async () => {
    const request = vi.fn().mockResolvedValue({
      org_id: "org-demo",
      slug: "demo-org",
      name: "Demo Org",
      business_name: "Demo Scheduling",
      appointments_enabled: true,
    });

    const client = createPublicSchedulingClient(request);
    const info = await client.getBusinessInfo("demo-org");

    expect(request).toHaveBeenCalledWith("/v1/public/demo-org/info");
    expect(info.scheduling_enabled).toBe(true);
    expect(info.appointments_enabled).toBe(true);
  });

  it("builds scheduling slot queries with branch, service and resource selectors", async () => {
    const request = vi.fn().mockResolvedValue({ items: [] });

    const client = createSchedulingClient(request);
    await client.listSlots({
      branchId: "branch-1",
      serviceId: "service-1",
      resourceId: "resource-1",
      date: "2026-04-03",
    });

    expect(request).toHaveBeenCalledWith(
      "/v1/scheduling/slots?branch_id=branch-1&service_id=service-1&resource_id=resource-1&date=2026-04-03",
    );
  });
});
