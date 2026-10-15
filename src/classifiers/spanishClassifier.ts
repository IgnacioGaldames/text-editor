// =============================================================================
// FILE: src/classifiers/spanishClassifier.ts
//
// PURPOSE: Part-of-speech classification exclusively for SPANISH prose.
//
// RESPONSIBILITIES:
//   - Spanish word dictionaries (Pronombres, Conjunciones, Preposiciones,
//     Verbos conjugados/irregulares, Adjetivos, Adverbios).
//   - Manejo de pronombres enclíticos (mirarla, arriesgarme, moviendose).
//   - Heurísticas morfológicas de sufijos en español (-mente, -ando, -oso, etc.).
// =============================================================================

import type { PartOfSpeech } from '../types';

const CONJUNCTIONS: ReadonlySet<string> = new Set([
  'y', 'e', 'ni', 'o', 'u', 'pero', 'mas', 'sino', 'aunque', 'porque',
  'pues', 'si', 'como', 'mientras', 'cuando', 'donde', 'que', 'ya', 'bien',
  'sea', 'siquiera', 'conque', 'luego', 'así', 'asi', 'entonces', 'puesto',
  'dado', 'visto', 'supuesto', 'salvo', 'excepto', 'menos', 'tan', 'tanto',
]);

const PREPOSITIONS: ReadonlySet<string> = new Set([
  'a', 'ante', 'bajo', 'cabe', 'con', 'contra', 'de', 'desde', 'durante',
  'en', 'entre', 'hacia', 'hasta', 'mediante', 'para', 'por', 'según', 'segun',
  'sin', 'so', 'sobre', 'tras', 'versus', 'vía', 'via', 'del', 'al',
]);

const PRONOUNS: ReadonlySet<string> = new Set([
  // Artículos
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo',
  // Personales y clíticos
  'yo', 'tú', 'tu', 'él', 'ella', 'ello', 'nosotros', 'nosotras',
  'vosotros', 'vosotras', 'ellos', 'ellas', 'usted', 'ustedes',
  'me', 'te', 'se', 'nos', 'os', 'le', 'les', 'mí', 'mi', 'ti', 'sí',
  'conmigo', 'contigo', 'consigo',
  // Demostrativos / posesivos / indefinidos
  'este', 'esta', 'estos', 'estas', 'esto',
  'ese', 'esa', 'esos', 'esas', 'eso',
  'aquel', 'aquella', 'aquellos', 'aquellas', 'aquello',
  'mío', 'mía', 'míos', 'mías', 'tuyo', 'tuya', 'tuyos', 'tuyas',
  'suyo', 'suya', 'suyos', 'suyas', 'nuestro', 'nuestra', 'nuestros', 'nuestras',
  'su', 'sus', 'mis', 'tus',
  'alguien', 'nadie', 'algo', 'nada', 'quien', 'quién', 'quienes', 'quiénes',
  'cuál', 'cual', 'cuáles', 'cuales', 'cuanto', 'cuánto', 'cuanta', 'cuánta',
  'ambos', 'ambas', 'otro', 'otra', 'otros', 'otras', 'mismo', 'misma', 'mismos', 'mismas',
  'uno', 'cuyo', 'cuya', 'cuyos', 'cuyas', 'alguno', 'alguna', 'algunos', 'algunas',
  'ninguno', 'ninguna', 'ningunos', 'ningunas',
]);

const ADVERBS: ReadonlySet<string> = new Set([
  'sí', 'no', 'nunca', 'jamás', 'jamas', 'tampoco', 'acaso', 'quizá', 'quizas',
  'tal', 'vez', 'muy', 'más', 'mas', 'menos', 'mucho', 'poco', 'bastante',
  'demasiado', 'casi', 'solo', 'sólo', 'apenas', 'tan', 'tanto', 'nada',
  'aquí', 'aqui', 'allí', 'alli', 'acá', 'aca', 'allá', 'alla', 'ahí', 'ahi',
  'cerca', 'lejos', 'arriba', 'abajo', 'delante', 'detrás', 'detras',
  'encima', 'debajo', 'dentro', 'fuera', 'hoy', 'ayer', 'mañana', 'manana',
  'ahora', 'antes', 'después', 'despues', 'luego', 'pronto', 'tarde', 'temprano',
  'todavía', 'todavia', 'aún', 'aun', 'ya', 'siempre', 'bien', 'mal', 'despacio',
  'deprisa', 'así', 'asi', 'claro', 'exacto', 'obvio', 'inclusive', 'incluso',
]);

const ADJECTIVES: ReadonlySet<string> = new Set([
  'gran', 'grande', 'grandes', 'pequeño', 'pequeña', 'pequeños', 'pequeñas',
  'bueno', 'buena', 'buenos', 'buenas', 'buen',
  'malo', 'mala', 'malos', 'malas', 'mal',
  'mejor', 'mejores', 'peor', 'peores',
  'nuevo', 'nueva', 'nuevos', 'nuevas',
  'viejo', 'vieja', 'viejos', 'viejas',
  'alto', 'alta', 'altos', 'altas',
  'bajo', 'baja', 'bajos', 'bajas',
  'largo', 'larga', 'largos', 'largas',
  'corto', 'corta', 'cortos', 'cortas',
  'blanco', 'blanca', 'blancos', 'blancas',
  'negro', 'negra', 'negros', 'negras',
  'rojo', 'roja', 'rojos', 'rojas',
  'azul', 'azules', 'verde', 'verdes',
  'amarillo', 'amarilla', 'amarillos', 'amarillas',
  'oscuro', 'oscura', 'obscuro', 'obscura', 'oscuros', 'oscuras',
  'claro', 'clara', 'claros', 'claras',
  'caliente', 'calientes', 'frío', 'fría', 'fríos', 'frías',
  'izquierdo', 'izquierda', 'izquierdos', 'izquierdas',
  'derecho', 'derecha', 'derechos', 'derechas',
  'primero', 'primera', 'primeros', 'primeras', 'primer',
  'segundo', 'segunda', 'segundos', 'segundas',
  'último', 'última', 'últimos', 'últimas', 'ultimo', 'ultima',
  'joven', 'jóvenes', 'jovenes',
  'asiático', 'asiática', 'asiaticos', 'asiaticas', 'asiatico', 'asiatica',
  'metálico', 'metálica', 'metalico', 'metalica', 'metálicos', 'metálicas',
  'robótico', 'robótica', 'robotico', 'robotica', 'robóticos', 'robóticas',
  'computacional', 'computacionales',
  'roto', 'rota', 'rotos', 'rotas',
  'fuerte', 'fuertes', 'débil', 'debiles', 'fácil', 'facil', 'difícil', 'dificil',
  'libre', 'libres', 'lleno', 'llena', 'llenos', 'llenas',
  'posible', 'posibles', 'imposible', 'imposibles',
  'importante', 'importantes', 'necesario', 'necesaria',
  'cierto', 'cierta', 'ciertos', 'ciertas',
  'propio', 'propia', 'propios', 'propias',
  'único', 'única', 'únicos', 'únicas', 'unico', 'unica',
  'puro', 'pura', 'puros', 'puras',
  'seguro', 'segura', 'seguros', 'seguras',
  'vivo', 'viva', 'vivos', 'vivas', 'muerto', 'muerta', 'muertos', 'muertas',
  'visto', 'vista', 'vistos', 'vistas',
  'escondido', 'escondida', 'escondidos', 'escondidas',
]);

const VERBS: ReadonlySet<string> = new Set([
  'es', 'son', 'era', 'eran', 'fue', 'fueron', 'sea', 'sean', 'ser', 'siendo', 'sido',
  'está', 'esta', 'están', 'estan', 'estaba', 'estaban', 'estuvo', 'estuvieron', 'estar', 'estando',
  'hay', 'había', 'habia', 'hubo', 'ha', 'han', 'he', 'hemos', 'habrá', 'haber',
  'tengo', 'tiene', 'tienen', 'tenía', 'tenia', 'tenían', 'tenian', 'tuve', 'tuvo', 'tuvieron', 'tener',
  'puedo', 'puede', 'pueden', 'podía', 'podia', 'podían', 'pude', 'pudo', 'pudieron', 'poder',
  'debo', 'debe', 'deben', 'debía', 'debería', 'deber',
  'voy', 'va', 'van', 'iba', 'iban', 'fui', 'fueron', 'vaya', 'ir', 'yendo', 'ido',
  'caigo', 'cae', 'caen', 'caía', 'cayó', 'cayeron', 'caer',
  'veo', 'ves', 've', 'vemos', 'ven', 'veía', 'veia', 'vio', 'vieron', 'ver',
  'miro', 'mira', 'miran', 'miraba', 'miró', 'mirar', 'mirarla', 'mirarlo', 'mirarse',
  'escucho', 'escucha', 'escuchan', 'escuchaba', 'escuché', 'escuchar', 'esucho',
  'huelo', 'huele', 'huelen', 'olía', 'oler',
  'siento', 'siente', 'sienten', 'sentía', 'sintió', 'sentir',
  'duele', 'duelen', 'dolió', 'doler',
  'gira', 'giran', 'giraba', 'giró', 'girar',
  'vuela', 'vuelan', 'volaba', 'voló', 'volar',
  'descansan', 'descansa', 'descansaba', 'descansó', 'descansar',
  'aferra', 'aferran', 'aferraba', 'aferró', 'aferrarse',
  'deja', 'dejan', 'dejaba', 'dejó', 'dejar', 'dejando',
  'escupe', 'escupen', 'escupía', 'escupiendo', 'esucpiendo', 'escupir',
  'mueve', 'mueven', 'movía', 'movió', 'mover', 'moviendo', 'moviendose',
  'corre', 'corren', 'corría', 'corrió', 'correr',
  'camina', 'caminan', 'caminaba', 'caminó', 'caminar',
  'pasa', 'pasan', 'pasaba', 'pasó', 'pasar',
  'llega', 'llegan', 'llegaba', 'llegó', 'llegar',
  'sale', 'salen', 'salía', 'salió', 'salir',
  'entra', 'entran', 'entraba', 'entró', 'entrar',
  'hace', 'hacen', 'hacía', 'hizo', 'hicieron', 'hacer',
  'dice', 'dicen', 'decía', 'dijo', 'dijeron', 'decir',
  'quiere', 'quieren', 'quería', 'quiso', 'querer',
  'sabe', 'saben', 'sabía', 'supo', 'saber',
  'da', 'dan', 'daba', 'dio', 'dieron', 'dar',
  'pone', 'ponen', 'ponía', 'puso', 'poner',
  'sigue', 'siguen', 'seguía', 'siguió', 'seguir',
  'cree', 'creen', 'creía', 'creyó', 'creer',
  'parece', 'parecen', 'parecía', 'pareció', 'parecer',
  'espera', 'esperan', 'esperaba', 'esperó', 'esperar',
  'busca', 'buscan', 'buscaba', 'buscó', 'buscar',
  'arriesga', 'arriesgan', 'arriesgar', 'arriesgarme', 'arriesgarse',
]);

/**
 * Classifies a Spanish lowercase word into a PartOfSpeech.
 * Returns null if the word is not recognized by Spanish dictionaries or rules.
 */
export function classifySpanishWord(w: string): PartOfSpeech | null {
  if (CONJUNCTIONS.has(w)) {
    return 'conjunction';
  }
  if (PREPOSITIONS.has(w)) {
    return 'preposition';
  }
  if (PRONOUNS.has(w)) {
    return 'pronoun';
  }
  if (ADVERBS.has(w)) {
    return 'adverb';
  }
  if (ADJECTIVES.has(w)) {
    return 'adjective';
  }
  if (VERBS.has(w)) {
    return 'verb';
  }

  // Pronombres enclíticos españoles (mirarla, arriesgarme, etc.)
  const encliticMatch = w.match(/^(.+)(me|te|se|nos|os|la|lo|las|los|le|les)$/);
  if (encliticMatch && encliticMatch[1].length >= 3) {
    const base = encliticMatch[1];
    if (
      base.endsWith('ar') || base.endsWith('er') || base.endsWith('ir') ||
      base.endsWith('ando') || base.endsWith('endo') || base.endsWith('iendo') ||
      VERBS.has(base)
    ) {
      return 'verb';
    }
  }

  // Sufijos adverbiales españoles: -mente
  if (w.endsWith('mente') && w.length > 5) {
    return 'adverb';
  }

  // Sufijos verbales españoles
  if (
    (w.endsWith('ando') || w.endsWith('iendo') || w.endsWith('yendo') ||
     w.endsWith('izar') || w.endsWith('ecer') || w.endsWith('ificar')) && w.length > 5
  ) {
    return 'verb';
  }

  // Sufijos adjetivales españoles
  if (
    (w.endsWith('oso') || w.endsWith('osa') || w.endsWith('osos') || w.endsWith('osas') ||
     w.endsWith('ivo') || w.endsWith('iva') || w.endsWith('ivos') || w.endsWith('ivas') ||
     w.endsWith('able') || w.endsWith('ible') || w.endsWith('ables') || w.endsWith('ibles') ||
     w.endsWith('ico') || w.endsWith('ica') || w.endsWith('icos') || w.endsWith('icas') ||
     w.endsWith('al') || w.endsWith('ales')) && w.length > 4
  ) {
    return 'adjective';
  }

  // Sufijos sustantivales españoles
  if (
    (w.endsWith('ción') || w.endsWith('cion') || w.endsWith('sión') || w.endsWith('sion') ||
     w.endsWith('miento') || w.endsWith('mientos') ||
     w.endsWith('dad') || w.endsWith('dades') ||
     w.endsWith('eza') || w.endsWith('ez') ||
     w.endsWith('encia') || w.endsWith('encias') ||
     w.endsWith('ancia') || w.endsWith('ancias') ||
     w.endsWith('ura') || w.endsWith('uras')) && w.length > 4
  ) {
    return 'noun';
  }

  return null;
}
