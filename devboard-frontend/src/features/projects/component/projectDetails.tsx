// import { ProjectsContext } from "../context/projectContext"
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import FeatureList from "./FeatureList"
import StackList from "./TechList"
import { MyProgress } from "./ProgressBar"
import { toast } from "react-toastify"
import useDialog from "../hooks/useDialog"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export default function ProjectDetails() {

    const { projectId } = useParams()
    const [isOffline, setIsOffline] = useState<boolean>(() => !navigator.onLine)

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
            queryKey: ["projects", projectId],
            queryFn: async () => {
                if (!navigator.onLine) {
                    throw new Error("NETWORK_OFFLINE")
                }

                const res = await fetch(`http://localhost:3001/api/projects/${projectId}`)

                if (!res.ok) {
                    throw new Error(`Request failed with status ${res.status}`)
                }
                return res.json()
            }
        }
    )

    const queryClient = useQueryClient()

    const { mutate, isPending } = useMutation({

        mutationFn: async (editProjectData: { projectId: number, name: string, summary: string, domain: string, techStack: string[] }) => {
            if (!navigator.onLine) {
                throw new Error("NETWORK_OFFLINE")
            }

            const res = await fetch("http://localhost:3001/api/projects", {
                method: 'put',
                headers: { "content-Type": "application/json" },
                body: JSON.stringify(editProjectData)
            })

            if (!res.ok) {
                throw new Error(`API error: ${res.status}`)
            }

            return res.json()
        },
        onMutate: () => {
            const id = toast.loading("Updating project...")
            return { toastId: id }
        },
        onSuccess: (_data, _variables, context) => {
            queryClient.invalidateQueries({ queryKey: ["projects"] })

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
            if (!navigator.onLine) {
                throw new Error("NETWORK_OFFLINE")
            }

            const res = await fetch(`http://localhost:3001/api/projects/${projectId}/features`, {
                method: 'put',
                headers: { "content-Type": "application/json" },
                body: JSON.stringify(featureData)
            })

            if (!res.ok) {
                throw new Error(`API error: ${res.status}`)
            }
            return res.json()
        },
        onMutate: () => {
            const id = toast.loading("Adding feature...")
            return { toastId: id }
        },
        onSuccess: (_data, _variables, context) => {
            queryClient.invalidateQueries({ queryKey: ["projects"] })
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
        features: string[]
    }
    interface featureInterface {
        title: string,
        tasks: string[]
    }
    const [feature, setfeature] = useState<featureInterface>({ title: "", tasks: [""] })
    const [editProject, setEditProject] = useState<editProjectType>({
        name: "",
        summary: "",
        domain: "",
        techStack: [],
        completion: 0,
        features: [],
    });

    const { dialogRef, openDialog, closeDialog } = useDialog();
    const { dialogRef: editDialogRef, openDialog: openEditDialog, closeDialog: closeEditDialog } = useDialog();

    const hasNetworkError = isOffline ||
        (error instanceof Error && (
            error.message === "NETWORK_OFFLINE" ||
            error.message.includes("Failed to fetch") ||
            error.message.includes("NetworkError")
        ))
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
            features: ThisProject.features,
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

    function handleAddNew(feature: featureInterface) {
        if (ThisProject === undefined) return

        if (feature.title.trim() === '') {
            toast.error("Please enter a feature name")
            return
        }

        if (feature.tasks.length === 0) {
            toast.error("Please add at least one task")
            return
        }

        if (!navigator.onLine) {
            toast.error("No network connection. Please check your internet connection and try again.")
            return
        }

        addFeature(feature)
        setfeature({ title: "", tasks: [""] })
        // toast.success("Feature added successfully")
        // closeDialog()
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
                <div style={{ borderRight: "1px solid #999", paddingRight: "20px", marginRight: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", flexDirection: "row", gap: "20px" }}>
                            <h1 style={{ width: "auto" }}>{ThisProject.name}</h1>
                            <button className="edit" onClick={handleOpenEdit}>Edit</button>

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
                    <h2 style={{ marginTop: "0px", fontWeight: "400" }}>{ThisProject.domain}</h2>
                    <h2>Summary:</h2>{ThisProject.summary}
                    <StackList techStack={ThisProject.techStack} />
                </div>
                <div style={{ marginRight: "20px" }}>
                    <FeatureList ThisProject={ThisProject} />
                    <button className="allButton" style={{ marginTop: "10px", width: "100%" }} onClick={openDialog}>Add New feature</button>
                    <dialog ref={dialogRef} className="popup" onClose={closeDialog}>
                        <form method="dialog" onSubmit={(e) => { e.preventDefault(); handleAddNew(feature) }}>
                            <h2>Add New Feature</h2>
                            {/* Updated Wrapper Class for scrolling/spacing */}
                            <div className="popup-tasks-container">
                                <input
                                    type="text"
                                    value={feature.title}
                                    className="popup-feature-input"
                                    placeholder="Enter feature name"
                                    onChange={(e) => setfeature({ ...feature, title: e.target.value })}
                                />

                                <div style={{ display: "flex", justifyContent: "space-between",alignItems:"center"}}>
                                    <p style={{}}>Tasks:</p>
                                    {/* Updated Button Class */}
                                    <button
                                        type="button"
                                        className="popup-add-btn"
                                        onClick={() => setfeature({ ...feature, tasks: [...feature.tasks, ""] })}
                                    >
                                        + Add more task
                                    </button>
                                </div>
                                {
                                    feature.tasks.map((_, index) => (
                                        <input
                                            key={index}
                                            type="text"
                                            value={feature.tasks[index]}
                                            className="popup-input"
                                            placeholder={`Enter Task #${index + 1}`}
                                            onChange={(e) => {
                                                const updatedTasks = [...feature.tasks];
                                                updatedTasks[index] = e.target.value;
                                                setfeature({ ...feature, tasks: updatedTasks });
                                            }}
                                        />
                                    ))
                                }
                            </div>

                            <div className="popup-actions">
                                <button className="popup-btn-primary" type="submit">
                                    {addFeaturePending ? "Adding..." : "Add feature"}
                                </button>
                                <button className="popup-btn-secondary" type="button" onClick={closeDialog}>
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
