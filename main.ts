import axios from "axios";
import { load } from "cheerio";
import { green, red } from "colorette";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { config } from "dotenv";

import { writeFileSync, readFileSync } from "fs";
import Downloader from "nodejs-file-downloader";
import slugify from "slugify";

config();

const amazonCode = process.env.AMAZONE_CODE ?? "djguider-20";

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
    const image = $("img.wp-post-image").attr("src");

    if (image && image.trim().length > 0) {
      const downloader = new Downloader({
        url: image, //If the file name already exists, a new file with the name 200MB1.zip is created.
        directory: "./images", //This folder will be created, if it doesn't exist.
      });
      try {
        const { filePath, downloadStatus } = await downloader.download(); //Downloader.download() resolves with some useful properties.

        if (filePath)
          data.image = filePath.replace("./images/", "/images/posts/");
      } catch (error) {}
    }
  } catch (error) {}

  try {
    const content = $("div.entry-content").html() ?? "";

    data.content = NodeHtmlMarkdown.translate(
      content.replaceAll("pdhresalam-20", amazonCode)
    );
  } catch (error) {}

  const postFilePath = slugify(data.title, {
    lower: true,
    trim: true,
  });

  writeFileSync(
    `./posts/${postFilePath}.md`,
    `---\ntitle: "${data.title}"\ndescription: "${data.content.slice(
      0,
      150
    )}"\ndate: "${new Date().toISOString()}"\nimage: "${
      data.image
    }"\ncategories: []\nauthors: ["Deana Stallings"]\ntags: []\ndraft: false\n---\n\n${
      data.content
    }`
  );
};

const init = async () => {
  const posts = JSON.parse(readFileSync("./data/urls.json").toString());

  const postsList: string[] = [];

  for (const [index, url] of posts.entries()) {
    try {
      const posts = await getUrls(url);

      for (const post of posts) {
        await getPost(post);
      }

      console.log(green(`Posts index succedess: ${index}`));
    } catch (error) {
      console.log(red(`Posts index failed: ${index}`));
    }
  }

  writeFileSync("./posts.json", JSON.stringify(postsList));
};

// init();

const url = "https://www.pdhre.org/best-hp-255-g3-batteries/";

getPost(url);
