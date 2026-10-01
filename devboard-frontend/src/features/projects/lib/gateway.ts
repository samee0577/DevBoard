import { createContext, useContext } from "react";
import { apiGateway } from "./apiGateway";
import type { projectType } from "../types/project";

export type EditProjectInput = {
  projectId: number;
  name: string;
  summary: string;
  domain: string;
  techStack: string[];
};

export type AddFeatureInput = {
  title: string;
  tasks: string[];
};

export type UpdateFeatureInput = {
  title: string;
  tasks: { title: string; status: boolean }[];
};

export type ToggleTaskInput = {
  taskId: number;
  status: boolean;
  featureId: number;
  projectId: string | number;
};

// Every data access the UI performs goes through this interface, so the same
// components can run against the real API or against the demo sandbox. The demo
// implementation must never import `api.ts` or `auth.ts`; the no-restricted-imports
// rule in eslint.config.js enforces that, and tests/guest-no-api-calls.spec.ts
// enforces it end to end.
export type ProjectGateway = {
  // True for the guest sandbox. Callers use this to skip network-reachability
  // handling: the demo data is local, so an offline visitor is not an error there,
  // and the "no network connection" screens would be actively misleading.
  readonly isSandbox: boolean;

  listProjects(): Promise<projectType[]>;
  getProject(projectId: string | number): Promise<projectType>;

  editProject(input: EditProjectInput): Promise<unknown>;
  deleteProject(projectId: number): Promise<unknown>;

  addFeature(projectId: string | number, feature: AddFeatureInput): Promise<unknown>;
  updateFeature(projectId: string | number, featureId: number, feature: UpdateFeatureInput): Promise<unknown>;
  deleteFeature(projectId: string | number, featureId: number): Promise<unknown>;

  toggleTask(input: ToggleTaskInput): Promise<unknown>;

  // Project detail links differ between the real app and the demo sandbox, so the
  // prefix belongs to whichever gateway is active rather than being hardcoded in cards.
  detailHref(projectId: string | number): string;
};

// Defaulting to the real gateway keeps every existing call site working unchanged,
// including tests that render these components without a provider. The demo layout
// overrides it for its own subtree only. GatewayProvider lives in its own file so
// this one stays free of components, which keeps react-refresh happy.
export const GatewayContext = createContext<ProjectGateway>(apiGateway);

export function useGateway(): ProjectGateway {
  return useContext(GatewayContext);
}