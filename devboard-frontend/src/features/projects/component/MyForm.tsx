import { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const inputStyle = {
    padding: "8px",
    fontSize: "18px",
    border: "1px solid black",
    borderRadius: 8,
};

import { validateProject, type NewProjectDraft } from "./myFormValidation";
export type { NewProjectDraft };

export default function MyForm() {

    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (newProject: NewProjectDraft) =>
            fetch(`${import.meta.env.VITE_API_URL}/api/projects`, {
                method: 'post',
                headers: { "content-Type": "application/json" },
                body: JSON.stringify(newProject)
            }).then(res => {
                if (!res.ok) {
                    throw new Error(`API error: ${res.status}`);
                }
                return res.json();
            }),
        onMutate: () => {
            const id = toast.loading("Creating project...");
            return { toastId: id };
        },
        onSuccess: (_data, _variables, context) => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            toast.update(context.toastId, {
                render: "Project created successfully!",
                type: "success",
                isLoading: false,
                autoClose: 1000,
                closeOnClick: true,
            });
            setNewProject({
                completion: 0,
                name: "",
                domain: "",
                summary: "",
                techStack: [""],
                features: [{ title: "", tasks: [""] }]
            });
        },
        onError: (_error, _variables, context) => {
            if (context?.toastId) {
                toast.update(context.toastId, {
                    render: "Failed to save project.",
                    type: "error",
                    isLoading: false,
                    autoClose: 1000,
                    closeOnClick: true,
                });
            } else {
                toast.error("Failed to save project.");
            }
        },
    });

    const [newProject, setNewProject] = useState<NewProjectDraft>({
        name: "",
        completion: 0,
        domain: "",
        summary: "",
        techStack: [""],
        features: [{ title: "", tasks: [""] }]
    });

    function handleSubmit() {

        if (!validateProject(newProject)) return;
        const cleanedProject = {
            ...newProject,
            techStack: newProject.techStack.filter(t => t.trim() !== ""),
            features: newProject.features.map(feature => ({
                ...feature,
                tasks: feature.tasks.filter(t => t.trim() !== "")
            }))
        };
        console.log("project submitted: ",cleanedProject);
        mutate(cleanedProject);
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        const { name, value } = e.target;
        setNewProject(prev => ({
            ...prev,
            [name]: value
        }));
    }

    const handleTechInput = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setNewProject(prev => ({
            ...prev,
            techStack: prev.techStack.map((tech, i) => i === index ? value : tech)
        }));
    };

    const handleFeatureInput = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setNewProject(prev => ({
            ...prev,
            features: prev.features.map((f, i) => i === index ? { ...f, title: value } : f)
        }));
    };

    const handleTaskInput = (index: number, taskIndex: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setNewProject(prev => ({
            ...prev,
            features: prev.features.map((f, i) => i === index ? {
                ...f,
                tasks: f.tasks.map((t, ti) => ti === taskIndex ? value : t)
            } : f)
        }));
    };

    function addNewTask(index: number) {
        setNewProject(prev => ({
            ...prev,
            features: prev.features.map((f, i) => i === index ? { ...f, tasks: [...f.tasks, ""] } : f)
        }));
    }

    function handleRemoveFeature(index: number) {
        setNewProject(prev => ({
            ...prev,
            features: prev.features.filter((_, i) => i !== index) // Cleaned up inline filter return
        }));
    }

    function handleRemoveTask(index: number, targetIndex: number) {
        setNewProject(prev => ({
            ...prev,
            features: prev.features.map((f, i) => i === index ? {
                ...f,
                tasks: f.tasks.filter((_, ti) => ti !== targetIndex)
            } : f)
        }));
    }

    function handleRemoveTech(index: number) {
        setNewProject(prev => ({
            ...prev,
            techStack: prev.techStack.filter((_, i) => i !== index)
        }));
    }

    return (
        <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "20px" }}>

                {/* Main Details Section */}
                <div style={{ paddingRight: "10px", display: "flex", flexDirection: "column", gap: "10px", borderRight: '1px solid #ccc' }}>
                    <label style={{ fontSize: "18px", marginTop: "10px" }}>Project Details</label>
                    <input style={inputStyle} name="name" placeholder="Name" value={newProject.name} onChange={handleInputChange} />
                    <input style={inputStyle} name="domain" placeholder="Domain" value={newProject.domain} onChange={handleInputChange} />
                    <textarea style={{ ...inputStyle, height: "100px" }} name="summary" placeholder="Summary" value={newProject.summary} onChange={handleInputChange} />
                </div>

                {/* Tech Stack Section */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", height: "fit-content", borderRight: '1px solid #ccc', paddingRight: "10px" }}>
                    <label style={{ fontSize: "18px" }}>Tech-Stack</label>
                    {newProject.techStack.map((stack, index) => (
                        <div key={`tech-${index}`} style={{ position: "relative" }}>
                            <input
                                value={stack}
                                onChange={handleTechInput(index)}
                                style={{ ...inputStyle, width: "100%" }}
                                placeholder="e.g. React"
                            />
                            {newProject.techStack.length > 1 && (
                                <button
                                    onClick={() => handleRemoveTech(index)}
                                    className="deleteButton"
                                    style={{ position: "absolute", top: "50%", right: "5px", transform: "translateY(-50%)", border: "none", cursor: "pointer" }}
                                >
                                    &times;
                                </button>
                            )}
                        </div>
                    ))}
                    <button type="button" className="allButton" onClick={() => setNewProject(prev => ({ ...prev, techStack: [...prev.techStack, ""] }))}>Add more Tech</button>
                </div>

                {/* Features Section */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <label style={{ fontSize: "18px" }}>Features</label>
                    {newProject.features.map((feature, index) => (
                        <div key={`feature-${index}`} style={{ padding: "20px", backgroundColor: "lightgray", borderRadius: "8px", position: "relative" }}>
                            {newProject.features.length > 1 && (
                                <button
                                    onClick={() => handleRemoveFeature(index)}
                                    className="deleteButton"
                                    style={{ position: "absolute", top: "5px", right: "5px", border: "none", cursor: "pointer" }}
                                >
                                    &times;
                                </button>
                            )}
                            <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                                <input
                                    value={feature.title}
                                    style={{ marginBottom: "10px", border: "none", background: "transparent", outline: "none", fontSize: "24px", fontWeight: "600", width: "90%" }}
                                    placeholder="Feature Title"
                                    onChange={handleFeatureInput(index)}
                                />
                                <button type="button" onClick={() => addNewTask(index)} style={{ fontSize: "18px", borderRadius: "5px" }}>+</button>
                            </div>

                            {feature.tasks.map((task, taskIndex) => (
                                <div key={`task-${index}-${taskIndex}`} style={{ display: "flex", gap: "10px", position: "relative" }}>
                                    <input
                                        style={{ ...inputStyle, width: "100%", marginBottom: "5px" }}
                                        type="text"
                                        placeholder="Enter task"
                                        value={task}
                                        onChange={handleTaskInput(index, taskIndex)}
                                    />
                                    {feature.tasks.length > 1 && (
                                        <button
                                            onClick={() => handleRemoveTask(index, taskIndex)}
                                            className="deleteButton"
                                            style={{ position: "absolute", right: "5px", top: "50%", transform: "translateY(-50%)", border: "none", cursor: "pointer" }}
                                        >
                                            &times;
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                    <button type="button" className="allButton" onClick={() => setNewProject(prev => ({ ...prev, features: [...prev.features, { title: "", tasks: [""] }] }))}>Add More Features</button>
                </div>
            </div>

            <ToastContainer position="bottom-left" autoClose={1000} />
            <button
                onClick={handleSubmit}
                className="allButton"
                style={{ marginBottom: "20px", padding: "10px" }}
                disabled={isPending}
            >
                {isPending ? "Creating project..." : "Create Project"}
            </button>
        </>
    );
}