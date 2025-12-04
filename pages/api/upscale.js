import fetch from 'node-fetch';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// USANDO A SINTAXE MAIS ESTÁVEL: "user/model:latest"
const REPLICATE_MODEL_AND_VERSION = "tstramer/resrgan:latest"; 

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    if (!REPLICATE_API_TOKEN) {
        return res.status(500).json({ message: 'ERRO CRÍTICO: REPLICATE_API_TOKEN não configurada.' });
    }
    
    const { imageUrl } = req.body;

    if (!imageUrl) {
        return res.status(400).json({ message: 'URL da imagem não fornecida.' });
    }

    try {
        // 1. INICIAR PREVISÃO usando o rótulo :latest
        const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Token ${REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                version: REPLICATE_MODEL_AND_VERSION, 
                input: {
                    image: imageUrl, // Campo de entrada deste modelo é 'image'
                    scale: 4, 
                },
            }),
        });

        const startData = await startResponse.json();

        // 2. DIAGNÓSTICO DE ERRO
        if (startResponse.status !== 201) {
            console.error('Erro ao iniciar Replicate:', startData);
            let errorMessage = startData.detail || startData.message || 'Erro desconhecido.';
            
            // Se o erro for a versão, mostra o problema:
            if (startResponse.status === 404) {
                errorMessage = "ERRO 404 FINAL: O Replicate não aceita o rótulo ':latest' para este modelo. A falha é puramente da API do Replicate.";
            } else if (startResponse.status === 401) {
                // Caso o novo token tenha falhado por algum motivo.
                errorMessage = "FALHA DE PERMISSÃO (401): O Token falhou mesmo sendo novo.";
            }
            
            return res.status(startResponse.status).json({ message: `Falha na previsão: ${errorMessage}` });
        }

        const predictionId = startData.id;
        
        // 3. Sondagem (Polling)
        let prediction = startData;
        while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
                headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` },
            });
            prediction = await pollResponse.json();

            if (prediction.status === 'failed') {
                return res.status(500).json({ message: `O processamento AI falhou: ${prediction.error}` });
            }
        }

        // 4. Retornar a URL
        if (prediction.output && prediction.output.length > 0) {
            const upscaledUrl = prediction.output[0]; 
            return res.status(200).json({ upscaledUrl: upscaledUrl, message: 'Upscale concluído com sucesso.' });
        } else {
             return res.status(500).json({ message: 'O Replicate retornou um resultado inesperado.' });
        }

    } catch (error) {
        console.error('Erro interno no servidor (Replicate):', error);
        return res.status(500).json({ message: 'Erro interno no servidor durante o processamento AI.', error: error.message });
    }
}
