# Guia do Aplicativo Mobile MedSync

## Visão Geral

Este guia descreve a versão mobile do sistema MedSync, desenvolvido para profissionais de saúde que necessitam gerenciar ordens médicas para materiais OPME (Órteses, Próteses e Materiais Especiais) de forma eficiente e intuitiva em dispositivos móveis.

O aplicativo MedSync Mobile oferece todas as funcionalidades essenciais presentes na versão web, adaptadas para a experiência mobile, permitindo que médicos e equipes hospitalares acessem e gerenciem as informações de seus pacientes e ordens médicas em qualquer lugar.

## Estrutura do Aplicativo

O aplicativo está organizado em cinco seções principais, acessíveis através da navegação por abas:

1. **Início**: Dashboard principal com acesso rápido às principais funcionalidades
2. **Pacientes**: Gerenciamento completo dos pacientes
3. **Hospitais**: Lista e detalhes dos hospitais cadastrados
4. **Catálogo OPME**: Catálogo de materiais e equipamentos
5. **Relatórios**: Visualização e exportação de relatórios

## Funcionalidades Principais

### Criação de Ordens Médicas

O aplicativo permite a criação de ordens médicas para OPME com um fluxo dividido em etapas:

1. **Seleção de Hospital**: Escolha do hospital onde o procedimento será realizado
2. **Seleção de Paciente**: Seleção do paciente que receberá o procedimento
3. **Procedimento e Data**: Escolha do tipo de procedimento e agendamento
4. **Materiais OPME**: Seleção dos materiais necessários para o procedimento
5. **Revisão**: Verificação final dos dados e confirmação da ordem

### Digitalização de Documentos

O aplicativo inclui uma função de digitalização de documentos utilizando a câmera do dispositivo, com recursos de:

- Captura de imagem com guia visual para melhor enquadramento
- OCR (Reconhecimento Óptico de Caracteres) para extração automática de texto
- Categorização de documentos por tipo (laudos, pedidos médicos, exames, etc.)
- Associação de documentos digitalizados a pacientes específicos

### Gestão de Pacientes

A seção de pacientes permite:

- Visualizar a lista completa de pacientes cadastrados
- Buscar pacientes por nome ou CPF
- Acessar detalhes completos do paciente, incluindo dados pessoais e histórico
- Visualizar ordens médicas associadas ao paciente
- Acessar documentos digitalizados do paciente

### Catálogo de Materiais OPME

O catálogo OPME oferece:

- Lista completa de materiais disponíveis
- Busca por nome, código ou fabricante
- Detalhes completos de cada item, incluindo descrição, código e preço
- Adição rápida de itens às ordens médicas em criação

### Relatórios

A seção de relatórios permite:

- Geração de relatórios por tipo de procedimento, material ou hospital
- Filtragem por períodos pré-definidos ou personalizados
- Visualização de dados tabulares e gráficos
- Exportação de relatórios para formatos PDF ou Excel

## Arquitetura Técnica

O aplicativo mobile foi desenvolvido utilizando:

- **React Native**: Framework para desenvolvimento mobile multiplataforma
- **Expo**: Plataforma para facilitar o desenvolvimento React Native
- **React Navigation**: Navegação entre telas
- **React Native Paper**: Biblioteca de componentes de UI
- **React Query**: Gerenciamento de estado e requisições à API
- **Tesseract.js**: OCR para reconhecimento de texto em imagens

## API Unificada

O aplicativo mobile se conecta à mesma API utilizada pela versão web, garantindo a consistência dos dados entre as plataformas. A API fornece endpoints para:

- Gerenciamento de pacientes, hospitais e usuários
- Cadastro e consulta de itens OPME
- Criação e gerenciamento de ordens médicas
- Upload e recuperação de documentos digitalizados
- Geração de relatórios

## Segurança e Conformidade

O aplicativo implementa:

- Autenticação segura de usuários
- Encriptação de dados sensíveis
- Armazenamento seguro de credenciais
- Conformidade com a LGPD (Lei Geral de Proteção de Dados)
- Registro de auditoria de ações críticas

## Processo de Desenvolvimento

Este aplicativo mobile é um protótipo funcional que demonstra as capacidades principais do sistema MedSync em um ambiente mobile. Foi projetado em paralelo com a versão web, compartilhando a mesma API backend e modelo de dados.

### Próximos Passos de Desenvolvimento

1. Implementação da autenticação com biometria
2. Modo offline com sincronização posterior
3. Notificações push para atualizações de ordens
4. Integração com APIs de planos de saúde
5. Scanner de código de barras para identificação de materiais

---

## Instalação e Configuração (Ambiente de Desenvolvimento)

Para desenvolvedores que desejem contribuir ou personalizar a aplicação:

1. Clone o repositório
2. Instale as dependências com `npm install`
3. Configure o arquivo `.env` com as variáveis de ambiente necessárias
4. Execute o projeto com `npm start` ou `expo start`

## Contato e Suporte

Para questões relacionadas ao desenvolvimento do aplicativo, entre em contato com nossa equipe de desenvolvimento em dev@medsync.example.com.

---

*MedSync Mobile App - v1.0.0 - 2025*