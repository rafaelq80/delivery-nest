# Projeto Delivery de Alimentos - Backend

<br />

<div align="center">
    <img src="https://i.imgur.com/icgjsRQ.png" title="source: imgur.com" width="50%"/>
</div>
<br /><br />

## 1. Descrição

Um sistema de **Delivery de Alimentos** permite que os usuários solicitem refeições de restaurantes parceiros, garantindo opções balanceadas, com as respectivas informações nutricionais, que garantem uma alimentação mais saudável, além de terem a refeição entregue em sua localização. Geralmente, uma plataforma de Delivery de Alimentos oferecem:

1. Um catálogo de restaurantes e pratos disponíveis
2. Busca e filtragem de opções
3. Sistema de pedidos e pagamentos online
4. Avaliações e feedback dos usuários
5. Rastreamento de entregas

No caso de um sistema focado em alimentos saudáveis é fundamental incluir:

1. Informações nutricionais do prato
2. Opções para dietas específicas como: vegana, sem glúten, low-carb, entre outras
3. Recomendações personalizadas baseadas nas preferências e necessidades do usuário

<br />

## 2. Sobre esta API


O Projeto de Delivery de Alimentos foi desenvolvida utilizando o Framework **NestJS** e a Linguagem **TypeScript**, oferecendo alguns endpoints para o gerenciamento dos Recursos **Usuário, Produto e Categoria**, além de oferecer recomendações de pratos saudáveis baseadas no modelo de Classificação NutriScore.


### 2.1. Principais funcionalidades da API:

1. Cadastro e gerenciamento dos usuários (Clientes e Restaurantes)
2. Registro e gerenciamento das categorias dos produtos (saudáveis, lanches, entre outras)
3. Criação e gerenciamento dos produtos (pratos e bebidas)
4. Indicação de produtos saudáveis utilizando o modelo de classificação **NutriScore**

<br />

## 3. Indicação de Alimentos Saudáveis - NutriScore


O **NutriScore** é um sistema de classificação nutricional que avalia alimentos de acordo com sua qualidade nutricional, utilizando uma escala de **A (verde escuro - mais saudável) a E (vermelho - menos saudável)**, como vemos na imagem abaixo:

<div align="center">
    <img src="https://i.imgur.com/uYe56AM.png" title="source: imgur.com" width="30%"/>
</div>

A classificação é baseada nos **nutrientes bons e ruins** por 100g do alimento:

- **Bons (pontos positivos):** fibras, proteínas, frutas, legumes e oleaginosas
- **Ruins (pontos negativos):** calorias, açúcares, gorduras saturadas e sódio

O sistema atribui pontos a cada critério, baseados em uma tabela de classificação, a partir desta pontuação, a classificação final do alimento é calculada através da fórmula:

$$
\text{NutriScore} = \text{Soma dos Pontos Negativos} - \text{Soma dos Pontos Positivos}
$$

<br />

## 4. Integração com a API - Google Gemini


O **Google Gemini** é uma família de modelos de inteligência artificial (IA) desenvolvida pelo Google DeepMind. Ele é projetado para processar múltiplos tipos de dados (texto, imagem, áudio e código) e pode ser utilizado em diversas aplicações, como assistentes virtuais, geração de texto, análise de imagens e mais.

A API do **Google Gemini** será utilizada pelo no Projeto Delivery de Alimentos para obter as informações nutricionais dos alimentos no momento do cadastro e atualização dos dados dos produtos, necessários para calcular o NutriScore do produto.


### 4.1. Passos para integração com a API do Gemini:

1. Criar um projeto no [Google Cloud Console](https://console.cloud.google.com)
2. Ativar a **API do Gemini** e gerar uma **chave de API (APi KEY)**
3. Adicionar a chave de API e a URL da API em variáveis de ambiente no Projeto Delivery de Alimentos

<br />

## 5. Diagrama de Classes

```mermaid
classDiagram
class Categoria {
  - id : number
  - descricao : string
  - icone : string
  - produto : []Produto
  + findAll()
  + findById(id : number)
  + findByDescricao(descricao : string)
  + create(categoria : Categoria)
  + update(categoria : Categoria)
  + delete(id : number)
}
class Produto {
  - id : number
  - nome : string
  - preco : number
  - foto : string
  - nutriscore : string
  - categoria : Categoria
  - usuario : Usuario
  + findAll()
  + findById(id : number)
  + findByNome(nome : string)
  + create(produto : Produto)
  + update(produto : Produto)
  + delete(id : number)
}
class Usuario {
  - id : number
  - nome : string
  - usuario : string
  - senha : string
  - foto : string
  - produto : []Produto
  + findAll()
  + findById(id : number)
  + create(usuario : Usuario)
  + update(usuario : Usuario)
  + autenticar(usuariologin : UsuarioLogin)
}
class UsuarioLogin{
  - id : number
  - nome : string
  - usuario : string
  - senha : string
  - foto : string
  - token : string
}
Categoria --> Produto
Usuario --> Produto
```

*O atributo nutriscore, da entidade produto, é um campo calculado, que será preenchido através do cálculo do NutriScore.*

<br />

## 6. Diagrama Entidade-Relacionamento (DER)



```mermaid
erDiagram
    CATEGORIA o|--o{ PRODUTO : classifica
    CATEGORIA {
        int id PK
        varchar(255) descricao
        varchar(5000) icone
    }
    PRODUTO }o--|o USUARIO : tem
    PRODUTO {
        int id PK
        varchar(255) nome
        decimal preco
        varchar(5000) foto
        varchar(255) nutriscore
        int categoria_id FK
        int usuario_id FK
    }
    USUARIO {
		int id PK
		varchar(255) nome
		varchar(255) usuario
		varchar(255) senha
		varchar(5000) foto
    }


```

<br />

## 7. Tecnologias utilizadas

| Item                          | Descrição  |
| ----------------------------- | ---------- |
| **Servidor**                  | Node JS    |
| **Linguagem de programação**  | TypeScript |
| **Framework**                 | Nest JS    |
| **ORM**                       | TypeORM    |
| **Banco de dados Relacional** | MySQL      |

<br />

## 8. Configuração e Execução

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Configure o banco de dados no arquivo `app.module.ts`
4. Configure as variáveis de ambiente no arquivo `.env`
5. Execute a aplicação: `npm run start:dev`

<br />

## 9. Implementações Futuras

- [ ] Implementar a função Curtir produtos
