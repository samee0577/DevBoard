import { deriveProject } from "../projects/lib/applyTaskToggle";
import type {
  AddFeatureInput,
  ProjectGateway,
  ToggleTaskInput,
  UpdateFeatureInput,
} from "../projects/lib/gateway";
import type { projectType } from "../projects/types/project";
import { createDemoProjects } from "./demoData";
import { readStoredDemoData, writeStoredDemoData } from "./demoMode";

// Sandbox implementation backing guest mode.
//
// SECURITY: this module must never import `../../auth`, `../../projects/lib/api`, or
// anything else that can reach the network or a database session. That rule is
// enforced by no-restricted-imports in eslint.config.js, and end-to-end by
// tests/guest-no-api-calls.spec.ts. If you find yourself wanting to add an import
// here, the design is wrong: add a method to the gateway interface instead.

const SIMULATED_LATENCY_MS = 220;

// Ids for entities a guest creates in the sandbox. Far above the fixture range so
// they can never collide with a seeded project.
let nextGeneratedId = 900_000;

function generateId(): number {
  nextGeneratedId += 1;
  return nextGeneratedId;
}

// A short delay on every operation so loading states and toasts behave the way they
// do against the real API, rather than resolving so fast that the UI appears broken.
function simulateLatency(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));
}

// `structuredClone` keeps nested feature/task objects from being shared by reference
// between the store and its callers, matching how a JSON response behaves.
function clone<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}

function findProjectIndex(store: projectType[], projectId: string | number): number {
  const numericId = Number(projectId);
  return store.findIndex((project) => project.id === numericId);
}

export function createDemoGateway(): ProjectGateway {
  // Seeded once per gateway instance, then hydrated from whatever the guest left
  // behind on a previous visit so their edits survive a reload. The array identity
  // never changes; mutations edit it in place.
  const store = clone(readStoredDemoData<projectType[]>(createDemoProjects()));

  function commit() {
    writeStoredDemoData(store);
  }

  function requireProject(projectId: string | number): projectType {
    const index = findProjectIndex(store, projectId);
    if (index === -1) {
      throw new Error(`Demo project ${projectId} not found`);
    }
    return store[index];
  }

  // Resolves the owning project from a (featureId, taskId) pair. A closure helper
  // rather than a method on the returned object, so the methods below never depend
  // on `this` being bound by the caller.
  function requireProjectForTask(taskId: number, featureId: number): projectType {
    for (const project of store) {
      const target = project.features.find((candidate) => candidate.id === featureId);
      if (target?.tasks.some((candidate) => candidate.id === taskId)) {
        return project;
      }
    }
    throw new Error(`Demo task ${taskId} not found`);
  }

  return {
    isSandbox: true,

    async listProjects() {
      await simulateLatency();
      return clone(store);
    },

    async getProject(projectId) {
      await simulateLatency();
      // deriveProject mirrors what the server does on every real read: recompute the
      // denormalised completion and feature status from the task rows so aggregates
      // can never drift out of sync in the sandbox either.
      return deriveProject(clone(requireProject(projectId)));
    },

    async editProject({ projectId, name, summary, domain, techStack }) {
      await simulateLatency();
      const project = requireProject(projectId);
      project.name = name;
      project.summary = summary;
      project.domain = domain;
      project.techStack = techStack.map((techName) => ({
        id: generateId(),
        name: techName,
        project_id: project.id,
      }));
      commit();
      return { message: "project edited successfully", projectId: project.id };
    },

    async deleteProject(projectId) {
      await simulateLatency();
      const index = findProjectIndex(store, projectId);
      if (index === -1) {
        throw new Error(`Demo project ${projectId} not found`);
      }
      store.splice(index, 1);
      commit();
      return { message: "Project deleted" };
    },

    async addFeature(projectId, { title, tasks }: AddFeatureInput) {
      await simulateLatency();
      const project = requireProject(projectId);
      const featureId = generateId();

      project.features.push({
        id: featureId,
        title,
        status: false,
        tasks: tasks.map((taskTitle) => ({
          id: generateId(),
          title: taskTitle,
          status: false,
        })),
      });

      commit();
      return { message: "Feature added successfully" };
    },

    async updateFeature(projectId, featureId, { title, tasks }: UpdateFeatureInput) {
      await simulateLatency();
      const project = requireProject(projectId);
      const target = project.features.find((candidate) => candidate.id === featureId);
      if (!target) {
        throw new Error(`Demo feature ${featureId} not found`);
      }

      target.title = title;
      // Task ids are preserved where possible so a guest editing one task does not
      // orphan the in-flight optimistic toggle for another.
      target.tasks = tasks.map((task, index) => ({
        id: target.tasks[index]?.id ?? generateId(),
        title: task.title,
        status: task.status,
      }));

      commit();
      return { message: "Feature updated successfully" };
    },

    async deleteFeature(projectId, featureId) {
      await simulateLatency();
      const project = requireProject(projectId);
      const index = project.features.findIndex((candidate) => candidate.id === featureId);
      if (index === -1) {
        throw new Error(`Demo feature ${featureId} not found`);
      }
      project.features.splice(index, 1);
      commit();
      return { message: "Feature deleted successfully" };
    },

    async toggleTask({ taskId, status, featureId }: ToggleTaskInput) {
      await simulateLatency();
      const project = requireProjectForTask(taskId, featureId);
      const target = project.features.find((candidate) => candidate.id === featureId);
      const task = target?.tasks.find((candidate) => candidate.id === taskId);
      if (!task) {
        throw new Error(`Demo task ${taskId} not found`);
      }

      task.status = status;
      commit();
      return { message: "task status toggled successfully" };
    },

    detailHref(projectId) {
      return `/demo/projectDetail/${projectId}`;
    },
  };
}