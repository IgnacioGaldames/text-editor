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
   - Define un **Mínimo** (alerta en amarillo/rojo si estás por debajo) y/o un **Máximo** (la barra de progreso se llena al alcanzarlo).
   - Deja cualquiera de los campos vacío en el comando de metas para quitar ese límite; también puedes establecerlo en `0` desde la configuración.
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
| `WordCraft: Toggle ON/OFF (Quick Switch)` | Pausa/reanuda todas las funciones de WordCraft sin deshabilitar el plugin. Un ícono discreto `$(eye)` / `$(eye-closed)` en la barra inferior permite hacer toggle con un solo clic. |

---

## 🚀 Cómo Instalar la Extensión (Uso Diario)

Para tener WordCraft instalado de forma permanente en tu editor (VS Code, Antigravity o Cursor) sin necesidad de abrirlo en modo depuración (`F5`):

### Paso 1: Generar el paquete instalador (`.vsix`)
En la terminal del proyecto, ejecuta:
```bash
npm run package
```
Esto compilará el código y generará el archivo instalador en la raíz del proyecto (por ejemplo: `wordcraft-writer-0.1.1.vsix`).

### Paso 2: Instalar en el editor

Puedes instalarlo de cualquiera de estas dos formas:

#### Opción A: Desde la interfaz gráfica (Recomendada)
1. Abre el panel lateral de **Extensiones** (`Ctrl + Shift + X` en Windows/Linux o `Cmd + Shift + X` en Mac).
2. Haz clic en el menú de los **tres puntos (`...`)** en la esquina superior derecha del panel de Extensiones.
3. Selecciona **"Install from VSIX..."** (*Instalar desde VSIX...*).
4. Navega hasta la carpeta del proyecto y selecciona el archivo `wordcraft-writer-0.1.1.vsix`.
5. ¡Listo! La extensión quedará instalada de forma permanente.

#### Opción B: Desde la terminal
Ejecuta el siguiente comando según tu editor:
- **VS Code:**
  ```bash
  code --install-extension wordcraft-writer-0.1.1.vsix
  ```
- **Cursor / Forks de VS Code:**
  ```bash
  cursor --install-extension wordcraft-writer-0.1.1.vsix
  ```

---

## 🔄 Cómo Actualizar y Generar un Nuevo `.vsix` (Tras hacer cambios)

Cada vez que hagas modificaciones en el código y quieras actualizar la versión instalada en tu editor:

1. **(Recomendado) Subir la versión:**
   Para que el editor reconozca que hay una actualización, incrementa la versión en `package.json` o ejecuta:
   ```bash
   npm version patch
   ```
   *(Esto subirá la versión automáticamente, por ejemplo de `0.1.1` a `0.1.2`)*.

2. **Generar el nuevo `.vsix`:**
   ```bash
   npm run package
   ```
   > 💡 **Nota:** Este comando ejecuta automáticamente `npm run build:prod` antes de empaquetar, por lo que compila y minifica todo el código TypeScript sin que tengas que compilarlo manualmente antes.

3. **Reinstalar en el editor:**
   - **Desde la interfaz:** Menú `...` en Extensiones -> **"Install from VSIX..."** -> selecciona el nuevo archivo `.vsix`.
   - **Desde la terminal:**
     ```bash
     code --install-extension wordcraft-writer-0.1.2.vsix
     ```
   Haz clic en **"Reload"** cuando el editor te lo solicite para activar la nueva versión.

---

## 💻 Desarrollo y Compilación (Para desarrolladores)

Si vas a modificar el código fuente de la extensión:

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Compilar el proyecto:**
   ```bash
   npm run build
   ```

3. **Modo vigilancia (recompilación automática al guardar cambios):**
   ```bash
   npm run watch
   ```

4. **Probar y depurar en vivo:**
   - Presiona `F5` (o ve a la pestaña *Run and Debug* y dale a *Run Extension*).
   - Se abrirá una nueva ventana aislada (*[Extension Development Host]*) con los cambios cargados al instante.
   - Abre cualquier archivo `.md` o `.txt` para ver las funciones activas.
