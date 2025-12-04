import fetch from 'node-fetch';

// ID do modelo Real-ESRGAN (Upscaling 4x)
const REPLICATE_MODEL_VERSION = "c7667d26b81d77a943a02c31e670407a51d8d21b65e2361099e2f6439a3f28d3";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido.' });
  }

  const { imageUrl } = req.body;
  
  // A CHAVE É LIDA AQUI, DE FORMA SEGURA
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

  if (!REPLICATE_API_TOKEN) {
    return res.status(500).json({ message: 'Token da API Replicate não configurado.' });
  }
  if (!imageUrl) {
    return res.status(400).json({ message: 'A URL da imagem é obrigatória.' });
  }

  try {
    // 1. INICIA A REQUISIÇÃO DE UPSCALING
    const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${REPLICATE_API_TOKEN}`,
      },
      body: JSON.stringify({
        version: REPLICATE_MODEL_VERSION, 
        input: {
          image: imageUrl,
          scale: 4, // Aumenta em 4x
        },
      }),
    });

    const startData = await startResponse.json();
    const predictionUrl = startData.urls.get;

    // 2. AGUARDA O RESULTADO (POLLING)
    // A API do Replicate funciona de forma assíncrona, exigindo que o backend verifique o status.
    let finalPrediction = startData;
    while (finalPrediction.status !== "succeeded" && finalPrediction.status !== "failed") {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Espera 1.5s
      
      const pollResponse = await fetch(predictionUrl, {
        headers: {
          "Authorization": `Token ${REPLICATE_API_TOKEN}`,
        },
      });
      finalPrediction = await pollResponse.json();
    }

    if (finalPrediction.status === "failed") {
      throw new Error(finalPrediction.error || "A predição falhou.");
    }
    
    // 3. DEVOLVE A URL DA IMAGEM MELHORADA
    const upscaledUrl = finalPrediction.output[0];

    res.status(200).json({ upscaledUrl });

  } catch (error) {
    console.error('Erro na API Replicate:', error.message);
    res.status(500).json({ message: `Falha no Upscaling: ${error.message}` });
  }
}
