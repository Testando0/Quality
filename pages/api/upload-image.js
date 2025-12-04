import formidable from 'formidable';
import fs from 'fs';
import fetch from 'node-fetch';

// Desabilita o body parser padrão do Next.js para usar o formidable
export const config = {
    api: {
        bodyParser: false,
    },
};

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    if (!IMGBB_API_KEY) {
        return res.status(500).json({ message: 'Erro interno no servidor: A chave IMGBB_API_KEY não está configurada.' });
    }

    const form = formidable({});

    try {
        const [fields, files] = await form.parse(req);
        const imageFile = files.image?.[0]; // Pega o primeiro arquivo do campo 'image'

        if (!imageFile) {
            return res.status(400).json({ message: 'Nenhum arquivo de imagem encontrado no upload.' });
        }

        // 1. LER e CONVERTER para Base64 (A causa do erro "Invalid base64 string")
        const fileData = fs.readFileSync(imageFile.filepath);
        const base64Image = fileData.toString('base64');

        // 2. Enviar para ImgBB
        const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `image=${encodeURIComponent(base64Image)}`, // Envia o Base64 codificado
        });

        const imgbbData = await imgbbResponse.json();

        if (imgbbData.success) {
            // Sucesso! Retorna a URL pública do ImgBB
            const publicUrl = imgbbData.data.url;
            return res.status(200).json({ 
                publicUrl: publicUrl,
                message: 'Upload concluído com sucesso.'
            });
        } else {
            // Falha no ImgBB
            console.error('Erro ImgBB:', imgbbData);
            return res.status(500).json({ message: `Falha na API ImgBB: ${imgbbData.error?.message || 'Erro desconhecido.'}` });
        }

    } catch (error) {
        console.error('Erro no processamento do upload:', error);
        return res.status(500).json({ message: 'Erro interno no servidor durante o upload.', error: error.message });
    }
}
