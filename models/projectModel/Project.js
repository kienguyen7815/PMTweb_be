const db = require('../../config/db');

class Project {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description || null;
        this.owner_id = data.owner_id || null;
        this.status = data.status || 'Not Started';
        this.start_date = data.start_date || null;
        this.end_date = data.end_date || null;
        this.created_at = data.created_at;
    }

    static async create({ name, description, owner_id, status = 'Not Started', start_date = null, end_date = null }) {
        // Validate status
        const validStatuses = ['Not Started', 'In Progress', 'Completed', 'Pending', 'Planned', 'Cancelled', 'Testing', 'In Review', 'Delayed'];
        const finalStatus = validStatuses.includes(status) ? status : 'Not Started';
        
        const query = `INSERT INTO prj (name, description, owner_id, status, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)`;
        const params = [
            name?.trim() || '', 
            description?.trim() || null, 
            owner_id || null, 
            finalStatus,
            start_date || null,
            end_date || null
        ];
        
        const [result] = await db.execute(query, params);
        
        const [rows] = await db.execute('SELECT * FROM prj WHERE id = ?', [result.insertId]);
        return new Project(rows[0]);
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM prj WHERE id = ?', [id]);
        if (rows.length === 0) return null;
        return new Project(rows[0]);
    }

    static async findAll() {
        const [rows] = await db.execute('SELECT * FROM prj ORDER BY created_at DESC');
        return rows.map(r => new Project(r));
    }

    async update(updateData) {
        const allowed = ['name', 'description', 'status', 'start_date', 'end_date'];
        const fields = [];
        const values = [];
        
        for (const [k, v] of Object.entries(updateData)) {
            if (allowed.includes(k) && v !== undefined) {
                fields.push(`${k} = ?`);
                
                // Special handling for different fields
                if (k === 'status') {
                    const validStatuses = ['Not Started', 'In Progress', 'Completed', 'Pending', 'Planned', 'Cancelled', 'Testing', 'In Review', 'Delayed'];
                    values.push(validStatuses.includes(v) ? v : 'Not Started');
                } else if (k === 'name') {
                    values.push(v?.trim() || '');
                } else if (k === 'description') {
                    values.push(v?.trim() || null);
                } else if (k === 'start_date' || k === 'end_date') {
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

    async delete() {
        await db.execute('DELETE FROM prj WHERE id = ?', [this.id]);
        return true;
    }

    // Check if project end_date has passed and update status to 'Completed' if needed
    async checkAndUpdateStatus() {
        // Only check if end_date exists and status is not already 'Completed' or 'Cancelled'
        if (this.end_date && 
            this.status !== 'Completed' && 
            this.status !== 'Cancelled') {
            
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of day for comparison
            
            const endDate = new Date(this.end_date);
            endDate.setHours(0, 0, 0, 0);
            
            // If end_date is in the past, update status to 'Completed'
            if (endDate < today) {
                await this.update({ status: 'Completed' });
                this.status = 'Completed';
                return true; // Status was updated
            }
        }
        return false; // Status was not updated
    }

    // Static method to check and update all expired projects
    static async checkAndUpdateExpiredProjects() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Update all projects where end_date < today and status is not 'Completed' or 'Cancelled'
            const [result] = await db.execute(`
                UPDATE prj 
                SET status = 'Completed' 
                WHERE end_date IS NOT NULL 
                  AND end_date < ? 
                  AND status NOT IN ('Completed', 'Cancelled')
            `, [today]);
            
            return result.affectedRows; // Return number of updated projects
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Error updating expired projects:', error);
            }
            throw error;
        }
    }
}

module.exports = Project;


