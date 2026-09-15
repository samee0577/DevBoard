import { Outlet } from "react-router-dom"
import NavBar from "../features/projects/component/NavBar"

export default function RootLayout() {

    return (
        <div className="root-layout">
            <NavBar />
            <hr style={{ marginTop: 15, margin: 5 }} />
            <Outlet />
        </div>
    )
}