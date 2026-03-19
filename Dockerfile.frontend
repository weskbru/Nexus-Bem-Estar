FROM node:20-alpine

WORKDIR /app

# Instala dependências primeiro (camada cacheada enquanto package.json não mudar)
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

# Copia o restante do projeto (configs, src, public, index.html)
COPY frontend/ .

EXPOSE 3000

CMD ["npm", "run", "dev"]
