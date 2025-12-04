import fetch from 'node-fetch';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// USANDO O ID DA VERSÃO ESTÁVEL (sczhou/codeformer:v1.3)
const REPLICATE_MODEL_VERSION = "7de2ea2a1c0d59265c0934988f83039d91cb6f24d4c82c6218c5ff217d8004f1"; 

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
        // 1. INICIAR PREVISÃO
        const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Token ${REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                version: REPLICATE_MODEL_VERSION, // ID ESTÁVEL
                input: {
                    image: imageUrl, 
                    face_upsample: true, 
                    codeformer_fidelity: 0.5 
                },
            }),
        });

        const startData = await startResponse.json();

        // 2. DIAGNÓSTICO DE ERRO
        if (startResponse.status !== 201) {
            console.error('Erro ao iniciar Replicate:', startData);
            let errorMessage = startData.detail || startData.message || 'Erro desconhecido.';
            
            if (startResponse.status === 401) {
                // Se for 401, a falha é no Token.
                errorMessage = "FALHA DE PERMISSÃO (401): Seu Token está inválido. Por favor, **gere um novo Token**.";
            } else if (startData.detail && startData.detail.includes("version does not exist")) {
                 // Se o 404 persistir, não há mais como contornar.
                 errorMessage = "FALHA FINAL NA VERSÃO (404): O Replicate está rejeitando a versão estável. O serviço pode estar em manutenção ou o Token é a única falha restante.";
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
