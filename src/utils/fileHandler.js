const fs = require('fs');
const axios = require('axios');
const path = require('path');

/**
 * Downloads a file from a URL to a local destination.
 * @param {string} url - The URL of the file to download.
 * @param {string} destPath - The local path to save the file.
 * @returns {Promise<string>} - The path to the downloaded file.
 */
async function downloadFile(url, destPath) {
  const writer = fs.createWriteStream(destPath);

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(destPath));
    writer.on('error', reject);
  });
}

/**
 * Deletes a file from the filesystem.
 * @param {string} filePath - The path of the file to delete.
 */
async function cleanupFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
  }
}

module.exports = {
  downloadFile,
  cleanupFile,
};
