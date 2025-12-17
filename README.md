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

### Exemplo de Autorização

```typescript
// Rota pública
@Post('/users/register')
async register() { ... }

// Rota autenticada
@UseGuards(JwtGuard)
@Get('/users/profile')
async getProfile() { ... }

// Rota restrida a admin
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
@Delete('/admin/users/:id')
async deleteUser() { ... }
```

---

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

### Exemplo de Requisição Encaminhada

```
Cliente:
  GET /api/rides/123?filter=active
  Authorization: Bearer <token>

Gateway encaminha para Ride Service:
  GET /123?filter=active
  Authorization: Bearer <token>
  x-correlation-id: a1b2c3d4-e5f6-7890
  x-forwarded-by: vai-comigo-api-gateway
```

---

## 📊 Rate Limiting

Proteção contra abuso, com limites diferentes para usuários autenticados e anônimos.

### Configuração Padrão

| Tipo | Limite | Janela |
|------|--------|--------|
| **Por IP (anônimo)** | 100 req/min | 60 segundos |
| **Autenticado** | 300 req/min | 60 segundos |

### Resposta de Excesso

```
HTTP 429 Too Many Requests

{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

### Configuração via ENV

```env
RATE_LIMIT_TTL=60000           # Janela de tempo (ms)
RATE_LIMIT_LIMIT=100           # Limite por IP
RATE_LIMIT_LIMIT_AUTHENTICATED=300  # Limite autenticado
```

---

## 📝 Observabilidade

### Logging Estruturado

Cada requisição é registrada com informações contextuais:

```
[CORRELATION_ID] METHOD PATH from IP
[CORRELATION_ID] Response: STATUS
```

#### Exemplo

```
[a1b2c3d4-e5f6-7890] GET /api/users/profile from ::1
[a1b2c3d4-e5f6-7890] Response: 200
[a1b2c3d4-e5f6-7890] GET /api/users/profile - 200 - 145ms
```

### X-Correlation-ID

- **Gerado**: Se não existir no header
- **Propagado**: Para todos os microsserviços
- **Rastreabilidade**: Agrupa logs de uma requisição

---

## ⚠️ Tratamento de Erros

### Formato Padronizado

```json
{
  "timestamp": "2024-12-17T10:30:45.123Z",
  "status": 500,
  "error": "Internal Server Error",
  "message": "Service temporarily unavailable",
  "path": "/api/rides/123",
  "correlationId": "a1b2c3d4-e5f6-7890"
}
```

### Códigos HTTP Comuns

| Código | Descrição |
|--------|-----------|
| **400** | Bad Request (rota desconhecida, validação falhou) |
| **401** | Unauthorized (JWT inválido/expirado) |
| **403** | Forbidden (Insufficient permissions) |
| **429** | Too Many Requests (rate limit excedido) |
| **500** | Internal Server Error (erro inesperado) |
| **503** | Service Unavailable (microsserviço indisponível) |

---

## 🏥 Health Check

Monitora a saúde da API Gateway e dos microsserviços.

### Endpoint

```
GET /health
```

### Resposta (Sucesso)

```json
{
  "status": "UP",
  "services": {
    "users": "UP",
    "rides": "UP",
    "chat": "UP",
    "maps": "UP",
    "reviews": "UP"
  },
  "timestamp": "2024-12-17T10:30:45.123Z"
}
```

### Resposta (Com Problema)

```json
{
  "status": "DOWN",
  "services": {
    "users": "UP",
    "rides": "DOWN",
    "chat": "UP",
    "maps": "UP",
    "reviews": "UP"
  },
  "timestamp": "2024-12-17T10:30:45.123Z"
}
```

---

## 📚 Swagger / OpenAPI

Documentação interativa dos endpoints do gateway.

### Acesso

```
GET http://localhost:3000/api/docs
```

### Documentação Inclui

✅ Autenticação JWT (com Bearer token)  
✅ Rotas públicas vs protegidas  
✅ Exemplos de request/response  
✅ Códigos de status HTTP  
✅ Parâmetros e validações  
✅ Tags por domínio (Users, Rides, Chat, etc.)

### ❌ NÃO Documenta

❌ Serviços internos  
❌ Detalhes de implementação dos microsserviços  
❌ Endpoints internos

---

## 🌍 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Porta do Gateway
PORT=3000

# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production
JWT_ISSUER=vai-comigo
JWT_AUDIENCE=vai-comigo-client
JWT_EXPIRATION=24h

# Microservices URLs (configurar com IPs/DNS corretos)
USER_SERVICE_URL=http://user-service:3001
RIDE_SERVICE_URL=http://ride-service:3002
CHAT_SERVICE_URL=http://chat-service:3003
MAPS_SERVICE_URL=http://maps-service:3004
REVIEW_SERVICE_URL=http://review-service:3005

# Rate Limiting
RATE_LIMIT_TTL=60000
RATE_LIMIT_LIMIT=100
RATE_LIMIT_LIMIT_AUTHENTICATED=300

# Logging
LOG_LEVEL=debug

# Ambiente
NODE_ENV=development
```

---

## 🚀 Como Usar

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Docker e Docker Compose (opcional)

### Instalação Local

```bash
# 1. Clonar repositório
git clone <repository-url>
cd api-gateway

# 2. Instalar dependências
npm install

# 3. Criar .env
cp .env.example .env

# 4. Executar em modo desenvolvimento
npm run start:dev
```

### Com Docker Compose

```bash
# Build e iniciar todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f api-gateway

# Parar e remover
docker-compose down
```

### Scripts Disponíveis

```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run start:prod
npm run build

# Testes
npm run test              # Testes unitários
npm run test:watch       # Modo watch
npm run test:cov         # Com cobertura

# Linting e formatação
npm run lint
npm run format
```

---

## 🧪 Testes

### Cobertura de Testes

- ✅ Validação de JWT
- ✅ Roteamento correto para microsserviços
- ✅ Bloqueio de acesso sem token
- ✅ Validação de roles
- ✅ Rate limiting
- ✅ Tratamento de erros
- ✅ Health check
- ✅ Propagação de correlation ID

### Executar Testes

```bash
# Testes unitários
npm run test

# Watch mode
npm run test:watch

# Com cobertura
npm run test:cov

# Arquivo específico
npm run test -- jwt-auth.service.spec.ts
```

---

## 📤 Exemplos de Uso

### 1. Registrar Novo Usuário (Público)

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "password": "senha123"
  }'
```

**Resposta:**
```json
{
  "id": "uuid-123",
  "name": "João Silva",
  "email": "joao@example.com"
}
```

---

### 2. Fazer Login (Público)

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@example.com",
    "password": "senha123"
  }'
```

**Resposta:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-123",
    "email": "joao@example.com"
  }
}
```

---

### 3. Acessar Perfil (Autenticado)

```bash
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Resposta:**
```json
{
  "id": "uuid-123",
  "name": "João Silva",
  "email": "joao@example.com",
  "role": "USER",
  "createdAt": "2024-12-17T10:00:00Z"
}
```

---

### 4. Criar Corrida (Autenticado)

```bash
curl -X POST http://localhost:3000/api/rides \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "Rua A, 123",
    "destination": "Rua B, 456",
    "dateTime": "2024-12-20T14:00:00Z"
  }'
```

---

### 5. Health Check

```bash
curl http://localhost:3000/health
```

**Resposta:**
```json
{
  "status": "UP",
  "services": {
    "users": "UP",
    "rides": "UP",
    "chat": "UP",
    "maps": "UP",
    "reviews": "UP"
  },
  "timestamp": "2024-12-17T10:30:45.123Z"
}
```

---

## 🛠️ Limitações e Considerações

### Limitações Atuais

⚠️ **Circuit Breaker**: Não implementado (considerado "opcional mas desejável")  
⚠️ **Retry Policy**: Simples, sem estratégia exponencial  
⚠️ **Cache**: Sem cache de respostas  
⚠️ **WebSocket**: Não suportado  
⚠️ **Compressão**: Não configurada  

### Considerações para Produção

- 🔐 **JWT_SECRET**: Usar valor forte e seguro
- 📊 **Rate Limit**: Ajustar conforme carga esperada
- 📝 **Logging**: Considerar integração com ELK ou Datadog
- 🔍 **Tracing**: Implementar OpenTelemetry
- 🔄 **Load Balance**: Usar HAProxy ou nginx em frente
- 📈 **Scaling**: Rodar múltiplas instâncias com load balancer

---

## 📋 Próximos Passos

### Curto Prazo

1. [ ] Implementar Circuit Breaker (resilience4j ou similar)
2. [ ] Adicionar retry com backoff exponencial
3. [ ] Integrar OpenTelemetry para distributed tracing
4. [ ] Implementar caching de respostas

### Médio Prazo

1. [ ] Adicionar autenticação OAuth2
2. [ ] Suporte a WebSocket (Socket.io)
3. [ ] Implementar GraphQL gateway
4. [ ] API versioning

### Longo Prazo

1. [ ] Service mesh (Istio)
2. [ ] Policy as Code
3. [ ] API Monetization
4. [ ] Analytics avançado

---

## 📞 Suporte

### Documentação

- [NestJS Docs](https://docs.nestjs.com)
- [JWT.io](https://jwt.io)
- [OpenAPI/Swagger](https://swagger.io)

### Troubleshooting

**Erro: JWT validation failed**
- Verificar JWT_SECRET está correto
- Verificar token não expirou
- Verificar formato Bearer <token>

**Erro: Service temporarily unavailable**
- Verificar URLs dos microsserviços em .env
- Verificar microsserviços estão rodando
- Verificar conectividade de rede

**Taxa de erro alta**
- Verificar rate limit (429)
- Verificar logs em `/health`
- Aumentar recursos (CPU/memória)

---

## 📄 Licença

MIT

---

## 👥 Contribuidores

Projeto de TCC - Vai Comigo Backend Architecture

---

**API Gateway v1.0.0** - 2024
