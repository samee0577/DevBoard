import { describe, it, expect } from "vitest";
import { createDemoProjects } from "./demoData";

/**
 * Contract tests for the demo fixture, asserted against hardcoded expectations rather
 * than against the fixture itself.
 *
 * This file exists because a truncated write to demoData.ts shipped silently: two of
 * four projects vanished and a summary lost its tail, while every other test still
 * passed because they compared the fixture to itself. These assertions fail on a
 * partial fixture, which is the whole point.
 */
describe("createDemoProjects", () => {
  it("ships exactly the four expected projects", () => {
    expect(createDemoProjects().map((project) => project.name)).toEqual([
      "Neon Storefront",
      "Habit Tracker",
      "Podcast Dashboard",
      "AI Resume Builder",
    ]);
  });

  it("uses the reserved demo id range", () => {
    expect(createDemoProjects().map((project) => project.id)).toEqual([
      900001, 900002, 900003, 900004,
    ]);
  });

  it("gives every project complete copy and at least one feature", () => {
    for (const project of createDemoProjects()) {
      expect(project.domain, `${project.name} domain`).not.toBe("");
      expect(project.summary.length, `${project.name} summary`).toBeGreaterThan(80);
      expect(project.techStack.length, `${project.name} techStack`).toBeGreaterThan(0);
      expect(project.features.length, `${project.name} features`).toBeGreaterThan(0);

      for (const feature of project.features) {
        expect(feature.tasks.length, `${project.name} / ${feature.title}`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps task ids globally unique", () => {
    // The task toggle queue keys its pending-write map by task id alone, on the
    // assumption that ids are unique across the whole dataset. A duplicate here would
    // silently cross-wire one project's optimistic update into another's.
    const projects = createDemoProjects();
    const ids = projects.flatMap((project) =>
      project.features.flatMap((feature) => feature.tasks.map((task) => task.id)),
    );

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps feature ids globally unique", () => {
    const ids = createDemoProjects().flatMap((project) => project.features.map((f) => f.id));

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("points every tech stack row at its own project", () => {
    for (const project of createDemoProjects()) {
      for (const tech of project.techStack) {
        expect(tech.project_id).toBe(project.id);
      }
    }
  });

  it("returns a fresh, independent copy each call", () => {
    // A caller mutating the seed would otherwise poison every later guest in the
    // same tab through a shared module-level array.
    const first = createDemoProjects();
    first[0].name = "Mutated";
    first[0].features[0].tasks[0].status = !first[0].features[0].tasks[0].status;

    const second = createDemoProjects();
    expect(second[0].name).toBe("Neon Storefront");
    expect(second[0].features[0].tasks[0].status).toBe(true);
  });

  it("mixes completed and incomplete tasks so progress is non-zero", () => {
    const projects = createDemoProjects();
    const allTasks = projects.flatMap((project) =>
      project.features.flatMap((feature) => feature.tasks),
    );

    // A fixture where everything is 0% or 100% makes the progress ring useless as a demo.
    expect(allTasks.some((task) => task.status)).toBe(true);
    expect(allTasks.some((task) => !task.status)).toBe(true);
  });
});