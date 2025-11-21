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
 *     description: Upload an audio file, provide a URL, or send a Base64 string to transcribe it using Whisper. Optionally translate the text.
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
 *                 description: URL of the audio file.
 *               audio_base64:
 *                 type: string
 *                 description: Base64 encoded audio string.
 *               target_language:
 *                 type: string
 *                 description: The target language for translation (e.g., "English", "Spanish").
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               audio_url:
 *                 type: string
 *                 description: URL of the audio file.
 *               audio_base64:
 *                 type: string
 *                 description: Base64 encoded audio string.
 *               target_language:
 *                 type: string
 *                 description: The target language for translation.
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: success
 *                     text:
 *                       type: string
 *                       description: The transcribed text (when no translation requested).
 *                     type:
 *                       type: string
 *                       example: transcription
 *                 - type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: success
 *                     text:
 *                       type: string
 *                       description: The translated text.
 *                     type:
 *                       type: string
 *                       example: translation
 *                     target_language:
 *                       type: string
 *                       example: English
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Internal Server Error
 */
router.post('/translate-audio', upload.single('file'), async (req, res) => {
    let filePath = null;

    try {
        const { audio_url, target_language, audio_base64 } = req.body;
        const file = req.file;

        // Validation
        if (!file && !audio_url && !audio_base64) {
            return res.status(400).json({ error: 'Please provide "file" (multipart), "audio_url", or "audio_base64".' });
        }

        // Determine file source
        if (file) {
            filePath = file.path;
        } else if (audio_base64) {
            const buffer = Buffer.from(audio_base64, 'base64');
            const fileName = `upload_b64_${Date.now()}.mp3`; // Assuming mp3
            filePath = path.join(__dirname, '../../uploads', fileName);

            // Ensure uploads dir exists
            if (!fs.existsSync(path.dirname(filePath))) {
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
            }

            fs.writeFileSync(filePath, buffer);
        } else if (audio_url) {
            const fileName = `download_${Date.now()}.mp3`;
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
        if (target_language) {
            res.json({
                status: 'success',
                text: translation,
                type: 'translation',
                target_language: target_language
            });
        } else {
            res.json({
                status: 'success',
                text: transcription,
                type: 'transcription'
            });
        }

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
