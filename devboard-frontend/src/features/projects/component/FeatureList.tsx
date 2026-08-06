import type { projectType } from "../types/project";
import { ToastContainer } from "react-toastify";
import "../../../index.css"
import { FeatureItem } from "./FeatureItem";

export default function FeatureList({ ThisProject }: { ThisProject: projectType }) {
    return (
        <>
            <h2>Tasks:</h2>
            <div style={{ display: "grid", gap: "10px" , gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))"}}>
                {ThisProject?.features.map((feature) =>
                    <FeatureItem feature={feature} ThisProjectId={ThisProject.id} key={feature.id} />
                )}
            </div>
            <ToastContainer />
        </>
    )
}