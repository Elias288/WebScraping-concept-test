import * as cheerio from "cheerio";
import ejs from "ejs";
import fs from "fs";

const TEMPLATE_PATH = "./views/template.ejs";
const OUT_HTML_FILE = "./dist/index.html";
const URL = "https://www.bitgree.com/earn-bitcoin-cash?fc%5B0%5D=<id>";
const URLS = [
  { country: "EEUU", id: "us" },
  { country: "Uruguay", id: "uy" },
  { country: "Argentina", id: "ar" },
];

interface Product {
  title: string;
  image: string;
  price: string;
  date: string;
  country: string;
}

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

async function showList() {
  const res = await Promise.all(
    URLS.map((u) => {
      return fetchData(u.country, URL.replace("<id>", u.id));
    })
  );
  console.log(res.flat());
}

loadData();
// showList();
