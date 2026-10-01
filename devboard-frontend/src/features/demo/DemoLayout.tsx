import { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { GatewayProvider } from "../projects/lib/GatewayProvider";
import DemoNavBar from "./DemoNavBar";
import { createDemoGateway } from "./demoGateway";
import { clearStoredDemoData } from "./demoMode";
import type { ProjectGateway } from "../projects/lib/gateway";

export default function DemoLayout() {
  const queryClient = useQueryClient();
  // Held in state rather than built inline so "Reset demo" can swap in a brand new
  // gateway. Each gateway owns its own in-memory store seeded from localStorage, so a
  // fresh instance is what actually restores the fixture.
  const [gateway, setGateway] = useState<ProjectGateway>(() => createDemoGateway());

  const handleReset = useCallback(() => {
    clearStoredDemoData();
    // Clearing the cache is what makes the refetched fixture visible; without it the
    // guest would keep seeing the pre-reset data for the cache's stale window.
    queryClient.clear();
    setGateway(createDemoGateway());
  }, [queryClient]);

  return (
    <GatewayProvider gateway={gateway}>
      <DemoNavBar onReset={handleReset} />
      <hr style={{ marginTop: 15, margin: 5 }} />
      <Outlet />
      <ToastContainer position="bottom-right" autoClose={3000} />
    </GatewayProvider>
  );
}