import Head from 'next/head';
import { useState, useMemo } from 'react';

// Estilos Dark Mode Profissional
const styles = {
    container: { fontFamily: 'Roboto, sans-serif', padding: '0', margin: '0', backgroundColor: '#121212', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#e0e0e0' },
    main: { maxWidth: '1000px', width: '90%', margin: '40px auto', backgroundColor: '#1e1e1e', padding: '40px', borderRadius: '15px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)' },
    title: { color: '#4CAF50', textAlign: 'center', marginBottom: '15px', fontSize: '2.5rem' },
    subtitle: { color: '#bdbdbd', textAlign: 'center', marginBottom: '40px', fontSize: '1.1rem' },
    form: { display: 'flex', gap: '15px', marginBottom: '40px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' },
    fileInputLabel: {
        flex: '1 1 65%', padding: '15px', borderRadius: '10px', border: '1px dashed #4CAF50', backgroundColor: '#2c2c2c', color: '#e0e0e0', fontSize: '16px', cursor: 'pointer', textAlign: 'center', transition: 'background-color 0.3s'
    },
    button: { flex: '1 1 30%', padding: '15px 25px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', transition: 'background-color 0.3s' },
    buttonDisabled: { backgroundColor: '#383838', cursor: 'not-allowed' },
    error: { color: '#FF5252', padding: '15px', backgroundColor: '#331a1a', border: '1px solid #FF5252', borderRadius: '10px', textAlign: 'center', marginBottom: '20px' },
    imageContainer: { marginTop: '30px', borderTop: '1px solid #333', paddingTop: '30px', textAlign: 'center' },
    loadingText: { color: '#4CAF50', fontSize: '1.2em', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    result: { marginTop: '20px' },
    resultTitle: { color: '#e0e0e0', fontSize: '1.8rem', marginBottom: '25px', borderBottom: '2px solid #4CAF50', paddingBottom: '10px' },
    imageWrapper: { display: 'flex', gap: '25px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '30px' },
    image: { maxWidth: '45%', height: 'auto', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)', border: '1px solid #444' },
    downloadLink: { display: 'inline-block', padding: '12px 25px', backgroundColor: '#FFC107', color: '#121212', textDecoration: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', transition: 'background-color 0.3s' },
};


export default function Home() {
    const [imageFile, setImageFile] = useState(null);
    const [upscaledUrl, setUpscaledUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [originalPublicUrl, setOriginalPublicUrl] = useState(null);

    // Cria URL local para pré-visualização no navegador
    const previewUrl = useMemo(() => {
        return imageFile ? URL.createObjectURL(imageFile) : null;
    }, [imageFile]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        
        // Limite de tamanho de 32MB para ImgBB
        if (file && file.size > 32 * 1024 * 1024) { 
            setError("O arquivo deve ter no máximo 32MB.");
            setImageFile(null);
            return;
        }

        if (file) {
            setImageFile(file);
            setError(null);
            setUpscaledUrl(null);
            setOriginalPublicUrl(null);
        } else {
            setImageFile(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!imageFile || isLoading) return;

        setIsLoading(true);
        setUpscaledUrl(null);
        setError(null);
        setOriginalPublicUrl(null);

        try {
            // 1. UPLOAD SEGURO: Envia o arquivo para o nosso endpoint Vercel /api/upload-image (que usa o ImgBB)
            const formData = new FormData();
            formData.append('image', imageFile);

            const uploadResponse = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData, 
            });

            const uploadData = await uploadResponse.json();

            if (!uploadResponse.ok) {
                // Erro do backend (pode ser chave ImgBB, ou falha no servidor)
                throw new Error(uploadData.message || 'Falha no upload da imagem.');
            }
            
            const uploadedUrl = uploadData.publicUrl;
            setOriginalPublicUrl(uploadedUrl); // Salva a URL pública do ImgBB

            // 2. UPSCALING: Envia a URL pública para o endpoint de processamento AI (Replicate)
            const upscaleResponse = await fetch('/api/upscale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: uploadedUrl }),
            });

            const upscaleData = await upscaleResponse.json();

            if (!upscaleResponse.ok) {
                // Erro do backend (pode ser chave Replicate, limite, ou falha no modelo)
                throw new Error(upscaleData.message || 'Erro no processamento AI (Replicate).');
            }
            
            setUpscaledUrl(upscaleData.upscaledUrl);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const buttonStyle = isLoading || !imageFile 
      ? { ...styles.button, ...styles.buttonDisabled } 
      : styles.button;

    return (
        <div style={styles.container}>
            <Head>
                <title>AI Image Upscaler Pro</title>
                <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet" />
            </Head>

            <main style={styles.main}>
                <h1 style={styles.title}>Super Resolução AI 🚀</h1>
                <p style={styles.subtitle}>Upload direto para o ImgBB para arquivos maiores e processamento com IA.</p>
                
                <form onSubmit={handleSubmit} style={styles.form}>
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        id="file-upload" 
                        style={{ display: 'none' }} 
                        disabled={isLoading}
                    />
                    <label htmlFor="file-upload" style={styles.fileInputLabel}>
                        {imageFile ? `✅ Arquivo Selecionado: ${imageFile.name}` : 'Clique para selecionar a Imagem (Max 32MB)'}
                    </label>
                    <button type="submit" style={buttonStyle} disabled={isLoading || !imageFile}>
                        {isLoading ? (
                            <>
                                <span role="img" aria-label="loading">⏳</span> Processando...
                            </>
                        ) : 'Melhorar Imagem'}
                    </button>
                </form>

                {error && <p style={styles.error}>{error}</p>}
                
                <div style={styles.imageContainer}>
                    {isLoading && <p style={styles.loadingText}><span role="img" aria-label="ai-processing">🧠</span> Upload e Processamento AI em andamento, por favor, aguarde...</p>}
                    
                    {/* Exibe a pré-visualização local enquanto carrega ou se apenas o upload foi feito */}
                    {(previewUrl && !upscaledUrl && !isLoading) && (
                        <div style={styles.result}>
                            <h2 style={styles.resultTitle}>Imagem Carregada</h2>
                            <img src={previewUrl} alt="Pré-visualização Original" style={{ ...styles.image, maxWidth: '500px' }} />
                        </div>
                    )}

                    {/* Exibe o comparativo após o processamento bem-sucedido */}
                    {upscaledUrl && previewUrl && (
                        <div style={styles.result}>
                            <h2 style={styles.resultTitle}>Comparativo de Qualidade (4x)</h2>
                            <div style={styles.imageWrapper}>
                                <img src={previewUrl} alt="Original (Baixa Resolução)" style={styles.image} />
                                <img src={upscaledUrl} alt="Melhorada (Alta Resolução)" style={styles.image} />
                            </div>
                            <a href={upscaledUrl} download target="_blank" rel="noreferrer" style={styles.downloadLink}>
                                Baixar Imagem Final
                            </a>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
