# Heimspiel

Die ganze App steckt in `index.html` (HTML, CSS und JavaScript in einer Datei).

## Ablauf bei Änderungen

1. Änderung machen, committen und auf den Arbeitsbranch pushen.
2. Danach selbstständig einen Pull Request nach `main` erstellen.
3. Sobald der Nutzer „go“ schreibt, den offenen Pull Request in `main` mergen (Squash).
4. Ohne „go“ nichts mergen.

## Texte

Im Text keine Bindestriche benutzen. Antworten auf Deutsch.

## Netlify

Die Seite läuft auf heimspiel.netlify.app und wird aus `main` veröffentlicht.
`netlify/functions/preis.mjs` fragt bei Perplexity Artikelname und Preis ab
(erreichbar unter `/api/preis`, nur von heimspiel.netlify.app aus). Der Schlüssel
liegt bei Netlify in der Umgebungsvariable `PERPLEXITY_API_KEY`, niemals im Code.
