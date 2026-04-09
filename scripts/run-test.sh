#!/bin/bash

# Script para testar o fluxo de localização via Socket
# 
# Antes de rodar este script:
# 1. Certifique-se que o backend 42RouteAPI está rodando
# 2. Certifique-se que o banco de dados tem um motorista com rota atribuída
# 3. Certifique-se que há um cadete nessa rota

echo "═══════════════════════════════════════════════════════════════"
echo "  🧪 TESTE: Fluxo de Localização via WebSocket"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Este script testa:"
echo "  ✓ Motorista se conecta ao socket"
echo "  ✓ Motorista entra na rota"
echo "  ✓ Motorista envia localização VIA SOCKET (não REST)"
echo "  ✓ Cadete se conecta ao socket"
echo "  ✓ Cadete entra na rota"
echo "  ✓ Cadete recebe localização do motorista"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Conferir se está conectado ao BD
if ! node -e "require('@prisma/client')" 2>/dev/null; then
    echo "❌ Erro: Dependências não estão instaladas"
    echo "   Execute: npm install"
    exit 1
fi

# Rodar o teste
node scripts/test-location-socket-flow.js

if [ $? -eq 0 ]; then
    echo "✅ Teste concluído com sucesso!"
    exit 0
else
    echo "❌ Teste falhou!"
    exit 1
fi
