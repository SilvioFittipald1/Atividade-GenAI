"""Schema do banco.db (SQLite3) injetado no system prompt do agente.

Gerado manualmente a partir de inspecao no banco + consultas complementares.
Contem:
- DDL real das 7 tabelas.
- Descricao semantica em PT-BR de cada coluna.
- Valores distintos das colunas categoricas chave (status, entrega_no_prazo, avaliacao).
- Relacionamentos entre tabelas (FKs nao declaradas no banco, mas existentes por convencao).
- Dicas de joins e agregacoes comuns.
"""
from __future__ import annotations

import re


TABLE_NAMES: list[str] = [
    "dim_consumidores",
    "dim_produtos",
    "dim_vendedores",
    "fat_pedidos",
    "fat_pedido_total",
    "fat_itens_pedidos",
    "fat_avaliacoes_pedidos",
]

SCHEMA_STR = """
# Banco de dados: E-commerce (SQLite3)

Database com dados historicos de pedidos de um marketplace brasileiro entre 2016-09-04 e 2018-10-17.
Total de 99.441 pedidos distribuidos entre 3.095 vendedores, 32.951 produtos e 99.441 consumidores.
Todas as datas sao strings em formato ISO (YYYY-MM-DD ou YYYY-MM-DD HH:MM:SS).
Valores monetarios em BRL (Real brasileiro) salvo indicacao contraria.

---

## Tabela: dim_consumidores (99.441 registros)

Dimensao de consumidores (clientes finais). Uma linha por consumidor.

DDL:
CREATE TABLE "dim_consumidores" (
  "id_consumidor" TEXT,      -- PK logica, hash unico do consumidor
  "prefixo_cep" INTEGER,     -- primeiros digitos do CEP (localizacao aproximada)
  "nome_consumidor" TEXT,    -- nome completo do consumidor
  "cidade" TEXT,             -- cidade em caixa alta, ex: 'SAO PAULO'
  "estado" TEXT              -- sigla UF com 2 letras, ex: 'SP', 'RJ', 'MG'
)

---

## Tabela: dim_produtos (32.951 registros)

Dimensao de produtos do catalogo. Uma linha por produto.

DDL:
CREATE TABLE "dim_produtos" (
  "id_produto" TEXT,               -- PK logica, hash unico
  "nome_produto" TEXT,             -- nome comercial do produto
  "categoria_produto" TEXT,        -- categoria em snake_case (ver valores abaixo)
  "peso_produto_gramas" REAL,
  "comprimento_centimetros" REAL,
  "altura_centimetros" REAL,
  "largura_centimetros" REAL
)

Categorias mais comuns (top 15 por quantidade de produtos): cama_mesa_banho, esporte_lazer, moveis_decoracao,
beleza_saude, utilidades_domesticas, automotivo, informatica_acessorios, brinquedos, relogios_presentes,
telefonia, bebes, perfumaria, papelaria, fashion_bolsas_e_acessorios, cool_stuff. Existem mais categorias.

---

## Tabela: dim_vendedores (3.095 registros)

Dimensao de vendedores (sellers do marketplace). Uma linha por vendedor.

DDL:
CREATE TABLE "dim_vendedores" (
  "id_vendedor" TEXT,
  "nome_vendedor" TEXT,
  "prefixo_cep" INTEGER,
  "cidade" TEXT,
  "estado" TEXT
)

---

## Tabela: fat_pedidos (99.441 registros)

Fato de pedidos com detalhes de ENTREGA e LOGISTICA. Uma linha por pedido.

DDL:
CREATE TABLE "fat_pedidos" (
  "id_pedido" TEXT,                         -- PK logica
  "id_consumidor" TEXT,                     -- FK -> dim_consumidores.id_consumidor
  "status" TEXT,                            -- ver valores abaixo
  "pedido_compra_timestamp" TEXT,           -- momento da compra (YYYY-MM-DD HH:MM:SS)
  "pedido_entregue_timestamp" TEXT,         -- momento da entrega real (pode ser NULL)
  "data_estimada_entrega" TEXT,             -- data que marketplace prometeu (YYYY-MM-DD)
  "tempo_entrega_dias" REAL,                -- dias entre compra e entrega real
  "tempo_entrega_estimado_dias" INTEGER,    -- dias prometidos
  "diferenca_entrega_dias" REAL,            -- tempo_entrega_dias - tempo_entrega_estimado_dias
                                            --   NEGATIVO = adiantado/no prazo, POSITIVO = atrasado
  "entrega_no_prazo" TEXT                   -- 'Sim', 'Nao' ou 'Nao Entregue' (ver abaixo)
)

Status distintos (fat_pedidos e fat_pedido_total compartilham os mesmos):
  entregue (96.478), enviado (1.107), cancelado (625), indisponivel (609),
  faturado (314), em processamento (301), criado (5), aprovado (2).
  Obs: a string exata usa acento em 'indisponivel' (no banco aparece como "indisponível").

entrega_no_prazo distintos (ATENCAO: valores tem ACENTOS no banco):
  'Sim'           -> 89.941 pedidos entregues no prazo ou antes.
  'Não'           -> 6.535  pedidos entregues com atraso (escreva 'a' com til).
  'Não Entregue'  -> 2.965  pedidos nunca entregues (cancelados, perdidos, etc).

REGRA DE OURO para filtrar entrega_no_prazo:
  NAO use `LIKE 'Nao'` ou `= 'Nao'` (sem acento) -> retorna ZERO linhas porque no banco eh 'Não'.
  USE uma destas formas equivalentes:
    a) entrega_no_prazo = 'Não'           -- escreva o til explicitamente (preferido)
    b) entrega_no_prazo LIKE 'N__'         -- 3 chars comecando com N (matcha 'Não')

Para calcular "% entregue no prazo por estado" (considerando so pedidos efetivamente entregues):
  SELECT dc.estado,
         CAST(SUM(CASE WHEN fp.entrega_no_prazo = 'Sim' THEN 1.0 ELSE 0 END) AS REAL)
           * 100.0 / COUNT(*) AS pct_no_prazo
  FROM fat_pedidos fp
  JOIN dim_consumidores dc ON dc.id_consumidor = fp.id_consumidor
  WHERE fp.entrega_no_prazo IN ('Sim', 'Não')    -- exclui 'Não Entregue' do denominador
  GROUP BY dc.estado
  ORDER BY pct_no_prazo DESC
  LIMIT 27;

---

## Tabela: fat_pedido_total (99.441 registros)

Fato de pedidos com TOTAIS FINANCEIROS. Uma linha por pedido.
Mesmo conjunto de id_pedido que fat_pedidos (1:1).

DDL:
CREATE TABLE "fat_pedido_total" (
  "id_pedido" TEXT,                 -- PK logica / join com fat_pedidos
  "id_consumidor" TEXT,             -- FK -> dim_consumidores
  "status" TEXT,                    -- redundante com fat_pedidos.status
  "valor_total_pago_brl" REAL,      -- valor final pago em BRL (produtos + frete)
  "valor_total_pago_usd" REAL,      -- mesmo valor convertido para USD
  "data_pedido" TEXT                -- data da compra em YYYY-MM-DD (sem hora)
)

Use fat_pedido_total.valor_total_pago_brl para:
- Receita total por periodo / estado / categoria (via join).
- Ticket medio: AVG(valor_total_pago_brl).

---

## Tabela: fat_itens_pedidos (112.650 registros)

Fato de ITENS individuais dentro de cada pedido. Um pedido pode ter N itens.

DDL:
CREATE TABLE "fat_itens_pedidos" (
  "id_pedido" TEXT,         -- FK -> fat_pedidos / fat_pedido_total
  "id_item" INTEGER,        -- numero sequencial do item dentro do pedido (1, 2, 3, ...)
  "id_produto" TEXT,        -- FK -> dim_produtos
  "id_vendedor" TEXT,       -- FK -> dim_vendedores
  "preco_BRL" REAL,         -- preco unitario do item em BRL
  "preco_frete" REAL        -- frete do item em BRL
)

Use fat_itens_pedidos para:
- "Produtos mais vendidos" (contar linhas agrupando por id_produto).
- "Receita por categoria" (SUM(preco_BRL) via join em dim_produtos).
- "Produtos/categorias por vendedor".
- "Produtos mais vendidos por estado" (join com fat_pedido_total e dim_consumidores).
ATENCAO: cada linha = 1 unidade vendida; quantidade de unidades vendidas = COUNT(*) ou COUNT(id_item).
Nao existe coluna "quantidade"; cada item aparece em uma linha propria.

---

## Tabela: fat_avaliacoes_pedidos (95.307 registros)

Fato de avaliacoes feitas pelos consumidores sobre pedidos.

DDL:
CREATE TABLE "fat_avaliacoes_pedidos" (
  "id_avaliacao" TEXT,          -- hash unico da avaliacao
  "id_pedido" TEXT,             -- FK -> fat_pedidos / fat_pedido_total
  "avaliacao" INTEGER,          -- nota de 1 a 5 (ver distribuicao abaixo)
  "titulo_comentario" TEXT,     -- titulo (pode ser 'Sem titulo')
  "comentario" TEXT,            -- comentario livre (pode ser 'Sem comentario')
  "data_comentario" TEXT,       -- YYYY-MM-DD HH:MM:SS
  "data_resposta" TEXT          -- YYYY-MM-DD HH:MM:SS, resposta da loja
)

Distribuicao de avaliacao: 1 (10.373), 2 (2.920), 3 (7.816), 4 (18.638), 5 (55.560). Media geral ~4.11.
Convencao: avaliacao NEGATIVA = nota 1 ou 2. Avaliacao POSITIVA = 4 ou 5. Neutra = 3.

---

## Relacionamentos entre tabelas

As foreign keys NAO estao declaradas no DDL mas existem por convencao dos IDs:

  dim_consumidores.id_consumidor  <-  fat_pedidos.id_consumidor
  dim_consumidores.id_consumidor  <-  fat_pedido_total.id_consumidor

  fat_pedidos.id_pedido           <-  fat_pedido_total.id_pedido     (1:1)
  fat_pedidos.id_pedido           <-  fat_itens_pedidos.id_pedido    (1:N)
  fat_pedidos.id_pedido           <-  fat_avaliacoes_pedidos.id_pedido

  dim_produtos.id_produto         <-  fat_itens_pedidos.id_produto
  dim_vendedores.id_vendedor      <-  fat_itens_pedidos.id_vendedor

Caminho para "produtos vendidos por estado do consumidor":
  fat_itens_pedidos
  JOIN fat_pedido_total  USING (id_pedido)
  JOIN dim_consumidores  ON dim_consumidores.id_consumidor = fat_pedido_total.id_consumidor
  JOIN dim_produtos      USING (id_produto)

Caminho para "% entrega no prazo por estado":
  fat_pedidos
  JOIN dim_consumidores  ON dim_consumidores.id_consumidor = fat_pedidos.id_consumidor
  (filtrar entrega_no_prazo LIKE 'S%' para 'Sim' e total com entrega_no_prazo != 'Nao Entregue')

Caminho para "receita por categoria":
  fat_itens_pedidos
  JOIN dim_produtos      USING (id_produto)
  (SUM(preco_BRL) agrupando por categoria_produto)

Caminho para "ticket medio por estado":
  fat_pedido_total
  JOIN dim_consumidores USING (id_consumidor)
  (AVG(valor_total_pago_brl) agrupando por estado)

Caminho para "media de avaliacao por VENDEDOR" (IMPORTANTE: fat_avaliacoes_pedidos NAO tem id_vendedor):
  fat_avaliacoes_pedidos
  JOIN fat_itens_pedidos USING (id_pedido)
  JOIN dim_vendedores     ON dim_vendedores.id_vendedor = fat_itens_pedidos.id_vendedor
  (AVG(avaliacao) agrupando por id_vendedor / nome_vendedor; a avaliacao do pedido e
   atribuida a cada vendedor que teve itens naquele pedido).
  Exemplo SQL (top 10 vendedores por avaliacao, com minimo de 10 avaliacoes):
    SELECT dv.nome_vendedor,
           ROUND(AVG(fa.avaliacao), 2) AS media,
           COUNT(DISTINCT fa.id_avaliacao) AS qtd_avaliacoes
    FROM fat_avaliacoes_pedidos fa
    JOIN fat_itens_pedidos fi USING (id_pedido)
    JOIN dim_vendedores dv ON dv.id_vendedor = fi.id_vendedor
    GROUP BY dv.id_vendedor, dv.nome_vendedor
    HAVING qtd_avaliacoes >= 10
    ORDER BY media DESC
    LIMIT 10;

Caminho para "taxa de avaliacao NEGATIVA por categoria" (negativa = nota 1 ou 2):
  fat_avaliacoes_pedidos
  JOIN fat_itens_pedidos USING (id_pedido)
  JOIN dim_produtos       USING (id_produto)
  Exemplo SQL:
    SELECT dp.categoria_produto,
           CAST(SUM(CASE WHEN fa.avaliacao <= 2 THEN 1.0 ELSE 0 END) AS REAL)
             * 100.0 / COUNT(*) AS pct_negativa,
           COUNT(*) AS total_avaliacoes
    FROM fat_avaliacoes_pedidos fa
    JOIN fat_itens_pedidos fi USING (id_pedido)
    JOIN dim_produtos dp       USING (id_produto)
    GROUP BY dp.categoria_produto
    HAVING total_avaliacoes >= 50   -- evita vies de categorias com poucas avaliacoes
    ORDER BY pct_negativa DESC
    LIMIT 10;

Caminho para "Estados com maior volume de pedidos E maior ticket medio" (ambos de uma vez):
  SELECT dc.estado,
         COUNT(*) AS volume_pedidos,
         ROUND(AVG(fpt.valor_total_pago_brl), 2) AS ticket_medio_brl
  FROM fat_pedido_total fpt
  JOIN dim_consumidores dc ON dc.id_consumidor = fpt.id_consumidor
  GROUP BY dc.estado
  ORDER BY volume_pedidos DESC
  LIMIT 15;

Caminho para "estados com maior ATRASO nas entregas" (media de dias de atraso, so entregas atrasadas):
  SELECT dc.estado,
         ROUND(AVG(fp.diferenca_entrega_dias), 2) AS media_atraso_dias,
         COUNT(*) AS pedidos_atrasados
  FROM fat_pedidos fp
  JOIN dim_consumidores dc ON dc.id_consumidor = fp.id_consumidor
  WHERE fp.entrega_no_prazo = 'Não'
  GROUP BY dc.estado
  ORDER BY media_atraso_dias DESC
  LIMIT 27;

Caminho para "quantidade de pedidos por STATUS" (mais simples, mas cuidado com acentos):
  SELECT status, COUNT(*) AS total
  FROM fat_pedidos
  GROUP BY status
  ORDER BY total DESC;

---

## Dicas importantes para gerar SQL correto

- Sempre use SELECT; nunca INSERT/UPDATE/DELETE/DDL (guardrail do sistema bloqueara).
- Para "top N" use ORDER BY ... DESC LIMIT N.
- Ao filtrar strings com acentos (status, entrega_no_prazo), prefira LIKE com wildcard ou
  cuide do encoding: use LIKE 'Sim' ou LIKE 'Nao%' quando simples, ou compare com a string exata.
- Para percentuais use CAST(SUM(CASE WHEN ... THEN 1 ELSE 0 END) AS REAL) * 100.0 / COUNT(*).
- Para "ticket medio" use AVG(valor_total_pago_brl) sobre fat_pedido_total.
- Para quantidade de itens vendidos conte linhas de fat_itens_pedidos (nao existe coluna quantidade).
- Datas sao TEXT; use substr(data, 1, 4) para extrair ano, ou date(data) para comparacoes.
- Sempre inclua LIMIT em queries exploratorias para nao sobrecarregar a resposta.
"""


_TABLE_SECTION_RE = re.compile(
    r"^## Tabela:\s*(?P<name>\w+)\b.*?(?=^---\s*$|^## )",
    re.DOTALL | re.MULTILINE,
)


def _header_section() -> str:
    """Intro do SCHEMA_STR (tudo antes do primeiro '## Tabela:')."""
    first = SCHEMA_STR.find("## Tabela:")
    if first < 0:
        return SCHEMA_STR
    return SCHEMA_STR[:first].rstrip() + "\n"


def _tail_sections() -> str:
    """Secoes globais (Relacionamentos, Dicas). Sempre incluidas porque sao
    pequenas e ajudam o LLM a fazer os JOINs corretos."""
    start_markers = ("## Relacionamentos", "## Dicas")
    earliest = len(SCHEMA_STR)
    for m in start_markers:
        idx = SCHEMA_STR.find(m)
        if idx >= 0 and idx < earliest:
            earliest = idx
    if earliest >= len(SCHEMA_STR):
        return ""
    return SCHEMA_STR[earliest:]


def build_schema_section(table_names: list[str] | None) -> str:
    """Monta uma versao do schema contendo apenas as tabelas pedidas.

    Args:
        table_names: lista de nomes de tabela a incluir. Se None ou vazia,
            devolve o SCHEMA_STR completo (fallback seguro).

    Returns:
        String pronta para ser usada como conteudo da secao "## Schema do banco"
        no system prompt do agente.
    """
    if not table_names:
        return SCHEMA_STR

    requested = set(table_names)
    blocks: list[str] = []
    for m in _TABLE_SECTION_RE.finditer(SCHEMA_STR):
        if m.group("name") in requested:
            blocks.append(m.group(0).rstrip())

    if not blocks:
        return SCHEMA_STR

    parts = [_header_section(), "\n\n---\n\n".join(blocks), _tail_sections()]
    return "\n\n".join(p.strip() for p in parts if p).strip() + "\n"
