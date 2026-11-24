/** Languages of the card's texts; English is used for all others. */
const LANGUAGES = ['en', 'de', 'fr', 'it', 'es'] as const;
type Language = (typeof LANGUAGES)[number];

/** Texts of card and editor; `{name}` marks a value inserted by `message`. */
const MESSAGES = {
  en: {
    loadFailed: 'Graphic could not be loaded: {reason}',
    invalidEntries: '{count} invalid entries in the configuration (details in the browser console)',
    configInvalid: 'Invalid configuration',
    fieldMissing:
      '"{field}" is missing: enter "graphic" (id from the cuttleskin portal) or the URL of the file, e.g. /local/cuttleskin/graphic.svg',
    graphicInvalid: '"graphic" must be the id of a graphic from the cuttleskin portal',
    versionInvalid: '"version" must be a version number (1, 2, …)',
    assetsInvalid: '"assets" must be the URL of the image folder',
    aspectRatioInvalid: '"aspect_ratio" must be a number greater than 0 (width / height)',
    variablesInvalid: '"variables" must map variable names to entities',
    entityMissing: 'variables.{name}: "entity" is missing',
    attributeInvalid: 'variables.{name}.attribute must be a text',
    mapInvalid: 'variables.{name}.map must map states to text, numbers or true/false',
    formulaInvalid: 'variables.{name}.formula is not valid: {reason}',
    labelGraphic: 'Graphic id from the cuttleskin portal (needs the cuttleskin integration)',
    labelSvg: 'SVG file (URL, without graphic id)',
    labelConfig: 'Configuration (URL, without graphic id)',
    labelAspectRatio: 'Aspect ratio width / height (empty: from the graphic)',
    configUnreadable: 'Configuration not readable: {reason}',
    editorUnavailable: 'Visual editor not available; please use the code editor (YAML).',
    noVariables: 'No variables found.',
    entitiesHeading: 'Entities for the variables:',
    typeNumber: 'number {minimum} to {maximum}',
    typeBoolean: 'yes/no',
    typeText: 'text',
    pickerDescription: 'Data-driven SVG graphic whose variables follow entities',
    placeholder: 'Choose a graphic: enter its id from the cuttleskin portal in the editor.',
    placeholderFiles:
      'Choose a graphic: export it from the cuttleskin portal, copy the files to www/ and enter the URLs of SVG and configuration in the editor.',
  },
  de: {
    loadFailed: 'Grafik konnte nicht geladen werden: {reason}',
    invalidEntries:
      '{count} ungültige Einträge in der Konfiguration (Details in der Browser-Konsole)',
    configInvalid: 'Ungültige Konfiguration',
    fieldMissing:
      '"{field}" fehlt: "graphic" (ID aus dem cuttleskin-Portal) oder die URL der Datei angeben, z. B. /local/cuttleskin/grafik.svg',
    graphicInvalid: '"graphic" muss die ID einer Grafik aus dem cuttleskin-Portal sein',
    versionInvalid: '"version" muss eine Versionsnummer sein (1, 2, …)',
    assetsInvalid: '"assets" muss die URL des Bildordners sein',
    aspectRatioInvalid: '"aspect_ratio" muss eine Zahl größer 0 sein (Breite / Höhe)',
    variablesInvalid: '"variables" muss Variablennamen auf Entitäten abbilden',
    entityMissing: 'variables.{name}: "entity" fehlt',
    attributeInvalid: 'variables.{name}.attribute muss ein Text sein',
    mapInvalid: 'variables.{name}.map muss Zustände auf Text, Zahl oder true/false abbilden',
    formulaInvalid: 'variables.{name}.formula ist ungültig: {reason}',
    labelGraphic: 'Grafik-ID aus dem cuttleskin-Portal (braucht die cuttleskin-Integration)',
    labelSvg: 'SVG-Datei (URL, ohne Grafik-ID)',
    labelConfig: 'Konfiguration (URL, ohne Grafik-ID)',
    labelAspectRatio: 'Seitenverhältnis Breite / Höhe (leer: aus der Grafik)',
    configUnreadable: 'Konfiguration nicht lesbar: {reason}',
    editorUnavailable: 'Visueller Editor nicht verfügbar; bitte den Code-Editor (YAML) verwenden.',
    noVariables: 'Keine Variablen gefunden.',
    entitiesHeading: 'Entitäten für die Variablen:',
    typeNumber: 'Zahl {minimum} bis {maximum}',
    typeBoolean: 'ja/nein',
    typeText: 'Text',
    pickerDescription: 'Datengesteuerte SVG-Grafik, deren Variablen Entitäten folgen',
    placeholder: 'Grafik wählen: im Editor die ID aus dem cuttleskin-Portal eintragen.',
    placeholderFiles:
      'Grafik wählen: im cuttleskin-Portal exportieren, die Dateien nach www/ kopieren und im Editor die URLs von SVG und Konfiguration eintragen.',
  },
  fr: {
    loadFailed: 'Le graphique n’a pas pu être chargé : {reason}',
    invalidEntries:
      '{count} entrées non valides dans la configuration (détails dans la console du navigateur)',
    configInvalid: 'Configuration non valide',
    fieldMissing:
      '« {field} » manque : indiquez « graphic » (ID du portail cuttleskin) ou l’URL du fichier, p. ex. /local/cuttleskin/graphique.svg',
    graphicInvalid: '« graphic » doit être l’ID d’un graphique du portail cuttleskin',
    versionInvalid: '« version » doit être un numéro de version (1, 2, …)',
    assetsInvalid: '« assets » doit être l’URL du dossier d’images',
    aspectRatioInvalid: '« aspect_ratio » doit être un nombre supérieur à 0 (largeur / hauteur)',
    variablesInvalid: '« variables » doit associer des noms de variables à des entités',
    entityMissing: 'variables.{name} : « entity » manque',
    attributeInvalid: 'variables.{name}.attribute doit être un texte',
    mapInvalid:
      'variables.{name}.map doit associer des états à du texte, des nombres ou true/false',
    formulaInvalid: 'variables.{name}.formula n’est pas valide : {reason}',
    labelGraphic: 'ID du graphique du portail cuttleskin (nécessite l’intégration cuttleskin)',
    labelSvg: 'Fichier SVG (URL, sans ID de graphique)',
    labelConfig: 'Configuration (URL, sans ID de graphique)',
    labelAspectRatio: 'Rapport largeur / hauteur (vide : celui du graphique)',
    configUnreadable: 'Configuration illisible : {reason}',
    editorUnavailable: 'Éditeur visuel indisponible ; veuillez utiliser l’éditeur de code (YAML).',
    noVariables: 'Aucune variable trouvée.',
    entitiesHeading: 'Entités pour les variables :',
    typeNumber: 'nombre de {minimum} à {maximum}',
    typeBoolean: 'oui/non',
    typeText: 'texte',
    pickerDescription:
      'Graphique SVG piloté par les données dont les variables suivent des entités',
    placeholder: 'Choisissez un graphique : saisissez son ID du portail cuttleskin dans l’éditeur.',
    placeholderFiles:
      'Choisissez un graphique : exportez-le depuis le portail cuttleskin, copiez les fichiers dans www/ et saisissez dans l’éditeur les URL du SVG et de la configuration.',
  },
  it: {
    loadFailed: 'Impossibile caricare la grafica: {reason}',
    invalidEntries:
      '{count} voci non valide nella configurazione (dettagli nella console del browser)',
    configInvalid: 'Configurazione non valida',
    fieldMissing:
      '"{field}" mancante: indicare "graphic" (ID dal portale cuttleskin) o l’URL del file, ad es. /local/cuttleskin/grafica.svg',
    graphicInvalid: '"graphic" deve essere l’ID di una grafica del portale cuttleskin',
    versionInvalid: '"version" deve essere un numero di versione (1, 2, …)',
    assetsInvalid: '"assets" deve essere l’URL della cartella delle immagini',
    aspectRatioInvalid: '"aspect_ratio" deve essere un numero maggiore di 0 (larghezza / altezza)',
    variablesInvalid: '"variables" deve associare nomi di variabili a entità',
    entityMissing: 'variables.{name}: "entity" mancante',
    attributeInvalid: 'variables.{name}.attribute deve essere un testo',
    mapInvalid: 'variables.{name}.map deve associare stati a testo, numeri o true/false',
    formulaInvalid: 'variables.{name}.formula non è valida: {reason}',
    labelGraphic: 'ID della grafica dal portale cuttleskin (richiede l’integrazione cuttleskin)',
    labelSvg: 'File SVG (URL, senza ID della grafica)',
    labelConfig: 'Configurazione (URL, senza ID della grafica)',
    labelAspectRatio: 'Proporzioni larghezza / altezza (vuoto: dalla grafica)',
    configUnreadable: 'Configurazione non leggibile: {reason}',
    editorUnavailable: 'Editor visuale non disponibile; usare l’editor di codice (YAML).',
    noVariables: 'Nessuna variabile trovata.',
    entitiesHeading: 'Entità per le variabili:',
    typeNumber: 'numero da {minimum} a {maximum}',
    typeBoolean: 'sì/no',
    typeText: 'testo',
    pickerDescription: 'Grafica SVG guidata dai dati, le cui variabili seguono le entità',
    placeholder: 'Scegli una grafica: inserisci nell’editor il suo ID dal portale cuttleskin.',
    placeholderFiles:
      'Scegli una grafica: esportala dal portale cuttleskin, copia i file in www/ e inserisci nell’editor gli URL di SVG e configurazione.',
  },
  es: {
    loadFailed: 'No se pudo cargar el gráfico: {reason}',
    invalidEntries:
      '{count} entradas no válidas en la configuración (detalles en la consola del navegador)',
    configInvalid: 'Configuración no válida',
    fieldMissing:
      'Falta "{field}": indica "graphic" (ID del portal cuttleskin) o la URL del archivo, p. ej. /local/cuttleskin/grafico.svg',
    graphicInvalid: '"graphic" debe ser el ID de un gráfico del portal cuttleskin',
    versionInvalid: '"version" debe ser un número de versión (1, 2, …)',
    assetsInvalid: '"assets" debe ser la URL de la carpeta de imágenes',
    aspectRatioInvalid: '"aspect_ratio" debe ser un número mayor que 0 (ancho / alto)',
    variablesInvalid: '"variables" debe asignar nombres de variables a entidades',
    entityMissing: 'variables.{name}: falta "entity"',
    attributeInvalid: 'variables.{name}.attribute debe ser un texto',
    mapInvalid: 'variables.{name}.map debe asignar estados a texto, números o true/false',
    formulaInvalid: 'variables.{name}.formula no es válida: {reason}',
    labelGraphic: 'ID del gráfico del portal cuttleskin (requiere la integración cuttleskin)',
    labelSvg: 'Archivo SVG (URL, sin ID de gráfico)',
    labelConfig: 'Configuración (URL, sin ID de gráfico)',
    labelAspectRatio: 'Relación de aspecto ancho / alto (vacío: la del gráfico)',
    configUnreadable: 'Configuración ilegible: {reason}',
    editorUnavailable: 'Editor visual no disponible; usa el editor de código (YAML).',
    noVariables: 'No se encontraron variables.',
    entitiesHeading: 'Entidades para las variables:',
    typeNumber: 'número de {minimum} a {maximum}',
    typeBoolean: 'sí/no',
    typeText: 'texto',
    pickerDescription: 'Gráfico SVG basado en datos cuyas variables siguen a entidades',
    placeholder: 'Elige un gráfico: introduce en el editor su ID del portal cuttleskin.',
    placeholderFiles:
      'Elige un gráfico: expórtalo desde el portal cuttleskin, copia los archivos en www/ e introduce en el editor las URL del SVG y de la configuración.',
  },
} as const satisfies Record<Language, Record<string, string>>;

export type MessageKey = keyof (typeof MESSAGES)['en'];

function isLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value);
}

/**
 * Language of the texts: Home Assistant's user language if known, else the language of the page
 * (Home Assistant sets `<html lang>`), else the browser language; only the primary subtag counts.
 */
export function cardLanguage(hassLanguage?: string): Language {
  const candidates = [
    hassLanguage,
    typeof document === 'undefined' ? undefined : document.documentElement.lang,
    typeof navigator === 'undefined' ? undefined : navigator.language,
  ];
  for (const candidate of candidates) {
    const primary = candidate?.toLowerCase().split('-')[0];
    if (primary && isLanguage(primary)) return primary;
  }
  return 'en';
}

/** Text in `language` with the values inserted, e.g. `message('de', 'loadFailed', { reason })`. */
export function message(
  language: Language,
  key: MessageKey,
  values: Readonly<Record<string, string | number>> = {},
): string {
  return MESSAGES[language][key].replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name];
    return value === undefined ? match : String(value);
  });
}

export type { Language as CardLanguage };
