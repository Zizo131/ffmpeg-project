const apiBase = "/api";

export async function fetchVideoInfo(url) {
  const response = await fetch(`${apiBase}/info?${new URLSearchParams({ url })}`);
  if (!response.ok) {
    const { error } = await response.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(error);
  }
  return response.json();
}

export async function fetchSuggestions(title) {
  const response = await fetch(`${apiBase}/suggestions?${new URLSearchParams({ q: title })}`);
  if (!response.ok) {
    const { error } = await response.json().catch(() => ({ error: "Suggestions indisponibles" }));
    throw new Error(error);
  }
  return response.json();
}

export async function downloadMP3(url, quality) {
  const params = new URLSearchParams({ url, quality });
  const response = await fetch(`${apiBase}/download?${params}`);
  if (!response.ok) {
    const { error } = await response.json().catch(() => ({ error: "Téléchargement échoué" }));
    throw new Error(error);
  }
  return response.blob();
}
