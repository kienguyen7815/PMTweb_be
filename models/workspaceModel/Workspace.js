const db = require('../../config/db');

class Workspace {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description || null;
        this.owner_id = data.owner_id;
        this.created_at = data.created_at;
    }

    static async create({ name, description, owner_id }) {
        const query = `
            INSERT INTO workspaces (name, description, owner_id)
            VALUES (?, ?, ?)
        `;
        const params = [
            name?.trim() || '',
            description?.trim() || null,
            owner_id
        ];

        const [result] = await db.execute(query, params);
        const [rows] = await db.execute('SELECT * FROM workspaces WHERE id = ?', [result.insertId]);
        return new Workspace(rows[0]);
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM workspaces WHERE id = ?', [id]);
        if (rows.length === 0) return null;
        return new Workspace(rows[0]);
    }

    static async findByUserId(userId) {
        // Lấy danh sách workspace mà user là thành viên
        const [rows] = await db.execute(`
            SELECT w.*, wm.role AS member_role
            FROM workspaces w
            INNER JOIN workspace_members wm ON wm.workspace_id = w.id
            WHERE wm.user_id = ?
            ORDER BY w.created_at DESC
        `, [userId]);

        return rows.map(row => ({
            workspace: new Workspace(row),
            role: row.member_role
        }));
    }
}

module.exports = Workspace;


