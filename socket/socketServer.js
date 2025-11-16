const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Comment = require('../models/commentModel/Comment');
const ProjectComment = require('../models/projectCommentModel/ProjectComment');
const User = require('../models/userModel/User');
const Notification = require('../models/notificationModel/Notification');

let io;

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    // Authentication middleware for socket
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            
            // JWT only contains userId, need to get user from database
            const user = await User.findById(decoded.userId);
            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            // Set user info on socket
            socket.userId = user.id;
            socket.userRole = user.role;
            socket.username = user.username;
            
            next();
        } catch (err) {
            console.error('Socket authentication error:', err);
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.username} (ID: ${socket.userId}, Role: ${socket.userRole})`);

        // Join task room
        socket.on('join-task', async (taskId) => {
            socket.join(`task-${taskId}`);
            console.log(`User ${socket.username} (${socket.userRole}) joined task-${taskId}`);
        });

        // Leave task room
        socket.on('leave-task', (taskId) => {
            socket.leave(`task-${taskId}`);
            console.log(`User ${socket.username} left task-${taskId}`);
        });

        // Handle new comment
        socket.on('new-comment', async (data) => {
            try {
                const { task_id, comment } = data;
                
                console.log(`New comment from ${socket.username} (${socket.userRole}):`, { task_id, comment: comment?.substring(0, 50) });
                
                // Validate required fields
                if (!task_id) {
                    return socket.emit('comment-error', { 
                        message: 'task_id là bắt buộc' 
                    });
                }
                
                if (!comment || !comment.trim()) {
                    return socket.emit('comment-error', { 
                        message: 'comment là bắt buộc' 
                    });
                }
                
                if (!socket.userId) {
                    return socket.emit('comment-error', { 
                        message: 'user_id là bắt buộc' 
                    });
                }
                
                // All authenticated users (including members) can create comments
                // No role-based restriction here
                
                // Create comment in database
                // Note: Comment.create() already returns the full comment with user info via findById
                const fullComment = await Comment.create({
                    task_id,
                    user_id: socket.userId,
                    comment: comment.trim()
                });
                
                if (!fullComment || !fullComment.id) {
                    throw new Error('Failed to create comment');
                }

                console.log(`Comment created successfully by ${socket.username} (${socket.userRole})`);
                console.log('Full comment data:', JSON.stringify(fullComment, null, 2));
                console.log(`Broadcasting to room: task-${task_id}`);

                // Broadcast to all users in the task room (including the sender)
                io.to(`task-${task_id}`).emit('comment-received', fullComment);
                
                // Also emit directly to the sender's socket to ensure they see their own message immediately
                socket.emit('comment-received', fullComment);
                
                console.log(`Comment broadcasted to task-${task_id} room and sender socket`);

                // Create notifications for task assignees (except comment author)
                // This would require getting task assignments
                // For now, we'll skip notification creation here
            } catch (error) {
                console.error('Error creating comment:', error);
                socket.emit('comment-error', { message: error.message });
            }
        });

        // Handle typing indicator
        socket.on('typing', (data) => {
            const { taskId, isTyping } = data;
            socket.to(`task-${taskId}`).emit('user-typing', {
                userId: socket.userId,
                username: socket.username,
                isTyping
            });
        });

        // ========== PROJECT CHAT HANDLERS ==========
        
        // Join project room
        socket.on('join-project', async (projectId) => {
            socket.join(`project-${projectId}`);
            console.log(`User ${socket.username} (${socket.userRole}) joined project-${projectId}`);
        });

        // Leave project room
        socket.on('leave-project', (projectId) => {
            socket.leave(`project-${projectId}`);
            console.log(`User ${socket.username} left project-${projectId}`);
        });

        // Handle new project comment
        socket.on('new-project-comment', async (data) => {
            try {
                const { project_id, comment } = data;
                
                console.log(`New project comment from ${socket.username} (${socket.userRole}):`, { project_id, comment: comment?.substring(0, 50) });
                
                // Validate required fields
                if (!project_id) {
                    return socket.emit('project-comment-error', { 
                        message: 'project_id là bắt buộc' 
                    });
                }
                
                if (!comment || !comment.trim()) {
                    return socket.emit('project-comment-error', { 
                        message: 'comment là bắt buộc' 
                    });
                }
                
                if (!socket.userId) {
                    return socket.emit('project-comment-error', { 
                        message: 'user_id là bắt buộc' 
                    });
                }
                
                // All authenticated users (including members) can create comments
                // No role-based restriction here
                
                // Create comment in database
                const fullComment = await ProjectComment.create({
                    project_id,
                    user_id: socket.userId,
                    comment: comment.trim()
                });
                
                if (!fullComment || !fullComment.id) {
                    throw new Error('Failed to create comment');
                }

                console.log(`Project comment created successfully by ${socket.username} (${socket.userRole})`);
                console.log('Full comment data:', JSON.stringify(fullComment, null, 2));
                console.log(`Broadcasting to room: project-${project_id}`);

                // Broadcast to all users in the project room (including the sender)
                io.to(`project-${project_id}`).emit('project-comment-received', fullComment);
                
                // Also emit directly to the sender's socket to ensure they see their own message immediately
                socket.emit('project-comment-received', fullComment);
                
                console.log(`Project comment broadcasted to project-${project_id} room and sender socket`);
            } catch (error) {
                console.error('Error creating project comment:', error);
                socket.emit('project-comment-error', { message: error.message });
            }
        });

        // Handle typing indicator for project
        socket.on('project-typing', (data) => {
            const { projectId, isTyping } = data;
            socket.to(`project-${projectId}`).emit('project-user-typing', {
                userId: socket.userId,
                username: socket.username,
                isTyping
            });
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.username} (${socket.userId})`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized');
    }
    return io;
};

module.exports = { initializeSocket, getIO };

