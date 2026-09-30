import type { feature, projectType, task } from "../types/project";

// The `features.status` and `projects.completion` columns are denormalised in the
// database, which means they can drift out of sync with the `tasks` rows they are
// derived from. Every function here recomputes them from the tasks themselves, so
// the UI stays correct whether or not the server-side trigger is in place.

export function findTaskStatus(project: projectType, taskId: number): boolean | undefined {
    for (const f of project.features) {
        const match = f.tasks.find((t) => t.id === taskId);
        if (match) return match.status;
    }
    return undefined;
}

// A feature counts as complete only when it actually has tasks: `every` returns
// true for an empty array, which would otherwise mark a taskless feature complete.
export function isFeatureComplete(tasks: task[]): boolean {
    return tasks.length > 0 && tasks.every((t) => t.status);
}

export function computeCompletion(features: feature[]): number {
    const allTasks = features.flatMap((f) => f.tasks);
    if (allTasks.length === 0) return 0;
    return Math.round((allTasks.filter((t) => t.status).length / allTasks.length) * 100);
}

// Re-derives every stored aggregate from the raw task rows. Applied both to
// optimistic writes and to server responses so a stale column never reaches the UI.
export function deriveProject(project: projectType): projectType {
    const features = project.features.map((f) => ({ ...f, status: isFeatureComplete(f.tasks) }));
    return { ...project, features, completion: computeCompletion(features) };
}

// Sets one task to an explicit status rather than flipping it, so the caller must
// read the current value first. Reading a render-time prop here is what made rapid
// clicks send a duplicate target status.
export function applyTaskStatus(project: projectType, taskId: number, status: boolean): projectType {
    return deriveProject({
        ...project,
        features: project.features.map((f) =>
            f.tasks.some((t) => t.id === taskId)
                ? { ...f, tasks: f.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)) }
                : f
        ),
    });
}
