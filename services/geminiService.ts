import { GoogleGenAI, Type } from "@google/genai";
import { CosmicReading } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateCosmicInsight = async (
  averageSpeed: number,
  peakIntensity: number,
  duration: number
): Promise<CosmicReading> => {
  const prompt = `
    The user has just interacted with a galaxy simulation using their hand movements. 
    Here is their session data:
    - Average Movement Speed: ${Math.round(averageSpeed * 100)}% (0-100 scale)
    - Peak Intensity: ${Math.round(peakIntensity * 100)}% (0-100 scale)
    - Duration: ${Math.round(duration)} seconds.

    Based on this energy signature, interpret their "cosmic flow". 
    If speed was high, they are energetic/chaotic. If low, they are calm/contemplative.
    Provide a title (e.g., "The Turbulent Nebula", "The Silent Void") and a 2-sentence poetic insight about their current mental state.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            insight: { type: Type.STRING }
          },
          required: ["title", "insight"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as CosmicReading;
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      title: "Connection Lost",
      insight: "The stars are silent momentarily. Your energy remains felt, even if unwritten."
    };
  }
};