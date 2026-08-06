import { useEffect, useRef, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import type { feature, task } from "../types/project";
import useDialog from "../hooks/useDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";


export function FeatureItem({ feature, ThisProjectId }: { feature: feature; ThisProjectId: number; }) {

    const client = useQueryClient();
    const { mutate: toggleTask, isPending } = useMutation({
        mutationFn: async (taskID: number) => {
            await fetch(`http://localhost:3001/api/projects/toggleTask`, {
                method: "PUT",
                headers: { "content-Type": "application/json" },
                body: JSON.stringify({ status: !feature.tasks.find(task => task.id === taskID)?.status, taskId: taskID, featureId: feature.id, projectId: ThisProjectId })
            }).then(res => res.json())
        },
        onMutate: async (taskID: number) => {
            await client.cancelQueries({ queryKey: ["projects", String(ThisProjectId)] });
            const previousProject = client.getQueryData(["projects", String(ThisProjectId)]);
            client.setQueryData(["projects", String(ThisProjectId)], (old: any) => {
                if (!old) return old;

                const updatedFeatures = old.features.map((f: feature) => {
                    if (f.id !== feature.id) return f;

                    const updatedTasks = f.tasks.map((t: task) =>
                        t.id === taskID ? { ...t, status: !t.status } : t
                    );

                    return {
                        ...f,
                        tasks: updatedTasks,
                        status: updatedTasks.every((t: task) => t.status)
                    };
                });

                const allTasks = updatedFeatures.flatMap((f: feature) => f.tasks);
                const total = allTasks.length;
                const completed = allTasks.filter((t: task) => t.status).length;
                const completion = total === 0 ? 0 : Math.round((completed / total) * 100);

                return {
                    ...old,
                    features: updatedFeatures,
                    completion: completion,
                };
            })
            return { previousProject };
        },
        onError: (_err, _taskId, context) => {
            if (context?.previousProject) {
                client.setQueryData(["projects", String(ThisProjectId)], context.previousProject);
            };
            toast.error("Error toggling task status");
        },
        onSettled() {
            client.invalidateQueries({ queryKey: ["projects", String(ThisProjectId)] })
        },
    })

    const { mutate: deleteFeature, isPending: isPendingDelete } = useMutation({
        mutationFn: async (featureId: number) => {
            await fetch(`http://localhost:3001/api/projects/${ThisProjectId}/features/${featureId}`, {
                method: "DELETE",
                headers: { "content-Type": "application/json" }
            }).then(res => res.json())
        },
        onSuccess: () => {
            client.invalidateQueries({ queryKey: ["projects"] });
            toast.success("Feature deleted successfully",
                {
                    position: "bottom-right",
                    autoClose: 2000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "light",
                }
            );
            closeDialog();
            setIsMenuOpen(false);
        },
        onError: () => {
            closeDialog();
            setIsMenuOpen(false);
            toast.error("Error deleting feature");
        }
    })

    const { mutate: updateFeature, isPending: isPendingEdit } = useMutation({
        mutationFn: async (updatedFeature: { title: string; tasks: { title: string; status: boolean }[] }) => {
            const res = await fetch(`http://localhost:3001/api/projects/${ThisProjectId}/features/${feature.id}`, {
                method: "PUT",
                headers: { "content-Type": "application/json" },
                body: JSON.stringify(updatedFeature)
            });

            if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            }

            return res.json();
        },
        onSuccess: () => {
            client.invalidateQueries({ queryKey: ["projects"] });
            toast.success("Feature updated successfully", {
                position: "bottom-right",
                autoClose: 2000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light",
            });
            closeEditDialog();
            setIsMenuOpen(false);
        },
        onError: () => {
            closeEditDialog();
            setIsMenuOpen(false);
            toast.error("Error updating feature");
        }
    })

    function handleToggle(taskId: number) {
        toggleTask(taskId)
    }

    function handleDeleteClick(featureId: number) {
        deleteFeature(featureId);
    }

    function handleOpenEdit() {
        setEditFeatureTitle(feature.title);
        setEditTasks(feature.tasks.map((taskItem) => ({
            id: taskItem.id,
            title: taskItem.title,
            status: taskItem.status,
        })));
        openEditDialog();
        setIsMenuOpen(false);
    }

    function handleSaveEdit() {
        const cleanedTitle = editFeatureTitle.trim();
        const cleanedTasks = editTasks
            .map((taskItem) => ({ ...taskItem, title: taskItem.title.trim() }))
            .filter((taskItem) => taskItem.title !== "");

        if (!cleanedTitle) {
            toast.error("Please enter a feature name");
            return;
        }

        if (cleanedTasks.length === 0) {
            toast.error("Please add at least one task");
            return;
        }

        updateFeature({
            title: cleanedTitle,
            tasks: cleanedTasks.map((taskItem) => ({
                title: taskItem.title,
                status: taskItem.status,
            })),
        });
    }

    const { dialogRef, openDialog, closeDialog } = useDialog();
    // const { dialogRef: taskDialogRef, openDialog: openTaskDialog, closeDialog: closeTaskDialog } = useDialog();
    const { dialogRef: editDialogRef, openDialog: openEditDialog, closeDialog: closeEditDialog } = useDialog();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [editFeatureTitle, setEditFeatureTitle] = useState(feature.title);
    const [editTasks, setEditTasks] = useState<{ id: number; title: string; status: boolean }[]>([]);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isMenuOpen]);

    return (
        <div style={{ alignSelf: "start" }}>
            <div style={{ position: "relative", height: "100%" }}>
                <div className="menuContainer" ref={menuRef}>
                    <button
                        type="button"
                        onClick={() => setIsMenuOpen((prev) => !prev)}
                        aria-label={`Options for ${feature.title}`}
                        className="menuButton"
                    >
                        &#8942;
                    </button>

                    {isMenuOpen && (
                        <div className="menuDropdown">
                            <button
                                type="button"
                                onClick={handleOpenEdit}
                                className="menuItemEdit"
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                onClick={openDialog}
                                className="menuItemDelete"
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </div>

                <div className="feature-wrapper">
                    <button
                        className="features"
                        onClick={() => setIsExpanded(!isExpanded)}
                        data-status={feature.status ? "true" : "false"}
                    >
                        {feature.title}
                    </button>
                    <div className={`tasks-container ${isExpanded ? "open" : ""}`}>
                        {feature.tasks.map((task) => (
                            <div key={task.id} className="task-item-wrapper">
                                <button
                                    className="task-item"
                                    data-status={task.status ? "true" : "false"}
                                    onClick={() => handleToggle(task.id)}
                                    disabled={isPending}>
                                    {task.title}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <dialog ref={editDialogRef} className="popup" onClose={closeEditDialog}>
                <form method="dialog" onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveEdit();
                }}>
                    <h2>Edit feature</h2>

                    <label className="popup-label">Feature title</label>
                    <input
                        type="text"
                        value={editFeatureTitle}
                        className="popup-input"
                        placeholder="Enter feature title"
                        onChange={(e) => setEditFeatureTitle(e.target.value)}
                    />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginTop: "12px" }}>
                        <label className="popup-label">Tasks</label>
                        <button
                            type="button"
                            className="popup-add-btn"
                            onClick={() => setEditTasks((prev) => [...prev, {
                                id: Date.now() + Math.floor(Math.random() * 1000),
                                title: "",
                                status: false,
                            }])}
                        >
                            + Add more task
                        </button>
                    </div>

                    <div className="popup-tasks-container">
                        {editTasks.map((taskItem, index) => (
                            <div key={taskItem.id ?? index} style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px", marginTop: "8px", position: "relative" }}>
                                <input
                                    type="text"
                                    value={taskItem.title}
                                    className="popup-input"
                                    placeholder={`Enter Task #${index + 1}`}
                                    onChange={(e) => {
                                        const updatedTasks = [...editTasks];
                                        updatedTasks[index] = { ...updatedTasks[index], title: e.target.value };
                                        setEditTasks(updatedTasks);
                                    }}
                                />
                                <button
                                    type="button"
                                    className="task-delete-button"
                                    onClick={() => setEditTasks((prev) => prev.filter((_, taskIndex) => taskIndex !== index))}
                                    aria-label="Remove task"
                                >
                                    🗑
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="popup-actions" style={{ marginTop: "20px" }}>
                        <button className="popup-btn-primary" type="submit" disabled={isPendingEdit}>
                            {isPendingEdit ? "Saving..." : "Save changes"}
                        </button>
                        <button className="popup-btn-secondary" type="button" onClick={closeEditDialog}>
                            Cancel
                        </button>
                    </div>
                </form>
            </dialog>

            <dialog ref={dialogRef} className="popup">
                <h2>Are you sure you want to delete {feature.title}?</h2>
                <div className="popup-actions">
                    <button className="popup-btn-primary" onClick={() => handleDeleteClick(feature.id)}>
                        {isPendingDelete ? "Deleting..." : "Delete feature"}
                    </button>
                    <button className="popup-btn-secondary" onClick={closeDialog}>
                        Close
                    </button>
                </div>
            </dialog>
            <ToastContainer />
        </div>
    );
}
