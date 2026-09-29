import { Link } from "react-router-dom"
import "../../../index.css"
import { useQuery } from "@tanstack/react-query"
import { api } from "../lib/api"

export default function Navbar() {

    const { data: projects, isLoading } = useQuery({
        queryKey: ["projects"],
        queryFn: async () => await api.get("/api/projects")
    })

    return (
        <nav>
            <div>
                <h1>DEVBOARD</h1>
            </div>
            <div style={{ display: "flex", flexDirection: "row", gap: "10px" }}>
                <Link className="buttonStyle" to="/dashboard">Dashboard</Link>
                <Link className="buttonStyle" to="/newProject">+ New Project</Link>
            </div>
            {isLoading ? (
                <span>Total Projects: <span className="skeleton-badge"></span></span>
            ) : (
                <span>Total Projects: {projects?.length || 0}</span>
            )}
        </nav>
    )

}