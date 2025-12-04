import fetch from 'node-fetch';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// USANDO A ABORDAGEM MAIS ESTÁVEL: "user/model:latest"
// O Replicate lida internamente com a versão mais recente.
const REPLICATE_MODEL = "arielrosh/real-esrgan-4x"; // Modelo Real-ESRGAN de 4x

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
        // 1. INICIAR PREVISÃO USANDO O RÓTULO "LATEST"
        const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Token ${REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                // O formato é 'user/model@version'
                version: `${REPLICATE_MODEL}:latest`, // Tenta usar o rótulo latest, ignorando o hash instável
                input: {
                    image: imageUrl, 
                },
            }),
        });

        const startData = await startResponse.json();

        // 2. DIAGNÓSTICO DE ERRO (Token vs. Versão)
        if (startResponse.status !== 201) {
            console.error('Erro ao iniciar Replicate:', startData);
            let errorMessage = startData.detail || startData.message || 'Erro desconhecido.';
            
            if (startResponse.status === 401) {
                errorMessage = "FALHA DE PERMISSÃO (401): O Token está inválido. VOCÊ DEVE GERAR UM NOVO TOKEN REPLICATE.";
            } else if (startResponse.status === 404) {
                 errorMessage = "FALHA DE VERSÃO (404): O modelo não foi encontrado. O modelo 'arielrosh/real-esrgan-4x' foi removido ou está em manutenção.";
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
        if (prediction.output && typeof prediction.output === 'string') {
            const upscaledUrl = prediction.output; 
            return res.status(200).json({ upscaledUrl: upscaledUrl, message: 'Upscale concluído com sucesso.' });
        } else {
             return res.status(500).json({ message: 'O Replicate retornou um resultado inesperado.' });
        }

    } catch (error) {
        console.error('Erro interno no servidor (Replicate):', error);
        return res.status(500).json({ message: 'Erro interno no servidor durante o processamento AI.', error: error.message });
    }
}
