const express = require('express');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(express.json({ limit: '10mb' }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Servir la página web
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="es" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Progrentis Solver By Luisbrz</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col items-center p-4">
  <div class="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl mt-6">
    <h1 class="text-2xl font-bold text-center text-blue-400 mb-6">Progrentis Solver By Luisbrz</h1>
    
    <div id="drop-zone" class="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
      <p class="text-slate-400 text-sm mb-2">Arrastra tu captura aquí o presiona <kbd class="bg-slate-800 px-2 py-1 rounded text-xs text-blue-300">Ctrl + V</kbd></p>
      <input type="file" id="file-input" accept="image/*" class="hidden">
      <button onclick="document.getElementById('file-input').click()" class="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg mt-2">Seleccionar Imagen</button>
    </div>

    <div id="preview-container" class="hidden mt-4 text-center">
      <img id="image-preview" class="max-h-64 mx-auto rounded-lg border border-slate-700 mb-4">
      <button id="solve-btn" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all">Resolver Ejercicio</button>
    </div>

    <div id="result-box" class="hidden mt-6 p-4 bg-slate-950 border border-emerald-500/30 rounded-xl text-center">
      <span class="text-xs text-slate-400 uppercase tracking-wider block mb-1">Respuesta Exacta</span>
      <div id="result-text" class="text-lg font-bold text-emerald-400"></div>
    </div>
  </div>

  <script>
    let currentBase64 = null;
    const fileInput = document.getElementById('file-input');
    const preview = document.getElementById('image-preview');
    const previewContainer = document.getElementById('preview-container');
    const solveBtn = document.getElementById('solve-btn');
    const resultBox = document.getElementById('result-box');
    const resultText = document.getElementById('result-text');

    function handleImage(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        currentBase64 = e.target.result;
        preview.src = currentBase64;
        previewContainer.classList.remove('hidden');
        resultBox.classList.add('hidden');
      };
      reader.readAsDataURL(file);
    }

    fileInput.addEventListener('change', (e) => handleImage(e.target.files[0]));
    
    window.addEventListener('paste', (e) => {
      const item = Array.from(e.clipboardData.items).find(x => x.type.indexOf('image') === 0);
      if (item) handleImage(item.getAsFile());
    });

    solveBtn.addEventListener('click', async () => {
      if (!currentBase64) return;
      solveBtn.disabled = true;
      solveBtn.innerText = 'Analizando...';
      
      try {
        const res = await fetch('/api/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: currentBase64 })
        });
        const data = await res.json();
        resultText.innerText = data.result || 'Error al analizar';
        resultBox.classList.remove('hidden');
      } catch (err) {
        resultText.innerText = 'Error de conexión';
        resultBox.classList.remove('hidden');
      } finally {
        solveBtn.disabled = false;
        solveBtn.innerText = 'Resolver Ejercicio';
      }
    });
  </script>
</body>
</html>
  `);
});

// Endpoint backend que procesa la imagen con IA
app.post('/api/solve', async (req, res) => {
  try {
    const { image } = req.body;
    const base64Data = image.split(',')[1];
    const mimeType = image.split(';')[0].split(':')[1];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        `Eres el motor de resolución automática para Progrentis Solver By Luisbrz.
        Analiza la imagen (puede ser ejercicio matemático, lectura de comprensión o problema lógico).
        REGLA DE SALIDA ESTRICTA:
        1. Si la imagen contiene opciones de respuesta con incisos (ejemplo: A, B, C, D o A), B), etc.), responde ÚNICAMENTE indicando la opción correcta, por ejemplo: "Inciso C".
        2. Si la imagen NO tiene incisos de opción múltiple, responde únicamente con el valor numérico o la palabra exacta del resultado final.
        NO des explicaciones ni agregues texto adicional.`
      ]
    });

    res.json({ result: response.text.trim() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error procesando la imagen' });
  }
});

module.exports = app;