# Relatorio de Avaliacao - Agente E-commerce

Data: 2026-04-22 13:37:09

## Resumo

- Perguntas avaliadas: **10**
- Sucessos: **10**
- Falhas: **0**
- Taxa de sucesso: **100.0%**
- Tempo total: 61.6s

Criterio de sucesso: HTTP 200 + SQL comecando com SELECT/WITH + >= 1 linha retornada.

## Cobertura por categoria da atividade

| Categoria | Aprovadas | Total |
|---|---|---|
| Vendas e Receita | 2 | 2 |
| Entrega e Logistica | 2 | 2 |
| Satisfacao | 2 | 2 |
| Consumidores | 2 | 2 |
| Vendedores e Produtos | 2 | 2 |

## Detalhes por pergunta

### [VR1] Vendas e Receita - OK

**Pergunta:** Top 10 produtos mais vendidos

- HTTP status: `200`
- Linhas retornadas: `10`
- Colunas: `nome_produto`, `quantidade_vendida`
- Tempo: `6.50s`
- Explicacao do agente: Os 10 produtos mais vendidos são: Secador de Cabelo, Toalha de Banho e Acessório Padrão, com 1076, 919 e 919 unidades vendidas, respectivamente.

```sql
SELECT
  dp.nome_produto,
  COUNT(*) AS quantidade_vendida
FROM fat_itens_pedidos AS fip
JOIN dim_produtos AS dp
  ON fip.id_produto = dp.id_produto
GROUP BY
  dp.nome_produto
ORDER BY
  quantidade_vendida DESC
LIMIT 10
```

### [VR2] Vendas e Receita - OK

**Pergunta:** Receita total por categoria de produto

- HTTP status: `200`
- Linhas retornadas: `10`
- Colunas: `categoria_produto`, `receita_total`
- Tempo: `6.77s`
- Explicacao do agente: A categoria de produtos com maior receita total é "beleza_saude", com um total de R$ 1.258.681,34 em vendas. A lista exibe as 10 categorias com maior faturamento.

```sql
SELECT
  dp.categoria_produto,
  SUM(fip.preco_BRL) AS receita_total
FROM fat_itens_pedidos AS fip
JOIN dim_produtos AS dp
  ON fip.id_produto = dp.id_produto
GROUP BY
  dp.categoria_produto
ORDER BY
  receita_total DESC
LIMIT 10
```

### [EL1] Entrega e Logistica - OK

**Pergunta:** Quantidade de pedidos por status

- HTTP status: `200`
- Linhas retornadas: `8`
- Colunas: `status`, `total`
- Tempo: `9.09s`
- Explicacao do agente: Não consegui processar sua solicitação devido a um erro de formatação JSON. Por favor, verifique se a entrada está correta e tente novamente.

```sql
SELECT status, COUNT(*) AS total
FROM fat_pedidos
GROUP BY status
ORDER BY total DESC
LIMIT 10
```

### [EL2] Entrega e Logistica - OK

**Pergunta:** Percentual de pedidos entregues no prazo por estado dos consumidores

- HTTP status: `200`
- Linhas retornadas: `10`
- Colunas: `estado`, `pct_no_prazo`
- Tempo: `6.55s`
- Explicacao do agente: Os estados do Tocantins (TO), São Paulo (SP) e Sergipe (SE) lideram com 100% de entregas no prazo, considerando apenas os pedidos que foram entregues.

```sql
SELECT
  dc.estado,
  CAST(SUM(CASE WHEN fp.entrega_no_prazo = 'Sim' THEN 1.0 ELSE 0 END) AS REAL) * 100.0 / COUNT(*)
    AS pct_no_prazo
FROM fat_pedidos fp
JOIN dim_consumidores dc ON dc.id_consumidor = fp.id_consumidor
WHERE fp.entrega_no_prazo IN ('Sim', 'Nao')    -- exclui 'Não Entregue' do denominador
GROUP BY dc.estado
ORDER BY pct_no_prazo DESC
LIMIT 10
```

### [SA1] Satisfacao - OK

**Pergunta:** Qual a media de avaliacao geral dos pedidos?

- HTTP status: `200`
- Linhas retornadas: `1`
- Colunas: `AVG(avaliacao)`
- Tempo: `2.56s`
- Explicacao do agente: A média geral de avaliação dos pedidos é de aproximadamente 4.11, indicando um alto nível de satisfação dos clientes.

```sql
SELECT AVG(avaliacao) FROM fat_avaliacoes_pedidos
LIMIT 1000
```

### [SA2] Satisfacao - OK

**Pergunta:** Top 10 vendedores por media de avaliacao

- HTTP status: `200`
- Linhas retornadas: `10`
- Colunas: `nome_vendedor`, `media_avaliacao`, `qtd_avaliacoes`
- Tempo: `4.68s`
- Explicacao do agente: Os 10 vendedores com as melhores médias de avaliação, considerando apenas aqueles com no mínimo 10 avaliações, são listados. O vendedor 'Sr. Lucas Gabriel da Cunha' lidera com nota 5.0.

```sql
SELECT dv.nome_vendedor, ROUND(AVG(fa.avaliacao), 2) AS media_avaliacao, COUNT(DISTINCT fa.id_avaliacao) AS qtd_avaliacoes
FROM fat_avaliacoes_pedidos fa
JOIN fat_itens_pedidos fi USING (id_pedido)
JOIN dim_vendedores dv ON dv.id_vendedor = fi.id_vendedor
GROUP BY dv.id_vendedor, dv.nome_vendedor
HAVING qtd_avaliacoes >= 10
ORDER BY media_avaliacao DESC
LIMIT 10
```

### [CO1] Consumidores - OK

**Pergunta:** Estados com maior volume de pedidos e maior ticket medio

- HTTP status: `200`
- Linhas retornadas: `15`
- Colunas: `estado`, `volume_pedidos`, `ticket_medio_brl`
- Tempo: `3.80s`
- Explicacao do agente: Os estados com maior volume de pedidos e maior ticket médio foram São Paulo (SP) com 41.746 pedidos e um ticket médio de R$ 143,69, seguido pelo Rio de Janeiro (RJ) com 12.852 pedidos e ticket médio de R$ 166,85, e Minas Gerais (MG) com 11.635 pedidos e ticket médio de R$ 160,92.

```sql
SELECT dc.estado,
       COUNT(*) AS volume_pedidos,
       ROUND(AVG(fpt.valor_total_pago_brl), 2) AS ticket_medio_brl
FROM fat_pedido_total fpt
JOIN dim_consumidores dc ON dc.id_consumidor = fpt.id_consumidor
GROUP BY dc.estado
ORDER BY volume_pedidos DESC
LIMIT 15
```

### [CO2] Consumidores - OK

**Pergunta:** Estados com maior atraso nas entregas

- HTTP status: `200`
- Linhas retornadas: `10`
- Colunas: `estado`, `media_atraso_dias`, `pedidos_atrasados`
- Tempo: `2.75s`
- Explicacao do agente: Os estados com maior média de dias de atraso nas entregas são AP e RR, com médias de 72.5 e 36.4 dias respectivamente. Foram considerados apenas os pedidos que chegaram com atraso.

```sql
SELECT dc.estado, ROUND(AVG(fp.diferenca_entrega_dias), 2) AS media_atraso_dias, COUNT(*) AS pedidos_atrasados FROM fat_pedidos fp JOIN dim_consumidores dc ON dc.id_consumidor = fp.id_consumidor WHERE fp.entrega_no_prazo = 'Não' GROUP BY dc.estado ORDER BY media_atraso_dias DESC LIMIT 10
```

### [VP1] Vendedores e Produtos - OK

**Pergunta:** Top 5 produtos mais vendidos por estado

- HTTP status: `200`
- Linhas retornadas: `100`
- Colunas: `estado`, `nome_produto`, `total_vendido`
- Tempo: `10.86s`
- Explicacao do agente: Os produtos mais vendidos em cada estado foram identificados. O estado do Acre teve a 'Cadeira de Escritório' como o item mais popular, com 6 unidades vendidas.

```sql
WITH
  top_produtos_por_estado AS (
    SELECT
      dc.estado,
      dp.nome_produto,
      COUNT(fip.id_item) AS total_vendido,
      ROW_NUMBER() OVER (PARTITION BY dc.estado ORDER BY COUNT(fip.id_item) DESC) AS rn
    FROM fat_itens_pedidos AS fip
    JOIN dim_produtos AS dp
      ON fip.id_produto = dp.id_produto
    JOIN fat_pedido_total AS fpt
      ON fip.id_pedido = fpt.id_pedido
    JOIN dim_consumidores AS dc
      ON fpt.id_consumidor = dc.id_consumidor
    GROUP BY
      dc.estado,
      dp.nome_produto
  )
SELECT
  estado,
  nome_produto,
  total_vendido
FROM
  top_produtos_por_estado
WHERE
  rn <= 5
ORDER BY
  estado,
  rn
LIMIT 100
```

### [VP2] Vendedores e Produtos - OK

**Pergunta:** Categorias com maior taxa de avaliacao negativa

- HTTP status: `200`
- Linhas retornadas: `10`
- Colunas: `categoria_produto`, `pct_negativa`, `total_avaliacoes`
- Tempo: `8.03s`
- Explicacao do agente: As categorias com maior taxa de avaliacao negativa (notas 1 ou 2) são "fashion_roupa_masculina" com 28.91% e "moveis_escritorio" com 24.03%.

```sql
SELECT dp.categoria_produto, CAST(SUM(CASE WHEN fa.avaliacao <= 2 THEN 1.0 ELSE 0 END) AS REAL) * 100.0 / COUNT(*) AS pct_negativa, COUNT(*) AS total_avaliacoes FROM fat_avaliacoes_pedidos fa JOIN fat_itens_pedidos fi USING (id_pedido) JOIN dim_produtos dp USING (id_produto) GROUP BY dp.categoria_produto HAVING total_avaliacoes >= 50 ORDER BY pct_negativa DESC LIMIT 10
```
