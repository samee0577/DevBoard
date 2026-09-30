import { useTaskPending, type TaskToggleQueue } from "../hooks/useTaskToggle";

export function TaskToggleButton({
    taskId,
    title,
    status,
    featureId,
    projectId,
    toggleQueue,
}: {
    taskId: number;
    title: string;
    status: boolean;
    featureId: number;
    projectId: number;
    toggleQueue: TaskToggleQueue;
}) {
    const isSyncing = useTaskPending(toggleQueue, taskId);

    return (
        <button
            className="task-item"
            data-status={status ? "true" : "false"}
            data-syncing={isSyncing ? "true" : "false"}
            onClick={() => toggleQueue.toggleTask(projectId, featureId, taskId)}
            aria-busy={isSyncing}
        >
            {title}
        </button>
    );
}
