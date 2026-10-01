import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import FeatureList from "./FeatureList"
import StackList from "./TechList"
import { MyProgress } from "./ProgressBar"
import { toast } from "react-toastify"
import useDialog from "../hooks/useDialog"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useGateway } from "../lib/gateway"
import { invalidateProjects, projectKeys } from "../lib/queryKeys"
import { useTaskToggleQueue } from "../hooks/useTaskToggle"

export default function ProjectDetails() {

    const { projectId } = useParams()
    const [isOffline, setIsOffline] = useState<boolean>(() => !navigator.onLine)
    const toggleQueue = useTaskToggleQueue()
    const gateway = useGateway()

    useEffect(() => {
        const handleOnline = () => setIsOffline(false)
        const handleOffline = () => setIsOffline(true)

        window.addEventListener("online", handleOnline)
        window.addEventListener("offline", handleOffline)

        return () => {
            window.removeEventListener("online", handleOnline)
            window.removeEventListener("offline", handleOffline)
        }
    }, [])

    const { data: projectData, isLoading, error } = useQuery(
        {
            queryKey: projectKeys.detail(projectId!),
            // With the default staleTime of 0, refetchOnWindowFocus can replace the
            // cache mid-toggle. A short staleTime keeps focus refetches from yanking
            // state out from under an in-flight optimistic write.
            staleTime: 30_000,
            queryFn: async () => {
                // The sandbox serves local data, so an offline guest is not an error
                // state there and must not be short-circuited to an error.
                if (!gateway.isSandbox && !navigator.onLine) {
                    throw new Error("NETWORK_OFFLINE")
                }

                // deriveProject runs inside each gateway's getProject, so the
                // denormalised aggregates are re-derived on the way in here too and a
                // stale completion or feature status never reaches the UI.
                return gateway.getProject(projectId!)
            }
        }
    )

    const queryClient = useQueryClient()

    const { mutate, isPending } = useMutation({

        mutationFn: async (editProjectData: { projectId: number, name: string, summary: string, domain: string, techStack: string[] }) => {
            if (!gateway.isSandbox && !navigator.onLine) {
                throw new Error("NETWORK_OFFLINE")
            }

            await gateway.editProject(editProjectData)
        },
        onMutate: () => {
            const id = toast.loading("Updating project...")
            return { toastId: id }
        },
        onSuccess: (_data, _variables, context) => {
            invalidateProjects(queryClient)

            if (context?.toastId) {
                toast.update(context.toastId, {
                    render: "Project updated successfully!",
                    type: "success",
                    isLoading: false,
                    autoClose: 1000,
                    closeOnClick: true,
                })
            } else {
                toast.success("Project updated successfully!")
            }

            closeEditDialog()
        },
        onError: (error, _variables, context) => {
            const message = error instanceof Error && error.message === "NETWORK_OFFLINE"
                ? "No network connection. Please check your internet connection and try again."
                : "Failed to save project."

            if (context?.toastId) {
                toast.update(context.toastId, {
                    render: message,
                    type: "error",
                    isLoading: false,
                    autoClose: 1000,
                    closeOnClick: true,
                })
            } else {
                toast.error(message)
            }
        }
    })

    const { mutate: addFeature, isPending: addFeaturePending } = useMutation({
        mutationFn: async (featureData: featureInterface) => {
            if (!gateway.isSandbox && !navigator.onLine) {
                throw new Error("NETWORK_OFFLINE")
            }

            return await gateway.addFeature(projectId!, featureData)
        },
        onMutate: () => {
            const id = toast.loading("Adding feature...")
            return { toastId: id }
        },
        onSuccess: (_data, _variables, context) => {
            invalidateProjects(queryClient)
            closeDialog()

            if (context?.toastId) {
                toast.update(context.toastId, {
                    render: "Feature added successfully!",
                    type: "success",
                    isLoading: false,
                    autoClose: 1000,
                    closeOnClick: true,
                })
            } else {
                toast.success("Feature added successfully!")
            }

        },
        onError: (error, _variables, context) => {
            const message = error instanceof Error && error.message === "NETWORK_OFFLINE"
                ? "No network connection. Please check your internet connection and try again."
                : "Failed to add feature."
            closeDialog()

            if (context?.toastId) {
                toast.update(context.toastId, {
                    render: message,
                    type: "error",
                    isLoading: false,
                    autoClose: 1000,
                    closeOnClick: true,
                })
            } else {
                toast.error(message)
            }

        }
    })



    interface editProjectType {
        name: string,
        summary: string,
        domain: string,
        techStack: string[],
        completion: number,
    }
    interface featureInterface {
        title: string,
        tasks: string[]
    }
    const [feature, setfeature] = useState<featureInterface>({ title: "", tasks: [""] })
    // Field-level validation state for the "Add New Feature" dialog. The task
    // fields are tracked by index so each empty input can be highlighted on its
    // own instead of relying on a single transient toast.
    const [titleError, setTitleError] = useState<string | null>(null)
    const [errorTaskIndexes, setErrorTaskIndexes] = useState<number[]>([])
    const [taskError, setTaskError] = useState<string | null>(null)
    const [editProject, setEditProject] = useState<editProjectType>({
        name: "",
        summary: "",
        domain: "",
        techStack: [],
        completion: 0,
    });

    const { dialogRef, openDialog, closeDialog } = useDialog();
    const { dialogRef: editDialogRef, openDialog: openEditDialog, closeDialog: closeEditDialog } = useDialog();

    // A guest offline is expected, not a fault, so the sandbox never enters this state.
    const hasNetworkError = !gateway.isSandbox && (isOffline ||
        (error instanceof Error && (
            error.message === "NETWORK_OFFLINE" ||
            error.message.includes("Failed to fetch") ||
            error.message.includes("NetworkError")
        )))
    if (hasNetworkError) {
        return (
            <div style={{
                minHeight: "60vh",
                display: "grid",
                placeItems: "center",
                textAlign: "center",
                padding: "24px"
            }}>
                <div>
                    <h2>No network connection</h2>
                    <p>Please check your internet connection and try again.</p>
                    <button className="allButton" onClick={() => window.location.reload()}>
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    if (isLoading) { return <div>Loading details please wait...</div> }
    if (error) { return <div>{error.message}</div> }
    if (!projectData) { return <div>No project detail found!</div> }

    const ThisProject = projectData

    function handleOpenEdit() {

        setEditProject({
            name: ThisProject.name,
            summary: ThisProject.summary,
            domain: ThisProject.domain,
            techStack: ThisProject.techStack.map((s: { name: string }) => { return s.name }),
            completion: ThisProject.completion,
        })
        openEditDialog()
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {

        const { name, value } = e.target

        setEditProject((prev) => ({
            ...prev,
            [name]: value
        }))
    }

    const handleTechStackChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTechStack = [...editProject.techStack]
        newTechStack[index] = e.target.value
        setEditProject({ ...editProject, techStack: newTechStack })
    }

    function resetFeatureForm() {
        setfeature({ title: "", tasks: [""] })
        setTitleError(null)
        setErrorTaskIndexes([])
        setTaskError(null)
    }

    function handleAddNew(feature: featureInterface) {
        if (ThisProject === undefined) return

        const cleanedTitle = feature.title.trim()
        const trimmedTasks = feature.tasks.map((task) => task.trim())
        // Indexes of inputs the user left blank, so only the offending fields
        // get highlighted instead of the whole list.
        const emptyIndexes = trimmedTasks
            .map((task, index) => (task === "" ? index : -1))
            .filter((index) => index !== -1)
        const cleanedTasks = trimmedTasks.filter((task) => task !== "")

        if (cleanedTitle === "") {
            setTitleError("Please enter a feature name")
            setErrorTaskIndexes([])
            setTaskError(null)
            return
        }
        setTitleError(null)

        if (cleanedTasks.length === 0) {
            setErrorTaskIndexes(feature.tasks.map((_, index) => index))
            setTaskError("Please add at least one task")
            return
        }

        if (emptyIndexes.length > 0) {
            setErrorTaskIndexes(emptyIndexes)
            setTaskError("Remove the empty task fields or fill them in")
            return
        }

        setErrorTaskIndexes([])
        setTaskError(null)

        if (!gateway.isSandbox && !navigator.onLine) {
            toast.error("No network connection. Please check your internet connection and try again.")
            return
        }

        addFeature({ title: cleanedTitle, tasks: cleanedTasks })
        resetFeatureForm()
    }

    function handleEdit() {
        if (ThisProject === undefined) return

        const nonEmptyTechStack = editProject.techStack.map(stack => stack.trim()).filter(name => name !== '')

        setEditProject(prev => ({
            ...prev,
            techStack: nonEmptyTechStack
        }));

        mutate({
            projectId: ThisProject.id,
            name: editProject?.name,
            summary: editProject?.summary,
            domain: editProject?.domain,
            techStack: nonEmptyTechStack
        })
    }

    function newStack() {
        setEditProject({ ...editProject, techStack: [...editProject.techStack, ""] })
    }

    return (
        <>
            <div className="project-grid-container">
                <div className="project-details-main">
                    <div className="project-header-row">
                        <div className="project-header-left">
                            <div className="project-title-group">
                                <h1 className="project-title">{ThisProject.name}</h1>
                                <button className="buttonStyle" onClick={handleOpenEdit}>Edit</button>
                            </div>
                            <span className="projectDomain">{ThisProject.domain}</span>

                            <dialog ref={editDialogRef} className="popup" onClose={closeEditDialog} >
                                <form method="dialog" onSubmit={(e) => { e.preventDefault(); handleEdit() }}>
                                    <h2>Edit Project</h2>

                                    <label className="popup-label">Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={editProject.name}
                                        className="popup-input"
                                        placeholder="Enter Project Name"
                                        onChange={handleInputChange}
                                    />

                                    <label className="popup-label">Domain</label>
                                    <input
                                        type="text"
                                        name="domain"
                                        value={editProject.domain}
                                        className="popup-input"
                                        placeholder="Enter Project Domain"
                                        onChange={handleInputChange}
                                    />

                                    <label className="popup-label">Summary</label>
                                    <textarea
                                        name="summary"
                                        value={editProject.summary}
                                        className="popup-input"
                                        style={{ minHeight: "100px" }}
                                        placeholder="Enter Project Summary"
                                        onChange={handleInputChange}
                                    />

                                    <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", padding: "5px", marginRight: "10px", marginBottom: "5px" }}>
                                        <label className="popup-label">Tech Stack</label>
                                        <button type="button" onClick={newStack}>+</button>
                                    </div>
                                    <div className="techStack-container">
                                        {editProject.techStack.map((stack, index) => {
                                            return (
                                                <input
                                                    className="popup-input"
                                                    key={index}
                                                    type="text"
                                                    value={stack}
                                                    placeholder="Enter Tech Stack"
                                                    onChange={handleTechStackChange(index)}
                                                />
                                            )
                                        })}
                                    </div>
                                    <div className="popup-actions" style={{ marginTop: "20px" }}>
                                        <button className="popup-btn-primary" type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save"}</button>
                                        <button className="popup-btn-secondary" type="button" onClick={closeEditDialog}>Cancel</button>
                                    </div>
                                </form>
                            </dialog>
                        </div>
                        <MyProgress completion={ThisProject.completion} />
                    </div>
                    <StackList techStack={ThisProject.techStack} />
                    <h2 className="field-label">Summary:</h2><p>{ThisProject.summary}</p>
                </div>
                <div className="project-details-features">
                    <FeatureList ThisProject={ThisProject} toggleQueue={toggleQueue} />
                    <button className="allButton" style={{ marginTop: "15px", width: "100%", minHeight: "44px" }} onClick={openDialog}>Add New feature</button>
                    <dialog ref={dialogRef} className="popup" onClose={() => { resetFeatureForm(); closeDialog(); }}>
                        <form method="dialog" onSubmit={(e) => { e.preventDefault(); handleAddNew(feature) }} noValidate>
                            <h2>Add New Feature</h2>
                            <div className="popup-tasks-container">
                                <input
                                    type="text"
                                    value={feature.title}
                                    className={`popup-feature-input${titleError ? " invalid" : ""}`}
                                    placeholder="Enter feature name"
                                    aria-invalid={titleError ? true : undefined}
                                    aria-label="Feature name"
                                    onChange={(e) => {
                                        setfeature({ ...feature, title: e.target.value })
                                        if (titleError && e.target.value.trim() !== "") setTitleError(null)
                                    }}
                                />
                                {titleError && <p className="popup-error-text" role="alert">{titleError}</p>}

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                                    <p style={{ fontWeight: 600 }}>Tasks:</p>
                                    <button
                                        type="button"
                                        className="popup-add-btn"
                                        onClick={() => setfeature({ ...feature, tasks: [...feature.tasks, ""] })}
                                    >
                                        + Add more task
                                    </button>
                                </div>
                                {
                                    feature.tasks.map((_, index) => {
                                        const isErrored = errorTaskIndexes.includes(index)
                                        return (
                                            <div
                                                key={index}
                                                className="popup-task-row"
                                                data-invalid={isErrored ? "true" : undefined}
                                            >
                                                <input
                                                    type="text"
                                                    value={feature.tasks[index]}
                                                    className={`popup-input${isErrored ? " invalid" : ""}`}
                                                    placeholder={`Enter Task #${index + 1}`}
                                                    aria-invalid={isErrored ? true : undefined}
                                                    aria-label={`Task ${index + 1}`}
                                                    onChange={(e) => {
                                                        const updatedTasks = [...feature.tasks];
                                                        updatedTasks[index] = e.target.value;
                                                        setfeature({ ...feature, tasks: updatedTasks });
                                                        if (isErrored) {
                                                            const filled = updatedTasks.map((task, i) => task.trim() === "" ? -1 : i).filter((i) => i !== -1)
                                                            setErrorTaskIndexes(filled)
                                                            if (filled.length > 0) setTaskError(null)
                                                        }
                                                    }}
                                                />
                                                {feature.tasks.length > 1 && (
                                                    <button
                                                        type="button"
                                                        className="task-remove-button"
                                                        onClick={() => {
                                                            setfeature({ ...feature, tasks: feature.tasks.filter((_, taskIndex) => taskIndex !== index) })
                                                            setErrorTaskIndexes([])
                                                            setTaskError(null)
                                                        }}
                                                        aria-label={`Remove task ${index + 1}`}
                                                    >
                                                        &times;
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })
                                }
                                {taskError && <p className="popup-error-text" role="alert">{taskError}</p>}
                            </div>

                            <div className="popup-actions">
                                <button className="popup-btn-primary" type="submit" disabled={addFeaturePending}>
                                    {addFeaturePending ? "Adding..." : "Add feature"}
                                </button>
                                <button className="popup-btn-secondary" type="button" onClick={resetFeatureForm}>
                                    Close
                                </button>
                            </div>
                        </form>
                    </dialog>
                </div>
            </div >
        </>
    )
} 
