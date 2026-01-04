const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// system instruction cho chat AI, phục vụ hướng dẫn cách trả lời, format, và phong cách
const SYSTEM_INSTRUCTION = `Bạn là một trợ lý AI thân thiện, giống như một người bạn đồng nghiệp trong lĩnh vực công nghệ và quản lý dự án.
	CÁCH TRÒ CHUYỆN:
		- Trò chuyện tự nhiên, thân thiện, không cứng nhắc
		- Trả lời bằng văn bản thuần túy, KHÔNG dùng markdown (**bold**, *italic*, ##heading, etc.)
		- Hỏi lại khi cần thêm thông tin, giống như đang trò chuyện với bạn bè
		- Không bắt buộc phải đề xuất tasks cho mọi câu hỏi
	KHI NGƯỜI DÙNG HỎI VỀ DỰ ÁN:
		- Hỏi thêm về lĩnh vực, mục đích của dự án
		- Gợi ý công nghệ, kiến trúc phù hợp nếu cần
		- Khi người dùng muốn bắt đầu làm việc cụ thể, gợi ý các bước SDLC:
		+ Requirement Analysis (Phân tích yêu cầu)
		+ Design (Thiết kế hệ thống)
		+ Implementation (Lập trình)
		+ Testing (Kiểm thử)
		+ Deployment (Triển khai)
		+ Maintenance (Bảo trì)
	KHI GỢI Ý TASKS CHI TIẾT:
		- Liệt kê từng task với format: "1. Tên task: Mô tả ngắn gọn"
		- Nhóm theo giai đoạn SDLC
		- Ví dụ:
			Requirement Analysis:
			1. Thu thập yêu cầu: Phỏng vấn người dùng, liệt kê chức năng cần có
			2. Viết tài liệu SRS: Tạo tài liệu mô tả yêu cầu chi tiết
			Design:
			3. Thiết kế Database: Vẽ ERD, xác định các bảng và quan hệ
			4. Thiết kế UI/UX: Vẽ wireframe, mockup cho giao diện
	LỆNH ĐẶC BIỆT:
	- Khi người dùng gõ "/export", trả về danh sách tasks dạng JSON với format:
	{
		"Requirement Analysis": ["Task 1", "Task 2", "Task 3"],
		"Design": ["Task 4", "Task 5"],
		"Implementation": ["Task 6", "Task 7", "Task 8"],
		"Testing": ["Task 9", "Task 10"],
		"Deployment": ["Task 11", "Task 12"],
		"Maintenance": ["Task 13", "Task 14"]
	}
	VÍ DỤ TRÒ CHUYỆN:
		User: "Tôi muốn tạo project mới"
		AI: "Tuyệt! Bạn định làm project về lĩnh vực gì?"
		User: "Hệ thống quản lý đơn hàng"
		AI: "Hay quá! Với hệ thống quản lý đơn hàng, bạn cần những chức năng chính như: tạo đơn, theo dõi trạng thái, quản lý khách hàng, báo cáo... Bạn muốn tôi gợi ý các bước phát triển theo SDLC không?"
		User: "Có"
		AI: "Ok! Đây là các bước cơ bản:
			- Requirement Analysis: Thu thập yêu cầu, liệt kê chức năng
			- Design: Vẽ sơ đồ ER, thiết kế UI/UX
			- Implementation: Lập trình backend & frontend
			- Testing: Viết testcase, kiểm thử
			- Deployment: Triển khai lên server
			- Maintenance: Theo dõi bug, nâng cấp
		Bạn muốn tôi chi tiết tasks cho từng bước không?"
	LƯU Ý:
	- Giữ phong cách trò chuyện tự nhiên, không quá kỹ thuật
	- Chỉ đi sâu vào chi tiết khi người dùng yêu cầu
	- Có thể hỏi ngắn gọn, không cần câu dài`;

// Định nghĩa các phase của quy trình SDLC (dùng cho AI sinh tasks)
const SDLC_PHASES = {
	"Requirement Analysis":
		"Thu thập và phân tích yêu cầu - Hiểu bài toán, xác định phạm vi, viết SRS, use case, user story",
	"System & Technical Design":
		"Thiết kế hệ thống - Kiến trúc, database, API, UI/UX, lựa chọn công nghệ",
	"Development":
		"Phát triển - Lập trình backend, frontend, tích hợp hệ thống, code review",
	"Testing & Quality Assurance":
		"Đảm bảo chất lượng - Unit test, integration test, UAT, kiểm tra hiệu năng và bảo mật",
	"Deployment & Release":
		"Triển khai - Build, CI/CD, cấu hình môi trường, phát hành sản phẩm",
	"Maintenance & Improvement":
		"Vận hành & cải tiến - Fix bug, theo dõi hệ thống, tối ưu và nâng cấp tính năng",
};

const VALID_PHASES = Object.keys(SDLC_PHASES);

const JSON_TEMPLATE = `[
  {
    "name": "Tên task ngắn gọn",
    "description": "Mô tả ngắn gọn về công việc cần làm",
    "phase": "Requirement Analysis"
  }
]`;

// Hàm loại bỏ định dạng Markdown trong text trả về từ AI
const removeMarkdown = (text) => {
	if (!text) return text;
	let cleaned = text
		.replace(/\*\*(.*?)\*\*/g, "$1")
		.replace(/\*([^*\n]+?)\*/g, "$1")
		.replace(/^#{1,6}\s+(.+)$/gm, "$1")
		.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/```[\s\S]*?```/g, "")
		.replace(/^\s*[-*+]\s+/gm, "")
		.replace(/^\s*\d+\.\s+/gm, "")
		.replace(/\n{3,}/g, "\n\n");

	return cleaned.trim();
};

// Giới hạn độ dài mô tả task nhưng không cắt giữa câu/cụm
const truncateDescription = (text, maxLength = 1000) => {
	if (!text || text.length <= maxLength) return text;
	let truncated = text.substring(0, maxLength);
	const lastPeriod = truncated.lastIndexOf(".");
	const lastNewline = truncated.lastIndexOf("\n");
	const cutPoint = Math.max(lastPeriod, lastNewline);

	if (cutPoint > maxLength * 0.7) {
		return truncated.substring(0, cutPoint + 1).trim();
	}

	return truncated.trim() + "...";
};

// Kiểm tra phase có thuộc danh sách hợp lệ hay không
const isValidPhase = (phase) => {
	return VALID_PHASES.includes(phase);
};

// Hàm nhận biết input quá mơ hồ từ user (câu hỏi trống/bị bỏ qua)
const detectAmbiguousInput = (message) => {
	if (!message || message.trim().length === 0) {
		return {
			isAmbiguous: true,
			suggestion: "Vui lòng cho tôi biết bạn cần hỗ trợ gì?",
		};
	}
	return { isAmbiguous: false };
};

// Parse tasks từ text trả về của AI (dạng liệt kê/phân theo phase)
const parseTasksFromResponse = (aiResponse) => {
	if (!aiResponse) return [];

	const tasks = [];
	const lines = aiResponse.split("\n");
	let currentPhase = null;
	let currentSection = null;

	// Regex nhận diện tiêu đề giai đoạn/section/task
	const phasePattern =
		/^(?:Giai đoạn\s*\d+|Phase\s*\d+)[\s:]*(.+?)(?:\s*-\s*(.+))?$/i;
	const sectionPattern =
		/^(?:\*\*)?([A-Z\s]+(?:ANALYSIS|DESIGN|IMPLEMENTATION|TESTING|DEPLOYMENT|MAINTENANCE))(?:\*\*)?[\s:]*(?:-\s*(.+))?$/i;
	const taskPattern = /^(\d+)[\.\)]\s*(.+?)[\s:：-]+(.+)$/;
	const simpleTaskPattern = /^(\d+)[\.\)]\s*(.+)$/;

	// Duyệt từng dòng và parse phase/task
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const phaseMatch = line.match(phasePattern);
		if (phaseMatch) {
			currentPhase = phaseMatch[1].trim();
			currentSection = mapToSDLCPhase(currentPhase);
			continue;
		}

		const sectionMatch = line.match(sectionPattern);
		if (sectionMatch) {
			currentSection = mapToSDLCPhase(sectionMatch[1].trim());
			continue;
		}

		const taskMatch = line.match(taskPattern);
		if (taskMatch) {
			const taskName = taskMatch[2].trim();
			const taskDesc = taskMatch[3].trim();

			if (taskName.length < 5 || taskName === taskName.toUpperCase()) {
				continue;
			}

			tasks.push({
				name: taskName.substring(0, 255),
				description: taskDesc.substring(0, 1000),
				phase: currentSection || "Implementation",
			});
			continue;
		}

		const simpleMatch = line.match(simpleTaskPattern);
		if (simpleMatch) {
			const taskName = simpleMatch[2].trim();

			if (taskName.length < 5 || taskName === taskName.toUpperCase()) {
				continue;
			}

			let description = "";
			if (i + 1 < lines.length) {
				const nextLine = lines[i + 1].trim();
				if (nextLine && !nextLine.match(/^\d+[\.\)]/)) {
					description = nextLine;
				}
			}

			tasks.push({
				name: taskName.substring(0, 255),
				description: description.substring(0, 1000) || taskName,
				phase: currentSection || "Implementation",
			});
		}
	}

	return tasks;
};

// Map string text sang tên phase SDLC chuẩn (kể cả tiếng Anh/Việt)
const mapToSDLCPhase = (text) => {
	if (!text) return null;

	const normalized = text.toLowerCase().trim();

	// Quy tắc mapping từ từ khoá sang phase chuẩn
	const phaseMap = {
	  requirement: "Requirement Analysis",
	  "yêu cầu": "Requirement Analysis",
	  "phân tích": "Requirement Analysis",
	  analysis: "Requirement Analysis",
	
	  design: "System & Technical Design",
	  "thiết kế": "System & Technical Design",
	  architecture: "System & Technical Design",
	  technical: "System & Technical Design",
	
	  implementation: "Development",
	  development: "Development",
	  coding: "Development",
	  "lập trình": "Development",
	
	  testing: "Testing & Quality Assurance",
	  test: "Testing & Quality Assurance",
	  qa: "Testing & Quality Assurance",
	  "kiểm thử": "Testing & Quality Assurance",
	
	  deployment: "Deployment & Release",
	  deploy: "Deployment & Release",
	  release: "Deployment & Release",
	  "triển khai": "Deployment & Release",
	
	  maintenance: "Maintenance & Improvement",
	  maintain: "Maintenance & Improvement",
	  improvement: "Maintenance & Improvement",
	  "bảo trì": "Maintenance & Improvement",
	};

	for (const [key, phase] of Object.entries(phaseMap)) {
		if (normalized.includes(key)) {
			return phase;
		}
	}

	return null;
};

// Hàm phân loại loại nội dung trả về: danh sách task hay chỉ là trình bày chung/info
const analyzeResponse = (aiResponse, userMessage) => {
	if (!aiResponse) {
		return { type: "info", tasks: [] };
	}

	const lowerResponse = aiResponse.toLowerCase();
	const parsedTasks = parseTasksFromResponse(aiResponse);

	if (parsedTasks.length >= 3) {
		return {
			type: "task_list",
			tasks: parsedTasks,
		};
	}
	const numberedItems = aiResponse.match(/^\s*\d+[\.\)]/gm);
	if (numberedItems && numberedItems.length >= 3) {
		return {
			type: "task_list",
			tasks: parsedTasks, 
		};
	}
	
	const sdlcKeywords = [
		/requirement analysis/i,
		/system design/i,
		/implementation/i,
		/testing/i,
		/deployment/i,
		/maintenance/i,
		/giai đoạn/i,
	];

	const hasSDLCKeywords = sdlcKeywords.some((pattern) =>
		pattern.test(lowerResponse)
	);
	if (hasSDLCKeywords && numberedItems && numberedItems.length >= 2) {
		return {
			type: "task_list",
			tasks: parsedTasks,
		};
	}

	return {
		type: "info",
		tasks: [],
	};
};


// Chuẩn hoá lịch sử tin nhắn thành format chat Gemini yêu cầu
const normalizeHistory = (messages) => {
	if (!messages || messages.length === 0) return [];

	const history = [];

	for (const msg of messages) {
		const role = msg.role === "user" ? "user" : "model";
		const content = msg.content || "";

		history.push({
			role: role,
			parts: [{ text: content }],
		});
	}

	if (history.length > 0 && history[0].role !== "user") {
		history.shift();
	}

	while (history.length > 1 && history[0].role === "model") {
		history.shift();
	}

	return history;
};


// Xử lý hội thoại AI và trả lời cho người dùng (gửi/nhận messages)
const chatWithAI = async (req, res, next) => {
	try {
		const { messages, project_name, user_projects } = req.body;
		if (!process.env.GEMINI_API_KEY) {
			return res.status(500).json({
				success: false,
				message: "Gemini API key chưa được cấu hình",
			});
		}

		const genAIInstance = getGenAI();
		const model = genAIInstance.getGenerativeModel({
			model: "gemini-1.5-flash", 
		});

		let conversationHistory = messages || [];
		// Nếu chưa có lịch sử chat, trả lời chào đầu tiên (Greeting)
		if (conversationHistory.length === 0) {
			let greeting =
				"Xin chào! Tôi là trợ lý AI của bạn. Tôi có thể giúp bạn lập kế hoạch và quản lý dự án. Bạn muốn làm gì hôm nay?";

			if (user_projects && user_projects.length > 0) {
				greeting +=
					"\n\nBạn có thể:\n- Bắt đầu một dự án mới\n- Phát triển dự án có sẵn\n";
				greeting += `\nDự án hiện có: ${user_projects
					.map((p) => p.name)
					.join(", ")}`;
			}

			return res.json({
				success: true,
				data: {
					message: greeting,
					role: "assistant",
					content: greeting,
					type: "info",
				},
			});
		}

		const lastMessage = conversationHistory[conversationHistory.length - 1];

		// Tin nhắn cuối phải là từ người dùng
		if (lastMessage.role !== "user") {
			return res.status(400).json({
				success: false,
				message: "Tin nhắn cuối cùng phải từ người dùng",
			});
		}

		const userMessage = lastMessage.content.trim();
		// Lệnh /export: trả về JSON mẫu các task SDLC
		if (userMessage.toLowerCase().startsWith("/export")) {
			let projectContext = "";
			for (let i = conversationHistory.length - 1; i >= 0; i--) {
				const msg = conversationHistory[i];
				if (
					msg.content &&
					(msg.content.includes("dự án") ||
						msg.content.includes("project") ||
						msg.content.includes("hệ thống"))
				) {
					projectContext = msg.content;
					break;
				}
			}

			// JSON SDLC mẫu theo từng phase
			const tasksJSON = {
				"Requirement Analysis": [
					"Thu thập yêu cầu từ stakeholders",
					"Phỏng vấn người dùng cuối",
					"Viết tài liệu SRS (Software Requirement Specification)",
					"Vẽ Use case diagram",
				],
				Design: [
					"Thiết kế kiến trúc hệ thống",
					"Thiết kế database ERD",
					"Thiết kế UI/UX wireframe",
					"Chọn công nghệ và framework",
				],
				Implementation: [
					"Setup project và cấu hình môi trường",
					"Xây dựng backend API",
					"Phát triển frontend UI",
					"Tích hợp frontend và backend",
					"Code review và refactoring",
				],
				Testing: [
					"Viết unit tests",
					"Integration testing",
					"System testing",
					"User Acceptance Testing (UAT)",
				],
				Deployment: [
					"Setup server và môi trường production",
					"Cấu hình CI/CD pipeline",
					"Deploy lên production",
					"Kiểm tra và monitoring",
				],
				Maintenance: [
					"Theo dõi logs và lỗi",
					"Fix bugs được báo cáo",
					"Cập nhật và nâng cấp tính năng",
					"Tối ưu hiệu năng",
				],
			};

			const jsonString = JSON.stringify(tasksJSON, null, 2);

			return res.json({
				success: true,
				data: {
					message: `Đây là danh sách tasks theo SDLC dạng JSON:\n\n${jsonString}\n\nBạn có thể copy JSON này để import vào hệ thống.`,
					role: "assistant",
					content: `Đây là danh sách tasks theo SDLC dạng JSON:\n\n${jsonString}\n\nBạn có thể copy JSON này để import vào hệ thống.`,
					type: "export",
					export_data: tasksJSON,
				},
			});
		}

		const history = normalizeHistory(conversationHistory.slice(0, -1));
		let enhancedMessage = userMessage;
		if (project_name) {
			enhancedMessage = `[Dự án hiện tại: ${project_name}]\n\n${userMessage}`;
		}

		if (history.length === 0) {
			enhancedMessage = `${SYSTEM_INSTRUCTION}\n\n---\n\nUser: ${enhancedMessage}`;
		}

		const chat = model.startChat({
			history: history,
			generationConfig: {
				temperature: 0.1, 
				topK: 40,
				topP: 0.95,
				maxOutputTokens: 2048,
			},
		});

		const result = await chat.sendMessage(enhancedMessage);
		const response = await result.response;
		let text = response.text();

		text = removeMarkdown(text);

		const analysis = analyzeResponse(text, userMessage);

		res.json({
			success: true,
			data: {
				message: text,
				role: "assistant",
				content: text,
				type: analysis.type,
				tasks: analysis.tasks,
			},
		});
	} catch (err) {
		console.error("AI Chat Error:", err);

		if (err.message && err.message.includes("API key")) {
			return res.status(500).json({
				success: false,
				message: "Lỗi xác thực API key",
			});
		}

		if (
			err.message &&
			(err.message.includes("429") || err.message.includes("quota"))
		) {
			return res.status(429).json({
				success: false,
				message: "Đã vượt quá giới hạn requests. Vui lòng thử lại sau.",
				error: "QUOTA_EXCEEDED",
			});
		}

		next(err);
	}
};

// Tạo gợi ý danh sách task phù hợp cho dự án dựa trên context gửi lên
const generateTaskSuggestions = async (req, res, next) => {
	try {
		const { project_name, project_context } = req.body;

		if (!project_name || !project_name.trim()) {
			return res.status(400).json({
				success: false,
				message: "project_name là bắt buộc",
			});
		}
		if (!process.env.GEMINI_API_KEY) {
			return res.status(500).json({
				success: false,
				message: "Gemini API key chưa được cấu hình",
			});
		}

		const genAIInstance = getGenAI();
		const model = genAIInstance.getGenerativeModel({
			model: "gemini-1.5-flash", 
		});

		let projectInfo = `Tên dự án: ${project_name.trim()}`;

		if (project_context) {
			if (project_context.description) {
				projectInfo += `\nMô tả: ${project_context.description}`;
			}
			if (project_context.technology) {
				projectInfo += `\nCông nghệ sử dụng: ${project_context.technology}`;
			}
			if (project_context.team_size) {
				projectInfo += `\nQuy mô team: ${project_context.team_size} người`;
			}
			if (project_context.deadline) {
				projectInfo += `\nThời hạn: ${project_context.deadline}`;
			}
		}

		// Prompt chi tiết gửi cho AI
		const prompt = `Dựa trên quy trình SDLC (Software Development Life Cycle) chuẩn với 6 giai đoạn, hãy đề xuất danh sách các task cần quản lý cho dự án sau:
			${projectInfo}
			THÔNG TIN VỀ 6 GIAI ĐOẠN SDLC:
			${Object.entries(SDLC_PHASES)
				.map(([phase, desc]) => `- ${phase}: ${desc}`)
				.join("\n")}
			YÊU CẦU:
			1. Tạo khoảng 18–22 tasks, hệ thống sẽ tự chọn 20 task phù hợp nhất, phân bổ đều cho 6 giai đoạn SDLC (khoảng 3-4 tasks/giai đoạn)
			2. Mỗi task phải có:
			   - name: Tên ngắn gọn, rõ ràng (tối đa 50 ký tự)
			   - description: Mô tả cụ thể công việc cần làm (1-3 câu)
			   - phase: Phải thuộc 1 trong 6 giai đoạn: ${VALID_PHASES.join(", ")}
			3. Tasks phải thực tế, khả thi, phù hợp với context dự án
			4. Ưu tiên các tasks quan trọng và cần thiết nhất
			5. QUAN TRỌNG: Chỉ trả về JSON array thuần túy, KHÔNG có text mở đầu, giải thích, hoặc kết thúc
			VÍ DỤ FORMAT JSON MONG MUỐN (ĐÚNG):
			${JSON_TEMPLATE}
			SAI: không được thêm text như "Dưới đây là...", "json code block", "Hy vọng...", etc.
			Tạo khoảng 18–22 tasks, hệ thống sẽ tự chọn 20 task phù hợp nhất;`;

		const result = await model.generateContent(prompt);
		const response = await result.response;
		const text = response.text();

		let tasks = [];
		let parseError = null;

		// Try/catch parsing JSON trả về từ AI
		try {
			tasks = JSON.parse(text);
		} catch (e1) {
			try {
				const jsonMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
				if (jsonMatch) {
					tasks = JSON.parse(jsonMatch[1]);
				} else {
					const simpleMatch = text.match(/\[[\s\S]*\]/);
					if (simpleMatch) {
						tasks = JSON.parse(simpleMatch[0]);
					} else {
						throw new Error("Không tìm thấy JSON array trong response");
					}
				}
			} catch (e2) {
				parseError = e2;
				console.error("Error parsing AI response:", e2);
				console.error("Raw response:", text);
			}
		}

		// Nếu không parse được, trả lỗi
		if (parseError || !Array.isArray(tasks)) {
			return res.status(500).json({
				success: false,
				message: "Không thể parse phản hồi từ AI",
				error: parseError?.message,
				raw_response: text.substring(0, 500),
			});
		}

		// Chuẩn hoá, lọc và giới hạn danh sách task phù hợp
		const formattedTasks = tasks
			.filter((task) => {
				if (!task.name || !task.name.trim()) return false;

				if (task.phase && !isValidPhase(task.phase)) {
					console.warn(`Invalid phase "${task.phase}" for task "${task.name}"`);
					return false;
				}

				return true;
			})
			.slice(0, 20)
			.map((task) => ({
				name: task.name.trim().substring(0, 255),
				description: truncateDescription(task.description || "", 1000),
				phase: task.phase || "Implementation",
			}));

		// Kiểm tra số lượng task hợp lệ tối thiểu trước khi trả ra ngoài
		if (formattedTasks.length === 0) {
			return res.status(500).json({
				success: false,
				message: "AI không tạo được task hợp lệ nào",
				raw_response: text.substring(0, 500),
			});
		}

		res.json({
			success: true,
			data: formattedTasks,
			meta: {
				total_tasks: formattedTasks.length,
				phases_distribution: VALID_PHASES.reduce((acc, phase) => {
					acc[phase] = formattedTasks.filter((t) => t.phase === phase).length;
					return acc;
				}, {}),
			},
		});
	} catch (err) {
		console.error("AI Error:", err);

		if (err.message && err.message.includes("API key")) {
			return res.status(500).json({
				success: false,
				message: "Lỗi xác thực API key",
			});
		}

		if (
			err.message &&
			(err.message.includes("429") ||
				err.message.includes("quota") ||
				err.message.includes("Too Many Requests"))
		) {
			return res.status(429).json({
				success: false,
				message:
					"Đã vượt quá giới hạn requests của Gemini API. Vui lòng thử lại sau.",
				error: "QUOTA_EXCEEDED",
			});
		}

		next(err);
	}
};

module.exports = {
	chatWithAI,
	generateTaskSuggestions,
};
