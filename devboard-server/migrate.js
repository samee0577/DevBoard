import {Client} from "pg";
import {readdir,readFile} from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: process.env.PGSSLMODE === "require" ? {rejectUnauthorized: false} : false,
});

await client.connect();

await client.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);

const dir = path.join(import.meta.dirname, "migrations");
const files = (await readdir(dir)).filter((f)=> f.endsWith(".sql")).sort();

const {rows} = await client.query("SELECT name FROM public.schema_migrations");

const applied = new Set(rows.map((r)=> r.name));

for (const file of files){
  if (applied.has(file)) {
    console.log(`Skipping ${file} (already applied)`);
    continue;
  }

  const sql = await readFile(path.join(dir, file), "utf8");
  try{
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO public.schema_migrations (name) VALUES ($1)", [file]);
    await client.query("COMMIT");
    console.log(`Applied ${file}`);
  }
  catch (err) {
    await client.query("ROLLBACK");
    console.error(`Error applying ${file}:`, err);
    process.exit(1);
  }
}

await client.end();