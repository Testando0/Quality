import fetch from 'node-fetch';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// ID do Modelo Replicate para Upscale (usando o Real-ESRGAN, popular para 4x)
const REPLICATE_MODEL_VERSION = "42fed1c4974146d4d2414e2be2c5277c7f7fab052204f7fd9c181d40306c50be";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    if (!REPLICATE_API_TOKEN) {
        return res.status(500).json({ message: 'Erro interno no servidor: A chave REPLICATE_API_TOKEN não está configurada.' });
    }
    
    const { imageUrl } = req.body;

    if (!imageUrl) {
        return res.status(400).json({ message: 'URL da imagem não fornecida.' });
    }

    try {
        // 1. Iniciar a previsão (upscale) no Replicate
        const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Token ${REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                version: REPLICATE_MODEL_VERSION,
                input: {
                    // O Replicate aceita a URL pública da imagem aqui
                    image: imageUrl, 
                    scale: 4, // Upscale de 4x
                },
            }),
        });

        const startData = await startResponse.json();

        if (startResponse.status !== 201) {
            console.error('Erro ao iniciar Replicate:', startData);
            return res.status(500).json({ message: `Falha ao iniciar a previsão no Replicate: ${startData.detail || startData.message || 'Erro desconhecido.'}` });
        }

        const predictionId = startData.id;
        
        // 2. Sondar o resultado (Polling)
        let prediction = startData;
        while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Espera 1 segundo
            
            const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
                headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` },
            });
            prediction = await pollResponse.json();

            if (prediction.status === 'failed') {
                console.error('Previsão Replicate Falhou:', prediction);
                return res.status(500).json({ message: `O processamento AI falhou: ${prediction.error}` });
            }
        }

        // 3. Retornar a URL da imagem upscaled
        if (prediction.output && prediction.output.length > 0) {
            const upscaledUrl = prediction.output[0];
            return res.status(200).json({ 
                upscaledUrl: upscaledUrl,
                message: 'Upscale concluído com sucesso.'
            });
        } else {
             return res.status(500).json({ message: 'O Replicate retornou um resultado vazio.' });
        }

    } catch (error) {
        console.error('Erro interno no servidor (Replicate):', error);
        return res.status(500).json({ message: 'Erro interno no servidor durante o processamento AI.', error: error.message });
    }
}
