import type { projectType } from "../types/project";
import "../../../index.css"
import { FeatureItem } from "./FeatureItem";
import type { TaskToggleQueue } from "../hooks/useTaskToggle";

export default function FeatureList({ ThisProject, toggleQueue }: { ThisProject: projectType; toggleQueue: TaskToggleQueue }) {
    return (
        <>
            <h2 className="section-title">Tasks:</h2>
            <div className="feature-list-grid">
                {ThisProject?.features.map((feature) =>
                    <FeatureItem
                        feature={feature}
                        ThisProjectId={ThisProject.id}
                        toggleQueue={toggleQueue}
                        key={feature.id}
                    />
                )}
            </div>
        </>
    )
}
