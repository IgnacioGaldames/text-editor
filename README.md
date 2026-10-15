# WordCraft Writer (Antigravity Prose-as-Code Plugin)

> Un mini editor y procesador de textos para **Markdown (`.md`)** y **Texto Plano (`.txt`)** diseñado para vivir dentro de VS Code / Antigravity con apariencia visual de código fuente ("*Code Camouflage*").

---

## 🎯 ¿Por qué WordCraft?

El objetivo es no salir nunca del entorno de desarrollo (sin saltar a Word, Google Docs o Scrivener) para escribir prosa, documentación, artículos o notas, pero manteniendo el flujo y la estética de un editor de código profesional:
1. **Camuflaje de Código (Part-of-Speech Syntax Highlighting):** Resalta palabras según su tipo gramatical usando la paleta temática de **One Dark Pro**:
   - 🔵 **Sustantivos:** Color azul (como etiquetas HTML / elementos).
   - 🟣 **Verbos:** Color púrpura (como llamadas a funciones y métodos).
   - 🟡 **Adjetivos:** Color amarillo (como cadenas de texto `strings`).
   - 🟢 **Adverbios:** Color verde (como constantes numéricas).
   - ⚪ **Preposiciones:** Color gris claro (como operadores `+`, `-`, `=`).
   - 🌸 **Conjunciones:** Color rosa/magenta (como palabras clave de control de flujo `if`, `return`).
   - 🔷 **Pronombres:** Color cian (como nombres de variables).
2. **Estadísticas en Tiempo Real en la Barra Inferior:**
   - Contador de palabras.
   - Contador de caracteres (con y sin espacios).
   - Contador de oraciones / frases.
   - Contador de párrafos.
   - Estimación de tiempo de lectura.
   - **Barra de progreso visual** interactiva (`████░░░░ 42%`).
3. **Metas y Límites de Palabras:**
   - Define un **Mínimo** (alerta en amarillo/rojo si estás por debajo).
   - Define un **Máximo** (la barra de progreso se llena al alcanzarlo).
4. **Selector Interactivo de Información:**
   - Puedes activar o desactivar cualquiera de los contadores directamente desde un menú multi-selección.

---

## 📂 Arquitectura Modular del Código

El proyecto fue diseñado pensando en que cualquier desarrollador junior o novato pueda entenderlo, modificarlo y extenderlo sin fricción:

```text
text-editor/
├── .vscode/
│   ├── launch.json              # Configuración para depurar con F5
│   └── tasks.json               # Tareas de compilación (npm run build/watch)
├── src/
│   ├── types.ts                 # Definición de interfaces y tipos de datos
│   ├── configurationReader.ts   # Lectura centralizada de opciones de configuración
│   ├── statisticsCalculator.ts  # Métricas puras (palabras, caracteres, oraciones, tiempo)
│   ├── partOfSpeechClassifier.ts# Diccionarios y heurísticas de clasificación gramatical
│   ├── syntaxHighlighter.ts     # Inyección de decoraciones y colores en el viewport
│   ├── wordGoalManager.ts       # Cálculo de metas, límites y render de barra de progreso
│   ├── statusBarManager.ts      # Elementos de la barra inferior (Status Bar)
│   ├── documentWatcher.ts       # Vigilante de eventos (escritura debounced, cambio de pestañas)
│   ├── commandHandlers.ts       # Lógica de los comandos ejecutables
│   └── extension.ts             # Punto de entrada de la extensión (activate / deactivate)
├── package.json                 # Manifest de la extensión (comandos, settings, scripts)
├── tsconfig.json                # Configuración de TypeScript
└── README.md                    # Esta guía
```

---

## ⚡ Comandos Disponibles

Abre la paleta de comandos (`Ctrl + Shift + P` o `Cmd + Shift + P`) y busca:

| Comando | Acción |
| :--- | :--- |
| `WordCraft: Open in Writer Mode` | Activa las métricas y el resaltado en el archivo actual. |
| `WordCraft: Set Word Goal (Min / Max)` | Abre un cuadro interactivo para fijar el límite mínimo y máximo de palabras. |
| `WordCraft: Toggle Part-of-Speech Highlighting` | Enciende o apaga el resaltado gramatical estilo código. |
| `WordCraft: Choose Status Bar Items to Display` | Menú con checkboxes para elegir qué estadísticas mostrar abajo. |

---

## 🛠️ Instalación y Compilación

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Compilar para desarrollo:**
   ```bash
   npm run build
   ```

3. **Modo vigilancia (recompilación automática al guardar):**
   ```bash
   npm run watch
   ```

4. **Probar la extensión:**
   - Presiona `F5` en VS Code para abrir una nueva ventana de desarrollo con la extensión cargada.
   - Abre un archivo `.md` o `.txt` y empieza a escribir.
