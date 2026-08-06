export type action =
    { type: "ADD_PROJECT", payload: projectType } |
    { type: "REMOVE_PROJECT", payload: { projectId: string } } |
    { type: "EDIT_PROJECT", payload: { projectId: string, newName: string, newSummary: string, newDomain: string, newTechStack: string[] } } |
    { type: "UPDATE_COMPLETION", payload: { projectId: string } } |
    { type: "ADD_FEATURE", payload: { projectId: string, feature: string ,tasks: task[]} } |
    { type: "DELETE_FEATURE", payload: { projectId: string, featureId: string } } |
    { type: "TOGGLE_TASK", payload: { projectId: string, featureId: string, taskId: string } } |
    // TO BE DONE LATER
    { type: "REMOVE_TASK", payload: { projectId: string, featureId: string, taskId: string } } |
    { type: "ADD_NEW_TASK", payload: { projectId: string, featureId: string, task: string } }

export interface projectType {
    id: number,
    name: string,
    summary: string,
    techStack: {id: number, name: string, project_id: number}[],
    domain: string,
    completion: number,
    features: feature[]
}

export type feature = {
    id: number,
    title: string
    status: boolean
    tasks: task[]
}

export type task = {
    id: number,
    title: string
    status: boolean
}