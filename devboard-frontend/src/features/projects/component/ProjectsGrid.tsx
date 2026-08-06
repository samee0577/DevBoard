import ProjectCard from "./projectCard";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { projectType } from "../types/project";


export default function ProjectsList() {

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
            queryKey: ["projects"],
            queryFn: async () => {
                if (!navigator.onLine) {
                    throw new Error("NETWORK_OFFLINE")
                }
                const res = await fetch("http://localhost:3001/api/projects").then(res => res.json())
                return res
            }
        }
    )
    const hasNetworkError = isOffline ||
        (error instanceof Error && (
            error.message === "NETWORK_OFFLINE" ||
            error.message.includes("Failed to fetch") ||
            error.message.includes("NetworkError")
        ))

    const demoProject = async () => {
        try {
            await fetch("http://localhost:3001/api/projects", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: "demo",
                    completion: 0,
                    domain: "testing",
                    summary: "lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptatibus, quibusdam.",
                    techStack: ["react", "postgres", "claude"],
                    features: [{ title: "hello world feature", tasks: ["testing demo task", "another demo task"] }]
                })
            });
            window.location.reload();
        } catch (error) {
            console.error("Error creating demo project:", error);
        }
    }

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
    if (error) return <div><h1>{error.message}</h1></div>

    return (
        <div>
            <h1>Projects</h1>
            <Link to="/newProject">
                <button style={{ padding: "10px", margin: "10px", border: "1px solid black", borderRadius: 10, cursor: "pointer" }}>
                    Add New Project
                </button>
            </Link>
            <button onClick={demoProject} style={{ padding: "10px", margin: "10px", border: "2px solid red", borderRadius: 10, cursor: "pointer", backgroundColor: "white" }}>
                [demo button]
            </button>

            {isLoading ? <h1>loading projects</h1> :

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "15px" }}>
                    {projectData.map((project: projectType) => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                        />
                    ))}
                </div>
            }
        </div>
    );
}