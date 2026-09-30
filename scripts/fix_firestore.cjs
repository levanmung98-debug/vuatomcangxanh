const fs = require("fs");
const path = require("path");

const filesToUpdate = [
  path.join(__dirname, "../assets/index-v7.js"),
  path.join(__dirname, "../public/assets/index-v7.js"),
  path.join(__dirname, "../assets/index-Os1X4Z7e.js"),
  path.join(__dirname, "../public/assets/index-Os1X4Z7e.js")
];

const targetPattern = 'Wu=C1(eo,{localCache:k1({tabManager:U1()})})';
const replacement = 'Wu=null/* Disabled dead remote Firestore to eliminate backend timeout */';

filesToUpdate.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, "utf8");
    if (content.includes(targetPattern)) {
      content = content.replace(targetPattern, replacement);
      fs.writeFileSync(file, content, "utf8");
      console.log(`Updated ${file}: replaced Wu=C1 with Wu=null`);
    } else {
      console.log(`Pattern not found in ${file}`);
    }
  }
});

console.log("Firestore fix completed!");
