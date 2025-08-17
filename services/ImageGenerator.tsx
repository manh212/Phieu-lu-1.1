
import { GoogleGenAI } from "@google/genai";
import { getApiSettings } from './geminiService';
import { incrementApiCallCount } from '../utils/apiUsageTracker';

const IMAGE_MODEL_NAME = 'imagen-3.0-generate-002'; // Updated model to guideline-specified one
let ai: GoogleGenAI | null = null;

function getAiInstance(): GoogleGenAI {
  const settings = getApiSettings();
  const effectiveApiKey = settings.apiKeySource === 'system' 
    ? process.env.API_KEY 
    : settings.userApiKeys.find(k => k && k.trim() !== '') || process.env.API_KEY;

  if (!effectiveApiKey) {
    throw new Error("API Key chưa được cấu hình. Vui lòng kiểm tra cài đặt API hoặc biến môi trường API_KEY.");
  }
  
  // Re-initialize if the key has changed
  if (!ai || (ai as any)._apiKey !== effectiveApiKey) {
      ai = new GoogleGenAI({ apiKey: effectiveApiKey });
  }

  return ai;
}

/**
 * Generates an image from a text prompt using the specified Imagen model.
 * @param prompt The text prompt to generate the image from.
 * @returns A Promise that resolves to the base64 encoded string of the generated image (without data URI prefix).
 * @throws An error if image generation fails or no image data is returned.
 */
export async function generateImageWithImagen3(prompt: string): Promise<string> {
  const geminiAi = getAiInstance();
  incrementApiCallCount('IMAGE_GENERATION'); // Increment for every image generation call
  try {
    const response = await geminiAi.models.generateImages({
      model: IMAGE_MODEL_NAME,
      prompt: prompt,
      config: { numberOfImages: 1, outputMimeType: 'image/png' }, // Ensure PNG for consistent base64 handling
    });

    if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image?.imageBytes) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      // The imageBytes from this API is already a base64 string.
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
            userMessage = `Lỗi API: Model '${IMAGE_MODEL_NAME}' không được tìm thấy hoặc không được hỗ trợ. Chi tiết: ${userMessage}`;
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

/**
 * A unified function for generating images. It currently wraps Imagen 3 but can be expanded
 * to include other models like Gemini based on settings.
 * @param prompt The text prompt for the image.
 * @returns A promise that resolves to the base64 image data string.
 */
export async function generateImageUnified(prompt: string): Promise<string> {
    const settings = getApiSettings();
    
    // In the future, you could add logic here:
    // if (settings.avatarGenerationEngine === 'gemini-2.0-flash') {
    //   return generateImageWithGemini2Flash(prompt);
    // }
    
    // Default to Imagen 3
    return generateImageWithImagen3(prompt);
}
