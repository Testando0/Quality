import Head from 'next/head';
import { useState, useMemo } from 'react';

// Paleta de Cores:
const ACCENT_COLOR = '#E53935'; // Vermelho Profissional (Red 600)
const DARK_BG = '#1A1A1A';      // Fundo Escuro
const CARD_BG = '#262626';      // Cor dos Cards/Containers

// Estilos Responsivos (CSS-in-JS)
const styles = {
    // Estilos Básicos e Mobile-First (Aplicados em todas as telas)
    container: { fontFamily: 'Roboto, sans-serif', padding: '0', margin: '0', backgroundColor: DARK_BG, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', color: '#f0f0f0' },
    main: { maxWidth: '1000px', width: '95%', margin: '20px auto', backgroundColor: CARD_BG, padding: '25px', borderRadius: '15px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)' },
    title: { color: ACCENT_COLOR, textAlign: 'center', marginBottom: '10px', fontSize: '2rem' },
    subtitle: { color: '#b0b0b0', textAlign: 'center', marginBottom: '30px', fontSize: '1rem' },
    form: { display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' },
    
    // Estilo da Label de Upload (Input de arquivo)
    fileInputLabel: {
        flex: '1 1 100%', padding: '15px', borderRadius: '10px', border: `1px dashed ${ACCENT_COLOR}`, backgroundColor: '#333333', color: '#f0f0f0', fontSize: '1rem', cursor: 'pointer', textAlign: 'center', transition: 'background-color 0.3s'
    },
    
    // Estilo do Botão
    button: { flex: '1 1 100%', padding: '15px 25px', backgroundColor: ACCENT_COLOR, color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', transition: 'background-color 0.3s' },
    buttonDisabled: { backgroundColor: '#444444', cursor: 'not-allowed' },

    // Mensagens
    error: { color: '#FFEB3B', padding: '12px', backgroundColor: '#3d321f', border: '1px solid #FFEB3B', borderRadius: '10px', textAlign: 'center', marginBottom: '20px' },
    loadingText: { color: ACCENT_COLOR, fontSize: '1.1em', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    
    // Área de Resultados
    imageContainer: { marginTop: '25px', borderTop: '1px solid #444', paddingTop: '20px', textAlign: 'center' },
    resultTitle: { color: '#f0f0f0', fontSize: '1.5rem', marginBottom: '20px', borderBottom: `2px solid ${ACCENT_COLOR}`, paddingBottom: '8px' },
    
    // Comparativo (Layout em Coluna no Mobile)
    imageWrapper: { display: 'flex', gap: '15px', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', marginBottom: '25px' },
    image: { maxWidth: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4)', border: '1px solid #444' },
    
    // Link de Download
    downloadLink: { display: 'inline-block', padding: '12px 25px', backgroundColor: '#FF7043', color: DARK_BG, textDecoration: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '1rem', transition: 'background-color 0.3s' },
    
    // Media Query para Desktop (> 768px) - Reorganiza Form e Imagens
    '@media (min-width: 768px)': {
        main: { padding: '40px' },
        title: { fontSize: '3rem' },
        form: { flexWrap: 'nowrap' },
        fileInputLabel: { flex: '1 1 65%' },
        button: { flex: '1 1 30%' },
        imageWrapper: { flexDirection: 'row' }, // Volta para Linha no Desktop
        image: { maxWidth: '45%' },
    }
};

export default function Home() {
    const [imageFile, setImageFile] = useState(null);
    const [upscaledUrl, setUpscaledUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [originalPublicUrl, setOriginalPublicUrl] = useState(null);

    const previewUrl = useMemo(() => {
        return imageFile ? URL.createObjectURL(imageFile) : null;
    }, [imageFile]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
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
            // 1. UPLOAD SEGURO (ImgBB via Vercel API)
            const formData = new FormData();
            formData.append('image', imageFile);

            const uploadResponse = await fetch('/api/upload-image', { method: 'POST', body: formData });
            const uploadData = await uploadResponse.json();

            if (!uploadResponse.ok) {
                throw new Error(uploadData.message || 'Falha no upload da imagem.');
            }
            
            const uploadedUrl = uploadData.publicUrl;
            setOriginalPublicUrl(uploadedUrl);

            // 2. UPSCALING (Replicate via Vercel API)
            const upscaleResponse = await fetch('/api/upscale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: uploadedUrl }),
            });

            const upscaleData = await upscaleResponse.json();

            if (!upscaleResponse.ok) {
                throw new Error(upscaleData.message || 'Erro no processamento AI.');
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
                <title>AI Upscaler Pro</title>
                <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet" />
                {/* Adicionando estilos responsivos diretamente no Head */}
                <style dangerouslySetInnerHTML={{__html: `
                    @media (min-width: 768px) {
                        .form-container { flex-wrap: nowrap; }
                        .file-label { flex: 1 1 65%; }
                        .submit-button { flex: 1 1 30%; }
                        .image-wrapper { flex-direction: row !important; }
                        .comp-image { max-width: 45% !important; }
                    }
                `}} />
            </Head>

            <main style={styles.main}>
                <h1 style={styles.title}>Super Resolução AI 🔥</h1>
                <p style={styles.subtitle}>Upload, processamento e resultados otimizados para qualquer dispositivo.</p>
                
                <form onSubmit={handleSubmit} style={styles.form} className="form-container">
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        id="file-upload" 
                        style={{ display: 'none' }} 
                        disabled={isLoading}
                    />
                    <label htmlFor="file-upload" style={styles.fileInputLabel} className="file-label">
                        {imageFile ? `✅ Arquivo Selecionado: ${imageFile.name}` : 'Clique para selecionar a Imagem (Max 32MB)'}
                    </label>
                    <button type="submit" style={buttonStyle} className="submit-button" disabled={isLoading || !imageFile}>
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
                    
                    {/* Pré-visualização local */}
                    {(previewUrl && !upscaledUrl && !isLoading) && (
                        <div style={styles.result}>
                            <h2 style={styles.resultTitle}>Pré-visualização</h2>
                            <img src={previewUrl} alt="Pré-visualização Original" style={{ ...styles.image, maxWidth: '500px' }} />
                        </div>
                    )}

                    {/* Exibe o comparativo após o processamento bem-sucedido */}
                    {upscaledUrl && previewUrl && (
                        <div style={styles.result}>
                            <h2 style={styles.resultTitle}>Comparativo de Qualidade (4x)</h2>
                            <div style={styles.imageWrapper} className="image-wrapper">
                                <img src={previewUrl} alt="Original (Baixa Resolução)" style={styles.image} className="comp-image" />
                                <img src={upscaledUrl} alt="Melhorada (Alta Resolução)" style={styles.image} className="comp-image" />
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
