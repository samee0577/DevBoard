import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import type { Id } from "react-toastify";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { validateProject } from "../utils/validateProject";
import type { NewProjectDraft } from "../utils/validateProject";
import type { CreateProjectResponse } from "../types/project";
import { api } from "../lib/api";
import { invalidateProjects } from "../lib/queryKeys";

export default function MyForm() {

    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { mutate, isPending } = useMutation<CreateProjectResponse, Error, NewProjectDraft, { toastId: Id }>({
        mutationFn: (newProject: NewProjectDraft) =>
            api.post("/api/projects", newProject),
        onMutate: () => {
            const id = toast.loading("Creating project...");
            return { toastId: id };
        },
        onSuccess: (data, _variables, context) => {
            invalidateProjects(queryClient);
            toast.update(context.toastId, {
                render: "Project created successfully!",
                type: "success",
                isLoading: false,
                autoClose: 1000,
                closeOnClick: true,
            });
            navigate(data?.projectId ? `/projectDetail/${data.projectId}` : "/dashboard");
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
            <div className="new-project-grid">

                {/* Main Details Section */}
                <div className="new-project-col new-project-col--details">
                    <label className="new-project-label">Project Details</label>
                    <input className="new-project-input" name="name" placeholder="Name" value={newProject.name} onChange={handleInputChange} />
                    <input className="new-project-input" name="domain" placeholder="Domain" value={newProject.domain} onChange={handleInputChange} />
                    <textarea className="new-project-input new-project-input--summary" name="summary" placeholder="Summary" value={newProject.summary} onChange={handleInputChange} />
                </div>

                {/* Tech Stack Section */}
                <div className="new-project-col new-project-col--tech">
                    <label className="new-project-label">Tech-Stack</label>
                    {newProject.techStack.map((stack, index) => (
                        <div key={`tech-${index}`} className="new-project-tech-row">
                            <input
                                value={stack}
                                onChange={handleTechInput(index)}
                                className="new-project-input new-project-input--full"
                                placeholder="e.g. React"
                            />
                            {newProject.techStack.length > 1 && (
                                <button
                                    onClick={() => handleRemoveTech(index)}
                                    className="deleteButton new-project-remove"
                                >
                                    &times;
                                </button>
                            )}
                        </div>
                    ))}
                    <button type="button" className="allButton" onClick={() => setNewProject(prev => ({ ...prev, techStack: [...prev.techStack, ""] }))}>Add more Tech</button>
                </div>

                {/* Features Section */}
                <div className="new-project-col">
                    <label className="new-project-label">Features</label>
                    {newProject.features.map((feature, index) => (
                        <div key={`feature-${index}`} className="new-project-feature-card">
                            {newProject.features.length > 1 && (
                                <button
                                    onClick={() => handleRemoveFeature(index)}
                                    className="deleteButton new-project-remove-feature"
                                >
                                    &times;
                                </button>
                            )}
                            <div className="new-project-feature-head">
                                <input
                                    value={feature.title}
                                    className="new-project-feature-title"
                                    placeholder="Feature Title"
                                    onChange={handleFeatureInput(index)}
                                />
                                <button type="button" onClick={() => addNewTask(index)} className="new-project-add-task">+</button>
                            </div>

                            {feature.tasks.map((task, taskIndex) => (
                                <div key={`task-${index}-${taskIndex}`} className="new-project-task-row">
                                    <input
                                        className="new-project-input new-project-input--task"
                                        type="text"
                                        placeholder="Enter task"
                                        value={task}
                                        onChange={handleTaskInput(index, taskIndex)}
                                    />
                                    {feature.tasks.length > 1 && (
                                        <button
                                            onClick={() => handleRemoveTask(index, taskIndex)}
                                            className="deleteButton new-project-remove"
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

            <button
                onClick={handleSubmit}
                className="allButton"
                disabled={isPending}
            >
                {isPending ? "Creating project..." : "Create Project"}
            </button>
        </>
    );
}