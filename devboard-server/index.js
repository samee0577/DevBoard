import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Pool from "pg-pool";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const port = 3001;

const { PGHOST,
    PGDATABASE,
    PGUSER,
    PGPASSWORD,
    PGSSLMODE,
    PGCHANNELBINDING } = process.env;

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

//delete project
app.delete("/api/projects/delete/:projectId", async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        const { projectId } = req.params;
        await client.query(`DELETE FROM projects WHERE id=$1;`, [projectId])
        res.status(200).json({ message: "Project deleted" })
    } catch {
        res.status(500).json({ error: error.message });
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

        await client.query("BEGIN");
        await client.query(`DELETE FROM tasks WHERE feature_id=$1;`, [featureId]);
        await client.query(`DELETE FROM features WHERE id=$1 AND project_id=$2;`, [featureId, projectId]);
        await client.query("COMMIT");

        res.status(200).json({ message: "Feature deleted successfully" });
    } catch (error) {
        if (client) {
            await client.query("ROLLBACK");
        }
        res.status(500).json({ error: error.message });
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
        await client.query(
            `UPDATE features SET title=$1 WHERE id=$2 AND project_id=$3;`,
            [title.trim(), featureId, projectId]
        );

        await client.query(`DELETE FROM tasks WHERE feature_id=$1;`, [featureId]);

        for (const task of normalizedTasks) {
            await client.query(
                `INSERT INTO tasks (title, status, feature_id) VALUES ($1, $2, $3);`,
                [task.title, task.status, featureId]
            );
        }

        await client.query(`UPDATE features SET status = (SELECT bool_and(status) FROM tasks WHERE feature_id = $1) WHERE id = $1;`, [featureId]);

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
        res.status(500).json({ error: error.message });
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
        const { projectId, featureId, taskId } = req.params;
        await client.query(`DELETE FROM tasks WHERE id=$1 AND feature_id=$2;`, [taskId, featureId]);
        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
        const result = await client.query("SELECT * FROM projects");
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (client) {
            client.release();
        }
    }
});

app.get("/api/projects/:projectId", async (req, res) => {
    let client;

    const { projectId } = req.params;

    try {
        client = await pool.connect();
        const projectResult = await client.query("SELECT * FROM projects WHERE id=$1", [projectId]);
        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: "Project not found" });
        }
        const featureResult = await client.query("SELECT * FROM features WHERE project_id=$1", [projectId]);
        const techStackResult = await client.query("SELECT * FROM tech_stack WHERE project_id=$1", [projectId]);

        const featuresWithTasks = await Promise.all(
            featureResult.rows.map(async (feature) => {
                const taskResult = await client.query("SELECT * FROM tasks WHERE feature_id=$1", [feature.id]);
                return { ...feature, tasks: taskResult.rows };
            })
        );

        res.json({
            ...projectResult.rows[0],
            features: featuresWithTasks,
            techStack: techStackResult.rows
        });
    } catch (error) {
        console.error("Error fetching project:", error);
        res.status(500).json({ error: error.message });
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
        const result = await client.query("SELECT NOW() as current_time");
        res.json({
            ok: true,
            message: "Database connection successful",
            currentTime: result.rows[0].current_time
        });
    } catch (error) {
        console.error("Database health check failed:", error);
        res.status(500).json({
            ok: false,
            message: "Database connection failed",
            error: error.message
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
    const feature  = req.body;
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
        await client.query("BEGIN");

        const featureId = await client.query("insert into features (title, status, project_id) values ($1, $2, $3) returning id;", [feature.title, false, projectId]);

        await client.query("insert into tasks (title, status, feature_id) select unnest($1::text[]),$2,$3;", [feature.tasks, false, featureId.rows[0].id]);
        await client.query("COMMIT");

        res.json({ message: "Feature added successfully" });
    } catch (error) {
        await client.query("rollback")
        res.status(500).json({
            ok: false,
            message: "Failed to add feature",
            error: error.message
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
        if (
            name === undefined || name === null ||
            summary === undefined || summary === null ||
            domain === undefined || domain === null ||
            techStack === undefined || techStack === null ||
            projectId === undefined || projectId === null
        ) {
            return res.status(400).json({ error: 'All fields must be provided in the request body.' });
        }

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
        await client.query('ROLLBACK');
        console.log(error.message)
        res.status(500).json({ error: error.message });
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

        await client.query(`UPDATE tasks SET status = $1 WHERE id = $2 returning *;`, [status, taskId]);
        await client.query(`UPDATE features SET status = (SELECT bool_and(status) FROM tasks WHERE feature_id = $1) WHERE id = $1;`, [featureId]);
        // const result = await client.query(`SELECT 
        //     COUNT(*) FILTER (WHERE tasks.status = true) AS completed,
        //     COUNT(*) AS total
        //     FROM tasks
        //     JOIN features ON tasks.feature_id = features.id
        //     WHERE features.project_id = $1;`, [projectId]);

        // const percentage = result.rows[0].total > 0 ? (result.rows[0].completed / result.rows[0].total) * 100 : 0;

        // await client.query(`UPDATE projects SET completion = $1 WHERE id = $2;`, [Math.round(percentage), projectId]);

        await client.query("COMMIT")

        res.json({ message: "task status toggled successfully" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error toggling task status:", error);
        res.status(500).json({ error: error.message });
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
        if (name.trim() === '') return res.status(400).json({ error: 'fill the project name input' });
        if (summary.trim() === '') return res.status(400).json({ error: 'fill the project summary input' });
        if (domain.trim() === '') return res.status(400).json({ error: 'fill the project domain input' });
        if (techStack.length === 0) return res.status(400).json({ error: 'add at least one tech stack item' });
        if (features.length === 0) return res.status(400).json({ error: 'add at least one feature block' });

        await client.query("BEGIN")

        const projectResult = await client.query(`INSERT INTO projects (name, summary, domain, completion) VALUES ($1, $2, $3, $4) returning id;`, [name, summary, domain, completion]);
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
        await client.query('ROLLBACK');
        console.log(error.message)
        res.status(500).json({ error: error.message });
    } finally {
        client.release()
    }
});

app.listen(port, () => {
    console.log("server is listening on port:", port)
});