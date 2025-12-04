import fetch from 'node-fetch';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// USANDO UM MODELO DE RESTAURAÇÃO DE IMAGEM ALTERNATIVO (sczhou/codeformer)
// ID da Versão ESTÁVEL (sczhou/codeformer)
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
                version: REPLICATE_MODEL_VERSION,
                input: {
                    image: imageUrl,             // Campo de entrada deste modelo é 'image'
                    face_upsample: true,         // Parâmetro específico para melhoria de faces
                    codeformer_fidelity: 0.5     // Nível de fidelidade
                },
            }),
        });

        const startData = await startResponse.json();

        // 2. DIAGNÓSTICO DE ERRO
        if (startResponse.status !== 201) {
            console.error('Erro ao iniciar Replicate:', startData);
            let errorMessage = startData.detail || startData.message || 'Erro desconhecido.';
            
            if (startResponse.status === 401) {
                errorMessage = "FALHA DE PERMISSÃO (401): O Token está inválido. Por favor, **gere um novo Token**.";
            } else if (startData.detail && startData.detail.includes("version does not exist")) {
                 errorMessage = "FALHA NA VERSÃO (404): O ID do modelo falhou novamente. A única solução é a falha no Token.";
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
        // O output deste modelo retorna um array, pegamos o primeiro elemento
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
