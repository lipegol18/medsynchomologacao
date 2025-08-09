# Documentação da API MedSync

## Visão Geral

Esta documentação descreve a API REST do sistema MedSync, que gerencia dados de pacientes, hospitais, ordens médicas e OPME (Órteses, Próteses e Materiais Especiais).

A API foi projetada para ser utilizada por aplicações web e mobile, fornecendo uma interface única para todas as plataformas.

## URL Base

```
https://api.medsync.example.com/api/v1
```

Para ambiente de desenvolvimento local:

```
http://localhost:5000/api
```

## Autenticação

A API utiliza autenticação baseada em tokens JWT. Para obter um token, envie uma solicitação POST para o endpoint `/api/auth/login` com suas credenciais.

**Exemplo de requisição de login:**

```json
POST /api/auth/login
Content-Type: application/json

{
  "username": "exemplo@email.com",
  "password": "senhaSegura123"
}
```

**Exemplo de resposta:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "exemplo@email.com",
    "name": "Nome do Usuário",
    "role": "doctor"
  }
}
```

Inclua o token em todas as requisições subsequentes no cabeçalho Authorization:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Status da API

### Verificar Status

```
GET /api/status
```

Retorna informações sobre o status atual da API. Útil para verificar se a API está online e respondendo.

**Resposta:**

```json
{
  "status": "online",
  "version": "1.0.0",
  "timestamp": "2025-05-07T14:30:00Z"
}
```

## Pacientes

### Listar Pacientes

```
GET /api/patients
```

Retorna uma lista de pacientes.

**Parâmetros de Consulta Opcionais:**

- `search`: Termo de busca para filtrar por nome ou CPF
- `page`: Número da página para paginação (padrão: 1)
- `limit`: Quantidade de registros por página (padrão: 20)

**Resposta:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Maria Silva",
      "cpf": "123.456.789-00",
      "birthDate": "1980-05-15",
      "gender": "Feminino",
      "phoneNumber": "(21) 98765-4321",
      "email": "maria@email.com",
      "address": "Rua das Flores, 123",
      "city": "Rio de Janeiro",
      "state": "RJ",
      "healthPlan": "Unimed"
    },
    // ...mais pacientes
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

### Obter Paciente por ID

```
GET /api/patients/{id}
```

Retorna informações detalhadas de um paciente específico.

**Resposta:**

```json
{
  "id": 1,
  "name": "Maria Silva",
  "cpf": "123.456.789-00",
  "birthDate": "1980-05-15",
  "gender": "Feminino",
  "phoneNumber": "(21) 98765-4321",
  "email": "maria@email.com",
  "address": "Rua das Flores, 123",
  "city": "Rio de Janeiro",
  "state": "RJ",
  "healthPlan": "Unimed",
  "createdAt": "2024-03-15T10:30:00Z",
  "updatedAt": "2024-04-20T14:15:00Z"
}
```

### Criar Paciente

```
POST /api/patients
```

Cria um novo registro de paciente.

**Corpo da Requisição:**

```json
{
  "name": "João Santos",
  "cpf": "987.654.321-00",
  "birthDate": "1975-08-20",
  "gender": "Masculino",
  "phoneNumber": "(11) 97654-3210",
  "email": "joao@email.com",
  "address": "Av. Paulista, 1000",
  "city": "São Paulo",
  "state": "SP",
  "healthPlan": "Amil"
}
```

**Resposta:**

```json
{
  "id": 2,
  "name": "João Santos",
  "cpf": "987.654.321-00",
  "birthDate": "1975-08-20",
  "gender": "Masculino",
  "phoneNumber": "(11) 97654-3210",
  "email": "joao@email.com",
  "address": "Av. Paulista, 1000",
  "city": "São Paulo",
  "state": "SP",
  "healthPlan": "Amil",
  "createdAt": "2025-05-07T15:00:00Z",
  "updatedAt": "2025-05-07T15:00:00Z"
}
```

### Atualizar Paciente

```
PATCH /api/patients/{id}
```

Atualiza informações de um paciente existente.

**Corpo da Requisição:**

```json
{
  "phoneNumber": "(11) 98888-7777",
  "email": "joao.novo@email.com",
  "healthPlan": "SulAmérica"
}
```

**Resposta:**

```json
{
  "id": 2,
  "name": "João Santos",
  "cpf": "987.654.321-00",
  "birthDate": "1975-08-20",
  "gender": "Masculino",
  "phoneNumber": "(11) 98888-7777",
  "email": "joao.novo@email.com",
  "address": "Av. Paulista, 1000",
  "city": "São Paulo",
  "state": "SP",
  "healthPlan": "SulAmérica",
  "createdAt": "2025-05-07T15:00:00Z",
  "updatedAt": "2025-05-07T15:30:00Z"
}
```

### Excluir Paciente

```
DELETE /api/patients/{id}
```

Remove um paciente do sistema.

**Resposta:**

```
Status: 204 No Content
```

## Hospitais

### Listar Hospitais

```
GET /api/hospitals
```

Retorna uma lista de hospitais.

**Parâmetros de Consulta Opcionais:**

- `search`: Termo de busca para filtrar por nome, cidade ou CNPJ
- `page`: Número da página para paginação (padrão: 1)
- `limit`: Quantidade de registros por página (padrão: 20)

**Resposta:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Hospital São Lucas",
      "cnpj": "12.345.678/0001-90",
      "address": "Av. Brasil, 1500",
      "city": "Rio de Janeiro",
      "state": "RJ",
      "phone": "(21) 3333-4444",
      "email": "contato@saolucas.com"
    },
    // ...mais hospitais
  ],
  "pagination": {
    "total": 30,
    "page": 1,
    "limit": 20,
    "pages": 2
  }
}
```

### Obter Hospital por ID

```
GET /api/hospitals/{id}
```

Retorna informações detalhadas de um hospital específico.

**Resposta:**

```json
{
  "id": 1,
  "name": "Hospital São Lucas",
  "cnpj": "12.345.678/0001-90",
  "address": "Av. Brasil, 1500",
  "city": "Rio de Janeiro",
  "state": "RJ",
  "phone": "(21) 3333-4444",
  "email": "contato@saolucas.com",
  "createdAt": "2024-01-10T08:45:00Z",
  "updatedAt": "2024-03-15T11:20:00Z"
}
```

### Criar Hospital

```
POST /api/hospitals
```

Cria um novo registro de hospital.

**Corpo da Requisição:**

```json
{
  "name": "Hospital Albert Einstein",
  "cnpj": "98.765.432/0001-10",
  "address": "Av. Albert Einstein, 627",
  "city": "São Paulo",
  "state": "SP",
  "phone": "(11) 2151-1233",
  "email": "contato@einstein.br"
}
```

**Resposta:**

```json
{
  "id": 2,
  "name": "Hospital Albert Einstein",
  "cnpj": "98.765.432/0001-10",
  "address": "Av. Albert Einstein, 627",
  "city": "São Paulo",
  "state": "SP",
  "phone": "(11) 2151-1233",
  "email": "contato@einstein.br",
  "createdAt": "2025-05-07T16:00:00Z",
  "updatedAt": "2025-05-07T16:00:00Z"
}
```

### Atualizar Hospital

```
PATCH /api/hospitals/{id}
```

Atualiza informações de um hospital existente.

**Corpo da Requisição:**

```json
{
  "phone": "(11) 2151-5555",
  "email": "atendimento@einstein.br"
}
```

**Resposta:**

```json
{
  "id": 2,
  "name": "Hospital Albert Einstein",
  "cnpj": "98.765.432/0001-10",
  "address": "Av. Albert Einstein, 627",
  "city": "São Paulo",
  "state": "SP",
  "phone": "(11) 2151-5555",
  "email": "atendimento@einstein.br",
  "createdAt": "2025-05-07T16:00:00Z",
  "updatedAt": "2025-05-07T16:30:00Z"
}
```

### Excluir Hospital

```
DELETE /api/hospitals/{id}
```

Remove um hospital do sistema.

**Resposta:**

```
Status: 204 No Content
```

## Itens OPME

### Listar Itens OPME

```
GET /api/opme-items
```

Retorna uma lista de itens OPME.

**Parâmetros de Consulta Opcionais:**

- `search`: Termo de busca para filtrar por nome, código ou fabricante
- `page`: Número da página para paginação (padrão: 1)
- `limit`: Quantidade de registros por página (padrão: 20)

**Resposta:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Parafuso Ortopédico de Titânio",
      "code": "PO-TI-001",
      "manufacturer": "OrthoMed",
      "description": "Parafuso de titânio para fixação de fraturas ósseas",
      "price": 1250.50
    },
    // ...mais itens
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

### Obter Item OPME por ID

```
GET /api/opme-items/{id}
```

Retorna informações detalhadas de um item OPME específico.

**Resposta:**

```json
{
  "id": 1,
  "name": "Parafuso Ortopédico de Titânio",
  "code": "PO-TI-001",
  "manufacturer": "OrthoMed",
  "description": "Parafuso de titânio para fixação de fraturas ósseas",
  "price": 1250.50,
  "createdAt": "2024-02-10T10:00:00Z",
  "updatedAt": "2024-02-10T10:00:00Z"
}
```

### Criar Item OPME

```
POST /api/opme-items
```

Cria um novo item OPME.

**Corpo da Requisição:**

```json
{
  "name": "Placa de Fixação para Úmero",
  "code": "PF-UM-002",
  "manufacturer": "Johnson & Johnson",
  "description": "Placa anatômica para fixação de fraturas do úmero",
  "price": 3750.75
}
```

**Resposta:**

```json
{
  "id": 2,
  "name": "Placa de Fixação para Úmero",
  "code": "PF-UM-002",
  "manufacturer": "Johnson & Johnson",
  "description": "Placa anatômica para fixação de fraturas do úmero",
  "price": 3750.75,
  "createdAt": "2025-05-07T17:00:00Z",
  "updatedAt": "2025-05-07T17:00:00Z"
}
```

## Procedimentos

### Listar Procedimentos

```
GET /api/procedures
```

Retorna uma lista de procedimentos.

**Parâmetros de Consulta Opcionais:**

- `search`: Termo de busca para filtrar por nome ou código
- `page`: Número da página para paginação (padrão: 1)
- `limit`: Quantidade de registros por página (padrão: 20)

**Resposta:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Artroscopia de Joelho",
      "code": "ART-JOE-001",
      "description": "Procedimento minimamente invasivo para tratamento de lesões no joelho"
    },
    // ...mais procedimentos
  ],
  "pagination": {
    "total": 40,
    "page": 1,
    "limit": 20,
    "pages": 2
  }
}
```

### Obter Procedimento por ID

```
GET /api/procedures/{id}
```

Retorna informações detalhadas de um procedimento específico.

**Resposta:**

```json
{
  "id": 1,
  "name": "Artroscopia de Joelho",
  "code": "ART-JOE-001",
  "description": "Procedimento minimamente invasivo para tratamento de lesões no joelho",
  "createdAt": "2024-01-15T09:30:00Z",
  "updatedAt": "2024-01-15T09:30:00Z"
}
```

## Ordens Médicas

### Listar Ordens Médicas

```
GET /api/medical-orders
```

Retorna uma lista de ordens médicas.

**Parâmetros de Consulta Opcionais:**

- `patientId`: Filtrar por ID do paciente
- `hospitalId`: Filtrar por ID do hospital
- `status`: Filtrar por status da ordem (pendente, aprovado, rejeitado, concluído)
- `page`: Número da página para paginação (padrão: 1)
- `limit`: Quantidade de registros por página (padrão: 20)

**Resposta:**

```json
{
  "data": [
    {
      "id": 1,
      "patientId": 1,
      "hospitalId": 1,
      "procedureId": 1,
      "procedureDate": "2023-11-15",
      "status": "Aprovado",
      "createdAt": "2023-11-01T10:00:00Z",
      "patientName": "Maria Silva",
      "hospitalName": "Hospital São Lucas",
      "procedureName": "Artroscopia de Joelho"
    },
    // ...mais ordens
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "pages": 2
  }
}
```

### Obter Ordem Médica por ID

```
GET /api/medical-orders/{id}
```

Retorna informações detalhadas de uma ordem médica específica.

**Resposta:**

```json
{
  "id": 1,
  "patientId": 1,
  "hospitalId": 1,
  "procedureId": 1,
  "procedureDate": "2023-11-15",
  "notes": "Paciente com histórico de hipertensão",
  "status": "Aprovado",
  "createdAt": "2023-11-01T10:00:00Z",
  "updatedAt": "2023-11-05T14:30:00Z",
  "patient": {
    "id": 1,
    "name": "Maria Silva",
    "cpf": "123.456.789-00"
  },
  "hospital": {
    "id": 1,
    "name": "Hospital São Lucas"
  },
  "procedure": {
    "id": 1,
    "name": "Artroscopia de Joelho",
    "code": "ART-JOE-001"
  }
}
```

### Criar Ordem Médica

```
POST /api/medical-orders
```

Cria uma nova ordem médica.

**Corpo da Requisição:**

```json
{
  "patientId": 2,
  "hospitalId": 2,
  "procedureId": 2,
  "procedureDate": "2023-12-20",
  "notes": "Paciente com osteoartrite avançada",
  "status": "Pendente"
}
```

**Resposta:**

```json
{
  "id": 2,
  "patientId": 2,
  "hospitalId": 2,
  "procedureId": 2,
  "procedureDate": "2023-12-20",
  "notes": "Paciente com osteoartrite avançada",
  "status": "Pendente",
  "createdAt": "2025-05-07T18:00:00Z",
  "updatedAt": "2025-05-07T18:00:00Z"
}
```

### Obter Itens de uma Ordem

```
GET /api/medical-orders/{orderId}/items
```

Retorna os itens OPME associados a uma ordem médica específica.

**Resposta:**

```json
{
  "data": [
    {
      "id": 1,
      "orderId": 1,
      "opmeItemId": 1,
      "quantity": 2,
      "unitPrice": 1250.50,
      "opmeItem": {
        "id": 1,
        "name": "Parafuso Ortopédico de Titânio",
        "code": "PO-TI-001",
        "manufacturer": "OrthoMed"
      }
    },
    // ...mais itens
  ]
}
```

### Adicionar Item a uma Ordem

```
POST /api/medical-orders/{orderId}/items
```

Adiciona um item OPME a uma ordem médica existente.

**Corpo da Requisição:**

```json
{
  "opmeItemId": 2,
  "quantity": 1,
  "unitPrice": 3750.75
}
```

**Resposta:**

```json
{
  "id": 2,
  "orderId": 1,
  "opmeItemId": 2,
  "quantity": 1,
  "unitPrice": 3750.75,
  "createdAt": "2025-05-07T18:30:00Z"
}
```

## Documentos Digitalizados

### Listar Documentos de um Paciente

```
GET /api/patients/{patientId}/scanned-documents
```

Retorna os documentos digitalizados associados a um paciente específico.

**Resposta:**

```json
{
  "data": [
    {
      "id": 1,
      "patientId": 1,
      "content": "Laudo de exame de imagem mostrando desgaste na articulação do joelho direito...",
      "documentType": "Laudo Médico",
      "createdAt": "2023-10-25T14:00:00Z"
    },
    // ...mais documentos
  ]
}
```

### Salvar Documento Digitalizado

```
POST /api/scanned-documents
```

Salva um novo documento digitalizado.

**Corpo da Requisição:**

```json
{
  "patientId": 1,
  "content": "Solicitação de procedimento cirúrgico para implante de prótese...",
  "documentType": "Solicitação"
}
```

**Resposta:**

```json
{
  "id": 2,
  "patientId": 1,
  "content": "Solicitação de procedimento cirúrgico para implante de prótese...",
  "documentType": "Solicitação",
  "createdAt": "2025-05-07T19:00:00Z"
}
```

## Códigos de Status

A API usa os seguintes códigos de status HTTP:

- `200 OK`: Requisição bem-sucedida
- `201 Created`: Recurso criado com sucesso
- `204 No Content`: Requisição processada, sem conteúdo para retornar
- `400 Bad Request`: Erro de validação ou dados incorretos
- `401 Unauthorized`: Falha na autenticação
- `403 Forbidden`: Sem permissão para acessar o recurso
- `404 Not Found`: Recurso não encontrado
- `409 Conflict`: Conflito ao tentar criar um recurso que já existe
- `500 Internal Server Error`: Erro interno do servidor

## Erros

Quando ocorre um erro, a API retorna uma resposta no seguinte formato:

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Os dados fornecidos são inválidos",
    "details": [
      {
        "field": "cpf",
        "message": "CPF inválido ou já cadastrado"
      }
    ]
  }
}
```

## Limitação de Taxa

A API implementa limitação de taxa para prevenir abusos:

- 100 requisições por minuto por IP
- 1000 requisições por hora por usuário autenticado

Quando o limite é excedido, a API retorna o status `429 Too Many Requests`.

---

## Considerações sobre Versão Mobile

Para o desenvolvimento de aplicativos mobile, recomendamos:

1. Implementar cache local para reduzir o número de requisições à API
2. Utilizar filas de sincronização para operações offline
3. Implementar mecanismos de retry com backoff exponencial para lidar com conexões instáveis
4. Otimizar o consumo de dados ao solicitar apenas os campos necessários

---

*MedSync API v1.0.0 - Documentação atualizada em 07/05/2025*