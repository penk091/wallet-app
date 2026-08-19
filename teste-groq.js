const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function testar() {

    try {

        const resposta =
            await groq.chat.completions.create({

                model: "llama-3.1-8b-instant",

                messages: [
                    {
                        role: "user",
                        content:
                            "Responda apenas: Groq funcionando na carteira!"
                    }
                ]

            });

        console.log(
            resposta.choices[0].message.content
        );

    } catch (erro) {

        console.error(
            "Erro Groq:",
            erro
        );

    }

}

testar();