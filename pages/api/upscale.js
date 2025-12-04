import fetch from 'node-fetch';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// NOVO ID DA VERSÃO CORRIGIDA (xinntao/realesrgan)
// Este ID está fixado no commit mais recente do modelo.
const REPLICATE_MODEL_VERSION = "7b58129048a176846747d6929a56526ac87f6515c0e81b67f1b40289f64e0a4f"; 

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // CRÍTICO: Verifica a existência do Token (Permissão)
    if (!REPLICATE_API_TOKEN) {
        return res.status(500).json({ message: 'Erro: REPLICATE_API_TOKEN não está configurada.' });
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
                version: REPLICATE_MODEL_VERSION, // ID corrigido
                input: {
                    image: imageUrl, 
                    scale: 4, 
                },
            }),
        });

        const startData = await startResponse.json();

        // Checagem de erro para diagnosticar se é problema de Token ou Versão
        if (startResponse.status !== 201) {
            console.error('Erro ao iniciar Replicate:', startData);
            let errorMessage = startData.detail || startData.message || 'Erro desconhecido.';
            
            if (startResponse.status === 401) {
                // 401: Unauthorized - Quase sempre Token/Permissão errada
                errorMessage = "Token Inválido (401). Verifique se o REPLICATE_API_TOKEN está correto e ativo.";
            } else if (startData.detail && startData.detail.includes("version does not exist")) {
                 // Versão falhou, mesmo após correção
                 errorMessage = "O ID da Versão do Modelo Replicate falhou novamente. Você precisa obter o ID de versão mais recente diretamente da página do modelo 'xinntao/realesrgan'.";
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
