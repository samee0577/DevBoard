## 2025-05-18 - Batch Task Querying in devboard-server
**Learning:** In Express endpoints fetching hierarchical relation data (e.g. project -> features -> tasks), performing `SELECT * FROM tasks WHERE feature_id=$1` inside a `for...of` loop creates an N+1 query problem that scales database latency linearly with the number of features.
**Action:** Always batch fetch child resources using `JOIN` queries or `WHERE parent_id = ANY(...)` and group them in-memory using a `Map` to keep query count at $O(1)$.
