import useProject from "../hooks/useProject";
import { createContext } from "react";
import type { ReactNode } from "react";
import React from "react";
import type { action, projectType } from "../types/project";

export const ProjectsContext = createContext<{ state: { projects: projectType[] }, dispatch: React.Dispatch<action> } | null>(null);

export default function ProjectProvider({ children }: { children: ReactNode }) {

    const { state, dispatch } = useProject()

    return (
        <ProjectsContext.Provider value={{ state, dispatch }}>
            {children}
        </ProjectsContext.Provider>
    )
}