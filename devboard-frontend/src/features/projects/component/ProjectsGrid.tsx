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
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects`).then(res => res.json())
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
            await fetch(`${import.meta.env.VITE_API_URL}/api/projects`, {
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
    if (error) return <div><h1>sorry something went wrong , please try again</h1></div>

    return (
        <div>
            <h1>Projects</h1>
            <Link to="/newProject">
                <button className="buttonStyle" style={{ padding: "10px 15px", margin: "10px", cursor: "pointer", display: "inline-block" }}>
                    Add New Project
                </button>
            </Link>
            <button className="buttonStyle" onClick={demoProject} style={{ display:"none", padding: "10px 15px", margin: "10px", border: "2px solid red", color: "red", cursor: "pointer", backgroundColor: "white" }}>
                [demo button]
            </button>

            {isLoading ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "15px" }}>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                        <div key={n} className="project-card skeleton-card">
                            <div style={{ display: "grid", gridTemplateColumns: "4fr 1fr", gap: "10px", marginBottom: "12px" }}>
                                <div className="skeleton-line" style={{ height: "24px", width: "70%" }}></div>
                                <div className="skeleton-circle" style={{ width: "40px", height: "40px", justifySelf: "end" }}></div>
                            </div>
                            <div className="skeleton-line" style={{ height: "16px", width: "90%", marginTop: "8px" }}></div>
                            <div className="skeleton-line" style={{ height: "16px", width: "60%", marginTop: "6px" }}></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "15px" }}>
                    {projectData?.map((project: projectType) => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}