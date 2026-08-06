import { Link } from "react-router-dom"
import "../../../index.css"
import { useQuery } from "@tanstack/react-query"

export default function Navbar() {

    const { data: projects, isLoading } = useQuery({
        queryKey: ["projects"],
        queryFn: async () => await fetch("http://localhost:3001/api/projects").then(res => res.json())
    })

    return (
        <nav style={{ margin: "5px" }}>
            <div><h1>DEVBOARD</h1></div>
            <div style={{ display: "flex", flexDirection: "row", gap: "10px" }}>
                <Link className="buttonStyle" to="/">Dashboard</Link>
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