import axios from "axios";
import { load } from "cheerio";
import { green, red } from "colorette";
import { NodeHtmlMarkdown } from "node-html-markdown";

import { writeFileSync, readFileSync } from "fs";

const getUrls = async (urlPath: string) => {
  const urls: string[] = [];

  const request = await axios(urlPath);

  const $ = load(request.data);

  $("loc").each((index, element) => {
    const url = $(element).text();

    if (url) urls.push(url);
  });

  return urls;
};

const getPost = async (postPath: string) => {
  const request = await axios(postPath);

  const $ = load(request.data);

  const data: {
    title: string;
    image: string;
    content: string;
  } = {
    title: "",
    image: "",
    content: "",
  };

  try {
    data.title = $("h1.post-title").text() ?? "";
  } catch (error) {}

  try {
    data.image = $("img.wp-post-image").attr("src") ?? "";
  } catch (error) {}

  try {
    const content = $("div.entry-content").html() ?? "";

    data.content = NodeHtmlMarkdown.translate(content);
  } catch (error) {}

  return data;
};

const init = async () => {
  // try {
  //   const postsList: string[] = [];

  //   const urls = await getUrls("https://www.pdhre.org/sitemap.xml");

  //   writeFileSync("./urls.json", JSON.stringify(urls));

  //   return;

  //   for (const [index, url] of urls.splice(0, 1).entries()) {
  //     try {
  //       const posts = await getUrls(url);

  //       console.log(posts);

  //       postsList.push(...posts);

  //       console.log(green(`Posts index succedess: ${index}`));
  //     } catch (error) {
  //       console.log(red(`Posts index failed: ${index}`));
  //     }
  //   }

  //   writeFileSync("./urls.json", JSON.stringify(postsList));
  // } catch (error) {
  //   console.log(error);
  // }

  const posts = JSON.parse(readFileSync("./urls.json").toString());

  const postsList: string[] = [];

  for (const [index, url] of posts.splice(0, 1).entries()) {
    try {
      const posts = await getUrls(url);

      const data = await getPost(posts[0]);

      console.log(data);

      writeFileSync("./post.md", data.content);

      // postsList.push(...posts);

      console.log(green(`Posts index succedess: ${index}`));
    } catch (error) {
      console.log(red(`Posts index failed: ${index}`));
    }
  }

  writeFileSync("./posts.json", JSON.stringify(postsList));
};

init();
