const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Comment = require('../models/commentModel/Comment');
const ProjectComment = require('../models/projectCommentModel/ProjectComment');
const User = require('../models/userModel/User');
const Notification = require('../models/notificationModel/Notification');
const WorkspaceMember = require('../models/workspaceModel/WorkspaceMember');

let io;

/**
 * initializeSocket
 * Khởi tạo Socket.IO trên server truyền vào, thiết lập middleware xác thực,
 * set context cho socket (userId, username, userRole, workspaceId) khi client connect,
 * và định nghĩa các event handler cho việc tham gia/phát broadcast các sự kiện liên quan đến task, project, comment, typing.
 * 
 * Summary:
 * - Xác thực user qua JWT token từ client
 * - Lấy thông tin user, role trong workspace nếu có
 * - Lắng nghe các event: join-task, leave-task, new-comment, typing, join-project, leave-project, new-project-comment, project-typing, disconnect
 * - Broadcast sự kiện đến room phù hợp hoặc socket cá nhân
 */
const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL,
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    /**
     * Middleware xác thực và thiết lập context workspace cho socket.
     * @param {Socket} socket - Socket được tạo bởi client
     * @param {Function} next - Callback để chuyển đến nơi tiếp theo
     * 
     * Tóm tắt: Xác thực user từ token, lấy role và workspace_id từ database, set vào socket.
     */
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            const user = await User.findById(decoded.userId);
            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            socket.userId = user.id;
            socket.username = user.username;
            
            const workspaceId = socket.handshake.auth.workspace_id;
            if (process.env.NODE_ENV === 'development') {
                console.log(`Socket auth - User: ${user.username}, Workspace ID from handshake:`, workspaceId);
            }
            
            if (workspaceId) {
                const workspaceMember = await WorkspaceMember.findByWorkspaceAndUser(
                    parseInt(workspaceId),
                    user.id
                );
                if (workspaceMember) {
                    socket.userRole = workspaceMember.role;
                    socket.workspaceId = parseInt(workspaceId);
                    if (process.env.NODE_ENV === 'development') {
                        console.log(`Socket auth - Found workspace member, role: ${workspaceMember.role}`);
                    }
                } else {
                    socket.userRole = user.role;
                    socket.workspaceId = null;
                    if (process.env.NODE_ENV === 'development') {
                        console.log(`Socket auth - Not a workspace member, using global role: ${user.role}`);
                    }
                }
            } else {
                socket.userRole = user.role;
                socket.workspaceId = null;
                if (process.env.NODE_ENV === 'development') {
                    console.log(`Socket auth - No workspace_id provided, using global role: ${user.role}`);
                }
            }
            
            next();
        } catch (err) {
            console.error('Socket authentication error:', err);
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.username} (ID: ${socket.userId}, Role: ${socket.userRole})`);

        socket.on('join-task', async (taskId) => {
            socket.join(`task-${taskId}`);
            console.log(`User ${socket.username} (${socket.userRole}) joined task-${taskId}`);
        });

        socket.on('leave-task', (taskId) => {
            socket.leave(`task-${taskId}`);
            console.log(`User ${socket.username} left task-${taskId}`);
        });

        socket.on('new-comment', async (data) => {
            try {
                const { task_id, comment } = data;
                
                console.log(`New comment from ${socket.username} (${socket.userRole}):`, { task_id, comment: comment?.substring(0, 50) });
                
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

                io.to(`task-${task_id}`).emit('comment-received', fullComment);
                socket.emit('comment-received', fullComment);
                console.log(`Comment broadcasted to task-${task_id} room and sender socket`);

            } catch (error) {
                console.error('Error creating comment:', error);
                socket.emit('comment-error', { message: error.message });
            }
        });

        socket.on('typing', (data) => {
            const { taskId, isTyping } = data;
            socket.to(`task-${taskId}`).emit('user-typing', {
                userId: socket.userId,
                username: socket.username,
                isTyping
            });
        });


        socket.on('join-project', async (projectId) => {
            socket.join(`project-${projectId}`);
            console.log(`User ${socket.username} (${socket.userRole}) joined project-${projectId}`);
        });

        socket.on('leave-project', (projectId) => {
            socket.leave(`project-${projectId}`);
            console.log(`User ${socket.username} left project-${projectId}`);
        });

        socket.on('new-project-comment', async (data) => {
            try {
                const { project_id, comment } = data;
                
                console.log(`New project comment from ${socket.username} (${socket.userRole}):`, { project_id, comment: comment?.substring(0, 50) });
                
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

                io.to(`project-${project_id}`).emit('project-comment-received', fullComment);
                
                socket.emit('project-comment-received', fullComment);
                
                console.log(`Project comment broadcasted to project-${project_id} room and sender socket`);
            } catch (error) {
                console.error('Error creating project comment:', error);
                socket.emit('project-comment-error', { message: error.message });
            }
        });

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
