import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProjectCard from "./projectCard";
import { GatewayProvider } from "../lib/GatewayProvider";
import { apiGateway } from "../lib/apiGateway";
import { createDemoGateway } from "../../demo/demoGateway";
import type { ProjectGateway } from "../lib/gateway";
import type { projectType } from "../types/project";

beforeEach(() => {
  // ProjectCard renders <dialog> through useDialog, which calls showModal/close.
  // jsdom implements neither, so they are stubbed here.
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

const project: projectType = {
  id: 900001,
  name: "Neon Storefront",
  domain: "storefront.dev",
  summary: "A sample project",
  completion: 50,
  techStack: [],
  features: [],
};

function renderCard(gateway: ProjectGateway) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <GatewayProvider gateway={gateway}>
          <ProjectCard project={project} />
        </GatewayProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProjectCard sample badge", () => {
  it("marks a sandbox project card as a sample", () => {
    renderCard(createDemoGateway());

    expect(screen.getByText("Sample")).toBeInTheDocument();
  });

  it("shows no sample marker on a real project card", () => {
    // This is the half the guest end-to-end suite cannot cover: a guest has no real
    // projects, so the apiGateway path is only reachable from here.
    renderCard(apiGateway);

    expect(screen.queryByText("Sample")).not.toBeInTheDocument();
  });
});