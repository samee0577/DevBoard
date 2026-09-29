import type { QueryClient } from "@tanstack/react-query"

export const projectKeys = {
    all: ["projects"] as const,
    list: () => ["projects"] as const,
    detail: (projectId: string | number) => ["projects", String(projectId)] as const,
}

export function invalidateProjects(queryClient: QueryClient) {
    return queryClient.invalidateQueries({ queryKey: projectKeys.all })
}
