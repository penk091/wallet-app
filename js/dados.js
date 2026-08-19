// =================================
// B3
// =================================

async function buscarCotacoesB3(tickers) {

    if (
        !tickers ||
        tickers.length === 0
    ) {

        return {};

    }


    const simbolos =
        [...new Set(tickers)]
            .join(",");


    try {

        const resposta =
            await fetch(
                `https://brapi.dev/api/v2/stocks/quote?symbols=${simbolos}`
            );


        if (!resposta.ok) {

            throw new Error(
                "Não foi possível obter as cotações B3."
            );

        }


        const dados =
            await resposta.json();


        const cotacoes = {};


        if (dados.results) {

            dados.results.forEach(
                resultado => {

                    if (
                        resultado.data &&
                        typeof resultado.data.regularMarketPrice === "number"
                    ) {

                        cotacoes[
                            resultado.symbol
                        ] =
                            resultado.data.regularMarketPrice;

                    }

                }
            );

        }


        return cotacoes;

    } catch (erro) {

        console.error(
            "Erro ao buscar cotações B3:",
            erro
        );


        return {};

    }

}


// =================================
// AÇÕES EUA
// =================================

async function buscarCotacoesEUA(tickers) {

    if (
        !Array.isArray(tickers) ||
        tickers.length === 0
    ) {

        return {};

    }


    const unicos =
        [
            ...new Set(

                tickers
                    .map(
                        ticker =>
                            String(ticker)
                                .trim()
                                .toUpperCase()
                                .split("/")[0]
                    )

                    .filter(Boolean)

            )
        ];


    const cotacoes = {};


    for (
        const ticker
        of unicos
    ) {

        try {

            console.log(
                `Buscando cotação EUA: ${ticker}`
            );


            const resposta =
                await fetch(
                    `https://39sc78y7e2.onrender.com/cotacao/${encodeURIComponent(ticker)}`
                );


            if (
                !resposta.ok
            ) {

                console.warn(
                    `Servidor retornou ${resposta.status} para ${ticker}`
                );

                continue;

            }


            const dados =
                await resposta.json();


            console.log(
                `Resposta da cotação ${ticker}:`,
                dados
            );


            // =================================
            // ACEITAR DIFERENTES FORMATOS
            // =================================

            let preco = null;


            if (
                typeof dados.USD === "number" &&
                dados.USD > 0
            ) {

                preco =
                    dados.USD;

            }


            if (
                preco === null &&
                typeof dados.c === "number" &&
                dados.c > 0
            ) {

                preco =
                    dados.c;

            }


            if (
                preco === null
            ) {

                console.warn(
                    `Cotação inválida para ${ticker}:`,
                    dados
                );

                continue;

            }


            // =================================
            // SALVAR
            // =================================

            cotacoes[ticker] = {

                USD:
                    preco,

                moeda:
                    "USD"

            };


            console.log(
                `✅ ${ticker}: US$ ${preco}`
            );


        } catch (erro) {

            console.error(
                `Erro ao buscar cotação de ${ticker}:`,
                erro
            );

        }

    }


    return cotacoes;

}


// =================================
// CRYPTO
// =================================

function normalizarCrypto(ticker) {

    return ticker
        .trim()
        .toUpperCase()
        .split("/")[0];

}


function moedaCrypto(ticker) {

    const partes =
        ticker
            .trim()
            .toUpperCase()
            .split("/");


    if (
        partes.length === 2
    ) {

        if (
            partes[1] === "BRL"
        ) {

            return "BRL";

        }


        if (
            partes[1] === "USD"
        ) {

            return "USD";

        }

    }


    // Se escrever apenas BTC,
    // consideramos USD.

    return "USD";

}


async function buscarCotacoesCrypto(ativos) {

    if (
        !ativos ||
        ativos.length === 0
    ) {

        return {};

    }


    const simbolos =
        ativos.map(
            ativo =>
                normalizarCrypto(
                    ativo.ticker
                )
        );


    const unicos =
        [
            ...new Set(simbolos)
        ];


    const cotacoes = {};


    try {

        for (
            const simbolo
            of unicos
        ) {

            const id =
                mapearCryptoId(
                    simbolo
                );


            const resposta =
                await fetch(
                    `https://wallet-app-buia.onrender.com${id}&vs_currencies=usd,brl`
                );


            if (
                !resposta.ok
            ) {

                console.warn(
                    `Cotação não encontrada para ${simbolo}`
                );

                continue;

            }


            const dados =
                await resposta.json();


            if (
                dados[id]
            ) {

                cotacoes[simbolo] = {

                    USD:
                        dados[id].usd,

                    BRL:
                        dados[id].brl

                };

            }

        }

    } catch (erro) {

        console.error(
            "Erro ao buscar crypto:",
            erro
        );

    }


    return cotacoes;

}


// =================================
// MAPEAR CRYPTO
// =================================

function mapearCryptoId(simbolo) {

    const mapa = {

        BTC:
            "bitcoin",

        ETH:
            "ethereum",

        SOL:
            "solana",

        XRP:
            "ripple",

        ADA:
            "cardano",

        DOGE:
            "dogecoin",

        BNB:
            "binancecoin",

        AVAX:
            "avalanche-2",

        LINK:
            "chainlink",

        DOT:
            "polkadot"

    };


    return (
        mapa[simbolo] ||
        simbolo.toLowerCase()
    );

}


// =================================
// FORMATAÇÃO
// =================================

function formatarMoeda(
    valor,
    moeda = "BRL"
) {

    return Number(valor)
        .toLocaleString(
            "pt-BR",
            {
                style:
                    "currency",

                currency:
                    moeda
            }
        );

}


// =================================
// RESULTADO
// =================================

function calcularResultado(
    ativo,
    precoAtual
) {

    const valorInvestido =
        ativo.quantidade *
        ativo.precoMedio;


    const valorAtual =
        ativo.quantidade *
        precoAtual;


    const lucro =
        valorAtual -
        valorInvestido;


    const rentabilidade =
        valorInvestido > 0

            ? (
                lucro /
                valorInvestido
            ) * 100

            : 0;


    return {

        valorInvestido,

        valorAtual,

        lucro,

        rentabilidade

    };

}
