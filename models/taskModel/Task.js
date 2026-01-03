const db = require('../../config/db');

const DEFAULT_STATUS = 'In Progress';

class Task {
    constructor(data) {
        this.id = data.id;
        this.project_id = data.project_id;
        this.name = data.name;
        this.description = data.description || null;
        this.status = data.status || DEFAULT_STATUS;
        this.progress = data.progress || 0;
        this.due_date = data.due_date || null;
        this.created_at = data.created_at;
    }

    /**
     * Tạo task mới trong project.
     * @param {Object} param0 - Thông tin của task
     * @param {number} param0.project_id - ID của project
     * @param {string} param0.name - Tên task
     * @param {string} [param0.description] - Mô tả task (tuỳ chọn)
     * @param {string} [param0.status=DEFAULT_STATUS] - Trạng thái task (tuỳ chọn)
     * @param {number} [param0.progress=0] - Tiến độ task (tuỳ chọn)
     * @param {string|null} [param0.due_date=null] - Ngày hết hạn (tuỳ chọn)
     * @returns {Promise<Task>} - Task vừa tạo
     * 
     * Tóm tắt: Hàm này dùng để tạo một task mới cho project, trả về instance Task vừa tạo.
     */
    static async create({ project_id, name, description, status = DEFAULT_STATUS, progress = 0, due_date = null }) {
        const query = `INSERT INTO tasks (project_id, name, description, status, progress, due_date) VALUES (?, ?, ?, ?, ?, ?)`;
        const params = [project_id, name, description || null, status, progress, due_date];
        const [result] = await db.execute(query, params);
        const [rows] = await db.execute('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
        return new Task(rows[0]);
    }

    /**
     * Lấy danh sách các trạng thái hợp lệ của trường status trong tasks.
     * @returns {Promise<string[]>} - Mảng trạng thái hợp lệ
     * 
     * Tóm tắt: Truy vấn các lựa chọn enum cho trường status trong bảng tasks.
     */
    static async getStatusOptions() {
        const dbName = process.env.DB_NAME;
        if (!dbName) return [];
        const [rows] = await db.execute(
            `SELECT COLUMN_TYPE FROM information_schema.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'status' 
             LIMIT 1`,
            [dbName]
        );
        if (!rows.length || !rows[0].COLUMN_TYPE) return [];
        const enumMatch = rows[0].COLUMN_TYPE.match(/enum\((.*)\)/i);
        if (!enumMatch || enumMatch.length < 2) return [];
        return enumMatch[1]
            .split(',')
            .map(val => val.trim().replace(/^'(.*)'$/, '$1'));
    }

    /**
     * Tìm task theo ID.
     * @param {number} id - ID của task
     * @returns {Promise<Task|null>} - Task nếu tồn tại, hoặc null nếu không
     * 
     * Tóm tắt: Lấy thông tin chi tiết về task từ id.
     */
    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM tasks WHERE id = ?', [id]);
        if (rows.length === 0) return null;
        return new Task(rows[0]);
    }

    /**
     * Lấy tất cả các task của một project.
     * @param {number} projectId - ID của project
     * @returns {Promise<Task[]>} - Danh sách các task trong project
     * 
     * Tóm tắt: Trả về toàn bộ task thuộc project chỉ định, sắp xếp theo ngày tạo mới nhất trước.
     */
    static async findAllByProject(projectId) {
        const [rows] = await db.execute('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC', [projectId]);
        return rows.map(r => new Task(r));
    }

    /**
     * Cập nhật thông tin task hiện tại.
     * @param {Object} updateData - Dữ liệu cập nhật
     * @returns {Promise<Task>} - Task sau cập nhật
     * 
     * Tóm tắt: Cho phép cập nhật các trường cho phép của một task.
     */
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

    /**
     * Xoá task này khỏi database.
     * @returns {Promise<boolean>} - Trả về true nếu thành công
     * 
     * Tóm tắt: Xoá dòng task tương ứng với id hiện tại khỏi bảng tasks.
     */
    async delete() {
        await db.execute('DELETE FROM tasks WHERE id = ?', [this.id]);
        return true;
    }
}

module.exports = Task;


