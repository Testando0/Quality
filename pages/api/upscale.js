import fetch from 'node-fetch';

// Garanta que esta variável de ambiente está configurada no Vercel
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// ID da Versão ESTÁVEL (xinntao/realesrgan - Dezembro/2025)
// Este ID deve ser o correto para o modelo que você está usando.
const REPLICATE_MODEL_VERSION = "7b58129048a176846747d6929a56526ac87f6515c0e81b67f1b40289f64e0a4f"; 

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
        // 1. INICIAR PREVISÃO com PARÂMETROS CORRETOS
        const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Token ${REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                version: REPLICATE_MODEL_VERSION,
                input: {
                    // Parâmetros do Modelo, seguindo o esquema que você forneceu:
                    img: imageUrl,             // Campo 'img' (Input required)
                    version: "General - v3",   // Campo 'version' (Modelo estável e tiny para imagens gerais)
                    scale: 4,                  // Campo 'scale' (Fator de escala de 4x)
                    tile: 0,                   // Campo 'tile' (Não usa tiling)
                    face_enhance: false        // Campo 'face_enhance' (Desativado por padrão)
                },
            }),
        });

        const startData = await startResponse.json();

        // 2. DIAGNÓSTICO DE ERRO (Token vs. Versão)
        if (startResponse.status !== 201) {
            console.error('Erro ao iniciar Replicate:', startData);
            let errorMessage = startData.detail || startData.message || 'Erro desconhecido.';
            
            if (startResponse.status === 401) {
                errorMessage = "FALHA DE PERMISSÃO (401): Seu REPLICATE_API_TOKEN está inválido. Por favor, verifique e gere um novo.";
            } else if (errorMessage.includes("version does not exist")) {
                 errorMessage = "FALHA NA VERSÃO (404): O ID da versão expirou novamente. Você deve obter o ID de versão mais recente do modelo 'xinntao/realesrgan'.";
            }
            
            return res.status(startResponse.status).json({ message: `Falha na previsão: ${errorMessage}` });
        }

        const predictionId = startData.id;
        
        // 3. Sondagem (Polling) para obter o resultado
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
        if (prediction.output && typeof prediction.output === 'string') {
            // A saída é uma string URI (URL do arquivo) conforme o esquema
            const upscaledUrl = prediction.output; 
            return res.status(200).json({ upscaledUrl: upscaledUrl, message: 'Upscale concluído com sucesso.' });
        } else {
             return res.status(500).json({ message: 'O Replicate retornou um resultado inesperado. Saída: ' + JSON.stringify(prediction.output) });
        }

    } catch (error) {
        console.error('Erro interno no servidor (Replicate):', error);
        return res.status(500).json({ message: 'Erro interno no servidor durante o processamento AI.', error: error.message });
    }
}
