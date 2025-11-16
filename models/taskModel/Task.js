const db = require('../../config/db');

class Task {
    constructor(data) {
        this.id = data.id;
        this.project_id = data.project_id;
        this.name = data.name;
        this.description = data.description || null;
        this.status = data.status || 'To Do';
        this.progress = data.progress || 0;
        this.due_date = data.due_date || null;
        this.created_at = data.created_at;
    }

    static async create({ project_id, name, description, status = 'To Do', progress = 0, due_date = null }) {
        const query = `INSERT INTO tasks (project_id, name, description, status, progress, due_date) VALUES (?, ?, ?, ?, ?, ?)`;
        const params = [project_id, name, description || null, status, progress, due_date];
        const [result] = await db.execute(query, params);
        const [rows] = await db.execute('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
        return new Task(rows[0]);
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM tasks WHERE id = ?', [id]);
        if (rows.length === 0) return null;
        return new Task(rows[0]);
    }

    static async findAllByProject(projectId) {
        const [rows] = await db.execute('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC', [projectId]);
        return rows.map(r => new Task(r));
    }

    async update(updateData) {
        const allowed = ['name', 'description', 'status', 'progress', 'due_date'];
        const fields = [];
        const values = [];
        for (const [k, v] of Object.entries(updateData)) {
            if (allowed.includes(k) && v !== undefined) {
                fields.push(`${k} = ?`);
                values.push(v);
            }
        }
        if (fields.length === 0) return this;
        values.push(this.id);
        await db.execute(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
        Object.assign(this, updateData);
        return this;
    }

    async delete() {
        await db.execute('DELETE FROM tasks WHERE id = ?', [this.id]);
        return true;
    }
}

module.exports = Task;


