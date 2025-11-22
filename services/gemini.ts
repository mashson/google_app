import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Initialize the Gemini API client
// Note: process.env.API_KEY is assumed to be available in the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Uses Gemini 2.5 Flash (Text) to analyze blog title and content to create a visual prompt.
 * This step ensures the image generation model receives a concise, visually descriptive prompt
 * rather than a raw wall of text.
 */
export const generateVisualDescription = async (title: string, content: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an expert art director and illustrator. 
      Read the following blog post title and content (if provided), and write a concise, vivid, and creative image generation prompt (under 50 words) that would generate a perfect 16:9 cover image for this post. 
      Focus on visual elements, mood, lighting, and style suitable for a wide landscape format.
      
      Blog Title: "${title}"
      
      Blog Content:
      ${content.substring(0, 5000)}`, // Limit input to avoid token limits just in case
    });

    return response.text || "블로그 콘텐츠를 나타내는 추상적인 디지털 아트 일러스트레이션.";
  } catch (error) {
    console.error("Error analyzing text:", error);
    throw new Error("블로그 콘텐츠 분석에 실패했습니다.");
  }
};

/**
 * Uses Gemini 2.5 Flash Image (Nano Banana) to generate an image from a text prompt.
 */
export const generateImageFromPrompt = async (prompt: string): Promise<string> => {
  try {
    // 'gemini-2.5-flash-image' is the model name for "Nano Banana" image generation
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    // Extract the base64 image data from the response
    // We iterate through parts to find the inlineData (image)
    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content || !candidate.content.parts) {
      throw new Error("생성된 콘텐츠가 없습니다.");
    }

    for (const part of candidate.content.parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("응답에서 이미지 데이터를 찾을 수 없습니다.");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

/**
 * Uses Gemini 2.5 Flash Image to edit an existing image based on a text command.
 * e.g., "Add a retro filter", "Remove the background person".
 */
export const editImageWithPrompt = async (base64Image: string, editCommand: string): Promise<string> => {
  try {
    // Strip the data URL prefix to get just the base64 string
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: editCommand,
          },
          {
            inlineData: {
              mimeType: 'image/png', // Assuming PNG, Flash Image handles standard formats
              data: cleanBase64,
            },
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content || !candidate.content.parts) {
      throw new Error("편집된 콘텐츠가 생성되지 않았습니다.");
    }

    for (const part of candidate.content.parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("편집된 이미지가 반환되지 않았습니다.");
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};