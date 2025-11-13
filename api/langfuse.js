import { Langfuse } from "langfuse";

export default async function handler(req, res) {
  // CORS 設定
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 處理 OPTIONS 請求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const langfuse = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: "https://cloud.langfuse.com"
    });

    const { agentId, agentName, model, action, prompt, response, cost, metadata } = req.body;

    // 創建 trace
    const trace = langfuse.trace({
      id: `trace-${agentId}-${Date.now()}`,
      name: `AI Decision - ${agentName}`,
      userId: agentId,
      metadata: {
        ...metadata,
        agentName,
        model,
        action
      },
      tags: [action, metadata.mood, metadata.vendor]
    });

    // 創建 generation
    trace.generation({
      name: action,
      model: model,
      modelParameters: {
        temperature: 0.8,
        maxTokens: 150
      },
      input: prompt,
      output: response,
      usage: {
        promptTokens: Math.ceil(prompt.length / 4),
        completionTokens: Math.ceil(response.length / 4),
        totalTokens: Math.ceil((prompt.length + response.length) / 4)
      },
      metadata: {
        health: metadata.health,
        hunger: metadata.hunger,
        thirst: metadata.thirst,
        energy: metadata.energy,
        mood: metadata.mood,
        estimatedCost: cost
      }
    });

    // 確保數據發送
    await langfuse.flushAsync();

    res.status(200).json({ 
      success: true, 
      message: 'Tracked successfully' 
    });

  } catch (error) {
    console.error('Langfuse error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.stack 
    });
  }
}
