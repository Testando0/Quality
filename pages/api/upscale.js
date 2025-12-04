import fetch from 'node-fetch';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// USANDO UM MODELO REAL-ESRGAN ALTERNATIVO E MAIS ESTÁVEL (lucataco/real-esrgan)
// ID da Versão ESTÁVEL para lucataco/real-esrgan
const REPLICATE_MODEL_VERSION = "0c6416d25287f32997637841824c3a1040445d8b8e3a2db65c71172a2ff8f17a"; 

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
                version: REPLICATE_MODEL_VERSION, // Usa a versão estável
                input: {
                    image: imageUrl, 
                    scale: 4, 
                },
            }),
        });

        const startData = await startResponse.json();

        // Checagem de erro mais detalhada da API Replicate
        if (startResponse.status !== 201) {
            console.error('Erro ao iniciar Replicate:', startData);
            return res.status(500).json({ message: `Falha ao iniciar a previsão no Replicate: ${startData.detail || startData.message || 'Erro desconhecido.'}. Verifique se o seu REPLICATE_API_TOKEN está correto no Vercel.` });
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
             return res.status(500).json({ message: 'O Replicate retornou um resultado vazio ou inesperado.' });
        }

    } catch (error) {
        console.error('Erro interno no servidor (Replicate):', error);
        return res.status(500).json({ message: 'Erro interno no servidor durante o processamento AI.', error: error.message });
    }
}
