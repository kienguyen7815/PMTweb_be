const db = require('../../config/db');

class WorkspaceMember {
    constructor(data) {
        this.id = data.id;
        this.workspace_id = data.workspace_id;
        this.user_id = data.user_id;
        this.role = data.role || 'mb';
        this.joined_at = data.joined_at;
    }

    /**
     * Thêm một thành viên vào workspace.<br>
     * Nếu thành viên đã tồn tại thì cập nhật lại vai trò của họ.<br>
     * @param {Object} param0 - Thông tin gồm workspace_id, user_id, role (tùy chọn, mặc định 'mb')
     * @returns {Promise<WorkspaceMember|null>} - Trả về object thành viên vừa thêm/cập nhật, hoặc null nếu thất bại
     * 
     * Tóm tắt: Thêm hoặc cập nhật thành viên trong workspace (nếu đã có thì đổi role).
     */
    static async addMember({ workspace_id, user_id, role = 'mb' }) {
        const query = `
            INSERT INTO workspace_members (workspace_id, user_id, role)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE role = VALUES(role)
        `;
        const [result] = await db.execute(query, [workspace_id, user_id, role]);

        const id = result.insertId || null;
        if (!id) {
            // Lấy lại record nếu chỉ là UPDATE
            const [rows] = await db.execute(
                'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
                [workspace_id, user_id]
            );
            if (rows.length > 0) {
                return new WorkspaceMember(rows[0]);
            }
            return null;
        }

        const [rows] = await db.execute('SELECT * FROM workspace_members WHERE id = ?', [id]);
        return new WorkspaceMember(rows[0]);
    }

    /**
     * Tìm thành viên trong workspace theo workspace_id và user_id.
     * @param {number} workspace_id - ID của workspace
     * @param {number} user_id - ID của thành viên
     * @returns {Promise<WorkspaceMember|null>} - Trả về thành viên nếu tìm thấy, ngược lại trả về null
     * 
     * Tóm tắt: Lấy dữ liệu thành viên trong workspace theo workspace_id và user_id.
     */
    static async findByWorkspaceAndUser(workspace_id, user_id) {
        const [rows] = await db.execute(
            'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
            [workspace_id, user_id]
        );
        if (rows.length === 0) return null;
        return new WorkspaceMember(rows[0]);
    }

    /**
     * Lấy danh sách thành viên trong workspace, trả về kèm thông tin user (username, email).
     * @param {number} workspace_id - ID của workspace cần lấy thành viên
     * @returns {Promise<Array>} - Danh sách thành viên với info user
     * 
     * Tóm tắt: Liệt kê toàn bộ thành viên của một workspace, sắp xếp theo thời điểm tham gia.
     */
    static async listMembers(workspace_id) {
        const [rows] = await db.execute(`
            SELECT wm.*, u.username, u.email
            FROM workspace_members wm
            JOIN users u ON wm.user_id = u.id
            WHERE wm.workspace_id = ?
            ORDER BY wm.joined_at ASC
        `, [workspace_id]);

        return rows.map(row => ({
            id: row.id,
            workspace_id: row.workspace_id,
            user_id: row.user_id,
            role: row.role,
            joined_at: row.joined_at,
            username: row.username,
            email: row.email
        }));
    }

    /**
     * Cập nhật vai trò của thành viên trong workspace.
     * @param {Object} param0 - Thông tin: workspace_id, user_id, role mới
     * @returns {Promise<WorkspaceMember|null>} - Trả về thành viên đã được cập nhật
     * 
     * Tóm tắt: Đổi vai trò (role) thành viên trong workspace.
     */
    static async updateRole({ workspace_id, user_id, role }) {
        await db.execute(
            'UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?',
            [role, workspace_id, user_id]
        );
        return this.findByWorkspaceAndUser(workspace_id, user_id);
    }
}

module.exports = WorkspaceMember;


