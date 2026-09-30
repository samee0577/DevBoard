import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTaskToggleQueue, useTaskPending } from "./useTaskToggle";
import { projectKeys } from "../lib/queryKeys";
import { api } from "../lib/api";
import type { feature, projectType, task } from "../types/project";

vi.mock("../lib/api", () => ({
    api: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock("react-toastify", () => ({
    toast: { error: vi.fn(), success: vi.fn(), loading: vi.fn(), update: vi.fn() },
}));

const mockedApi = vi.mocked(api);

function makeTask(id: number, status: boolean): task {
    return { id, title: `task ${id}`, status };
}

function makeFeature(id: number, tasks: task[]): feature {
    return { id, title: `feature ${id}`, status: false, tasks };
}

function seedProject(): projectType {
    return {
        id: 7,
        name: "project",
        summary: "summary",
        techStack: [],
        domain: "example.com",
        completion: 0,
        features: [
            makeFeature(10, [makeTask(100, false), makeTask(101, false)]),
            makeFeature(20, [makeTask(200, false)]),
        ],
    };
}

const PROJECT_ID = 7;

function wrapper(queryClient: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
}

function renderQueue(queryClient: QueryClient) {
    return renderHook(() => useTaskToggleQueue(), { wrapper: wrapper(queryClient) });
}

function freshClient() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(projectKeys.detail(PROJECT_ID), seedProject());
    return queryClient;
}

// A promise plus its resolver, so a test can hold a request open and observe the
// state that results from clicking again while it is still in flight.
function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

beforeEach(() => {
    mockedApi.put.mockReset();
    mockedApi.get.mockReset();
    mockedApi.put.mockResolvedValue({ message: "ok" } as never);
});

describe("useTaskToggleQueue", () => {
    it("updates the cache synchronously, before any response arrives", () => {
        const queryClient = freshClient();
        mockedApi.put.mockReturnValue(new Promise(() => { }) as never);

        const { result } = renderQueue(queryClient);

        act(() => {
            result.current.toggleTask(PROJECT_ID, 10, 100);
        });

        const cached = queryClient.getQueryData<projectType>(projectKeys.detail(PROJECT_ID))!;
        expect(cached.features[0].tasks[0].status).toBe(true);
        // One of three tasks across the project is now done.
        expect(cached.completion).toBe(33);
    });

    it("never blocks the next click while a request is in flight", async () => {
        const queryClient = freshClient();
        const gate = deferred<unknown>();
        mockedApi.put.mockReturnValue(gate.promise as never);

        const { result } = renderQueue(queryClient);

        act(() => {
            result.current.toggleTask(PROJECT_ID, 10, 100);
        });

        // Still in flight, but the next click is accepted and applied immediately.
        act(() => {
            result.current.toggleTask(PROJECT_ID, 10, 101);
        });

        const cached = queryClient.getQueryData<projectType>(projectKeys.detail(PROJECT_ID))!;
        expect(cached.features[0].tasks[1].status).toBe(true);

        await act(async () => {
            gate.resolve({ message: "ok" });
        });
    });

    it("sends the final value when a task is clicked repeatedly before the response", async () => {
        const queryClient = freshClient();
        const gate = deferred<unknown>();
        mockedApi.put.mockReturnValueOnce(gate.promise as never);

        const { result } = renderQueue(queryClient);

        act(() => {
            result.current.toggleTask(PROJECT_ID, 10, 100);
        });

        // Three more clicks on the same task while the first request is still open.
        await act(async () => {
            result.current.toggleTask(PROJECT_ID, 10, 100);
            result.current.toggleTask(PROJECT_ID, 10, 100);
            result.current.toggleTask(PROJECT_ID, 10, 100);
        });

        await act(async () => {
            gate.resolve({ message: "ok" });
        });

        await waitFor(() => expect(mockedApi.put).toHaveBeenCalledTimes(2));

        // Four clicks is an even number, so the task ends where it started. The
        // follow-up request must carry that final value, not a stale intermediate one.
        const lastCall = mockedApi.put.mock.calls.at(-1)![1] as { status: boolean };
        const cached = queryClient.getQueryData<projectType>(projectKeys.detail(PROJECT_ID))!;
        expect(cached.features[0].tasks[0].status).toBe(false);
        expect(lastCall.status).toBe(cached.features[0].tasks[0].status);
    });

    it("sends the toggled value when an odd number of clicks lands mid-flight", async () => {
        const queryClient = freshClient();
        const gate = deferred<unknown>();
        mockedApi.put.mockReturnValueOnce(gate.promise as never);

        const { result } = renderQueue(queryClient);

        act(() => {
            result.current.toggleTask(PROJECT_ID, 10, 100);
        });

        // Two more clicks: odd total, so the task should end up done.
        await act(async () => {
            result.current.toggleTask(PROJECT_ID, 10, 100);
            result.current.toggleTask(PROJECT_ID, 10, 100);
        });

        await act(async () => {
            gate.resolve({ message: "ok" });
        });

        await waitFor(() => expect(mockedApi.put).toHaveBeenCalledTimes(2));

        const lastCall = mockedApi.put.mock.calls.at(-1)![1] as { status: boolean };
        expect(lastCall.status).toBe(true);
    });

    it("coalesces clicks in the same tick into a single request", async () => {
        const queryClient = freshClient();

        const { result } = renderQueue(queryClient);

        await act(async () => {
            result.current.toggleTask(PROJECT_ID, 10, 100);
            result.current.toggleTask(PROJECT_ID, 10, 101);
            result.current.toggleTask(PROJECT_ID, 20, 200);
        });

        await waitFor(() => expect(mockedApi.put).toHaveBeenCalledTimes(3));

        // One request per distinct task, not one per click.
        const taskIds = mockedApi.put.mock.calls.map((call) => (call[1] as { taskId: number }).taskId);
        expect(taskIds.sort()).toEqual([100, 101, 200]);
    });

    it("runs requests sequentially so same-feature toggles cannot race", async () => {
        const queryClient = freshClient();
        let inFlight = 0;
        let maxConcurrent = 0;

        mockedApi.put.mockImplementation(async () => {
            inFlight += 1;
            maxConcurrent = Math.max(maxConcurrent, inFlight);
            await Promise.resolve();
            inFlight -= 1;
            return { message: "ok" } as never;
        });

        const { result } = renderQueue(queryClient);

        await act(async () => {
            result.current.toggleTask(PROJECT_ID, 10, 100);
            result.current.toggleTask(PROJECT_ID, 10, 101);
        });

        await waitFor(() => expect(mockedApi.put).toHaveBeenCalledTimes(2));
        expect(maxConcurrent).toBe(1);
    });

    it("leaves the cache alone on success, with no refetch", async () => {
        const queryClient = freshClient();
        const { result } = renderQueue(queryClient);

        await act(async () => {
            result.current.toggleTask(PROJECT_ID, 10, 100);
        });

        await waitFor(() => expect(mockedApi.put).toHaveBeenCalledTimes(1));
        // Success must not trigger a resync fetch.
        expect(mockedApi.get).not.toHaveBeenCalled();
    });

    it("resyncs from the server when a toggle fails", async () => {
        const queryClient = freshClient();
        mockedApi.put.mockRejectedValue(new Error("boom") as never);
        mockedApi.get.mockResolvedValue(seedProject() as never);

        const { result } = renderQueue(queryClient);

        await act(async () => {
            result.current.toggleTask(PROJECT_ID, 10, 100);
        });

        await waitFor(() => expect(mockedApi.get).toHaveBeenCalledTimes(1));

        // Server is the source of truth again: the optimistic flip is gone.
        const cached = queryClient.getQueryData<projectType>(projectKeys.detail(PROJECT_ID))!;
        expect(cached.features[0].tasks[0].status).toBe(false);
    });

    it("does not clobber a newer click when an older request fails", async () => {
        const queryClient = freshClient();
        const gate = deferred<unknown>();
        mockedApi.put.mockReturnValueOnce(gate.promise as never);
        // The resync reports the task still incomplete, i.e. the server never
        // applied the first write.
        mockedApi.get.mockResolvedValue(seedProject() as never);

        const { result } = renderQueue(queryClient);

        act(() => {
            result.current.toggleTask(PROJECT_ID, 10, 100);
        });

        await act(async () => {
            result.current.toggleTask(PROJECT_ID, 10, 100);
        });

        await act(async () => {
            gate.reject(new Error("boom"));
        });

        await waitFor(() => expect(mockedApi.get).toHaveBeenCalled());

        // The second intent is still queued and gets sent after the failure.
        await waitFor(() => expect(mockedApi.put).toHaveBeenCalledTimes(2));
    });

    it("ignores a click for a task that is not in the cache", () => {
        const queryClient = freshClient();
        const { result } = renderQueue(queryClient);

        act(() => {
            result.current.toggleTask(PROJECT_ID, 10, 999);
        });

        expect(mockedApi.put).not.toHaveBeenCalled();
    });

    it("ignores a click when the project is not in the cache", () => {
        const queryClient = new QueryClient();
        const { result } = renderQueue(queryClient);

        act(() => {
            result.current.toggleTask(PROJECT_ID, 10, 100);
        });

        expect(mockedApi.put).not.toHaveBeenCalled();
    });

    it("returns the same queue instance across re-renders", () => {
        const queryClient = freshClient();
        const { result, rerender } = renderQueue(queryClient);

        const first = result.current;
        rerender();

        expect(result.current).toBe(first);
    });
});

describe("useTaskPending", () => {
    it("reports true only while a task's own request is in flight", async () => {
        const queryClient = freshClient();
        const gate = deferred<unknown>();
        mockedApi.put.mockReturnValue(gate.promise as never);

        const { result: queueResult } = renderQueue(queryClient);
        const queue = queueResult.current;

        const { result: pendingResult } = renderHook(
            () => useTaskPending(queue, 100),
            { wrapper: wrapper(queryClient) }
        );

        expect(pendingResult.current).toBe(false);

        await act(async () => {
            queue.toggleTask(PROJECT_ID, 10, 100);
        });

        await waitFor(() => expect(pendingResult.current).toBe(true));

        await act(async () => {
            gate.resolve({ message: "ok" });
        });

        await waitFor(() => expect(pendingResult.current).toBe(false));
    });

    it("does not mark a different task as pending", async () => {
        const queryClient = freshClient();
        const gate = deferred<unknown>();
        mockedApi.put.mockReturnValue(gate.promise as never);

        const { result: queueResult } = renderQueue(queryClient);
        const queue = queueResult.current;

        const { result: pendingResult } = renderHook(
            () => useTaskPending(queue, 101),
            { wrapper: wrapper(queryClient) }
        );

        await act(async () => {
            queue.toggleTask(PROJECT_ID, 10, 100);
        });

        expect(pendingResult.current).toBe(false);

        await act(async () => {
            gate.resolve({ message: "ok" });
        });
    });
});
