import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Pool from "pg-pool";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { requireAuth, assertProjectOwner } from "./auth.js";

dotenv.config();

const app = express();

app.disable("x-powered-by");

// Security Headers Middleware
// This API only ever returns JSON, so helmet's default CSP is inert here.
// frameguard defaults to SAMEORIGIN; keep the stricter DENY this app had before.
app.use(helmet({ frameguard: { action: "deny" } }));

const corsOptions = {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    // Uptime monitors polling /api/db-health share an egress IP with real users,
    // so health polling must not consume their request budget.
    skip: (req) => req.path === "/api/db-health",
    message: { error: "Too many requests, please try again later." }
});

app.use(apiRateLimiter);

app.use("/api", (req, res, next) => {
    if (req.path === "/db-health") return next();
    return requireAuth(req, res, next);
});

const port = process.env.PORT || 3001;

const { PGHOST,
    PGDATABASE,
    PGUSER,
    PGPASSWORD,
    PGSSLMODE,
    PGCHANNELBINDING,
    NEON_AUTH_BASE_URL } = process.env;

const pool = new Pool({
    database: PGDATABASE,
    host: PGHOST,
    port: 5432,
    user: PGUSER,
    password: PGPASSWORD,
    ssl: {
        require: true,
        rejectUnauthorized: false
    }
});

// Ownership and validation failures carry the intended HTTP status on the thrown
// error (see assertProjectOwner in ./auth.js). Honour it instead of a blanket 500 so
// authorization denials stop being logged and reported as server faults.
function sendError(res, error, fallbackMessage) {
    if (error && Number.isInteger(error.status) && error.status >= 400 && error.status < 500) {
        return res.status(error.status).json({ error: error.message || fallbackMessage });
    }
    return res.status(500).json({ error: fallbackMessage });
}

//delete project
app.delete("/api/projects/delete/:projectId", async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        const { projectId } = req.params;
        const userId = req.userId;
        const result = await client.query(`DELETE FROM projects WHERE id=$1 AND user_id=$2;`, [projectId, userId])
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Project not found" });
        }
        res.status(200).json({ message: "Project deleted" })
    } catch (error) {
        console.error("Error deleting project:", error);
        sendError(res, error, "Internal server error");
    } finally {
        if (client) {
            client.release()
        }
    }
})

//delete feature
app.delete("/api/projects/:projectId/features/:featureId", async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        const { projectId, featureId } = req.params;
        const userId = req.userId;

        await client.query("BEGIN");

        const featureResult = await client.query(
            `DELETE FROM features
             WHERE id=$1
               AND project_id IN (SELECT id FROM projects WHERE id=$2 AND user_id=$3)
             RETURNING id;`,
            [featureId, projectId, userId]
        );

        if (featureResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Feature not found" });
        }

        const ownedFeatureId = featureResult.rows[0].id;

        await client.query(`DELETE FROM tasks WHERE feature_id=$1;`, [ownedFeatureId]);
        await client.query("COMMIT");

        res.status(200).json({ message: "Feature deleted successfully" });
    } catch (error) {
        if (client) {
            await client.query("ROLLBACK");
        }
        console.error("Error deleting feature:", error);
        sendError(res, error, "Internal server error");
    } finally {
        if (client) {
            client.release();
        }
    }
})

//update feature
app.put("/api/projects/:projectId/features/:featureId", async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        const { projectId, featureId } = req.params;
        const { title, tasks } = req.body;
        const userId = req.userId;

        if (!title || typeof title !== "string" || title.trim() === "") {
            return res.status(400).json({ error: "Feature title is required." });
        }

        if (!Array.isArray(tasks) || tasks.length === 0) {
            return res.status(400).json({ error: "At least one task is required." });
        }

        const normalizedTasks = tasks
            .map((task) => ({
                title: task.title?.trim?.() ?? String(task).trim(),
                status: typeof task.status === "boolean" ? task.status : false,
            }))
            .filter((task) => task.title !== "");

        if (normalizedTasks.length === 0) {
            return res.status(400).json({ error: "At least one task is required." });
        }

        await client.query("BEGIN");

        const featureResult = await client.query(
            `UPDATE features SET title=$1
             WHERE id=$2
               AND project_id IN (SELECT id FROM projects WHERE id=$3 AND user_id=$4)
             RETURNING id;`,
            [title.trim(), featureId, projectId, userId]
        );

        if (featureResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Feature not found" });
        }

        const ownedFeatureId = featureResult.rows[0].id;

        await client.query(`DELETE FROM tasks WHERE feature_id=$1;`, [ownedFeatureId]);

        // Optimization: Batch insert tasks in a single query using unnest instead of a for-loop.
        // Expected impact: Reduces database roundtrips from O(N) queries for N tasks to 1 query (O(1)).
        const taskTitles = normalizedTasks.map(t => t.title);
        const taskStatuses = normalizedTasks.map(t => t.status);
        await client.query(
            `INSERT INTO tasks (title, status, feature_id) SELECT unnest($1::text[]), unnest($2::boolean[]), $3;`,
            [taskTitles, taskStatuses, ownedFeatureId]
        );

        await client.query(`UPDATE features SET status = (SELECT bool_and(status) FROM tasks WHERE feature_id = $1) WHERE id = $1;`, [ownedFeatureId]);

        const result = await client.query(`SELECT 
            COUNT(*) FILTER (WHERE tasks.status = true) AS completed,
            COUNT(*) AS total
            FROM tasks
            JOIN features ON tasks.feature_id = features.id
            WHERE features.project_id = $1;`, [projectId]);

        const percentage = result.rows[0].total > 0 ? Math.round((result.rows[0].completed / result.rows[0].total) * 100) : 0;
        await client.query(`UPDATE projects SET completion = $1 WHERE id = $2;`, [percentage, projectId]);

        await client.query("COMMIT");
        res.status(200).json({ message: "Feature updated successfully" });
    } catch (error) {
        if (client) {
            await client.query("ROLLBACK");
        }
        console.error("Error updating feature:", error);
        sendError(res, error, "Internal server error");
    } finally {
        if (client) {
            client.release();
        }
    }
})

//delete just a task
app.delete("/api/projects/features/:featureId/tasks/:taskId", async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        const { featureId, taskId } = req.params;
        const userId = req.userId;
        const result = await client.query(
            `DELETE FROM tasks WHERE id=$1 AND feature_id=$2 AND feature_id IN (SELECT f.id FROM features f JOIN projects p ON p.id = f.project_id WHERE p.user_id=$3);`,
            [taskId, featureId, userId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Task not found" });
        }
        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        console.error("Error deleting task:", error);
        sendError(res, error, "Internal server error");
    } finally {
        if (client) {
            client.release();
        }
    }
});

app.get("/api/projects", async (req, res) => {
    let client;

    try {
        client = await pool.connect();
        const userId = req.userId;
        const result = await client.query("SELECT * FROM projects WHERE user_id = $1", [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching projects:", error);
        sendError(res, error, "Internal server error");
    } finally {
        if (client) {
            client.release();
        }
    }
});

app.get("/api/projects/:projectId", async (req, res) => {
    let client;

    const { projectId } = req.params;
    const userId = req.userId;

    try {
        client = await pool.connect();
        const projectResult = await client.query("SELECT * FROM projects WHERE id=$1 AND user_id=$2", [projectId, userId]);
        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: "Project not found" });
        }
        const featureResult = await client.query("SELECT * FROM features WHERE project_id=$1", [projectId]);
        const techStackResult = await client.query("SELECT * FROM tech_stack WHERE project_id=$1", [projectId]);

        // Optimization: Batch fetch all tasks for the project's features in a single query to solve N+1 database call bottleneck.
        // Expected impact: Reduces database roundtrips from 3 + N queries down to 4 queries total.
        const tasksResult = await client.query(
            "SELECT tasks.* FROM tasks JOIN features ON tasks.feature_id = features.id WHERE features.project_id = $1",
            [projectId]
        );

        const tasksByFeatureId = new Map();
        for (const task of tasksResult.rows) {
            if (!tasksByFeatureId.has(task.feature_id)) {
                tasksByFeatureId.set(task.feature_id, []);
            }
            tasksByFeatureId.get(task.feature_id).push(task);
        }

        const featuresWithTasks = featureResult.rows.map((feature) => ({
            ...feature,
            tasks: tasksByFeatureId.get(feature.id) || []
        }));

        res.json({
            ...projectResult.rows[0],
            features: featuresWithTasks,
            techStack: techStackResult.rows
        });
    } catch (error) {
        console.error("Error fetching project:", error);
        sendError(res, error, "Internal server error");
    } finally {
        if (client) {
            client.release();
        }
    }
});

// db connection check 
app.get("/api/db-health", async (req, res) => {
    let client;

    try {
        client = await pool.connect();
        await client.query("SELECT 1");
        res.json({
            ok: true,
            message: "Database connection successful"
        });
    } catch (error) {
        console.error("Database health check failed:", error);
        res.status(500).json({
            ok: false,
            message: "Database connection failed"
        });
    } finally {
        if (client) {
            client.release();
        }
    }
});

//add more features
app.put("/api/projects/:projectId/features", async (req, res) => {
    let client;
    const { projectId } = req.params;
    const feature = req.body;
    const userId = req.userId;
    if (!feature) {
        return res.status(400).json({ error: "Feature object is required." });
    }

    if (!feature.title) {
        return res.status(400).json({ error: "Feature title is required." });
    }

    if (!Array.isArray(feature.tasks) || feature.tasks.length === 0) {
        return res.status(400).json({ error: "Feature tasks must be a non-empty array." });
    }
    try {
        client = await pool.connect();
        await assertProjectOwner(client, projectId, userId);
        await client.query("BEGIN");

        const featureId = await client.query("insert into features (title, status, project_id) values ($1, $2, $3) returning id;", [feature.title, false, projectId]);

        await client.query("insert into tasks (title, status, feature_id) select unnest($1::text[]),$2,$3;", [feature.tasks, false, featureId.rows[0].id]);
        await client.query("COMMIT");

        res.json({ message: "Feature added successfully" });
    } catch (error) {
        if (client) {
            await client.query("rollback");
        }
        console.error("Error adding feature:", error);
        if (error && Number.isInteger(error.status) && error.status >= 400 && error.status < 500) {
            return res.status(error.status).json({ ok: false, message: error.message });
        }
        res.status(500).json({
            ok: false,
            message: "Failed to add feature"
        });
    } finally {
        if (client) {
            client.release();
        }
    }
})

//edit project
app.put("/api/projects", async (req, res) => {
    let client;

    try {
        client = await pool.connect();
        const { name, summary, domain, techStack, projectId } = req.body;
        const userId = req.userId;
        if (
            name === undefined || name === null ||
            summary === undefined || summary === null ||
            domain === undefined || domain === null ||
            techStack === undefined || techStack === null ||
            projectId === undefined || projectId === null
        ) {
            return res.status(400).json({ error: 'All fields must be provided in the request body.' });
        }

        await assertProjectOwner(client, projectId, userId);

        await client.query("BEGIN")

        await client.query(
            `UPDATE projects SET name=$1, summary=$2, domain=$3 WHERE id=$4;`,
            [name, summary, domain, projectId]
        );

        await client.query(
            `delete from tech_stack where project_id=$1;`,
            [projectId]
        );

        await client.query(
            `INSERT INTO tech_stack (name, project_id) 
             select unnest($1::text[]),$2;`,
            [techStack, projectId]
        );

        await client.query("COMMIT");

        res.json({ message: "project edited successfully", projectId });

    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error("Error editing project:", error);
        sendError(res, error, "Internal server error");
    } finally {
        if (client) {
            client.release();
        }
    }
});


//toggle feature.task
app.put("/api/projects/toggleTask", async (req, res) => {
    let client

    try {
        client = await pool.connect();

        const { taskId, status, featureId, projectId } = req.body;
        const userId = req.userId;

        const hasMissingField = [taskId, status, featureId, projectId].some(
            (value) => value === undefined || value === null || value === ''
        );

        if (hasMissingField || typeof status !== 'boolean') {
            res.status(400).json({
                error: 'taskId, status, featureId, and projectId must be provided in the request body, and status must be a boolean.'
            });
            return;
        }

        await client.query("BEGIN")

        const taskResult = await client.query(
            `UPDATE tasks SET status = $1
             WHERE id = $2
               AND feature_id = $3
               AND feature_id IN (
                   SELECT f.id
                   FROM features f
                   JOIN projects p ON p.id = f.project_id
                   WHERE f.id = $3 AND p.id = $4 AND p.user_id = $5
               )
             returning feature_id;`,
            [status, taskId, featureId, projectId, userId]
        );

        if (taskResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Task not found" });
        }

        const ownedFeatureId = taskResult.rows[0].feature_id;

        await client.query(
            `UPDATE features SET status = (SELECT bool_and(status) FROM tasks WHERE feature_id = $1) WHERE id = $1;`,
            [ownedFeatureId]
        );

        await client.query("COMMIT")

        res.json({ message: "task status toggled successfully" });
    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error("Error toggling task status:", error);
        sendError(res, error, "Internal server error");
    } finally {
        if (client) {
            client.release();
        }
    }
});

//add project
app.post("/api/projects", async (req, res) => {
    let client;

    try {
        client = await pool.connect();
        const { name, summary, domain, completion, techStack } = req.body;
        const { features } = req.body;
        const userId = req.userId;
        if (name.trim() === '') return res.status(400).json({ error: 'fill the project name input' });
        if (summary.trim() === '') return res.status(400).json({ error: 'fill the project summary input' });
        if (domain.trim() === '') return res.status(400).json({ error: 'fill the project domain input' });
        if (techStack.length === 0) return res.status(400).json({ error: 'add at least one tech stack item' });
        if (features.length === 0) return res.status(400).json({ error: 'add at least one feature block' });

        await client.query("BEGIN")

        const projectResult = await client.query(`INSERT INTO projects (name, summary, domain, completion, user_id) VALUES ($1, $2, $3, $4, $5) returning id;`, [name, summary, domain, completion, userId]);
        const projectId = projectResult.rows[0].id;

        if (techStack.length > 0) {
            await client.query(
                "INSERT INTO tech_stack (name, project_id) SELECT unnest($1::text[]),$2;",
                [techStack, projectId]
            );
        }

        for (const feature of features) {
            const featureResult = await client.query(
                `INSERT INTO features (title, status, project_id) VALUES ($1, $2, $3) RETURNING id;`,
                [feature.title, false, projectId]
            );

            const featureId = featureResult.rows[0].id;

            for (const task of feature.tasks) {
                await client.query(
                    `INSERT INTO tasks (title, status, feature_id) VALUES ($1, $2, $3);`,
                    [task, false, featureId]
                );
            }
        }
        await client.query("COMMIT")

        res.json({ message: "project added successfully", projectId });

    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error("Error adding project:", error);
        sendError(res, error, "Internal server error");
    } finally {
        if (client) {
            client.release();
        }
    }
});

app.listen(port, () => {
    console.log("server is listening on port:", port)
});