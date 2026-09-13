import { toast } from "react-toastify";

export type NewProjectDraft = {
    name: string;
    completion?: number;
    domain: string;
    summary: string;
    techStack: string[];
    features: { title: string; tasks: string[] }[];
};

export function validateProject(draft: NewProjectDraft): boolean {
    // Check core project fields first
    if (draft.name.trim() === "") {
        toast.error("Project name is required");
        return false; // Stop right here so the user isn't spammed
    }
    if (draft.domain.trim() === "") {
        toast.error("Domain name is required");
        return false;
    }
    if (draft.summary.trim() === "") {
        toast.error("Project summary is required");
        return false;
    }

    // Check if tech stack has valid values
    const cleanTech = draft.techStack.filter(t => t.trim() !== "");
    if (cleanTech.length === 0) {
        toast.error("tech stack items cannot be empty");
        return false;
    }

    // Check features array structure
    if (draft.features.length === 0) {
        toast.error("Add at least one feature block");
        return false;
    }

    // Validate deep nested elements (Features & Tasks)
    for (let i = 0; i < draft.features.length; i++) {
        const feature = draft.features[i];

        if (feature.title.trim() === "") {
            toast.error(`Feature block #${i + 1} is missing a title`);
            return false;
        }

        const cleanTasks = feature.tasks.filter(t => t.trim() !== "");
        if (cleanTasks.length === 0) {
            toast.error(`Feature "${feature.title}" needs at least one task description`);
            return false;
        }
    }

    return true; // Everything looks pristine!
}
