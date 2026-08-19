const API_KEY =
    process.env.FINNHUB_API_KEY;


async function buscarNoticias(ticker) {

    const hoje =
        new Date();

    const semanaAtras =
        new Date();

    semanaAtras.setDate(
        hoje.getDate() - 7
    );


    const dataFim =
        hoje
            .toISOString()
            .split("T")[0];


    const dataInicio =
        semanaAtras
            .toISOString()
            .split("T")[0];


    const url =
        `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${dataInicio}&to=${dataFim}&token=${API_KEY}`;


    const resposta =
        await fetch(url);


    if (!resposta.ok) {

        throw new Error(
            `Erro Finnhub: ${resposta.status}`
        );

    }


    const noticias =
        await resposta.json();


    return noticias;

}


async function testar() {

    try {

        const noticias =
            await buscarNoticias("NVDA");


        console.log(
            `Encontradas ${noticias.length} notícias.`
        );


        noticias
            .slice(0, 5)
            .forEach(
                (noticia, indice) => {

                    console.log(
                        `\n--- NOTÍCIA ${indice + 1} ---`
                    );

                    console.log(
                        "Título:",
                        noticia.headline
                    );

                    console.log(
                        "Fonte:",
                        noticia.source
                    );

                    console.log(
                        "Link:",
                        noticia.url
                    );

                }
            );


    } catch (erro) {

        console.error(
            "Erro:",
            erro
        );

    }

}


testar();