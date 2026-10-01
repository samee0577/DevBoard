import { describe, it, expect, beforeEach, vi } from "vitest";
import { createDemoGateway } from "./demoGateway";
import { createDemoProjects } from "./demoData";
import { clearStoredDemoData, DEMO_DATA_KEY, DEMO_MODE_KEY, isDemoMode } from "./demoMode";

// Every operation resolves on a timer, so fake timers are used to keep the suite
// fast. The rejection handler is attached synchronously at creation time rather than
// after the clock advances, otherwise a promise that rejects mid-advance is briefly
// unhandled and Vitest reports it as an error even though the test passes.
async function settle<T>(run: () => Promise<T>): Promise<T> {
  let outcome: { ok: true; value: T } | { ok: false; error: unknown } | undefined;

  run().then(
    (value) => { outcome = { ok: true, value }; },
    (error) => { outcome = { ok: false, error }; },
  );

  await vi.advanceTimersByTimeAsync(500);

  if (!outcome) throw new Error("gateway promise did not settle");
  if (!outcome.ok) throw outcome.error;
  return outcome.value;
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
});

describe("createDemoGateway", () => {
  it("seeds the fixture projects", async () => {
    const gateway = createDemoGateway();
    const projects = await settle(() => gateway.listProjects());

    expect(projects).toHaveLength(createDemoProjects().length);
    expect(projects.map((project) => project.name)).toContain("Neon Storefront");
  });

  it("never reaches the network", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const gateway = createDemoGateway();
    const project = await settle(() => gateway.listProjects());
    await settle(() => gateway.toggleTask({
      projectId: project[0].id,
      featureId: project[0].features[0].id,
      taskId: project[0].features[0].tasks[0].id,
      status: true,
    }));
    await settle(() => gateway.editProject({
      projectId: project[0].id,
      name: "Renamed",
      summary: "s",
      domain: "d",
      techStack: ["React"],
    }));

    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("derives completion from the task rows rather than trusting stored values", async () => {
    const gateway = createDemoGateway();
    const seeded = await settle(() => gateway.listProjects());
    const project = seeded[0];
    const totalTasks = project.features.reduce((sum, f) => sum + f.tasks.length, 0);

    const detail = await settle(() => gateway.getProject(project.id));
    const doneTasks = detail.features.flatMap((f) => f.tasks).filter((t) => t.status).length;

    // The fixture stores completion: 0 on every project; deriveProject must overwrite
    // it with the real ratio, exactly as it does for a live API response.
    expect(detail.completion).toBe(Math.round((doneTasks / totalTasks) * 100));
    expect(detail.completion).not.toBe(0);
  });

  it("marks a feature complete only when all of its tasks are done", async () => {
    const gateway = createDemoGateway();
    const seeded = await settle(() => gateway.listProjects());
    const project = seeded[0];
    // "Cart" has three done and one pending task.
    const cart = project.features.find((f) => f.title === "Cart")!;

    let detail = await settle(() => gateway.getProject(project.id));
    expect(detail.features.find((f) => f.id === cart.id)!.status).toBe(false);

    const pending = cart.tasks.find((task) => !task.status)!;
    await settle(() => gateway.toggleTask({
      projectId: project.id,
      featureId: cart.id,
      taskId: pending.id,
      status: true,
    }));

    detail = await settle(() => gateway.getProject(project.id));
    expect(detail.features.find((f) => f.id === cart.id)!.status).toBe(true);
  });

  it("adds a feature with its tasks and persists it", async () => {
    const gateway = createDemoGateway();
    const seeded = await settle(() => gateway.listProjects());
    const project = seeded[0];
    const before = project.features.length;

    await settle(() => gateway.addFeature(project.id, { title: "Payments", tasks: ["Card form", "Refunds"] }));

    const detail = await settle(() => gateway.getProject(project.id));
    expect(detail.features).toHaveLength(before + 1);

    const added = detail.features.find((f) => f.title === "Payments")!;
    expect(added.tasks.map((task) => task.title)).toEqual(["Card form", "Refunds"]);
    expect(added.tasks.every((task) => task.status === false)).toBe(true);
  });

  it("preserves task ids when a feature is edited", async () => {
    const gateway = createDemoGateway();
    const seeded = await settle(() => gateway.listProjects());
    const project = seeded[0];
    const feature = project.features[0];
    const originalIds = feature.tasks.map((task) => task.id);

    await settle(() => gateway.updateFeature(project.id, feature.id, {
      title: "Catalogue v2",
      tasks: feature.tasks.map((task) => ({ title: task.title, status: task.status })),
    }));

    const detail = await settle(() => gateway.getProject(project.id));
    const updated = detail.features.find((f) => f.id === feature.id)!;

    expect(updated.title).toBe("Catalogue v2");
    // Ids must survive so an in-flight optimistic toggle is not orphaned.
    expect(updated.tasks.map((task) => task.id)).toEqual(originalIds);
  });

  it("deletes a feature and leaves the rest intact", async () => {
    const gateway = createDemoGateway();
    const seeded = await settle(() => gateway.listProjects());
    const project = seeded[0];
    const target = project.features[0];
    const before = project.features.length;

    await settle(() => gateway.deleteFeature(project.id, target.id));

    const detail = await settle(() => gateway.getProject(project.id));
    expect(detail.features).toHaveLength(before - 1);
    expect(detail.features.find((f) => f.id === target.id)).toBeUndefined();
  });

  it("edits project metadata and rebuilds the tech stack", async () => {
    const gateway = createDemoGateway();
    const seeded = await settle(() => gateway.listProjects());
    const project = seeded[1];
    const before = project.techStack.length;

    await settle(() => gateway.editProject({
      projectId: project.id,
      name: "Habit Tracker 2",
      summary: "Updated summary",
      domain: "streakly.io",
      techStack: ["React", "Hono"],
    }));

    const detail = await settle(() => gateway.getProject(project.id));
    expect(detail.name).toBe("Habit Tracker 2");
    expect(detail.domain).toBe("streakly.io");
    expect(detail.techStack.map((tech) => tech.name)).toEqual(["React", "Hono"]);
    expect(detail.techStack).toHaveLength(2);
    expect(before).toBeGreaterThan(0);
  });

  it("deletes a project", async () => {
    const gateway = createDemoGateway();
    const seeded = await settle(() => gateway.listProjects());
    const target = seeded[0];

    await settle(() => gateway.deleteProject(target.id));

    const remaining = await settle(() => gateway.listProjects());
    expect(remaining.find((project) => project.id === target.id)).toBeUndefined();
  });

  it("returns guest-scoped detail links", async () => {
    const gateway = createDemoGateway();
    expect(gateway.detailHref(900001)).toBe("/demo/projectDetail/900001");
  });

  it("rejects an unknown project instead of returning something empty", async () => {
    const gateway = createDemoGateway();
    await expect(settle(() => gateway.getProject(12345))).rejects.toThrow(/not found/);
  });

  it("hands out defensive copies so a caller cannot mutate the store", async () => {
    const gateway = createDemoGateway();
    const projects = await settle(() => gateway.listProjects());
    projects[0].name = "Vandalised";

    const again = await settle(() => gateway.listProjects());
    expect(again[0].name).not.toBe("Vandalised");
  });

  it("persists edits so a new gateway instance sees them", async () => {
    const first = createDemoGateway();
    const seeded = await settle(() => first.listProjects());
    const project = seeded[0];

    await settle(() => first.editProject({
      projectId: project.id,
      name: "Survives Reload",
      summary: "s",
      domain: "d",
      techStack: ["React"],
    }));

    // Simulate a full page reload: brand new gateway, same localStorage.
    const reloaded = createDemoGateway();
    const detail = await settle(() => reloaded.getProject(project.id));

    expect(detail.name).toBe("Survives Reload");
    expect(window.localStorage.getItem(DEMO_DATA_KEY)).toBeTruthy();
  });

  it("falls back to the fixture when stored data is corrupt", async () => {
    window.localStorage.setItem(DEMO_DATA_KEY, "{ not json");

    const gateway = createDemoGateway();
    const projects = await settle(() => gateway.listProjects());

    expect(projects).toHaveLength(createDemoProjects().length);
  });

  it("does not write to localStorage when writes are unavailable", async () => {
    // Private browsing and hardened browsers can throw on access. The sandbox must
    // keep working from memory rather than taking the page down.
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });

    const gateway = createDemoGateway();
    const projects = await settle(() => gateway.listProjects());
    expect(projects.length).toBeGreaterThan(0);

    await settle(() => gateway.editProject({
      projectId: projects[0].id,
      name: "In Memory Only",
      summary: "s",
      domain: "d",
      techStack: [],
    }));
    const detail = await settle(() => gateway.getProject(projects[0].id));
    expect(detail.name).toBe("In Memory Only");

    getItem.mockRestore();
    setItem.mockRestore();
  });
});

describe("demoMode", () => {
  it("defaults to off and toggles on enter", () => {
    expect(isDemoMode()).toBe(false);
    window.localStorage.setItem(DEMO_MODE_KEY, "1");
    expect(isDemoMode()).toBe(true);
  });

  it("clearing the demo restores the pristine fixture", async () => {
    const gateway = createDemoGateway();
    const seeded = await settle(() => gateway.listProjects());

    await settle(() => gateway.editProject({
      projectId: seeded[0].id,
      name: "Temporary",
      summary: "s",
      domain: "d",
      techStack: [],
    }));
    clearStoredDemoData();

    const afterReset = createDemoGateway();
    const detail = await settle(() => afterReset.getProject(seeded[0].id));
    expect(detail.name).not.toBe("Temporary");
  });
});