import fs from 'fs';
import path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modulesPath = path.resolve(__dirname, "..", "modules");

// Recursively collect all .ts and .js files in a directory
function getAllFiles(dir, ext = ['.ts', '.js'], fileList = []) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      getAllFiles(fullPath, ext, fileList);
    } else if (ext.includes(path.extname(file.name))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const files = getAllFiles(modulesPath);

const options = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' }
  },
  apis: []
};

for (const file of files) {
  try {
    swaggerJSDoc({ ...options, apis: [file] });
    console.log(`✅ OK: ${file}`);
  } catch (err) {
    console.error(`❌ ERROR in ${file}`);
    console.error(err.message);
  }
}
