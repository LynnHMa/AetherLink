# AetherLink

AetherLink 是一个成熟、美观且功能丰富的 Web 客户端，专为连接兼容 OpenAI 格式的大语言模型 (LLM) API 而设计。它支持流畅的文本流式输出对话以及图像生成功能，并采用了精致的“优雅暗黑” (Elegant Dark) 主题设计。

> ✨ **特别说明**：本项目是完全 **vibe 出来的**！(Vibe-coded via AI)

## ✨ 主要特性

- **💬 文本对话 (Chat)**: 支持标准的 LLM 对话补全，支持流式输出 (Streaming) 以实现打字机效果。
- **🎨 图像生成 (Image)**: 支持切换到图片模式，通过 prompt 提示词直接生成并预览图片（支持类似 DALL-E、GPT-2 等接入标准绘图接口的模型）。
- **⚙️ 高度可配置 (Customizable)**: 
  - 支持自定义 API Base URL（例如：`https://api.openai.com/v1` 或其他第三方中转 API 服务）。
  - 支持绑定自定义 API Key。
  - 支持动态添加或删除文本模型和图像模型的名称，方便在多个模型之间无缝切换。
- **🌙 优雅暗黑主题 (Elegant Dark)**: 提供极客风格的深色 UI，包括精致的排版、毛玻璃效果和柔和的交互动画。
- **📱 响应式设计 (Responsive)**: 兼容桌面端和移动端，随时随地在任何设备上使用。
- **🔒 隐私安全**: 密钥和配置信息仅保存在您的本地浏览器中 (Local Storage)。

## 🚀 快速开始

### 1. 配置参数
点击界面左下角的 **"设置 (Settings)"** 按钮，填写以下内容：
- **Base URL**: 您的 API 接口地址。
- **API Key**: 对应的访问密钥 (如 `sk-...`)。
- **Model**: 可以输入并添加需要的使用的文本模型（默认提供 `claude-opus-4.7`, `gpt-4o-latest` 等）和图像模型名称（如 `dall-e-3`）。保存好设置即可！

### 2. 模式切换
- 在输入框上方的按钮可以切换 **Chat (文本模式)** 和 **Image (图像模式)**。
- Chat 模式下按 `Enter` 发送消息，按 `Shift + Enter` 换行。

## 🛠 技术栈

- **Frontend**: React (Vite), Tailwind CSS, Lucide React (图标)
- **Backend**: Express (Node.js) - 提供轻量级的 API 请求代理以解决跨域 (CORS) 与流式数据透传问题。
- **Markdown Rendering**: `react-markdown` 配合 `remark-gfm` 实现优秀的代码与文本块高亮解析。
