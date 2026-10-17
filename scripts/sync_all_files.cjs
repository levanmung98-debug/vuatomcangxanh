const fs = require("fs");
const path = require("path");

const mainBundlePath = path.join(__dirname, "../assets/index-v7.js");
const bundle = fs.readFileSync(mainBundlePath, "utf8");

const copies = [
  path.join(__dirname, "../public/assets/index-v7.js"),
  path.join(__dirname, "../assets/index-Os1X4Z7e.js"),
  path.join(__dirname, "../public/assets/index-Os1X4Z7e.js")
];

for (const copyPath of copies) {
  fs.writeFileSync(copyPath, bundle, "utf8");
  console.log("Synchronized to:", copyPath);
}

// Bump cache to v13
let indexHtml = fs.readFileSync("index.html", "utf8");
indexHtml = indexHtml.replace("/assets/index-v7.js?v=20260930_v12", "/assets/index-v7.js?v=20261017_v13");
indexHtml = indexHtml.replace("/sw.js?v=12", "/sw.js?v=13");
indexHtml = indexHtml.replace("vuatomcangxanh-v12", "vuatomcangxanh-v13");
fs.writeFileSync("index.html", indexHtml, "utf8");
console.log("Bumped index.html to v13");

let sw = fs.readFileSync("sw.js", "utf8");
sw = sw.replaceAll("vuatomcangxanh-v12", "vuatomcangxanh-v13");
fs.writeFileSync("sw.js", sw, "utf8");
fs.writeFileSync("public/sw.js", sw, "utf8");
console.log("Bumped sw.js to v13");
