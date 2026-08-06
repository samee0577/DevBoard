import { Link } from "react-router-dom";
import type { projectType } from "../types/project";
import { MyProgress } from "./ProgressBar";
import { useState, useRef, useEffect } from "react";
import useDialog from "../hooks/useDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

export default function ProjectCard({ project }: { project: projectType }) {

    const queryClient =useQueryClient();
    const { mutate, isPending } = useMutation({

        mutationFn: async (projectId: number) => {
            await fetch(`http://localhost:3001/api/projects/delete/${projectId}`, {
                method: "DELETE"
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast.success("Project deleted successfully!");
            queryClient.invalidateQueries({ queryKey: ["projects"] })
            closeDialog();
        },
        onError: (error: any) => {
            console.error("Error deleting project:", error);
            alert("Failed to delete the project. Please try again.");
            toast.error("Failed to delete the project.");
        }
    });

    const { dialogRef, openDialog, closeDialog } = useDialog();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Toggle menu dropdown
    const toggleMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsMenuOpen((prev) => !prev);
    };

    // Open confirmation dialog and close dropdown menu
    const handleDeleteClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsMenuOpen(false);
        openDialog();
    };

    // Close menu automatically if user clicks anywhere outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isMenuOpen]);

    return (
        <>
            <dialog ref={dialogRef} className="popup">
                <p className="popupText">Are you sure you want to delete "{project.name}"?</p>
                <div className="popup-actions">
                    <button type="button" 
                        className="popup-btn-primary"
                        disabled={isPending} 
                        onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        mutate(project.id);
                    }}>{isPending?"Deleting...":"Confirm"}</button>
                    <button type="button" className="popup-btn-secondary" onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        closeDialog();
                    }}>Cancel</button>
                </div>
            </dialog>

            <div style={{
                padding: "15px",
                margin: "5px",
                border: "1px solid #ccc",
                borderRadius: 10,
                position: "relative",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
            }}>

                {/* Three-Dot Menu Container */}
                <div className="menuContainer" ref={menuRef}>
                    <button
                        type="button"
                        onClick={toggleMenu}
                        aria-label={`Options for ${project.name}`}
                        className="menuButton"
                    >
                        &#8942; {/* Vertical Three-Dot Symbol (⋮) */}
                    </button>

                    {/* Popover Dropdown */}
                    {isMenuOpen && (
                        <div className="menuDropdown">
                            <button
                                type="button"
                                onClick={handleDeleteClick}
                                className="menuItemDelete"
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </div>

                <Link to={`/projectDetail/${project.id}`} style={{ textDecoration: "none", color: "black" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "4fr 1fr", gap: "10px", paddingRight: "20px" }}>
                        <h2 style={{ margin: "0 0 10px 0", fontSize: "1.25rem" }}>{project.name}</h2>
                        <MyProgress completion={project.completion} />
                    </div>
                    <p style={{ margin: 0, color: "#555" }}>summary: {project.summary}</p>
                </Link>
            </div>
        </>
    );
}