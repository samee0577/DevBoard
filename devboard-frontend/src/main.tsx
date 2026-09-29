import "./index.css"
import { createRoot } from "react-dom/client"
import { RouterProvider, createBrowserRouter, Outlet } from "react-router-dom"
import RootLayout from "./Layout/RootLayout"
import Dashboard from "./pages/Dashboard"
import { NewProject } from "./pages/NewProject"
import ProjectDetail from "./pages/ProjectDetails"
import { QueryClientProvider, QueryClient, QueryCache } from "@tanstack/react-query"
import { Analytics } from '@vercel/analytics/react'
import { ApiError } from "./features/projects/lib/api.ts"
import Auth from "./pages/Auth.tsx"
import { requireAuthLoader } from "./requireAuth.ts"

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
        element: <Outlet />,
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
      }
    ]
  }
])

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401 && window.location.pathname !== "/") {
        window.location.assign("/");
      }
    },
  }),
})

createRoot(document.getElementById('root')!).render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Analytics />
    </QueryClientProvider>  
)
