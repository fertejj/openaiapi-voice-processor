const fs = require('fs');
const OpenAI = require('openai');

// Initialize OpenAI client
// Ensure OPENAI_API_KEY is set in environment variables
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcribes audio file using OpenAI Whisper.
 * @param {string} filePath - Path to the audio file.
 * @returns {Promise<string>} - The transcribed text.
 */
async function transcribeAudio(filePath) {
    try {
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: 'whisper-1',
        });
        return transcription.text;
    } catch (error) {
        console.error('Error transcribing audio:', error);
        throw new Error('Failed to transcribe audio.');
    }
}

/**
 * Translates text using OpenAI Chat Completion (GPT-4o or similar).
 * @param {string} text - The text to translate.
 * @param {string} targetLanguage - The target language (e.g., "English", "Spanish").
 * @returns {Promise<string>} - The translated text.
 */
async function translateText(text, targetLanguage) {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // Or 'gpt-3.5-turbo'
            messages: [
                {
                    role: 'system',
                    content: `You are a helpful translator. Translate the following text to ${targetLanguage}. Return ONLY the translated text, nothing else.`,
                },
                {
                    role: 'user',
                    content: text,
                },
            ],
        });
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error translating text:', error);
        throw new Error('Failed to translate text.');
    }
}

module.exports = {
    transcribeAudio,
    translateText,
};
