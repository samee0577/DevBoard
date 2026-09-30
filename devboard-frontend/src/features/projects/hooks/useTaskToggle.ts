import { useState, useSyncExternalStore } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { api } from "../lib/api";
import { projectKeys } from "../lib/queryKeys";
import { applyTaskStatus, deriveProject, findTaskStatus } from "../lib/applyTaskToggle";
import type { projectType } from "../types/project";

type ToggleRequest = {
    projectId: number;
    featureId: number;
    taskId: number;
    status: boolean;
};

export type TaskToggleQueue = {
    toggleTask: (projectId: number, featureId: number, taskId: number) => void;
    isTaskPending: (taskId: number) => boolean;
    subscribe: (listener: () => void) => () => void;
};

// Task ids are primary keys, so they are unique across projects and safe to key the
// queue's state by. Keeping the queue project-agnostic means a single instance is
// valid for the whole component lifetime, including a projectId change.
function createTaskToggleQueue(client: QueryClient): TaskToggleQueue {
    // Latest intent wins. Rapid clicks on the same task overwrite each other, so a
    // burst collapses into a single request carrying the final value.
    const pending = new Map<number, ToggleRequest>();
    const pendingTasks = new Set<number>();
    const listeners = new Set<() => void>();

    let flushing = false;

    function emit() {
        for (const listener of listeners) listener();
    }

    function subscribe(listener: () => void) {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }

    function isTaskPending(taskId: number) {
        return pendingTasks.has(taskId);
    }

    async function send(request: ToggleRequest) {
        await api.put("/api/projects/toggleTask", {
            status: request.status,
            taskId: request.taskId,
            featureId: request.featureId,
            projectId: request.projectId,
        });
    }

    async function resyncFromServer(failed: ToggleRequest) {
        try {
            const fresh = await api.get(`/api/projects/${failed.projectId}`);
            client.setQueryData(projectKeys.detail(failed.projectId), deriveProject(fresh as projectType));
        } catch {
            // Offline or failed: the next mount, focus or successful toggle recovers.
        }
    }

    // Batches run strictly one after another. Two tasks in the same feature toggled
    // concurrently would race on the server's `bool_and` feature-status update and
    // could persist a stale aggregate, so parallelism is deliberately not an option.
    async function flush() {
        if (flushing) return;
        flushing = true;

        try {
            while (pending.size > 0) {
                const batch = [...pending.values()];
                pending.clear();

                for (const request of batch) {
                    pendingTasks.add(request.taskId);
                    emit();

                    try {
                        await send(request);
                    } catch {
                        toast.error("Error toggling task status");
                        // Resync from the server instead of hand-rolling a rollback: a
                        // manual revert would clobber any newer click made while this
                        // request was in flight.
                        await resyncFromServer(request);
                    } finally {
                        pendingTasks.delete(request.taskId);
                        emit();
                    }
                }
            }
        } finally {
            flushing = false;
            emit();
        }
    }

    function toggleTask(projectId: number, featureId: number, taskId: number) {
        const key = projectKeys.detail(projectId);
        const cached = client.getQueryData<projectType>(key);
        if (!cached) return;

        // Read the current value from the cache rather than a render-time prop. The
        // cache already holds every prior optimistic write, so this stays correct no
        // matter how fast the user clicks.
        const current = findTaskStatus(cached, taskId);
        if (current === undefined) return;

        const next = !current;

        // Fire-and-forget: abort any straggler refetch so it cannot land on top of the
        // optimistic value. Deliberately not awaited, to keep the click instant.
        void client.cancelQueries({ queryKey: key });

        client.setQueryData<projectType>(key, (old) =>
            old ? applyTaskStatus(old, taskId, next) : old
        );

        // Latest intent wins, so anything that arrived while a request was in flight
        // simply overwrites the queued value.
        pending.set(taskId, { projectId, featureId, taskId, status: next });
        pendingTasks.add(taskId);
        emit();

        // The drain loop re-checks `pending` after every request, so clicks that land
        // mid-flight are picked up on its next pass, and several clicks in one tick
        // collapse into a single request. Only start a loop when none is running:
        // `flush` sets its guard synchronously, so this can never double-fire.
        if (!flushing) void flush();
    }

    return { toggleTask, isTaskPending, subscribe };
}

export function useTaskToggleQueue(): TaskToggleQueue {
    const client = useQueryClient();
    // Lazy initialiser, so the queue is built once and stays referentially stable
    // for the lifetime of the component.
    const [queue] = useState(() => createTaskToggleQueue(client));

    return queue;
}

// Drives the per-task "syncing" visual. Purely informational: the task button is
// never disabled, so a slow request can never block the next click.
export function useTaskPending(queue: TaskToggleQueue, taskId: number): boolean {
    return useSyncExternalStore(
        queue.subscribe,
        () => queue.isTaskPending(taskId),
        () => false
    );
}
