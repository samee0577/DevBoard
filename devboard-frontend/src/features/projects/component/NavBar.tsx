import { Link } from "react-router-dom"
import "../../../index.css"
import { useQuery } from "@tanstack/react-query"
import { toast } from "react-toastify"
import { useGateway } from "../lib/gateway"
import { projectKeys } from "../lib/queryKeys"
import { useSignOut } from "../../../hooks/useSignOut"

export default function Navbar() {

    const gateway = useGateway();

    const { data: projects, isLoading } = useQuery({
        queryKey: projectKeys.list(),
        queryFn: async () => await gateway.listProjects()
    })

    const { handleSignOut, isSigningOut, error: signOutError } = useSignOut()

    const onSignOut = async () => {
        await handleSignOut()
        if (signOutError) toast.error(signOutError)
    }

    return (
        <nav>
            <div>
                <h1>DEVBOARD</h1>
            </div>
            <div className="nav-links">
                <div style={{ display: "flex", flexDirection: "row", gap: "10px" }}>
                    <Link className="buttonStyle" to="/dashboard">Dashboard</Link>
                    <Link className="buttonStyle" to="/newProject">+ New Project</Link>
                </div>
                <div>
                    <button className="buttonStyle" type="button" onClick={onSignOut} disabled={isSigningOut}>
                        {isSigningOut ? "Signing out..." : "Sign Out"}
                    </button>
                </div>
            </div>
            {isLoading ? (
                <span>Total Projects: <span className="skeleton-badge"></span></span>
            ) : (
                <span>Total Projects: {projects?.length || 0}</span>
            )}
        </nav>
    )

}
