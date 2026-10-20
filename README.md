# Caça-Pechinchas (site)

Site para ver os negócios encontrados pelo [caca-pechinchas](https://github.com/ricardojose-rgb/caca-pechinchas)
(repositório privado), editar as procuras e registar compras e vendas.

**Abrir:** https://ricardojose-rgb.github.io/caca-pechinchas-web/

- **Negócios**: os melhores anúncios de cada procura, com preço total (portes e taxas incluídos),
  desconto em relação à mediana do mercado e botão para registar a compra.
- **Procuras**: criar, editar, pausar e apagar procuras (SSD, RAM ou qualquer outro produto).
- **Compras**: o que compraste, por quanto vendeste e o lucro.
- **Definições**: ligação ao GitHub e estado dos sites.

Este repositório é público mas não tem dados: o site lê-os do repositório privado com uma chave
do GitHub (fine-grained, só com acesso a `caca-pechinchas`) guardada apenas no teu browser.

## Desenvolvimento
`npm install`, `npm run dev`. Cada push para `main` publica o site no GitHub Pages.
`npm run build:demo` gera uma versão de um só ficheiro com dados de exemplo (precisa de
`src/demo/*.json`, que não vão para o repositório).
