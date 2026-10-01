import "./index.css"
import { createRoot } from "react-dom/client"
import { RouterProvider, createBrowserRouter, redirect } from "react-router-dom"
import RootLayout from "./Layout/RootLayout"
import DashboardLayout from "./Layout/DashboardLayout"
import Dashboard from "./pages/Dashboard"
import { NewProject } from "./pages/NewProject"
import ProjectDetail from "./pages/ProjectDetails"
import { QueryClientProvider, QueryClient, QueryCache, MutationCache } from "@tanstack/react-query"
import { Analytics } from '@vercel/analytics/react'
import { ApiError } from "./features/projects/lib/api.ts"
import Auth from "./pages/Auth.tsx"
import { requireAuthLoader } from "./requireAuth.ts"
import DemoLayout from "./features/demo/DemoLayout"

// The /demo branch is deliberately loader-free: guests have no session, so requiring
// one here would be exactly what this feature is meant to avoid. Everything under it
// is served by demoGateway, which never reaches the network. There is intentionally
// no newProject route in this subtree, so a guest has no create path even if one is
// requested by URL.
const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Auth />
      },
      {
        element: <DashboardLayout />,
        loader: requireAuthLoader,
        children: [
          {
            path: 'dashboard',
            element: <Dashboard />
          },
          {
            path: 'newProject',
            element: <NewProject />
          },
          {
            path: 'projectDetail/:projectId',
            element: <ProjectDetail />
          }
        ]
      },
      {
        path: 'demo',
        element: <DemoLayout />,
        children: [
          {
            index: true,
            loader: () => redirect('/demo/dashboard')
          },
          {
            path: 'dashboard',
            element: <Dashboard />
          },
          {
            path: 'projectDetail/:projectId',
            element: <ProjectDetail />
          }
        ]
      }
    ]
  }
])

function handleAuthFailure(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    queryClient.clear();
    window.location.assign("/");
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleAuthFailure }),
  mutationCache: new MutationCache({ onError: handleAuthFailure }),
})

createRoot(document.getElementById('root')!).render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Analytics />
    </QueryClientProvider>  
)
