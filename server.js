const http = require("http");
const fs = require("fs");
const path = require("path");

const { GoogleGenAI } = require("@google/genai");
const Groq = require("groq-sdk");

const PORTA = process.env.PORT || 3000;
const HOST = "0.0.0.0";

const ROOT = path.join(__dirname, "..");

// =============================================
// CHAVES
// =============================================

const FINNHUB_API_KEY =
    process.env.FINNHUB_API_KEY;

const GEMINI_API_KEY =
    process.env.GEMINI_API_KEY;

const GROQ_API_KEY =
    process.env.GROQ_API_KEY;


// =============================================
// CLIENTES IA
// =============================================

const ai =
    GEMINI_API_KEY
        ? new GoogleGenAI({
            apiKey: GEMINI_API_KEY
        })
        : null;

const groq =
    GROQ_API_KEY
        ? new Groq({
            apiKey: GROQ_API_KEY
        })
        : null;


// =============================================
// GEMINI
// =============================================

async function perguntarGemini(pergunta) {

    if (!ai) {
        throw new Error(
            "GEMINI_API_KEY não configurada."
        );
    }

    const resposta =
        await ai.models.generateContent({

            model: "gemini-2.5-flash",

            contents: pergunta

        });

    return resposta.text;
}


// =============================================
// GROQ
// =============================================

async function perguntarGroq(pergunta) {

    if (!groq) {
        throw new Error(
            "GROQ_API_KEY não configurada."
        );
    }

    const resposta =
        await groq.chat.completions.create({

            model: "openai/gpt-oss-20b",

            messages: [

                {
                    role: "user",
                    content: pergunta
                }

            ]

        });

    return resposta
        .choices[0]
        .message
        .content;
}


// =============================================
// FINNHUB - EUA
// =============================================

async function buscarCotacao(ticker) {

    if (!FINNHUB_API_KEY) {
        throw new Error(
            "FINNHUB_API_KEY não configurada."
        );
    }

    const url =
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_API_KEY}`;

    console.log(
        `Buscando EUA: ${ticker}`
    );

    const resposta =
        await fetch(url);

    if (!resposta.ok) {
        throw new Error(
            `Erro Finnhub: ${resposta.status}`
        );
    }

    const dados =
        await resposta.json();

    if (
        typeof dados.c !== "number" ||
        dados.c <= 0
    ) {
        throw new Error(
            `Cotação indisponível para ${ticker}`
        );
    }

    return dados.c;
}


// =============================================
// DÓLAR
// =============================================

async function buscarDolar() {

    const resposta =
        await fetch(
            "https://economia.awesomeapi.com.br/json/last/USD-BRL"
        );

    if (!resposta.ok) {
        throw new Error(
            "Erro ao buscar dólar."
        );
    }

    const dados =
        await resposta.json();

    const valor =
        Number(
            dados.USDBRL?.bid
        );

    if (
        !Number.isFinite(valor) ||
        valor <= 0
    ) {
        throw new Error(
            "Cotação do dólar inválida."
        );
    }

    return valor;
}


// =============================================
// B3
// =============================================

async function buscarCotacaoB3(ticker) {

    const simbolo =
        String(ticker)
            .replace(".SA", "")
            .toUpperCase();

    const url =
        `https://brapi.dev/api/quote/${encodeURIComponent(simbolo)}`;

    console.log(
        `Buscando B3: ${simbolo}`
    );

    const resposta =
        await fetch(url);

    if (!resposta.ok) {
        throw new Error(
            `Erro BRAPI: ${resposta.status}`
        );
    }

    const dados =
        await resposta.json();

    const resultado =
        dados.results?.[0];

    const preco =
        Number(
            resultado?.regularMarketPrice
        );

    if (
        !Number.isFinite(preco) ||
        preco <= 0
    ) {
        throw new Error(
            `Cotação B3 indisponível para ${simbolo}`
        );
    }

    return preco;
}


// =============================================
// CRYPTO
// =============================================

function mapearCryptoId(simbolo) {

    const mapa = {

        BTC: "bitcoin",
        ETH: "ethereum",
        SOL: "solana",
        XRP: "ripple",
        ADA: "cardano",
        DOGE: "dogecoin",
        BNB: "binancecoin",
        AVAX: "avalanche-2",
        LINK: "chainlink",
        DOT: "polkadot"

    };

    return (
        mapa[simbolo] ||
        simbolo.toLowerCase()
    );
}


async function buscarCotacaoCrypto(ticker) {

    const simbolo =
        String(ticker)
            .trim()
            .toUpperCase()
            .split("/")[0];

    const id =
        mapearCryptoId(simbolo);

    const url =
        `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd,brl`;

    console.log(
        `Buscando Crypto: ${simbolo}`
    );

    const resposta =
        await fetch(url);

    if (!resposta.ok) {
        throw new Error(
            `Erro CoinGecko: ${resposta.status}`
        );
    }

    const dados =
        await resposta.json();

    const cotacao =
        dados[id];

    if (!cotacao) {
        throw new Error(
            `Cotação indisponível para ${simbolo}`
        );
    }

    const USD =
        Number(cotacao.usd);

    const BRL =
        Number(cotacao.brl);

    if (
        !Number.isFinite(USD) ||
        !Number.isFinite(BRL) ||
        USD <= 0 ||
        BRL <= 0
    ) {
        throw new Error(
            `Cotação inválida para ${simbolo}`
        );
    }

    return {
        USD,
        BRL
    };
}


// =============================================
// NORMALIZAR ATIVO
// =============================================

function normalizarAtivo(ativo) {

    return {

        ticker:
            String(
                ativo.ticker || ""
            )
                .trim()
                .toUpperCase(),

        categoria:
            String(
                ativo.categoria || "EUA"
            )
                .trim()
                .toUpperCase(),

        quantidade:
            Number(ativo.quantidade) || 0,

        precoMedio:
            Number(ativo.precoMedio) || 0

    };
}


// =============================================
// ATUALIZAR COTAÇÕES DA CARTEIRA
// =============================================

async function atualizarDadosCarteira(ativos) {

    let dolar = 0;

    try {
        dolar =
            await buscarDolar();
    } catch (erro) {
        console.warn(
            "Dólar indisponível:",
            erro.message
        );
    }

    const ativosAtualizados = [];

    for (const ativo of ativos) {

        try {

            let precoAtual = 0;
            let moeda = "BRL";

            if (
                ativo.categoria === "B3"
            ) {

                precoAtual =
                    await buscarCotacaoB3(
                        ativo.ticker
                    );

                moeda = "BRL";

            } else if (
                ativo.categoria === "EUA"
            ) {

                precoAtual =
                    await buscarCotacao(
                        ativo.ticker
                    );

                moeda = "USD";

            } else if (
                ativo.categoria === "CRYPTO"
            ) {

                const crypto =
                    await buscarCotacaoCrypto(
                        ativo.ticker
                    );

                const usaBRL =
                    ativo.ticker
                        .toUpperCase()
                        .includes("/BRL");

                if (usaBRL) {

                    precoAtual =
                        crypto.BRL;

                    moeda = "BRL";

                } else {

                    precoAtual =
                        crypto.USD;

                    moeda = "USD";

                }

            } else {

                throw new Error(
                    `Categoria desconhecida: ${ativo.categoria}`
                );

            }

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

            let valorAtualBRL =
                valorAtual;

            let valorInvestidoBRL =
                valorInvestido;

            if (
                moeda === "USD"
            ) {

                if (
                    !dolar ||
                    dolar <= 0
                ) {
                    throw new Error(
                        "Dólar indisponível."
                    );
                }

                valorAtualBRL =
                    valorAtual * dolar;

                valorInvestidoBRL =
                    valorInvestido * dolar;
            }

            ativosAtualizados.push({

                ...ativo,

                precoAtual,

                moeda,

                valorInvestido,

                valorAtual,

                lucro,

                rentabilidade,

                dolar,

                valorAtualBRL,

                valorInvestidoBRL

            });

        } catch (erro) {

            console.error(
                `Erro em ${ativo.ticker}:`,
                erro.message
            );

            const valorInvestido =
                ativo.quantidade *
                ativo.precoMedio;

            ativosAtualizados.push({

                ...ativo,

                precoAtual: 0,

                moeda:
                    ativo.categoria === "B3"
                        ? "BRL"
                        : "USD",

                valorInvestido,

                valorAtual: 0,

                lucro: 0,

                rentabilidade: 0,

                dolar,

                valorAtualBRL: 0,

                valorInvestidoBRL:
                    ativo.categoria === "B3"
                        ? valorInvestido
                        : valorInvestido * dolar

            });

        }

    }

    const patrimonioTotal =
        ativosAtualizados.reduce(
            (soma, ativo) =>
                soma +
                (
                    Number(
                        ativo.valorAtualBRL
                    ) || 0
                ),
            0
        );

    const resultadoFinal =
        ativosAtualizados.map(
            ativo => {

                const peso =
                    patrimonioTotal > 0
                        ? (
                            ativo.valorAtualBRL /
                            patrimonioTotal
                        ) * 100
                        : 0;

                return {

                    ...ativo,

                    peso:
                        Number(
                            peso.toFixed(2)
                        )

                };

            }
        );

    return {

        ativos:
            resultadoFinal,

        patrimonioTotal,

        dolar

    };
}


// =============================================
// EXTRAIR JSON DA IA
// =============================================

function extrairJSON(texto) {

    if (
        typeof texto !== "string"
    ) {
        throw new Error(
            "Resposta da IA não é texto."
        );
    }

    let textoLimpo =
        texto.trim();

    textoLimpo =
        textoLimpo
            .replace(/^```json/i, "")
            .replace(/^```/, "")
            .replace(/```$/, "")
            .trim();

    const inicio =
        textoLimpo.indexOf("{");

    const fim =
        textoLimpo.lastIndexOf("}");

    if (
        inicio === -1 ||
        fim === -1
    ) {
        throw new Error(
            "A IA não retornou JSON válido."
        );
    }

    return JSON.parse(
        textoLimpo.substring(
            inicio,
            fim + 1
        )
    );
}


// =============================================
// PROMPT
// =============================================

function montarPromptCarteira(ativos) {

    const lista =
        ativos.map(
            (ativo, indice) => `

ATIVO ${indice + 1}

Ticker: ${ativo.ticker}
Categoria: ${ativo.categoria}
Quantidade: ${ativo.quantidade}
Preço médio: ${ativo.precoMedio}
Preço atual: ${ativo.precoAtual}
Moeda: ${ativo.moeda}
Valor investido: ${ativo.valorInvestido}
Valor atual: ${ativo.valorAtual}
Valor investido BRL: ${ativo.valorInvestidoBRL}
Valor atual BRL: ${ativo.valorAtualBRL}
Peso: ${ativo.peso}%
Lucro/prejuízo: ${ativo.lucro}
Rentabilidade: ${ativo.rentabilidade}%
`
        ).join("\n");

    return `

Você é um analista profissional de investimentos.

Analise TODOS os ativos fornecidos.

Use EXCLUSIVAMENTE os dados fornecidos abaixo.

Não use notícias.
Não pesquise notícias.
Não invente fatos.
Não invente números.
Não invente resultados financeiros.

Os preços e indicadores já foram calculados pelo servidor.

Para cada ativo considere:

- posição atual;
- desempenho;
- lucro ou prejuízo;
- rentabilidade;
- peso;
- concentração;
- risco;
- oportunidade;
- relação risco/retorno.

Dê:

impacto:
"positivo", "negativo" ou "neutro"

perspectiva:
"favoravel", "cautela" ou "neutra"

pontuacao:
0 até 10

Depois faça uma análise geral da carteira.

A análise deve ser objetiva e fácil de entender.

IMPORTANTE:
Analise TODOS os ativos.
Não ignore nenhum.

Responda SOMENTE com JSON válido.

Formato:

{
  "ativos": [
    {
      "ticker": "",
      "categoria": "",
      "impacto": "neutro",
      "perspectiva": "neutra",
      "pontuacao": 0,
      "analise": ""
    }
  ],
  "carteira": {
    "sentimento": "NEUTRO",
    "pontuacao": 0,
    "analise": ""
  }
}

Deve existir exatamente uma entrada para cada ativo.

CARTEIRA:

${lista}
`;
}


// =============================================
// NORMALIZAR RESULTADO IA
// =============================================

function normalizarResultadoIA(
    resultado,
    ativos
) {

    const recebidos =
        Array.isArray(resultado?.ativos)
            ? resultado.ativos
            : [];

    const normalizados =
        ativos.map(
            ativo => {

                const encontrado =
                    recebidos.find(
                        item =>
                            String(
                                item.ticker || ""
                            )
                                .trim()
                                .toUpperCase() ===
                            ativo.ticker
                    );

                if (!encontrado) {

                    return {

                        ticker:
                            ativo.ticker,

                        categoria:
                            ativo.categoria,

                        impacto:
                            "neutro",

                        perspectiva:
                            "neutra",

                        pontuacao: 0,

                        analise:
                            "A IA não retornou análise para este ativo."

                    };

                }

                let pontuacao =
                    Number(
                        encontrado.pontuacao
                    );

                if (
                    !Number.isFinite(
                        pontuacao
                    )
                ) {
                    pontuacao = 0;
                }

                pontuacao =
                    Math.max(
                        0,
                        Math.min(
                            10,
                            pontuacao
                        )
                    );

                const impacto =
                    String(
                        encontrado.impacto ||
                        "neutro"
                    ).toLowerCase();

                const perspectiva =
                    String(
                        encontrado.perspectiva ||
                        "neutra"
                    ).toLowerCase();

                return {

                    ticker:
                        ativo.ticker,

                    categoria:
                        ativo.categoria,

                    impacto:
                        [
                            "positivo",
                            "negativo",
                            "neutro"
                        ].includes(impacto)
                            ? impacto
                            : "neutro",

                    perspectiva:
                        [
                            "favoravel",
                            "cautela",
                            "neutra"
                        ].includes(perspectiva)
                            ? perspectiva
                            : "neutra",

                    pontuacao:
                        Number(
                            pontuacao.toFixed(2)
                        ),

                    analise:
                        String(
                            encontrado.analise || ""
                        )

                };

            }
        );

    return normalizados;
}


// =============================================
// ANALISAR CARTEIRA
// =============================================

async function analisarCarteira(carteira) {

    if (
        !Array.isArray(carteira) ||
        carteira.length === 0
    ) {
        throw new Error(
            "A carteira está vazia."
        );
    }

    const ativos =
        carteira
            .map(normalizarAtivo)
            .filter(
                ativo =>
                    ativo.ticker
            );

    if (
        ativos.length === 0
    ) {
        throw new Error(
            "Nenhum ativo válido."
        );
    }

    console.log(
        `Analisando ${ativos.length} ativo(s)...`
    );

    const dados =
        await atualizarDadosCarteira(
            ativos
        );

    const prompt =
        montarPromptCarteira(
            dados.ativos
        );

    const respostas =
        await Promise.all([

            perguntarGemini(prompt),

            perguntarGroq(prompt)

        ]);

    let gemini;
    let groqResultado;

    try {

        gemini =
            extrairJSON(
                respostas[0]
            );

    } catch {

        throw new Error(
            "Gemini retornou JSON inválido."
        );

    }

    try {

        groqResultado =
            extrairJSON(
                respostas[1]
            );

    } catch {

        throw new Error(
            "Groq retornou JSON inválido."
        );

    }

    const resultadoGemini =
        normalizarResultadoIA(
            gemini,
            dados.ativos
        );

    const resultadoGroq =
        normalizarResultadoIA(
            groqResultado,
            dados.ativos
        );

    const ativosFinais =
        dados.ativos.map(
            ativo => {

                const g =
                    resultadoGemini.find(
                        item =>
                            item.ticker ===
                            ativo.ticker
                    );

                const q =
                    resultadoGroq.find(
                        item =>
                            item.ticker ===
                            ativo.ticker
                    );

                const pontuacao =
                    (
                        (g?.pontuacao || 0) +
                        (q?.pontuacao || 0)
                    ) / 2;

                const impacto =
                    g?.impacto === q?.impacto
                        ? g.impacto
                        : "neutro";

                const perspectiva =
                    g?.perspectiva ===
                    q?.perspectiva
                        ? g.perspectiva
                        : "neutra";

                const analiseG =
                    g?.analise || "";

                const analiseQ =
                    q?.analise || "";

                return {

                    ...ativo,

                    impacto,

                    perspectiva,

                    pontuacao:
                        Number(
                            pontuacao.toFixed(2)
                        ),

                    analise:
                        analiseG.length >=
                        analiseQ.length
                            ? analiseG
                            : analiseQ

                };

            }
        );

    const pontuacaoCarteira =
        ativosFinais.length > 0
            ? ativosFinais.reduce(
                (soma, ativo) =>
                    soma +
                    ativo.pontuacao,
                0
            ) /
            ativosFinais.length
            : 0;

    let sentimento = "NEUTRO";

    if (
        pontuacaoCarteira >= 7
    ) {
        sentimento = "POSITIVO";
    } else if (
        pontuacaoCarteira < 4
    ) {
        sentimento = "NEGATIVO";
    }

    const analiseGemini =
        String(
            gemini?.carteira?.analise || ""
        );

    const analiseGroq =
        String(
            groqResultado?.carteira?.analise || ""
        );

    return {

        sucesso: true,

        quantidadeAtivos:
            ativosFinais.length,

        patrimonioTotal:
            dados.patrimonioTotal,

        dolar:
            dados.dolar,

        carteira: {

            sentimento,

            pontuacao:
                Number(
                    pontuacaoCarteira.toFixed(2)
                ),

            analise:
                analiseGemini.length >=
                analiseGroq.length
                    ? analiseGemini
                    : analiseGroq

        },

        ativos:
            ativosFinais

    };
}


// =============================================
// LER BODY
// =============================================

function lerBody(req) {

    return new Promise(
        (resolve, reject) => {

            let body = "";

            req.on(
                "data",
                parte => {
                    body +=
                        parte.toString();
                }
            );

            req.on(
                "end",
                () => {

                    try {

                        resolve(
                            body
                                ? JSON.parse(body)
                                : {}
                        );

                    } catch {

                        reject(
                            new Error(
                                "JSON inválido."
                            )
                        );

                    }

                }
            );

            req.on(
                "error",
                reject
            );

        }
    );
}


// =============================================
// ARQUIVOS DO SITE
// =============================================

function servirArquivo(
    req,
    res
) {

    let urlPath =
        decodeURIComponent(
            req.url.split("?")[0]
        );

    if (
        urlPath === "/"
    ) {
        urlPath =
            "/index.html";
    }

    const arquivo =
        path.resolve(
            ROOT,
            "." + urlPath
        );

    if (
        !arquivo.startsWith(ROOT)
    ) {
        return false;
    }

    if (
        !fs.existsSync(arquivo) ||
        !fs.statSync(arquivo).isFile()
    ) {
        return false;
    }

    const extensao =
        path.extname(arquivo)
            .toLowerCase();

    const tipos = {

        ".html":
            "text/html; charset=utf-8",

        ".css":
            "text/css; charset=utf-8",

        ".js":
            "application/javascript; charset=utf-8",

        ".json":
            "application/json; charset=utf-8",

        ".png":
            "image/png",

        ".jpg":
            "image/jpeg",

        ".jpeg":
            "image/jpeg",

        ".svg":
            "image/svg+xml",

        ".ico":
            "image/x-icon",

        ".webp":
            "image/webp"

    };

    res.statusCode = 200;

    res.setHeader(
        "Content-Type",
        tipos[extensao] ||
        "application/octet-stream"
    );

    res.end(
        fs.readFileSync(arquivo)
    );

    return true;
}


// =============================================
// SERVIDOR
// =============================================

const servidor =
    http.createServer(
        async (req, res) => {

            res.setHeader(
                "Access-Control-Allow-Origin",
                "*"
            );

            res.setHeader(
                "Access-Control-Allow-Methods",
                "GET, POST, OPTIONS"
            );

            res.setHeader(
                "Access-Control-Allow-Headers",
                "Content-Type"
            );

            if (
                req.method === "OPTIONS"
            ) {

                res.statusCode = 204;
                res.end();

                return;
            }


            // =================================
            // COTAÇÃO EUA
            // =================================

            if (
                req.method === "GET" &&
                req.url.startsWith(
                    "/cotacao/"
                )
            ) {

                const ticker =
                    decodeURIComponent(
                        req.url
                            .replace(
                                "/cotacao/",
                                ""
                            )
                            .split("?")[0]
                    )
                        .trim()
                        .toUpperCase();

                try {

                    const cotacao =
                        await buscarCotacao(
                            ticker
                        );

                    res.statusCode = 200;

                    res.setHeader(
                        "Content-Type",
                        "application/json; charset=utf-8"
                    );

                    res.end(
                        JSON.stringify({

                            ticker,

                            USD:
                                cotacao

                        })
                    );

                } catch (erro) {

                    res.statusCode = 500;

                    res.setHeader(
                        "Content-Type",
                        "application/json; charset=utf-8"
                    );

                    res.end(
                        JSON.stringify({

                            sucesso: false,

                            ticker,

                            erro:
                                erro.message

                        })
                    );

                }

                return;
            }


            // =================================
            // COTAÇÃO B3
            // =================================

            if (
                req.method === "GET" &&
                req.url.startsWith(
                    "/cotacao-b3/"
                )
            ) {

                const ticker =
                    decodeURIComponent(
                        req.url
                            .replace(
                                "/cotacao-b3/",
                                ""
                            )
                            .split("?")[0]
                    )
                        .trim()
                        .toUpperCase();

                try {

                    const cotacao =
                        await buscarCotacaoB3(
                            ticker
                        );

                    res.statusCode = 200;

                    res.setHeader(
                        "Content-Type",
                        "application/json; charset=utf-8"
                    );

                    res.end(
                        JSON.stringify({

                            ticker,

                            BRL:
                                cotacao

                        })
                    );

                } catch (erro) {

                    res.statusCode = 500;

                    res.setHeader(
                        "Content-Type",
                        "application/json; charset=utf-8"
                    );

                    res.end(
                        JSON.stringify({

                            sucesso: false,

                            ticker,

                            erro:
                                erro.message

                        })
                    );

                }

                return;
            }


            // =================================
            // COTAÇÃO CRYPTO
            // =================================

            if (
                req.method === "GET" &&
                req.url.startsWith(
                    "/cotacao-crypto/"
                )
            ) {

                const ticker =
                    decodeURIComponent(
                        req.url
                            .replace(
                                "/cotacao-crypto/",
                                ""
                            )
                            .split("?")[0]
                    )
                        .trim()
                        .toUpperCase();

                try {

                    const cotacao =
                        await buscarCotacaoCrypto(
                            ticker
                        );

                    res.statusCode = 200;

                    res.setHeader(
                        "Content-Type",
                        "application/json; charset=utf-8"
                    );

                    res.end(
                        JSON.stringify({

                            ticker,

                            USD:
                                cotacao.USD,

                            BRL:
                                cotacao.BRL

                        })
                    );

                } catch (erro) {

                    res.statusCode = 500;

                    res.setHeader(
                        "Content-Type",
                        "application/json; charset=utf-8"
                    );

                    res.end(
                        JSON.stringify({

                            sucesso: false,

                            ticker,

                            erro:
                                erro.message

                        })
                    );

                }

                return;
            }


            // =================================
            // DÓLAR
            // =================================

            if (
                req.method === "GET" &&
                req.url === "/cotacao-dolar"
            ) {

                try {

                    const dolar =
                        await buscarDolar();

                    res.statusCode = 200;

                    res.setHeader(
                        "Content-Type",
                        "application/json; charset=utf-8"
                    );

                    res.end(
                        JSON.stringify({
                            USD_BRL: dolar
                        })
                    );

                } catch (erro) {

                    res.statusCode = 500;

                    res.setHeader(
                        "Content-Type",
                        "application/json; charset=utf-8"
                    );

                    res.end(
                        JSON.stringify({
                            sucesso: false,
                            erro: erro.message
                        })
                    );

                }

                return;
            }


            // =================================
            // ANALISTA IA
            // =================================

            if (
                req.method === "POST" &&
                req.url ===
                    "/ia/analisar-carteira"
            ) {

                try {

                    const dados =
                        await lerBody(req);

                    const carteira =
                        Array.isArray(
                            dados.carteira
                        )
                            ? dados.carteira
                            : [];

                    const resultado =
                        await analisarCarteira(
                            carteira
                        );

                    res.statusCode = 200;

                    res.setHeader(
                        "Content-Type",
                        "application/json; charset=utf-8"
                    );

                    res.end(
                        JSON.stringify(
                            resultado
                        )
                    );

                } catch (erro) {

                    console.error(
                        "ERRO IA:",
                        erro
                    );

                    res.statusCode = 500;

                    res.setHeader(
                        "Content-Type",
                        "application/json; charset=utf-8"
                    );

                    res.end(
                        JSON.stringify({

                            sucesso: false,

                            erro:
                                erro.message

                        })
                    );

                }

                return;
            }


            // =================================
            // TESTE GEMINI
            // =================================

            if (
                req.method === "GET" &&
                req.url === "/ia/teste"
            ) {

                try {

                    const resposta =
                        await perguntarGemini(
                            "Responda apenas: Gemini funcionando!"
                        );

                    res.statusCode = 200;

                    res.setHeader(
                        "Content-Type",
                        "application/json; charset=utf-8"
                    );

                    res.end(
                        JSON.stringify({

                            sucesso: true,

                            resposta

                        })
                    );

                } catch (erro) {

                    res.statusCode = 500;

                    res.setHeader(
                        "Content-Type",
                        "application/json; charset=utf-8"
                    );

                    res.end(
                        JSON.stringify({

                            sucesso: false,

                            erro:
                                erro.message

                        })
                    );

                }

                return;
            }


            // =================================
            // SITE
            // =================================

            if (
                req.method === "GET"
            ) {

                if (
                    servirArquivo(
                        req,
                        res
                    )
                ) {
                    return;
                }

            }


            // =================================
            // 404
            // =================================

            res.statusCode = 404;

            res.setHeader(
                "Content-Type",
                "application/json; charset=utf-8"
            );

            res.end(
                JSON.stringify({

                    sucesso: false,

                    erro:
                        "Rota não encontrada."

                })
            );

        }
    );


// =============================================
// INICIAR
// =============================================

servidor.listen(
    PORTA,
    HOST,
    () => {

        console.log(
            `Wallet iniciada em http://localhost:${PORTA}`
        );

    }
);