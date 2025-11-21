const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { downloadFile, cleanupFile } = require('../utils/fileHandler');
const { transcribeAudio, translateText } = require('../services/openai');

// Configure Multer for file uploads
const upload = multer({ dest: 'uploads/' });

/**
 * @swagger
 * /translate-audio:
 *   post:
 *     summary: Transcribe and optionally translate audio
 *     description: Upload an audio file or provide a URL to transcribe it using Whisper. Optionally translate the text.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The audio file to upload.
 *               audio_url:
 *                 type: string
 *                 description: URL of the audio file (alternative to file upload).
 *               target_language:
 *                 type: string
 *                 description: The target language for translation (e.g., "English", "Spanish").
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 transcription:
 *                   type: string
 *                   description: The transcribed text.
 *                 translation:
 *                   type: string
 *                   description: The translated text (if requested).
 *                 target_language:
 *                   type: string
 *                   example: English
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Internal Server Error
 */
router.post('/translate-audio', upload.single('file'), async (req, res) => {
    let filePath = null;
    let isUpload = false;

    try {
        const { audio_url, target_language } = req.body;
        const file = req.file;

        // Validation
        if (!file && !audio_url) {
            return res.status(400).json({ error: 'Please provide either "file" (multipart) or "audio_url".' });
        }

        // Determine file source
        if (file) {
            filePath = file.path;
            isUpload = true;
        } else if (audio_url) {
            const fileName = `download_${Date.now()}.mp3`; // Assuming mp3 for simplicity, or detect from URL
            filePath = path.join(__dirname, '../../uploads', fileName);

            // Ensure uploads dir exists
            if (!fs.existsSync(path.dirname(filePath))) {
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
            }

            await downloadFile(audio_url, filePath);
        }

        // 1. Transcribe
        const transcription = await transcribeAudio(filePath);

        // 2. Translate (if target_language provided)
        let translation = null;
        if (target_language) {
            translation = await translateText(transcription, target_language);
        }

        // Response
        res.json({
            status: 'success',
            transcription,
            translation, // will be null if not requested
            target_language: target_language || 'not_specified'
        });

    } catch (error) {
        console.error('Processing error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    } finally {
        // Cleanup temp file
        if (filePath) {
            await cleanupFile(filePath);
        }
    }
});

module.exports = router;
