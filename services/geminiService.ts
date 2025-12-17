import { GoogleGenAI } from "@google/genai";
import { AggregatedStats, SocialMediaData } from "../types";

const parseAIResponse = (text: string) => {
  // Simple cleanup if the model returns Markdown formatting
  return text.replace(/\*\*/g, '').replace(/###/g, '');
};

export const generateDashboardInsights = async (
  stats: AggregatedStats,
  topPerformers: SocialMediaData[]
): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("No API Key found for Gemini");
      return "Configure your API Key to enable AI insights.";
    }

    const ai = new GoogleGenAI({ apiKey });

    // Construct a summarized prompt to avoid huge token usage
    const prompt = `
      Act as a senior social media analyst. Analyze the following summary data for a monthly report.
      
      Total Followers: ${stats.totalFollowers.toLocaleString()}
      Total Reach: ${stats.totalReach.toLocaleString()}
      Net Follower Growth: ${stats.totalGrowth.toLocaleString()}
      
      Platform Breakdown:
      ${stats.platformStats.map(p => `- ${p.name}: ${p.followers.toLocaleString()} followers, ${p.reach.toLocaleString()} reach`).join('\n')}
      
      Top 5 Performing Pages:
      ${topPerformers.slice(0, 5).map(p => `- ${p.pageName} (${p.platform}): +${p.followerGrowth.toLocaleString()} growth`).join('\n')}
      
      Provide a concise 3-bullet point executive summary highlighting:
      1. Overall health and main growth driver.
      2. Which platform is dominating in Reach vs Followers.
      3. A brief strategic recommendation for the underperforming platform.
      
      Keep it professional, encouraging, and under 150 words.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return parseAIResponse(response.text || "Could not generate insights.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI Insights temporarily unavailable.";
  }
};
