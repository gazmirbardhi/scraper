import axios from "axios";
import { load } from "cheerio";
import { green, red } from "colorette";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { config } from "dotenv";

import { writeFileSync, readFileSync } from "fs";
import Downloader from "nodejs-file-downloader";
import slugify from "slugify";
import moment from "moment";

config();

const amazonCode = process.env.AMAZONE_CODE ?? "djguider-20";

const downloadImage = async (imageUrl: string) => {
  const downloader = new Downloader({
    url: imageUrl, //If the file name already exists, a new file with the name 200MB1.zip is created.
    directory: "./images", //This folder will be created, if it doesn't exist.
  });

  try {
    const { filePath, downloadStatus } = await downloader.download(); //Downloader.download() resolves with some useful properties.

    if (filePath) return filePath.replace("./images/", "/images/");
  } catch (error) {
    console.log(error);
  }
};

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
    data.title = $("h1.entry-title").text() ?? "";
  } catch (error) {}

  try {
    const image = $("img.wp-post-image").attr("src");

    if (image && image.trim().length > 0) {
      const imageUrl = await downloadImage(image);

      if (imageUrl) data.image = imageUrl;
    }
  } catch (error) {}

  try {
    const content = $("div.entry-content").html() ?? "";

    let postContent = NodeHtmlMarkdown.translate(
      content.replaceAll("pantryforkitc-20", amazonCode)
    ) as string;

    const imageUrls = postContent.match(/!\[(.*?)\]\((.*?)\)/g);

    if (imageUrls) {
      for (const imageUrl of imageUrls) {
        const urlPath = imageUrl.match(/\((.*?)\)/);

        if (!urlPath) {
          postContent = postContent.replace(
            imageUrl,
            `<ExportedImage alt={"${data.title}"} src={"/images/not-found.jpg"} priority layout="fill" />`
          );
        } else {
          const imagePath = await downloadImage(urlPath[1]);

          if (imagePath && urlPath.input)
            postContent = postContent.replace(
              urlPath.input,
              `<ExportedImage alt={"${data.title}"} src={"${imagePath}"} priority layout="fill" />`
            );
          else
            postContent = postContent.replace(
              imageUrl,
              `<ExportedImage alt={"${data.title}"} src={"/images/not-found.jpg"} priority layout="fill" />`
            );
        }
      }
    }

    data.content = postContent;
  } catch (error) {
    console.log(error);
  }

  const postFilePath = slugify(data.title, {
    lower: true,
    trim: true,
  });

  writeFileSync(
    `./posts/${postFilePath}.mdx`,
    `---\ntitle: "${data.title}"\ndescription: "${data.content.slice(
      0,
      150
    )}"\ndate: "${moment(new Date()).format("YYYY-MM-DD")}"\nimage: "${
      data.image
    }"\n---\n\n<ExportedImage alt={"${data.title}"} src={"${
      data.image
    }"} priority layout="fill" />\n${data.content}`
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

init();
