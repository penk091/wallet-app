const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function testar() {

    try {

        const resposta =
            await ai.models.generateContent({
                model: "gemini-3.1-flash-lite",
                contents: "Responda apenas: Gemini funcionando!"
            });

        console.log(
            resposta.text
        );

    } catch (erro) {

        console.error(
            "Erro Gemini:",
            erro
        );

    }

}

testar();