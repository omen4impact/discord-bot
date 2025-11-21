# 1. Basis-Image mit Node.js
FROM node:20-alpine

# 2. Arbeitsverzeichnis festlegen
WORKDIR /app

# 3. package.json kopieren und Abhängigkeiten installieren
COPY package*.json ./
RUN npm install

# 4. Restliche Dateien kopieren
COPY . .

# 5. Befehl zum Starten des Bots
CMD ["node", "index.js"]
