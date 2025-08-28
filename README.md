# WebScraping githubActions

Prueba de concepto de página web estática haciendo web scraping con github actions

**Indice**

- [WebScraping githubActions](#webscraping-githubactions)
  - [Funcionamiento](#funcionamiento)
    - [Web Scraping Script](#web-scraping-script)
    - [Github Action](#github-action)

## Funcionamiento

El funcionamiento de esta prueba de concepto se separa en 2: Script encargado de obtener la información y construir el html; y el github action que se encarga de reconstruir la página ejecutando el script y publicándolo en github-pages.

### Web Scraping Script

**Paso 1 (Fetching data)**

Como primer paso está la de obtener la información usando la función `fetch` y dando forma a la data con el paquete [cheerio](https://www.npmjs.com/package/cheerio).

```ts
async function fetchData(country: string, url: string): Promise<Product[]> {
  const res = await fetch(url);
  const page = await res.text();
  const $ = cheerio.load(page);
  const productsCards = $(".product-card");

  const products: Product[] = productsCards
    .map((_, el) => {
      const title = $(el).find(".product-title").text().trim();
      const image = $(el).find(".product-thumb img").attr("src") ?? "";
      const price = $(el).find(".product-price-fiat").text().trim();
      const date = $(el).find(".wish-waiting-time").text().trim();

      return { title, image, price, date, country };
    })
    .get();

  return products;
}
```

**Paso 2 (Cargando la información)**

Una vez obtenida la información se construirá un html siguiendo un [template.ejs](./views/template.ejs) a partir de un archivo `ejs` usando el paquete [ejs](https://www.npmjs.com/package/ejs)

```ts
const TEMPLATE_PATH ='./views/template.ejs' 
const OUT_HTML_FILE = "./dist/index.html"

async function loadData(): Promise<void> {
  const posts = await Promise.all(
    URLS.map((u) => {
      return fetchData(u.country, URL.replace("<id>", u.id));
    })
  );
  const data = {
    items: posts.flat(),
    creationDate: new Date().toLocaleDateString(),
  };

  ejs.renderFile(TEMPLATE_PATH, data, (err, html) => {
    if (err) {
      console.error("Error al renderizar: ", err);
      return;
    }

    fs.writeFileSync(OUT_HTML_FILE, html);
  });
}
```

El comando `ejs.renderFile(TEMPLATE_PATH, data, (err, html) => {` toma el archivo `template.ejs` y le pasa el valor de `data: { items: Product[] }` para cargar:

```html
<body>
    <h1>Web scraping</h1>
    <div id="root">
        <div class="postsContainer">
            <% items.forEach(function(item) { %>
                <%- include("partials/item", item) %>
                    <% }); %>
        </div>
    </div>
</body>
```

En este template se está recorriendo el valor de `items` y por cada objeto de `items` se está llamando al template [partial/item.ejs](./views/partials/item.ejs).

```html
<div class="postContent">
    <h2>
        <%= title %>
    </h2>
    <img src="<%= image %>" alt="<%= title %>">

    <div class="info">
        <p class="price">
            price:
            <strong>
                <%= price %>
            </strong>
        </p>

        <span>
            creation time:
            <%= date %>
        </span>
    </div>
</div>
```

Como resultado se crea un `index.html` estático con la información obtenida que puede ser mostrada en github-pages.

### Github Action

Para ejecutar el script (encargado de obtener la información y construir el html) y publicar la página se utiliza un github action que se define a partir de un archivo `.yml` con las ordenes de ejecución: [deploy.yml](./.github/workflows/deploy.yml).

Lo importante de este archivo son:

**Ejecución de la acción**

```yml
on:
  # Ejecuta la acción al hacer un push en la rama main
  push:
    branches: [main]
  # Ordena la ejecución de la acción en un momento dado
  schedule:
    - cron: "0 0 * * 6" # cada viernes de cada més
  workflow_dispatch:
```

**Compilación**

```yml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Instala dependencias y ejecuta el script
      - name: Build project
        run: |
          npm install
          npm start

      # Crea el artifact de github, donde se guarda el resultado
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

```

**Despliegue**

```yml
# Despliegue en github-pages
deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```