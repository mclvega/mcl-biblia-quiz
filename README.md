# Quiz Bíblico (RVR1960)

Juego de trivia sobre la Biblia (Reina Valera 1960), pensado para móvil, con dificultades, categorías, temporizador por pregunta y tabla de puntuaciones local.

## Desarrollo local

```bash
npm install
npm run dev
npm test     # banco de preguntas, partidas y guardado
```

Abre `http://localhost:5173`. En VS Code también puedes presionar **F5** (configuración "Quiz Bíblico: jugar en local (Chrome)" en `.vscode/launch.json`).

## Build de producción

```bash
npm run build
npm run preview
```

## Publicar en Netlify

- **Opción A:** conectar este repositorio a Netlify. Build command: `npm run build`, publish directory: `dist` (ya configurado en `netlify.toml`).
- **Opción B:** ejecutar `npm run build` localmente y arrastrar la carpeta `dist/` a Netlify.

## Estructura

- `src/content/preguntas.json` — banco de preguntas (categoría, dificultad, referencia RVR1960).
- `src/ui/` — pantallas: bienvenida, configuración, juego, resultados, puntuaciones.
- `src/audio.ts` — efectos de sonido sintetizados con Web Audio API (sin archivos de audio).
- `src/storage.ts` — nombre del jugador, configuración y tabla de puntuaciones en `localStorage`.
