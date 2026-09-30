const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../assets/index-Os1X4Z7e.js");
let content = fs.readFileSync(filePath, "utf8");

const oldSpecs = "const dynamicSpecs = [\n                          ...(Array.isArray(traderProf.catchingSpecs) ? traderProf.catchingSpecs.map(sp => sp && sp.text).filter(Boolean) : []),\n                          traderProf.harvestStartTime && traderProf.harvestEndTime ? `Thời gian bắt & cân: từ ${traderProf.harvestStartTime} đến ${traderProf.harvestEndTime}` : \"Thời gian bắt: Buổi sáng sớm mát trời (4h30 - 8h30)\",\n                          `Quy cách trừ hao: 100kg tôm trừ bì ${traderProf.tarePer100Kg !== undefined ? traderProf.tarePer100Kg : 1} kg`\n                        ];";

const newSpecs = `const dynamicSpecs = [
                          ...(Array.isArray(traderProf.catchingSpecs) ? traderProf.catchingSpecs.map(sp => sp && sp.text).filter(Boolean) : []),
                          traderProf.harvestStartTime ? \`Thời gian bắt tôm: từ \${traderProf.harvestStartTime}\` : "Thời gian bắt: 04:30",
                          traderProf.harvestEndTime ? \`Thời gian cân tôm: từ \${traderProf.harvestEndTime}\` : "Thời gian cân: 08:30",
                          traderProf.harvestStartTime && traderProf.harvestEndTime ? \`Thời gian bắt & cân: từ \${traderProf.harvestStartTime} đến \${traderProf.harvestEndTime}\` : "Thời gian bắt & cân: từ 04:30 đến 08:30",
                          \`Quy cách trừ hao: 100kg tôm trừ bì \${traderProf.tarePer100Kg !== undefined ? traderProf.tarePer100Kg : 1} kg\`
                        ];`;

if (content.includes(oldSpecs)) {
  content = content.replace(oldSpecs, newSpecs);
  fs.writeFileSync(filePath, content, "utf8");
  console.log("Successfully refined dynamicSpecs!");
} else {
  console.log("Could not find oldSpecs exact string!");
}
