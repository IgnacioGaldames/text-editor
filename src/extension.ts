// =============================================================================
// FILE: src/extension.ts
//
// PURPOSE: Punto de entrada principal (Entry Point) de la extensión de VS Code.
//
// RESPONSABILIDADES:
//   - Ciclo de vida: `activate()` cuando VS Code carga la extensión.
//   - Instanciar los módulos en el orden correcto (Inversión de Dependencias básica).
//   - Registrar todos los comandos definidos en `package.json`.
//   - Limpieza automática y segura en `deactivate()`.
//
// DISEÑO PARA DESARROLLADORES NOVICIOS:
//   Este archivo está organizado de manera completamente lineal:
//     1. Inicialización de componentes (Highlighter, StatusBarManager).
//     2. Inicialización del DocumentWatcher (observador de eventos).
//     3. Registro de comandos con VS Code.
//     4. Suscripción de recursos para auto-limpieza (Garbage Collection).
// =============================================================================

import * as vscode from 'vscode';
import { StatusBarManager } from './statusBarManager';
import { SyntaxHighlighter } from './syntaxHighlighter';
import { DocumentWatcher } from './documentWatcher';
import { readHighlightingConfig } from './configurationReader';
import {
  handleOpenWriter,
  handleSetWordGoal,
  handleToggleHighlighting,
  handleConfigureStatusBar,
} from './commandHandlers';

/**
 * Referencia global al vigilante de documentos para poder llamar a dispose()
 * explícitamente si fuera necesario durante la desactivación.
 */
let watcherInstance: DocumentWatcher | undefined;

/**
 * Función obligatoria de VS Code. Se ejecuta cuando la extensión se activa.
 * La activación ocurre según lo definido en los `activationEvents` de package.json
 * (ej. al abrir un archivo .md/.txt o al ejecutar uno de sus comandos).
 *
 * @param context - Proporcionado por VS Code para gestionar el ciclo de vida y recursos.
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('[WordCraft] Iniciando extensión de escritura con camuflaje de código...');

  // ───────────────────────────────────────────────────────────────────────────
  // PASO 1: Inicializar Módulos Principales
  // ───────────────────────────────────────────────────────────────────────────

  // Leemos la configuración inicial de resaltado gramatical (One Dark Pro colors)
  const initialHighlightingConfig = readHighlightingConfig();

  // 1. Gestor de sintaxis y coloreado por tipo de palabra (POS: Verbos, Sustantivos, etc.)
  const syntaxHighlighter = new SyntaxHighlighter(context, initialHighlightingConfig);

  // 2. Gestor de la barra inferior (Status Bar: contador palabras, caracteres, barra de progreso)
  const statusBarManager = new StatusBarManager(context);

  // 3. Vigilante de eventos de documentos (escucha cambios de texto, scroll, cambio de pestaña)
  watcherInstance = new DocumentWatcher(context, statusBarManager, syntaxHighlighter);

  // ───────────────────────────────────────────────────────────────────────────
  // PASO 2: Registro de Comandos de VS Code
  // Cada comando registrado aquí coincide exactamente con un comando en `package.json`.
  // ───────────────────────────────────────────────────────────────────────────

  // Comando A: Activar modo escritor en el archivo actual
  const cmdOpenWriter = vscode.commands.registerCommand('wordcraft.openWriter', async () => {
    await handleOpenWriter(statusBarManager, syntaxHighlighter);
  });

  // Comando B: Establecer límite/meta de palabras (mínimo y máximo)
  const cmdSetWordGoal = vscode.commands.registerCommand('wordcraft.setWordGoal', async () => {
    await handleSetWordGoal(statusBarManager);
  });

  // Comando C: Activar/desactivar el resaltado de colores tipo código
  const cmdToggleHighlighting = vscode.commands.registerCommand('wordcraft.toggleHighlighting', async () => {
    await handleToggleHighlighting(syntaxHighlighter);
  });

  // Comando D: Selector para elegir qué datos mostrar en la barra inferior
  const cmdConfigureStatusBar = vscode.commands.registerCommand('wordcraft.configureStatusBar', async () => {
    await handleConfigureStatusBar(statusBarManager);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PASO 3: Registro de Suscripciones
  // Al agregar los objetos a `context.subscriptions`, VS Code los liberará
  // automáticamente de memoria cuando la extensión se desactive o cierre.
  // ───────────────────────────────────────────────────────────────────────────
  context.subscriptions.push(
    cmdOpenWriter,
    cmdSetWordGoal,
    cmdToggleHighlighting,
    cmdConfigureStatusBar,
    {
      dispose: () => {
        syntaxHighlighter.dispose();
        statusBarManager.dispose();
        watcherInstance?.dispose();
      },
    }
  );

  console.log('[WordCraft] Activación completada con éxito.');
}

/**
 * Función obligatoria de VS Code. Se ejecuta cuando la extensión se desactiva.
 * Se usa para liberar memoria, temporizadores o suscripciones pendientes.
 */
export function deactivate(): void {
  console.log('[WordCraft] Desactivando extensión y liberando recursos...');
  if (watcherInstance) {
    watcherInstance.dispose();
    watcherInstance = undefined;
  }
}