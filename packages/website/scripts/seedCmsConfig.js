const fs = require("fs");
const path = require("path");

const cmsDir = path.join(__dirname, "..", "cms");

const seeds = {
  "components.123456.json": '{"components":[]}',
  "presets.123456.json": '{"presets":[]}',
};

for (const [file, content] of Object.entries(seeds)) {
  const filePath = path.join(cmsDir, file);
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
}
