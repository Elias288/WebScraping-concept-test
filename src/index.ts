import * as cheerio from 'cheerio'
import ejs from 'ejs'
import fs from 'fs'

const TEMPLATE_PATH ='./views/template.ejs' 
const OUT_HTML_FILE = "./dist/index.html"
const URL = "https://www.bitgree.com/earn-bitcoin-cash?fc%5B0%5D=us";

interface Product {
  title: string;
  image: string;
  price: string;
  date: string;
}

async function fetchData(): Promise<Product[]> {
  const res = await fetch(URL);
  const page = await res.text();
  const $ = cheerio.load(page);
  const productsCards = $(".product-card");

  const products: Product[] = productsCards
    .map((_, el) => {
      const title = $(el).find(".product-title").text().trim();
      const image = $(el).find(".product-thumb img").attr("src") ?? "";
      const price = $(el).find(".product-price-fiat").text().trim();
      const date = $(el).find(".wish-waiting-time").text().trim();

      return { title, image, price, date };
    })
    .get();

  return products;
}

function loadData(): void {
  const posts = fetchData()
  posts.then(posts => {
    const data = {
      items: posts
    }

    ejs.renderFile(TEMPLATE_PATH, data, (err, html) => {
      if(err) {
        console.error("Error al renderizar: ", err);
        return
      }

      fs.writeFileSync(OUT_HTML_FILE, html)
    })
  })
}

loadData()
// fetchData().then(d => console.log(d));
