import { getAiClient, getApiSettings } from './api/geminiClient';
import { incrementApiCallCount } from '../utils/apiUsageTracker';

export async function generateImageWithImagen4(prompt: string): Promise<string> {
  const geminiAi = getAiClient();
  incrementApiCallCount('IMAGE_GENERATION');
  try {
    const response = await geminiAi.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: { numberOfImages: 1, outputMimeType: 'image/png' },
    });

    if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image?.imageBytes) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return base64ImageBytes;
    } else {
      console.error("No image data found in API response. Response:", response);
      throw new Error("Không tìm thấy dữ liệu ảnh trong phản hồi từ API. Vui lòng thử lại hoặc kiểm tra mô tả của bạn.");
    }

  } catch (error) {
    console.error("Lỗi khi tạo ảnh bằng Gemini API (generateImages):", error);
    const errorContext = error as any;
    let userMessage = "Lỗi không xác định khi tạo ảnh.";

    if (errorContext?.message) {
        userMessage = errorContext.message;
        if (userMessage.includes("API key not valid") || userMessage.includes("PERMISSION_DENIED") || userMessage.includes("API_KEY_INVALID")) {
            userMessage = `Lỗi API: API key không hợp lệ hoặc không có quyền truy cập. Vui lòng kiểm tra lại API_KEY. Chi tiết: ${userMessage}`;
        } else if (userMessage.includes("Model not found") || userMessage.includes("does not exist") || userMessage.includes("model is not supported")) {
            userMessage = `Lỗi API: 'imagen-4.0-generate-001' không được tìm thấy hoặc không được hỗ trợ. Chi tiết: ${userMessage}`;
        } else if (userMessage.toLowerCase().includes("quota") || errorContext?.status === 429) {
            userMessage = `Lỗi API: Đã vượt quá hạn ngạch sử dụng. Vui lòng thử lại sau. Chi tiết: ${userMessage}`;
        } else if (userMessage.includes("prompt was blocked")) {
            userMessage = `Lỗi API: Mô tả của bạn có thể đã vi phạm chính sách nội dung. Vui lòng thử mô tả khác. Chi tiết: ${userMessage}`;
        } else {
            userMessage = `Lỗi tạo ảnh: ${userMessage}`;
        }
    }
    throw new Error(userMessage);
  }
}

export async function generateImageUnified(prompt: string): Promise<string> {
    const { avatarGenerationEngine } = getApiSettings();
    if (avatarGenerationEngine === 'imagen-4.0-generate-001') {
        return generateImageWithImagen4(prompt);
    }
    // Fallback or other engines can be added here
    return generateImageWithImagen4(prompt);
}
