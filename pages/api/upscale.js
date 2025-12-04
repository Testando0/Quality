import fetch from 'node-fetch';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// ID da Versão CORRIGIDA e ATUALIZADA do modelo xinntao/realesrgan (v3.0.0)
const REPLICATE_MODEL_VERSION = "7b58129048a176846747d6929a56526ac87f6515c0e81b67f1b40289f64e0a4f"; 

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // 🚨 VERIFICAÇÃO CRÍTICA 1: Token
    if (!REPLICATE_API_TOKEN) {
        return res.status(500).json({ message: 'Erro: REPLICATE_API_TOKEN não está configurada. Configure no Vercel/Ambiente.' });
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
                version: REPLICATE_MODEL_VERSION, // Usa o novo ID
                input: {
                    image: imageUrl, 
                    scale: 4, 
                    // O campo 'model_version' não é necessário aqui, a versão é definida acima
                },
            }),
        });

        const startData = await startResponse.json();

        // 🚨 VERIFICAÇÃO CRÍTICA 2: Erro 401 (Permissão) ou 404 (Versão)
        if (startResponse.status !== 201) {
            console.error('Erro ao iniciar Replicate:', startData);
            let errorMessage = startData.detail || startData.message || 'Erro desconhecido.';
            
            if (startResponse.status === 401) {
                errorMessage = "Token Inválido (401). Verifique o REPLICATE_API_TOKEN.";
            } else if (startResponse.status === 404) {
                 errorMessage = "Versão do Modelo Não Encontrada (404). O ID da versão pode ter expirado.";
            }
            
            return res.status(startResponse.status).json({ message: `Falha na previsão: ${errorMessage}` });
        }

        const predictionId = startData.id;
        
        // 2. Sondar o resultado (Polling)
        let prediction = startData;
        while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
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
