const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testTranslation() {
    try {
        const form = new FormData();
        // Create a dummy file for testing if one doesn't exist
        const testFilePath = path.join(__dirname, 'test_audio.mp3');
        if (!fs.existsSync(testFilePath)) {
            console.log('Creating dummy test file...');
            fs.writeFileSync(testFilePath, 'dummy content');
            // Note: This dummy content will fail Whisper if sent to real API, 
            // but verifies the route handler accepts the file.
            // For real testing, place a real 'test_audio.mp3' in this directory.
        }

        form.append('file', fs.createReadStream(testFilePath));
        form.append('target_language', 'English');

        console.log('Sending request to http://localhost:8080/translate-audio...');

        const response = await axios.post('http://localhost:8080/translate-audio', form, {
            headers: {
                ...form.getHeaders(),
            },
        });

        console.log('Response:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('Error Response:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testTranslation();
