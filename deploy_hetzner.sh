#!/bin/bash

echo "🚀 Iniciando Deploy do Backend na Hetzner"
echo "=========================================="

# 1. Obter o IP
if [ -z "$1" ]; then
  echo "🤔 Qual é o IP do seu servidor na Hetzner?"
  echo "Dica: Acesse console.hetzner.cloud > Seu Projeto > Copie o IP do servidor"
  read -p "IP do Servidor: " SERVER_IP
else
  SERVER_IP=$1
fi

if [ -z "$SERVER_IP" ]; then
  echo "❌ IP não informado. Cancelando."
  exit 1
fi

# 2. Caminhos
LOCAL_FILE="/Users/jeffersonreis/.gemini/antigravity/brain/d188a536-b906-4ab8-b41a-3fe84a20ba0c/docker-compose.yml"
REMOTE_USER="root"
REMOTE_PATH="/root/docker-compose.yml"

echo ""
echo "📦 Enviando arquivo docker-compose.yml para $SERVER_IP..."

# 3. Enviar arquivo via SCP
scp "$LOCAL_FILE" "$REMOTE_USER@$SERVER_IP:$REMOTE_PATH"

if [ $? -eq 0 ]; then
  echo "✅ Arquivo enviado com sucesso!"
  echo ""
  echo "🔧 Próximos passos:"
  echo "1. Acesse o servidor: ssh $REMOTE_USER@$SERVER_IP"
  echo "2. Inicie o servico: docker-compose up -d"
  echo ""
  
  read -p "Deseja acessar o servidor via SSH agora? (s/n) " CONNECT_SSH
  if [[ "$CONNECT_SSH" =~ ^[Ss]$ ]]; then
    ssh "$REMOTE_USER@$SERVER_IP"
  fi
else
  echo "❌ Erro ao enviar arquivo. Verifique se o IP está correto e se você tem acesso SSH (chave pública configurada)."
fi
