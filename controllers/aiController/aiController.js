const { GoogleGenerativeAI } = require('@google/generative-ai');

// Khởi tạo đối tượng Gemini AI với API key từ biến môi trường
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Hàm helper để loại bỏ định dạng markdown khỏi văn bản
const removeMarkdown = (text) => {
    if (!text) return text;
    let cleaned = text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*([^*\n]+?)\*/g, '$1')
        .replace(/^#{1,6}\s+(.+)$/gm, '$1')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/^\s*\d+\.\s+/gm, '')
        .replace(/\n{3,}/g, '\n\n');
    
    return cleaned.trim();
};

// Hàm chat với AI - Trợ lý trò chuyện về quản lý dự án phần mềm
const chatWithAI = async (req, res, next) => {
    try {
        const { messages, project_name } = req.body;

        // Kiểm tra API key đã cấu hình chưa
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({
                success: false,
                message: 'Gemini API key chưa được cấu hình'
            });
        }

        // Promt trò chuyện vói Ai
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.5-flash',
            systemInstruction: `Bạn là một trợ lý AI thông minh chuyên hỗ trợ quản lý dự án phần mềm theo quy trình SDLC (Software Development Life Cycle) chuẩn. Bạn có thể:
                - Trả lời các câu hỏi về quản lý dự án, phát triển phần mềm, công nghệ
                - Đề xuất các task và quy trình làm việc theo quy trình SDLC chuẩn
                - Tư vấn về best practices trong phát triển phần mềm
                - Trò chuyện tự nhiên và thân thiện
                - Hỗ trợ lập kế hoạch và tổ chức công việc

                QUY TRÌNH SDLC CHUẨN - 6 GIAI ĐOẠN:

                1. REQUIREMENT ANALYSIS - Phân tích yêu cầu
                Mục tiêu: Hiểu rõ "phần mềm phải làm gì"
                Công việc chính:
                - Thu thập yêu cầu từ khách hàng
                - Xác định chức năng chính, phụ
                - Ghi rõ nghiệp vụ (business flow)
                - Viết tài liệu: SRS (Software Requirement Specification), Use case diagram, User stories

                2. SYSTEM DESIGN - Thiết kế hệ thống
                Mục tiêu: Xây hình kiến trúc phần mềm
                Công việc chính:
                - Thiết kế kiến trúc (monolithic, microservice, v.v.)
                - Thiết kế Database (ERD, schema)
                - Thiết kế luồng xử lý (flowchart, sequence diagram)
                - Thiết kế UI/UX wireframe
                - Chọn công nghệ: React, Node, MySQL, Redis, v.v.

                3. IMPLEMENTATION - Lập trình
                Mục tiêu: Viết code theo thiết kế
                Công việc chính:
                - Xây dựng backend API
                - Xây dựng frontend UI
                - Áp dụng coding convention
                - Tích hợp bảo mật (auth, token, v.v.)
                - Viết unit test

                4. TESTING - Kiểm thử
                Mục tiêu: Đảm bảo phần mềm chạy đúng và ổn định
                Các loại test:
                - Unit test
                - Integration test
                - System test
                - UAT (User Acceptance Test - khách hàng nghiệm thu)
                - Performance test
                - Security test
                Kết quả: Viết test case, bug report, fix bug

                5. DEPLOYMENT - Triển khai
                Mục tiêu: Đưa phần mềm lên môi trường vận hành
                Các môi trường: Dev (phát triển), Staging (kiểm thử), Production (chính thức)
                Công việc chính:
                - Build & deploy qua CI/CD (GitHub Actions, GitLab CI, v.v.)
                - Cấu hình server (Docker, Nginx, v.v.)
                - Quản lý phiên bản (version control)

                6. MAINTENANCE - Bảo trì & cải tiến
                Mục tiêu: Vận hành, sửa lỗi, nâng cấp
                Công việc chính:
                - Theo dõi logs, lỗi
                - Cập nhật tính năng
                - Tối ưu hiệu năng
                - Hỗ trợ người dùng

                QUY TRÌNH LÀM VIỆC CỦA AI:
                1. BƯỚC ĐẦU TIÊN: Khi người dùng bắt đầu cuộc trò chuyện hoặc hỏi về dự án, bạn PHẢI giới thiệu quy trình SDLC với 6 giai đoạn trên và hỏi người dùng muốn bắt đầu từ giai đoạn nào hoặc muốn gợi ý tasks cho toàn bộ quy trình.

                2. KHI NGƯỜI DÙNG CHỌN GIAI ĐOẠN HOẶC YÊU CẦU GỢI Ý TASKS: Bạn PHẢI đưa ra danh sách các task cụ thể theo giai đoạn đã chọn, mỗi task nên:
                - Có tên ngắn gọn, rõ ràng (tối đa 50 ký tự)
                - Có mô tả ngắn gọn (1-2 câu) giải thích công việc cần làm
                - Được liệt kê theo thứ tự ưu tiên
                - Phù hợp với giai đoạn trong quy trình SDLC
                - Có thể thực thi được
                - Format: "1. Tên task: Mô tả ngắn gọn về công việc" hoặc "1. Tên task - Mô tả ngắn gọn"

                3. KHI CÓ TÊN DỰ ÁN: Nếu người dùng đề cập đến tên dự án cụ thể, bạn nên đưa ra gợi ý tasks phù hợp với loại dự án đó.

                QUAN TRỌNG: 
                - Hãy trả lời một cách tự nhiên, hữu ích và dễ hiểu
                - KHÔNG sử dụng markdown formatting (không dùng **, *, #, [], (), v.v.)
                - Trả lời bằng văn bản thuần túy, không có ký tự đặc biệt để format
                - Khi liệt kê tasks, sử dụng số thứ tự (1., 2., 3., v.v.) hoặc dấu gạch đầu dòng (-) để dễ nhận diện
                - Mỗi task nên có format: "Tên task: Mô tả" hoặc "Tên task - Mô tả" để dễ parse
                - Mỗi task nên được viết trên một dòng riêng để dễ parse
                - Luôn nhớ quy trình SDLC với 6 giai đoạn chính khi đưa ra gợi ý
                - Mô tả task nên ngắn gọn, rõ ràng, giải thích công việc cần làm`
        });

        // Lưu lịch sử hội thoại lại (nếu có), hoặc khởi tạo mảng rỗng
        let conversationHistory = messages || [];
        
        // Hàm helper kiểm tra nội dung message có phải là chọn mô hình phát triển phần mềm không
        const isModelSelection = (content) => {
            const lowerContent = content.toLowerCase();
            // Danh sách các mô hình phổ biến để AI nhận diện
            const models = ['scrum', 'waterfall', 'agile', 'kanban', 'devops', 'lean', 'xp', 'extreme programming', 'spiral', 'v-model'];
            // Kiểm tra nội dung có nhắc đến mô hình và động từ chọn/dùng/theo/áp dụng...
            return models.some(model => lowerContent.includes(model) && 
                (lowerContent.includes('chọn') || lowerContent.includes('dùng') || lowerContent.includes('theo') || 
                 lowerContent.includes('muốn') || lowerContent.includes('sử dụng') || lowerContent.includes('áp dụng')));
        };
        
        // Kiểm tra xem user đã chọn mô hình phát triển nào chưa (trong lịch sử, trừ message cuối cùng)
        const hasSelectedModel = conversationHistory.length > 1 && 
            conversationHistory.slice(0, -1).some(msg => {
                if (msg.role === 'user') {
                    return isModelSelection(msg.content);
                }
                return false;
            });
        
        // Nếu message rỗng (chưa có hội thoại), tự động gửi chào hỏi và giới thiệu quy trình SDLC
        // Frontend có thể điều khiển, back-end đảm bảo mặc định user luôn được gợi mở
        if (conversationHistory.length === 0) {
            const greeting = project_name 
                ? `Xin chào! Tôi đang làm việc với dự án "${project_name}". Bạn muốn tôi gợi ý các task theo quy trình SDLC (Software Development Life Cycle) chuẩn không? Quy trình gồm 6 giai đoạn: Phân tích yêu cầu, Thiết kế hệ thống, Lập trình, Kiểm thử, Triển khai, và Bảo trì.`
                : 'Xin chào! Tôi có thể giúp bạn quản lý dự án phần mềm theo quy trình SDLC (Software Development Life Cycle) chuẩn. Quy trình gồm 6 giai đoạn: Phân tích yêu cầu, Thiết kế hệ thống, Lập trình, Kiểm thử, Triển khai, và Bảo trì. Bạn muốn bắt đầu từ giai đoạn nào?';
            
            conversationHistory.push({
                role: 'user',
                content: greeting
            });
        }

        // Nếu có ít nhất 2 message trong hội thoại, dùng chat mode (trả lời giữ lịch sử)
        if (conversationHistory.length > 1) {
            // Xây dựng lịch sử hội thoại riêng cho Gemini (bỏ message cuối)
            const history = [];
            for (let i = 0; i < conversationHistory.length - 1; i++) {
                const msg = conversationHistory[i];
                const role = msg.role === 'user' ? 'user' : 'model';
                history.push({
                    role: role,
                    parts: [{ text: msg.content }]
                });
            }

            // Đảm bảo history bắt đầu với 'user' - Gemini yêu cầu history phải bắt đầu với 'user'
            let validHistory = [];
            
            // Tìm message 'user' đầu tiên và lấy từ đó
            let firstUserIndex = -1;
            for (let i = 0; i < history.length; i++) {
                if (history[i].role === 'user') {
                    firstUserIndex = i;
                    break;
                }
            }
            
            if (firstUserIndex >= 0) {
                // Lấy từ message 'user' đầu tiên trở đi
                validHistory = history.slice(firstUserIndex);
                
                // Đảm bảo validHistory có định dạng đúng: user, model, user, model, ...
                // Nếu có 2 message 'user' liên tiếp hoặc 2 message 'model' liên tiếp, chỉ lấy đến message hợp lệ cuối cùng
                for (let i = 1; i < validHistory.length; i++) {
                    if (validHistory[i].role === validHistory[i - 1].role) {
                        // Nếu có 2 message cùng role liên tiếp, cắt bỏ từ đây
                        validHistory = validHistory.slice(0, i);
                        break;
                    }
                }
            }
            
            // Nếu không có user message nào trong history, không dùng history
            if (validHistory.length === 0 || validHistory[0].role !== 'user') {
                validHistory = [];
            }

            // Khởi tạo chat với lịch sử hợp lệ
            const chat = model.startChat({
                history: validHistory.length > 0 ? validHistory : undefined,
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                },
            });

            const lastMessage = conversationHistory[conversationHistory.length - 1];
            
            // Đảm bảo lastMessage phải là từ user
            if (lastMessage.role !== 'user') {
                return res.status(400).json({
                    success: false,
                    message: 'Tin nhắn cuối cùng phải từ người dùng'
                });
            }
            
            // Nâng cấp prompt để AI luôn gợi ý theo quy trình SDLC
            let enhancedMessage = lastMessage.content;
            
            // Nếu user yêu cầu gợi ý tasks hoặc đề cập đến dự án, thêm hướng dẫn về SDLC
            const lowerContent = lastMessage.content.toLowerCase();
            const isRequestingTasks = lowerContent.includes('task') || 
                                     lowerContent.includes('công việc') || 
                                     lowerContent.includes('gợi ý') ||
                                     lowerContent.includes('đề xuất') ||
                                     lowerContent.includes('bắt đầu');
            
            if (isRequestingTasks || project_name) {
                enhancedMessage = `${lastMessage.content}\n\nHãy đưa ra gợi ý các task cụ thể theo quy trình SDLC chuẩn với 6 giai đoạn: Requirement Analysis, System Design, Implementation, Testing, Deployment, và Maintenance. Mỗi task nên được liệt kê rõ ràng với số thứ tự hoặc dấu gạch đầu dòng, tên task ngắn gọn (tối đa 50 ký tự), kèm theo mô tả ngắn gọn (1-2 câu) giải thích công việc cần làm. Format: "1. Tên task: Mô tả" hoặc "1. Tên task - Mô tả".`;
            }
            
            const result = await chat.sendMessage(enhancedMessage);
            const response = await result.response;
            let text = response.text();
            
            // Loại bỏ markdown, chỉ giữ plain text
            text = removeMarkdown(text);

            res.json({
                success: true,
                data: {
                    message: text,
                    role: 'assistant',
                    content: text
                }
            });
        } else {
            // Nếu chỉ có 1 message (thường là câu hỏi/mở đầu), dùng generateContent
            // Prompt mặc định để AI luôn ưu tiên giới thiệu các mô hình phát triển phần mềm
            const firstMessage = conversationHistory[0].content;
            
            // Thêm hướng dẫn yêu cầu AI giới thiệu quy trình SDLC và gợi ý tasks
            const enhancedFirstMessage = project_name
                ? `${firstMessage}\n\nHãy giới thiệu quy trình SDLC (Software Development Life Cycle) với 6 giai đoạn chính và đưa ra gợi ý các task cụ thể cho dự án "${project_name}" theo từng giai đoạn. Mỗi task nên được liệt kê rõ ràng với số thứ tự hoặc dấu gạch đầu dòng, tên task ngắn gọn kèm theo mô tả ngắn gọn (1-2 câu). Format: "1. Tên task: Mô tả" hoặc "1. Tên task - Mô tả".`
                : `${firstMessage}\n\nHãy giới thiệu quy trình SDLC (Software Development Life Cycle) với 6 giai đoạn chính: Requirement Analysis, System Design, Implementation, Testing, Deployment, và Maintenance. Sau đó đưa ra gợi ý các task cụ thể cho từng giai đoạn. Mỗi task nên được liệt kê rõ ràng với số thứ tự hoặc dấu gạch đầu dòng, tên task ngắn gọn kèm theo mô tả ngắn gọn (1-2 câu). Format: "1. Tên task: Mô tả" hoặc "1. Tên task - Mô tả".`;
            
            const result = await model.generateContent(enhancedFirstMessage);
            const response = await result.response;
            let text = response.text();
            
            // Loại bỏ markdown, chỉ giữ plain text
            text = removeMarkdown(text);

            res.json({
                success: true,
                data: {
                    message: text,
                    role: 'assistant',
                    content: text
                }
            });
        }
    } catch (err) {
        console.error('AI Chat Error:', err);
        next(err);
    }
};

// Hàm gợi ý task cho dự án dựa trên tên project (giữ lại để tương thích cũ)
const generateTaskSuggestions = async (req, res, next) => {
    try {
        const { project_name } = req.body;

        // Kiểm tra đầu vào có tên project không
        if (!project_name || !project_name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'project_name là bắt buộc'
            });
        }

        // Kiểm tra API key đã cài
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({
                success: false,
                message: 'Gemini API key chưa được cấu hình'
            });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Prompt cho Gemini yêu cầu xuất đề xuất task theo quy trình SDLC chuẩn
        const prompt = `Dựa trên quy trình SDLC (Software Development Life Cycle) chuẩn với 6 giai đoạn, hãy đề xuất danh sách các task cần quản lý cho dự án có tên: "${project_name.trim()}".

Quy trình SDLC gồm 6 giai đoạn:
1. Requirement Analysis - Phân tích yêu cầu
2. System Design - Thiết kế hệ thống
3. Implementation - Lập trình
4. Testing - Kiểm thử
5. Deployment - Triển khai
6. Maintenance - Bảo trì & cải tiến

Yêu cầu:
1. Liệt kê các task theo 6 giai đoạn SDLC trên
2. Mỗi task nên có tên ngắn gọn, rõ ràng (tối đa 50 ký tự)
3. Trả về dưới dạng JSON array với format:
[
  {
    "name": "Tên task",
    "description": "Mô tả ngắn gọn",
    "phase": "Requirement Analysis/System Design/Implementation/Testing/Deployment/Maintenance"
  }
]
4. Tối đa 20-25 tasks (phân bổ đều cho các giai đoạn)
5. Chỉ trả về JSON, không có text thêm`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Xử lý parse dữ liệu JSON từ phản hồi của AI
        let tasks = [];
        try {
            // Nếu trả về dạng code markdown có chứa [ dữ liệu ] thì lấy ra
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                tasks = JSON.parse(jsonMatch[0]);
            } else {
                tasks = JSON.parse(text);
            }
        } catch (parseError) {
            // Nếu không parse được JSON, trả lỗi kèm phản hồi gốc
            console.error('Error parsing AI response:', parseError);
            return res.status(500).json({
                success: false,
                message: 'Không thể parse phản hồi từ AI',
                raw_response: text
            });
        }

        // Kiểm tra lại task, cắt chuỗi cho đúng format, loại những task không hợp lệ
        const formattedTasks = tasks
            .filter(task => task.name && task.name.trim())
            .slice(0, 20)
            .map(task => ({
                name: task.name.trim().substring(0, 255),
                description: (task.description || '').trim().substring(0, 1000),
                phase: task.phase || 'Development'
            }));

        res.json({
            success: true,
            data: formattedTasks
        });
    } catch (err) {
        console.error('AI Error:', err);
        next(err);
    }
};

module.exports = {
    chatWithAI,
    generateTaskSuggestions
};
