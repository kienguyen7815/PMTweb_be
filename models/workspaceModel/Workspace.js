const db = require('../../config/db');

class Workspace {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description || null;
        this.owner_id = data.owner_id;
        this.created_at = data.created_at;
    }

    /**
     * Tạo workspace mới
     * @param {Object} param0 - Thông tin workspace
     * @param {string} param0.name - Tên workspace
     * @param {string|null} param0.description - Mô tả workspace (tùy chọn)
     * @param {number} param0.owner_id - ID người tạo workspace
     * @returns {Promise<Workspace>} - Đối tượng Workspace vừa được tạo
     * 
     * Tóm tắt: Tạo một workspace mới trong hệ thống với name, description (tùy chọn) và owner_id.
     */
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

    /**
     * Tìm kiếm workspace theo ID
     * @param {number} id - ID của workspace
     * @returns {Promise<Workspace|null>} - Trả về Workspace tìm được hoặc null nếu không tồn tại
     * 
     * Tóm tắt: Lấy dữ liệu workspace theo id, trả về đối tượng Workspace hoặc null nếu không có.
     */
    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM workspaces WHERE id = ?', [id]);
        if (rows.length === 0) return null;
        return new Workspace(rows[0]);
    }

    /**
     * Lấy danh sách workspace theo user
     * @param {number} userId - ID của user
     * @returns {Promise<Array<{workspace: Workspace, role: string}>>}
     * 
     * Tóm tắt: Lấy toàn bộ workspace mà user này là thành viên, có thêm thông tin vai trò (role) trong workspace đó.
     */
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


