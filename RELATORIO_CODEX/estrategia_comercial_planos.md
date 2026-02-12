# Estrategia Comercial e Implementacao (AURA)

## Estrutura de Planos (lancamento)

1. Lite - R$ 79/mes
- 1 WhatsApp
- Sugestao com IA
- Sem CRM e sem varinha magica
- Limite mensal de mensagens com IA

2. Pro - R$ 179/mes
- 1 WhatsApp
- IA + varinha magica
- CRM basico
- Limite maior de mensagens com IA

3. Scale - R$ 349/mes
- Ate 3 WhatsApps
- Multiplos usuarios
- Funil completo + relatorios
- Limite alto/prioritario de IA

## Logica de Marketing (ancoragem + decoy)

- Lite reduz barreira de entrada.
- Pro vira opcao segura para maioria.
- Scale cria percepcao de valor por pequena diferenca de preco e melhora ticket medio.

## Implementacao para o Comprador (onboarding simples)

1. Cliente contrata e escolhe plano.
2. Sistema cria tenant interno do cliente.
3. Para cada numero contratado, criar uma instancia Evolution separada.
4. Cliente conecta cada numero via QR code no painel.
5. Cada conversa recebe marcador de canal/numero para rastreio.
6. Equipe opera com IA + CRM conforme permissao do plano.

## Arquitetura recomendada de canais

- 1 instancia Evolution por numero WhatsApp.
- Mapear: `tenant_id`, `instance_name`, `phone_label`, `plan`.
- Exemplo de labels: `Comercial`, `Pos-venda`, `Suporte`.

## Regras de upgrade

- Bateu limite IA no Lite/Pro: oferecer pacote extra ou upgrade.
- Necessidade de segundo numero: CTA direto para Scale.
- Necessidade de mais usuarios e relatorios: CTA para Scale.
