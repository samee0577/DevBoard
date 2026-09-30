import { describe, it, expect } from "vitest";
import {
    applyTaskStatus,
    computeCompletion,
    deriveProject,
    findTaskStatus,
    isFeatureComplete,
} from "./applyTaskToggle";
import type { feature, projectType, task } from "../types/project";

function makeTask(id: number, status: boolean): task {
    return { id, title: `task ${id}`, status };
}

function makeFeature(id: number, tasks: task[]): feature {
    return { id, title: `feature ${id}`, status: isFeatureComplete(tasks), tasks };
}

function makeProject(features: feature[], completion = 0): projectType {
    return {
        id: 1,
        name: "project",
        summary: "summary",
        techStack: [],
        domain: "example.com",
        completion,
        features,
    };
}

const twoTasks = makeProject([
    makeFeature(10, [makeTask(100, false), makeTask(101, false)]),
    makeFeature(20, [makeTask(200, false), makeTask(201, false)]),
]);

describe("findTaskStatus", () => {
    it("finds a task status across features", () => {
        expect(findTaskStatus(twoTasks, 200)).toBe(false);
    });

    it("returns undefined for an unknown task", () => {
        expect(findTaskStatus(twoTasks, 999)).toBeUndefined();
    });
});

describe("isFeatureComplete", () => {
    it("is false for a feature with no tasks", () => {
        // `every` returns true on an empty array, which would wrongly mark a
        // taskless feature as complete.
        expect(isFeatureComplete([])).toBe(false);
    });

    it("is true only when every task is done", () => {
        expect(isFeatureComplete([makeTask(1, true), makeTask(2, true)])).toBe(true);
        expect(isFeatureComplete([makeTask(1, true), makeTask(2, false)])).toBe(false);
    });
});

describe("computeCompletion", () => {
    it("returns 0 when the project has no tasks at all", () => {
        expect(computeCompletion([makeFeature(1, [])])).toBe(0);
    });

    it("rounds to the nearest whole percent", () => {
        const features = [makeFeature(1, [makeTask(1, true), makeTask(2, false), makeTask(3, false)])];
        expect(computeCompletion(features)).toBe(33);
    });

    it("counts tasks across every feature", () => {
        const features = [
            makeFeature(1, [makeTask(1, true), makeTask(2, false)]),
            makeFeature(2, [makeTask(3, true), makeTask(4, true)]),
        ];
        expect(computeCompletion(features)).toBe(75);
    });
});

describe("applyTaskStatus", () => {
    it("sets the explicit status rather than flipping", () => {
        const result = applyTaskStatus(twoTasks, 100, true);
        expect(findTaskStatus(result, 100)).toBe(true);
    });

    it("can set a task back to false", () => {
        const result = applyTaskStatus(twoTasks, 100, true);
        expect(findTaskStatus(result, 100)).toBe(true);
    });

    it("marks the parent feature complete only when all its tasks are done", () => {
        const partial = applyTaskStatus(twoTasks, 100, true);
        expect(partial.features[0].status).toBe(false);

        const complete = applyTaskStatus(partial, 101, true);
        expect(complete.features[0].status).toBe(true);
    });

    it("does not affect sibling features", () => {
        const result = applyTaskStatus(twoTasks, 100, true);
        expect(result.features[1]).toEqual(twoTasks.features[1]);
    });

    it("recomputes project completion", () => {
        const result = applyTaskStatus(twoTasks, 100, true);
        expect(result.completion).toBe(25);
    });

    it("does not mutate the input project", () => {
        const snapshot = JSON.parse(JSON.stringify(twoTasks));
        applyTaskStatus(twoTasks, 100, true);
        expect(twoTasks).toEqual(snapshot);
    });

    it("leaves task rows untouched for an unknown task id", () => {
        const result = applyTaskStatus(twoTasks, 999, true);
        expect(result.features).toEqual(twoTasks.features);
    });

    it("re-derives aggregates even when the task id is unknown", () => {
        // applyTaskStatus always normalises the stored aggregates, so a stale
        // completion is corrected regardless of which task was targeted.
        const stale = makeProject([makeFeature(10, [makeTask(100, true)])], 0);
        expect(applyTaskStatus(stale, 999, true).completion).toBe(100);
    });

    it("stays correct across a rapid sequence of toggles", () => {
        // Two clicks before any response lands: the second must read the value the
        // first wrote, not a stale prop.
        let current = twoTasks;
        current = applyTaskStatus(current, 100, true);
        current = applyTaskStatus(current, 100, false);
        expect(findTaskStatus(current, 100)).toBe(false);
        expect(current.completion).toBe(0);
    });
});

describe("deriveProject", () => {
    it("overrides a stale stored completion from the task rows", () => {
        const stale = makeProject(
            [makeFeature(10, [makeTask(100, true), makeTask(101, true)])],
            0
        );
        expect(deriveProject(stale).completion).toBe(100);
    });

    it("overrides a stale stored feature status from the task rows", () => {
        const stale = makeProject([{ ...makeFeature(10, [makeTask(100, true)]), status: false }]);
        expect(deriveProject(stale).features[0].status).toBe(true);
    });

    it("leaves a taskless feature incomplete", () => {
        const result = deriveProject(makeProject([makeFeature(10, [])]));
        expect(result.features[0].status).toBe(false);
    });
});
