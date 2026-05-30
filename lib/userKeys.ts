// Almacenamiento de las API keys que el usuario trae (BYOK).
// La key vive SOLO en el navegador del usuario: usamos sessionStorage (se borra
// al cerrar la pestaña, más seguro que persistirla) y, si el navegador lo bloquea
// (incógnito endurecido / storage deshabilitado), caemos a una variable en memoria
// para no romper la app.

const OPENAI_KEY = "cqh:openai_key";
const ANTHROPIC_KEY = "cqh:anthropic_key";

// Fallback en memoria cuando localStorage no está disponible.
const memory: Record<string, string> = {};

function read(key: string): string | null {
  try {
    const v = window.localStorage.getItem(key);
    if (v != null) return v;
  } catch {
    // localStorage bloqueado: usamos memoria.
  }
  return memory[key] ?? null;
}

function write(key: string, value: string | null) {
  if (value) memory[key] = value;
  else delete memory[key];
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // localStorage bloqueado: la copia en memoria ya quedó guardada.
  }
}

export function getOpenAIKey(): string | null {
  return read(OPENAI_KEY);
}

export function getAnthropicKey(): string | null {
  return read(ANTHROPIC_KEY);
}

export function hasOpenAIKey(): boolean {
  return !!getOpenAIKey();
}

export function setKeys({
  openai,
  anthropic,
}: {
  openai: string;
  anthropic?: string;
}) {
  write(OPENAI_KEY, openai.trim());
  write(ANTHROPIC_KEY, anthropic?.trim() ? anthropic.trim() : null);
}

export function clearKeys() {
  write(OPENAI_KEY, null);
  write(ANTHROPIC_KEY, null);
}

// Validación mínima de formato para la UI (no garantiza que la key sea válida).
export function isLikelyOpenAIKey(v: string): boolean {
  return /^sk-[A-Za-z0-9_-]{20,}$/.test(v.trim());
}
