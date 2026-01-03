const db = require('../../config/db');

class Project {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description || null;
        this.owner_id = data.owner_id || null;
        this.workspace_id = data.workspace_id || null;
        this.status = data.status || 'Not Started';
        this.start_date = data.start_date || null;
        this.end_date = data.end_date || null;
        this.created_at = data.created_at;
    }

    /**
     * Tạo mới một project
     * @param {Object} param0 - Thông tin project (name, description, owner_id, workspace_id, status, start_date, end_date)
     * @returns {Promise<Project>} - Đối tượng Project vừa được tạo
     * 
     * Tóm tắt: Tạo một project mới trong hệ thống, trả về đối tượng Project sau khi tạo.
     */
    static async create({ name, description, owner_id, workspace_id = null, status = 'Not Started', start_date = null, end_date = null }) {
        const validStatuses = ['Not Started', 'In Progress', 'Completed', 'Pending', 'Planned', 'Cancelled', 'Testing', 'In Review', 'Delayed'];
        const finalStatus = validStatuses.includes(status) ? status : 'Not Started';

        const query = `INSERT INTO prj (name, description, owner_id, workspace_id, status, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const params = [
            name?.trim() || '',
            description?.trim() || null,
            owner_id || null,
            workspace_id || null,
            finalStatus,
            start_date || null,
            end_date || null
        ];

        const [result] = await db.execute(query, params);

        const [rows] = await db.execute('SELECT * FROM prj WHERE id = ?', [result.insertId]);
        return new Project(rows[0]);
    }

    /**
     * Tìm project theo id
     * @param {number} id - Id của project
     * @returns {Promise<Project|null>} - Trả về đối tượng Project hoặc null nếu không tìm thấy
     * 
     * Tóm tắt: Lấy project theo id, trả về đối tượng Project nếu có, ngược lại trả về null.
     */
    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM prj WHERE id = ?', [id]);
        if (rows.length === 0) return null;
        return new Project(rows[0]);
    }

    /**
     * Lấy tất cả project (có thể lọc theo workspace)
     * @param {number|null} workspaceId - Id workspace muốn lọc, nếu không truyền sẽ lấy tất cả project
     * @returns {Promise<Project[]>} - Danh sách các project
     * 
     * Tóm tắt: Lấy danh sách project trong workspace hoặc toàn bộ (nếu không truyền workspaceId), sắp xếp mới nhất trước.
     */
    static async findAll(workspaceId = null) {
        let query = 'SELECT * FROM prj';
        const params = [];

        if (workspaceId) {
            query += ' WHERE workspace_id = ?';
            params.push(workspaceId);
        }

        query += ' ORDER BY created_at DESC';
        const [rows] = await db.execute(query, params);
        return rows.map(r => new Project(r));
    }

    /**
     * Cập nhật thông tin project hiện tại
     * @param {Object} updateData - Thông tin mới muốn cập nhật cho project
     * @returns {Promise<Project>} - Đối tượng Project sau khi cập nhật
     * 
     * Tóm tắt: Cập nhật các trường cho project hiện tại (chỉ cập nhật những trường cho phép), trả về project đã cập nhật.
     */
    async update(updateData) {
        const allowed = ['name', 'description', 'status', 'workspace_id', 'start_date', 'end_date'];
        const fields = [];
        const values = [];

        for (const [k, v] of Object.entries(updateData)) {
            if (allowed.includes(k) && v !== undefined) {
                fields.push(`${k} = ?`);
                if (k === 'status') {
                    const validStatuses = ['Not Started', 'In Progress', 'Completed', 'Pending', 'Planned', 'Cancelled', 'Testing', 'In Review', 'Delayed'];
                    values.push(validStatuses.includes(v) ? v : 'Not Started');
                } else if (k === 'name') {
                    values.push(v?.trim() || '');
                } else if (k === 'description') {
                    values.push(v?.trim() || null);
                } else if (k === 'start_date' || k === 'end_date' || k === 'workspace_id') {
                    values.push(v || null);
                } else {
                    values.push(v);
                }
            }
        }

        if (fields.length === 0) {
            return this;
        }

        values.push(this.id);
        const query = `UPDATE prj SET ${fields.join(', ')} WHERE id = ?`;

        await db.execute(query, values);
        Object.assign(this, updateData);
        return this;
    }

    /**
     * Xóa project hiện tại
     * @returns {Promise<boolean>} - Trả về true khi xóa thành công
     * 
     * Tóm tắt: Xóa project này ra khỏi CSDL.
     */
    async delete() {
        await db.execute('DELETE FROM prj WHERE id = ?', [this.id]);
        return true;
    }

    /**
     * Kiểm tra và cập nhật trạng thái project thành 'Completed' nếu đã hết hạn
     * @returns {Promise<boolean>} - true nếu có cập nhật, false nếu không update
     * 
     * Tóm tắt: Nếu project có end_date < hôm nay và chưa completed/cancelled thì tự chuyển sang trạng thái Completed.
     */
    async checkAndUpdateStatus() {
        if (this.end_date &&
            this.status !== 'Completed' &&
            this.status !== 'Cancelled') {

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const endDate = new Date(this.end_date);
            endDate.setHours(0, 0, 0, 0);

            if (endDate < today) {
                await this.update({ status: 'Completed' });
                this.status = 'Completed';
                return true;
            }
        }
        return false;
    }

    /**
     * Kiểm tra và cập nhật trạng thái tất cả các project hết hạn thành 'Completed'
     * @returns {Promise<number>} - Số lượng project được cập nhật thành công
     * 
     * Tóm tắt: Duyệt tất cả project có end_date < hôm nay, chưa completed/cancelled thì cập nhật sang Completed.
     */
    static async checkAndUpdateExpiredProjects() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const [result] = await db.execute(`
                UPDATE prj 
                SET status = 'Completed' 
                WHERE end_date IS NOT NULL 
                  AND end_date < ? 
                  AND status NOT IN ('Completed', 'Cancelled')
            `, [today]);

            return result.affectedRows;
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Error updating expired projects:', error);
            }
            throw error;
        }
    }
}

module.exports = Project;


