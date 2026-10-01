import { GatewayContext, type ProjectGateway } from "./gateway";

// Split out from gateway.ts purely so that file can export the context and hook
// without also exporting a component, which react-refresh flags as unsafe for
// hot reloading.
export function GatewayProvider({
  gateway,
  children,
}: {
  gateway: ProjectGateway;
  children: React.ReactNode;
}) {
  return <GatewayContext.Provider value={gateway}>{children}</GatewayContext.Provider>;
}