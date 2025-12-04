import fetch from 'node-fetch';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// USANDO UM MODELO DE SUPER-RESOLUÇÃO DIFERENTE E MAIS ESTÁVEL: tstramer/resrgan
// ID da Versão MAIS ESTÁVEL: 195724285871f3918a93a8e97cc9611f7c5553b5e40e2b3c7b3967814b748281
const REPLICATE_MODEL_VERSION = "195724285871f3918a93a8e97cc9611f7c5553b5e40e2b3c7b3967814b748281"; 

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // 🚨 VERIFICAÇÃO CRÍTICA 1: Token (Permissão)
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
                version: REPLICATE_MODEL_VERSION, // Usando o modelo estável
                input: {
                    image: imageUrl, 
                    scale: 4, 
                },
            }),
        });

        const startData = await startResponse.json();

        // 🚨 VERIFICAÇÃO CRÍTICA 2: Diagnóstico de Erro
        if (startResponse.status !== 201) {
            console.error('Erro ao iniciar Replicate:', startData);
            let errorMessage = startData.detail || startData.message || 'Erro desconhecido.';
            
            if (startResponse.status === 401) {
                // 401: Unauthorized - PROBLEMA DE PERMISSÃO/TOKEN
                errorMessage = "O seu Token de API do Replicate (REPLICATE_API_TOKEN) está inválido. Por favor, gere um novo token no painel do Replicate.";
            } else if (startResponse.status === 404) {
                 // 404: Não Encontrado - A versão falhou novamente.
                 errorMessage = "Erro interno: Falha na versão do modelo Replicate. Tente novamente ou verifique se o modelo 'tstramer/resrgan' está ativo.";
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
