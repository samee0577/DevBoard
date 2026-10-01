import ProjectCard from "./projectCard";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query"
import { useGateway } from "../lib/gateway";
import { projectKeys } from "../lib/queryKeys";


export default function ProjectsList() {

    const [isOffline, setIsOffline] = useState<boolean>(() => !navigator.onLine)
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
            queryKey: projectKeys.list(),
            queryFn: async () => {
                if (!gateway.isSandbox && !navigator.onLine) {
                    throw new Error("NETWORK_OFFLINE")
                }
                return gateway.listProjects()
            }
        }
    )
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
    if (error) return <div><h1>sorry something went wrong , please try again</h1></div>

    return (
        <div>
            <h1 className="page-title">Projects</h1>

            {isLoading ? (
                <div className="dashboard-grid">
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
                <div className="dashboard-grid">
                    {projectData?.map((project) => (
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