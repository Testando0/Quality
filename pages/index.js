import Head from 'next/head';
import { useState } from 'react';

// Estilos Dark Mode
const styles = {
    container: { fontFamily: 'Roboto, sans-serif', padding: '0', margin: '0', backgroundColor: '#121212', minHeight: '100vh', display: 'flex', justifyContent: 'center', color: '#e0e0e0' },
    main: { maxWidth: '1000px', width: '90%', margin: '40px auto', backgroundColor: '#1e1e1e', padding: '40px', borderRadius: '15px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)' },
    title: { color: '#4CAF50', textAlign: 'center', marginBottom: '15px', fontSize: '2.5rem' },
    subtitle: { color: '#bdbdbd', textAlign: 'center', marginBottom: '40px', fontSize: '1.1rem' },
    form: { display: 'flex', gap: '15px', marginBottom: '40px', flexWrap: 'wrap' },
    input: { flex: '1 1 65%', padding: '15px', borderRadius: '10px', border: '1px solid #333', backgroundColor: '#2c2c2c', color: '#e0e0e0', fontSize: '16px', outline: 'none' },
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
  const [originalUrl, setOriginalUrl] = useState('');
  const [upscaledUrl, setUpscaledUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpscale = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setUpscaledUrl(null);
    setError(null);

    // Validação básica da URL
    if (!originalUrl.match(/^https?:\/\/.+/)) {
        setError("Por favor, insira uma URL válida.");
        setIsLoading(false);
        return;
    }

    try {
      const response = await fetch('/api/upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: originalUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro desconhecido ao comunicar com o servidor.');
      }
      
      setUpscaledUrl(data.upscaledUrl);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonStyle = isLoading || !originalUrl 
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
        <p style={styles.subtitle}>Aumente a qualidade de suas imagens em 4x com tecnologia Real-ESRGAN.</p>
        
        <form onSubmit={handleUpscale} style={styles.form}>
          <input
            style={styles.input}
            type="url"
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
            placeholder="Cole a URL da imagem (ex: https://dominio.com/foto.jpg)"
            required
            disabled={isLoading}
          />
          <button type="submit" style={buttonStyle} disabled={isLoading || !originalUrl}>
            {isLoading ? (
                <>
                    <span role="img" aria-label="loading">⏳</span> Processando...
                </>
            ) : 'Melhorar Imagem'}
          </button>
        </form>

        {error && <p style={styles.error}>{error}</p>}
        
        <div style={styles.imageContainer}>
          {isLoading && <p style={styles.loadingText}><span role="img" aria-label="ai-processing">🧠</span> A inteligência artificial está trabalhando, por favor, aguarde...</p>}
          
          {upscaledUrl && (
            <div style={styles.result}>
              <h2 style={styles.resultTitle}>Comparativo de Qualidade (4x)</h2>
              <div style={styles.imageWrapper}>
                <img src={originalUrl} alt="Original (Baixa Resolução)" style={styles.image} />
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
