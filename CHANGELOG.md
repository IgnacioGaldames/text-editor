# Changelog - WordCraft Writer

Todos los cambios notables en este proyecto serán documentados en este archivo siguiendo la convención de [Semantic Versioning](https://semver.org/lang/es/):
- **Primer dígito (`X.0.0`):** Versión mayor (*Breaking changes* o rediseño integral).
- **Segundo dígito (`0.X.0`):** Nuevas funcionalidades y características (*Features* compatibles hacia atrás).
- **Tercer dígito (`0.0.X`):** Corrección de errores (*Bug fixes* y parches menores).

---

## [0.1.1] - 2026-10-15

### 🚀 Nuevas Características (Features)
- **Soporte Bilingüe Modular (Español & Inglés):**
  - Se estructuró la clasificación lingüística en submódulos separados e independientes:
    - [`src/classifiers/spanishClassifier.ts`](file:///c:/Users/igaldames/Documents/GitHub/text-editor/src/classifiers/spanishClassifier.ts): Vocabulario, conjugaciones y heurísticas para Español.
    - [`src/classifiers/englishClassifier.ts`](file:///c:/Users/igaldames/Documents/GitHub/text-editor/src/classifiers/englishClassifier.ts): Vocabulario, derivaciones y heurísticas para Inglés.
- **Soporte de Pronombres Enclíticos en Español:**
  - Reconocimiento automático de verbos con pronombres fusionados al final (ej: `mirarla`, `arriesgarme`, `moviendose`).
- **Activación Integral de Categorías:**
  - Se activaron por defecto en `package.json` las categorías de preposiciones (`grey`), conjunciones (`pink`) y pronombres/artículos (`cyan`) para enriquecer la estética visual de código.

### 🐛 Corrección de Errores (Bug Fixes)
- **Soporte Unicode con Acentos y Ñ:**
  - Corregida la expresión regular en el clasificador que ignoraba caracteres con tildes (`á`, `é`, `í`, `ó`, `ú`, `ü`) o la letra `ñ`, lo que provocaba que palabras acentuadas se fragmentaran o cayeran erróneamente en el color azul por defecto.
- **Corrección de "Bloque Azul":**
  - Se corrigió el comportamiento donde la prosa en español era casi 100% azul al no existir reglas para español en la versión previa.
- **Limpieza de variables no utilizadas:**
  - Resuelto error de TypeScript en `documentWatcher.ts` por import no utilizado.

---

## [0.1.0] - 2026-10-15

### 🚀 Versión Inicial (Initial Release)
- **Contadores de Prosa:** Conteo de palabras, caracteres (con y sin espacios), oraciones, párrafos y tiempo estimado de lectura en la barra inferior.
- **Sistema de Metas:** Definición de mínimo y máximo de palabras con alertas visuales en la barra de estado.
- **Barra de Progreso:** Indicador visual de progreso en bloques ASCII (`████░░░░ 42%`).
- **Selector de Métricas:** Menú interactivo `WordCraft: Choose Status Bar Items to Display` para personalizar qué estadísticas ver.
- **Camuflaje de Código Inicial:** Coloreado de partes de la oración inspirado en la paleta de One Dark Pro.
