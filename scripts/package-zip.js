const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Simple JS zip creator using node or adm-zip / archiver if present, or using PowerShell via script file
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

console.log('Packaging frontend zip with POSIX forward-slash paths for Hostinger (Linux)...');
