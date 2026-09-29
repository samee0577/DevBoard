import { Outlet } from "react-router-dom"
import { ToastContainer } from "react-toastify"
import NavBar from "../features/projects/component/NavBar"

export default function DashboardLayout() {

    return (
        <>
            <NavBar />
            <hr style={{ marginTop: 15, margin: 5 }} />
            <Outlet />
            <ToastContainer position="bottom-right" autoClose={3000} />
        </>
    )
}
