import Head from 'next/head';
import { useState, useMemo } from 'react';

// Paleta Profissional Clean Dark
const ACCENT_COLOR = '#D32F2F'; // Vermelho Profissional
const DARK_BG = '#0A0A0A';      // Fundo Quase Preto
const CARD_BG = '#151515';      // Fundo do Container Principal

// Estilos Base (CSS-in-JS)
const styles = {
    // Estilos Globais e Mobile-First
    container: { fontFamily: 'Inter, sans-serif', padding: '0', margin: '0', backgroundColor: DARK_BG, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', color: '#F0F0F0' },
    
    // Container Principal (Card) - Sem Borda
    main: { maxWidth: '1000px', width: '95%', margin: '30px auto', backgroundColor: CARD_BG, padding: '35px 20px', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.9)', border: 'none !important', outline: 'none !important' },
    
    // Título e Subtítulo
    title: { color: ACCENT_COLOR, textAlign: 'center', marginBottom: '8px', fontSize: '2rem', fontWeight: 700 },
    subtitle: { color: '#888888', textAlign: 'center', marginBottom: '35px', fontSize: '1rem' },
    
    // Formulário e Inputs
    form: { display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' },
    fileInputLabel: {
        flex: '1 1 100%', padding: '16px', borderRadius: '8px', border: `1px solid ${ACCENT_COLOR}`, backgroundColor: '#252525', color: '#F0F0F0', fontSize: '1rem', cursor: 'pointer', textAlign: 'center', transition: 'background-color 0.3s, border-color 0.3s', outline: 'none !important', border: 'none !important' // Borda e Outline Removidos
    },
    
    // Botão de Ação
    button: { flex: '1 1 100%', padding: '16px 25px', backgroundColor: ACCENT_COLOR, color: 'white', border: 'none !important', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', transition: 'background-color 0.3s', outline: 'none !important' },
    buttonDisabled: { backgroundColor: '#444444', cursor: 'not-allowed', opacity: 0.7 },

    // Mensagens de Estado
    error: { color: '#FFEB3B', padding: '12px', backgroundColor: '#383015', borderLeft: '4px solid #FFEB3B', borderRadius: '4px', textAlign: 'center', marginBottom: '20px' },
    loadingText: { color: ACCENT_COLOR, fontSize: '1.1em', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0' },
    
    // Área de Resultados (Linha divisória suavizada)
    imageContainer: { marginTop: '20px', paddingTop: '20px', textAlign: 'center' },
    resultTitle: { color: '#F0F0F0', fontSize: '1.4rem', marginBottom: '20px', borderBottom: `1px solid #222222`, paddingBottom: '8px', fontWeight: 600 },
    
    // Comparativo (Padrão mobile: Coluna)
    imageWrapper: { display: 'flex', gap: '15px', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', marginBottom: '25px' },
    
    // Imagem (Nenhuma Borda ou Sombra Clara)
    image: { maxWidth: '100%', height: 'auto', borderRadius: '6px', boxShadow: '0 0 5px rgba(0, 0, 0, 0.7)', border: 'none !important', outline: 'none !important' }, // BORDA EXCLUÍDA
    
    // Link de Download
    downloadLink: { display: 'inline-block', padding: '12px 25px', backgroundColor: ACCENT_COLOR, color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', transition: 'background-color 0.3s' },
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
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
                
                {/* Estilos Responsivos Otimizados (Usando !important para forçar a remoção de bordas/outlines) */}
                <style dangerouslySetInnerHTML={{__html: `
                    /* Força a remoção de outlines em foco para inputs e botões (causa comum de bordas) */
                    input:focus, button:focus, label:focus { outline: none !important; }
                    
                    @media (min-width: 768px) {
                        .main-container { margin-top: 40px; padding: 40px; }
                        .form-container { flex-wrap: nowrap; }
                        .file-label { flex: 1 1 65% !important; border: none !important; }
                        .submit-button { flex: 1 1 30% !important; }
                        
                        /* Layout do Comparativo */
                        .image-wrapper { flex-direction: row !important; }
                        /* Aplica a remoção definitiva da borda na imagem */
                        .comp-image { max-width: 45% !important; border: none !important; outline: none !important; box-shadow: 0 0 5px rgba(0, 0, 0, 0.7) !important; }
                    }
                `}} />
            </Head>

            <main style={styles.main} className="main-container">
                <h1 style={styles.title}>Super Resolução AI</h1>
                <p style={styles.subtitle}>Upload rápido e processamento com IA para imagens de alta qualidade.</p>
                
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
                        {imageFile ? `✅ Arquivo Selecionado: ${imageFile.name}` : 'Clique para selecionar a Imagem (Máx. 32MB)'}
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
                            <img src={previewUrl} alt="Pré-visualização Original" style={styles.image} className="comp-image" />
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
