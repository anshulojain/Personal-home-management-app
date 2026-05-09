/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface AnalysisResult {
  name: string;
  type: string;
  suggestedFrequencyMonths: number;
  referenceLink?: string;
  notes?: string;
}

export async function analyzeItemImage(base64Image: string): Promise<AnalysisResult> {
  // Extract pure base64 data from data URL
  const data = base64Image.split(',')[1] || base64Image;
  const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/png';

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data,
            mimeType,
          },
        },
        {
          text: "Analyze this image of a household item (like a water filter, car part, or appliance). 1. Identify the exact subcategory (e.g., instead of just 'Water Filter', identify if it's an 'RO Filter', 'Shower Filter', 'Sediment Filter', etc.). 2. Suggest a descriptive name. 3. Determine the maintenance type. 4. Provide a realistic maintenance frequency (months). 5. Suggest where to find replacements (buying link). 6. Add brief maintenance tips.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Descriptive name of the item" },
          type: { type: Type.STRING, description: "General type of the product" },
          suggestedFrequencyMonths: { type: Type.NUMBER, description: "Suggested replacement frequency in months" },
          referenceLink: { type: Type.STRING, description: "Example reference or buying link" },
          notes: { type: Type.STRING, description: "Brief maintenance notes or tips" },
        },
        required: ["name", "type", "suggestedFrequencyMonths"],
      },
    },
  });

  const result = JSON.parse(response.text);
  return result;
}
