# Vai Comigo - API Gateway

## 📋 Visão Geral

A **API Gateway** é o ponto único de entrada para o backend do **Vai Comigo**. Funciona como um **facade e orquestrador leve**, centralizando concerns transversais e mantendo os microsserviços desacoplados.

### Responsabilidades

✅ Receber todas as requisições HTTP/HTTPS do cliente  
✅ Validar e decodificar JWT  
✅ Aplicar autorização básica por rota  
✅ Realizar roteamento interno para os microsserviços  
✅ Centralizar **cross-cutting concerns**:
  - Autenticação via JWT
  - Rate limiting
  - Logging estruturado
  - Correlação de requisições
  - Tratamento padronizado de erros

### ❌ Não faz

❌ Não contem regra de negócio  
❌ Não acessa banco de dados  
❌ Não realiza processamento pesado

---

## 🏗️ Arquitetura

### Stack Tecnológico

- **NestJS** - Framework web progressivo
- **TypeScript** - Tipagem estática
- **@nestjs/axios** - HTTP client
- **@nestjs/config** - Gerenciamento de configuração
- **@nestjs/swagger** - Documentação OpenAPI
- **@nestjs/throttler** - Rate limiting
- **jsonwebtoken** - Validação de JWT
- **class-validator** - Validação de dados
- **Jest** - Testes unitários
- **Docker** - Containerização

### Estrutura de Pastas

```
src/
 ├── main.ts                          # Entry point
 ├── app.module.ts                    # Root module
 ├── config/
 │    ├── gateway-config.service.ts   # Configuration service
 │    └── config.module.ts            # Config module
 ├── auth/
 │    ├── jwt-auth.service.ts         # JWT validation
 │    ├── jwt.guard.ts                # JWT guard
 │    ├── roles.guard.ts              # Role-based access control
 │    ├── roles.decorator.ts          # Roles metadata
 │    └── auth.module.ts              # Auth module
 ├── gateway/
 │    ├── gateway.controller.ts       # Main controller
 │    ├── gateway.service.ts          # Gateway logic
 │    ├── http-client.service.ts      # HTTP forwarding
 │    ├── route-map.service.ts        # Route mapping
 │    └── gateway.module.ts           # Gateway module
 ├── health/
 │    ├── health-check.controller.ts  # Health check endpoint
 │    ├── health-check.service.ts     # Service health check
 │    └── health.module.ts            # Health module
 ├── common/
 │    ├── filters/
 │    │    └── global-exception.filter.ts  # Exception handling
 │    ├── middleware/
 │    │    └── correlation-id.middleware.ts # Request correlation
 │    └── interceptors/               # (placeholder)
 └── types/
      └── index.ts                    # Type definitions

test/
 └── jest-e2e.json                   # E2E test configuration
```

### Fluxo de Requisição

```
1. Cliente envia requisição HTTP
   ↓
2. API Gateway recebe (CorrelationIdMiddleware gera ID único)
   ↓
3. GlobalExceptionFilter protege
   ↓
4. RouteMapService identifica o serviço destino
   ↓
5. Verifica autenticação (se rota não pública)
   └─→ Valida JWT
   └─→ Extrai userContext (userId, role)
   ↓
6. Verifica autorização por papel (se aplicável)
   ↓
7. HttpClientService encaminha requisição:
   └─→ Preserva método HTTP
   └─→ Preserva headers relevantes
   └─→ Propaga x-correlation-id
   └─→ Inclui headers de auditoria
   ↓
8. Microsserviço processa
   ↓
9. Resposta retorna ao cliente com status e dados
   └─→ Inclui x-correlation-id
```

---

## 🔐 Autenticação e Segurança

### JWT (JSON Web Tokens)

#### Formato do Token

```
Authorization: Bearer <JWT_TOKEN>
```

#### Claims Obrigatórias

```json
{
  "userId": "uuid",
  "role": "USER|ADMIN",
  "iat": 1234567890,
  "exp": 1234571490,
  "iss": "vai-comigo",
  "aud": "vai-comigo-client"
}
```

#### Validação

- ✅ Assinatura do token
- ✅ Expiração
- ✅ Issuer (emissor)
- ✅ Audience (destinatário)
- ✅ Claims obrigatórias

### Guarda de Rotas

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| **Pública** | Sem autenticação | `/api/users/register`, `/api/users/login` |
| **Autenticada** | Requer JWT válido | `/api/users/profile`, `/api/rides` |
| **Restritas** | Requer role específico | `/api/admin/*` → `ADMIN` |


## 🛣️ Roteamento Interno

A API Gateway funciona como **reverse proxy lógico**, mapeando requisições para os serviços internos.

### Mapeamento de Rotas

| Rota Pública | Serviço Interno |
|--------------|-----------------|
| `/api/users/**` | User Service |
| `/api/rides/**` | Ride Service |
| `/api/chat/**` | Chat Service |
| `/api/maps/**` | Maps Service |
| `/api/reviews/**` | Review Service |

### Roteamento Preserva

✅ Método HTTP (GET, POST, PUT, DELETE, PATCH)  
✅ Headers relevantes (Authorization, Content-Type, etc.)  
✅ Request body (para POST, PUT, PATCH)  
✅ Query parameters  
✅ x-correlation-id (propagado)

## 📊 Rate Limiting

Proteção contra abuso, com limites diferentes para usuários autenticados e anônimos.

### Configuração Padrão

| Tipo | Limite | Janela |
|------|--------|--------|
| **Por IP (anônimo)** | 100 req/min | 60 segundos |
| **Autenticado** | 300 req/min | 60 segundos |

### X-Correlation-ID

- **Gerado**: Se não existir no header
- **Propagado**: Para todos os microsserviços
- **Rastreabilidade**: Agrupa logs de uma requisição

---
