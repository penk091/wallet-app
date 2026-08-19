const formulario =
    document.getElementById("formulario");

let idEditando = null;
let idAtivoDividendo = null;

let cotacoesAtuais = {};
let cotacoesEUA = {};
let cotacoesCrypto = {};

let cotacaoDolar = null;


// ==============================
// FORMULÁRIO DE ATIVO
// ==============================

function abrirFormulario() {

    formulario.classList.add("ativo");

}


function fecharFormulario() {

    formulario.classList.remove("ativo");

    limparFormulario();

    idEditando = null;

    document.querySelector(
        ".formulario-topo h3"
    ).textContent = "Adicionar ativo";

    document.querySelector(
        ".salvar-ativo"
    ).textContent = "SALVAR ATIVO";

}


// ==============================
// BUSCAR DÓLAR
// ==============================

async function buscarCotacaoDolar() {

    try {

        const resposta =
            await fetch(
                "https://api.frankfurter.dev/v2/rate/USD/BRL"
            );


        if (!resposta.ok) {

            throw new Error(
                "Erro ao buscar dólar."
            );

        }


        const dados =
            await resposta.json();


        cotacaoDolar =
            Number(dados.rate);


        return cotacaoDolar;

    } catch (erro) {

        console.error(
            "Erro ao buscar dólar:",
            erro
        );


        cotacaoDolar =
            null;


        return null;

    }

}


// ==============================
// ADICIONAR / EDITAR ATIVO
// ==============================

function adicionarAtivo() {

    const categoria =
        document.getElementById(
            "categoria"
        ).value;


    const ticker =
        document
            .getElementById(
                "ticker"
            )
            .value
            .trim()
            .toUpperCase();


    const quantidade =
        Number(
            document.getElementById(
                "quantidade"
            ).value
        );


    const precoMedio =
        Number(
            document.getElementById(
                "preco-medio"
            ).value
        );


    if (
        !ticker ||
        quantidade <= 0 ||
        precoMedio <= 0
    ) {

        alert(
            "Preencha todos os campos corretamente."
        );

        return;

    }


    let carteira =
        JSON.parse(
            localStorage.getItem(
                "carteira"
            )
        ) || [];


    if (
        idEditando !== null
    ) {

        const indice =
            carteira.findIndex(
                ativo =>
                    ativo.id ===
                    idEditando
            );


        if (
            indice !== -1
        ) {

            carteira[indice] = {

                ...carteira[indice],

                categoria,

                ticker,

                quantidade,

                precoMedio

            };

        }

    } else {

        const ativo = {

            id:
                Date.now(),

            categoria,

            ticker,

            quantidade,

            precoMedio

        };


        carteira.push(
            ativo
        );

    }


    localStorage.setItem(
        "carteira",
        JSON.stringify(
            carteira
        )
    );


    limparFormulario();

    idEditando = null;

    fecharFormulario();

    carregarCarteira();

}


// ==============================
// CARREGAR CARTEIRA
// ==============================

async function carregarCarteira() {

    const carteira =
        JSON.parse(
            localStorage.getItem(
                "carteira"
            )
        ) || [];


    const listaB3 =
        document.getElementById(
            "lista-b3"
        );


    const listaEua =
        document.getElementById(
            "lista-eua"
        );


    const listaCrypto =
        document.getElementById(
            "lista-crypto"
        );


    listaB3.innerHTML = "";

    listaEua.innerHTML = "";

    listaCrypto.innerHTML = "";


    // ==============================
    // TICKERS B3
    // ==============================

    const tickersB3 =
        carteira
            .filter(
                ativo =>
                    ativo.categoria ===
                    "B3"
            )
            .map(
                ativo =>
                    ativo.ticker
            );


    // ==============================
    // TICKERS EUA
    // ==============================

    const tickersEUA =
        carteira
            .filter(
                ativo =>
                    ativo.categoria ===
                    "EUA"
            )
            .map(
                ativo =>
                    ativo.ticker
            );


    // ==============================
    // CRYPTO
    // ==============================

    const ativosCrypto =
        carteira.filter(
            ativo =>
                ativo.categoria ===
                "CRYPTO"
        );


    // ==============================
    // BUSCAR COTAÇÕES
    // ==============================

    cotacoesAtuais =
        await buscarCotacoesB3(
            tickersB3
        );


    cotacoesEUA =
        await buscarCotacoesEUA(
            tickersEUA
        );


    cotacoesCrypto =
        await buscarCotacoesCrypto(
            ativosCrypto
        );


    // ==============================
    // DÓLAR
    // ==============================

    await buscarCotacaoDolar();


    // ==============================
    // TOTAL
    // ==============================

    let totalInvestido = 0;

    let totalAtual = 0;


    // ==============================
    // PRIMEIRA ETAPA
    // CALCULAR PATRIMÔNIO COMPLETO
    // ==============================

    carteira.forEach(
        ativo => {

            const valorInvestido =
                ativo.quantidade *
                ativo.precoMedio;


            // ==============================
            // B3
            // ==============================

            if (
                ativo.categoria ===
                "B3"
            ) {

                totalInvestido +=
                    valorInvestido;


                const precoAtual =
                    cotacoesAtuais[
                        ativo.ticker
                    ];


                if (
                    typeof precoAtual ===
                    "number"
                ) {

                    totalAtual +=
                        ativo.quantidade *
                        precoAtual;

                } else {

                    totalAtual +=
                        valorInvestido;

                }

            }


            // ==============================
            // EUA
            // ==============================

            else if (
                ativo.categoria ===
                "EUA"
            ) {

                // PM cadastrado em USD

                const investimentoUSD =
                    valorInvestido;


                const investimentoBRL =
                    cotacaoDolar
                        ? investimentoUSD *
                          cotacaoDolar
                        : investimentoUSD;


                totalInvestido +=
                    investimentoBRL;


                const cotacao =
                    cotacoesEUA[
                        ativo.ticker
                    ];


                if (
                    cotacao &&
                    typeof cotacao.USD ===
                    "number"
                ) {

                    const valorUSD =
                        ativo.quantidade *
                        cotacao.USD;


                    const valorBRL =
                        cotacaoDolar
                            ? valorUSD *
                              cotacaoDolar
                            : valorUSD;


                    totalAtual +=
                        valorBRL;

                } else {

                    totalAtual +=
                        investimentoBRL;

                }

            }


            // ==============================
            // CRYPTO
            // ==============================

            else if (
                ativo.categoria ===
                "CRYPTO"
            ) {

                // Crypto será considerada USD

                const investimentoUSD =
                    valorInvestido;


                const investimentoBRL =
                    cotacaoDolar
                        ? investimentoUSD *
                          cotacaoDolar
                        : investimentoUSD;


                totalInvestido +=
                    investimentoBRL;


                const simbolo =
                    normalizarCrypto(
                        ativo.ticker
                    );


                const cotacao =
                    cotacoesCrypto[
                        simbolo
                    ];


                const moeda =
                    moedaCrypto(
                        ativo.ticker
                    );


                if (
                    cotacao &&
                    typeof cotacao[
                        moeda
                    ] === "number"
                ) {

                    const valorCrypto =
                        ativo.quantidade *
                        cotacao[
                            moeda
                        ];


                    let valorBRL =
                        valorCrypto;


                    if (
                        moeda ===
                        "USD" &&
                        cotacaoDolar
                    ) {

                        valorBRL =
                            valorCrypto *
                            cotacaoDolar;

                    }


                    totalAtual +=
                        valorBRL;

                } else {

                    totalAtual +=
                        investimentoBRL;

                }

            }


            // ==============================
            // OUTROS
            // ==============================

            else {

                totalInvestido +=
                    valorInvestido;

                totalAtual +=
                    valorInvestido;

            }

        }
    );


    // ==============================
    // SEGUNDA ETAPA
    // CRIAR CARDS
    // ==============================

    carteira.forEach(
        ativo => {

            let precoAtual =
                null;


            let moeda =
                "BRL";


            // ==============================
            // B3
            // ==============================

            if (
                ativo.categoria ===
                "B3"
            ) {

                precoAtual =
                    cotacoesAtuais[
                        ativo.ticker
                    ];


                moeda =
                    "BRL";

            }


            // ==============================
            // EUA
            // ==============================

            if (
                ativo.categoria ===
                "EUA"
            ) {

                const cotacao =
                    cotacoesEUA[
                        ativo.ticker
                    ];


                if (
                    cotacao &&
                    typeof cotacao.USD ===
                    "number"
                ) {

                    precoAtual =
                        cotacao.USD;

                }


                moeda =
                    "USD";

            }


            // ==============================
            // CRYPTO
            // ==============================

            if (
                ativo.categoria ===
                "CRYPTO"
            ) {

                const simbolo =
                    normalizarCrypto(
                        ativo.ticker
                    );


                const cotacao =
                    cotacoesCrypto[
                        simbolo
                    ];


                const moedaCryptoAtivo =
                    moedaCrypto(
                        ativo.ticker
                    );


                if (
                    cotacao &&
                    typeof cotacao[
                        moedaCryptoAtivo
                    ] ===
                    "number"
                ) {

                    precoAtual =
                        cotacao[
                            moedaCryptoAtivo
                        ];

                }


                moeda =
                    moedaCryptoAtivo;

            }


            const elemento =
                criarElementoAtivo(
                    ativo,
                    precoAtual,
                    totalAtual,
                    moeda
                );


            if (
                ativo.categoria ===
                "B3"
            ) {

                listaB3.appendChild(
                    elemento
                );

            }


            if (
                ativo.categoria ===
                "EUA"
            ) {

                listaEua.appendChild(
                    elemento
                );

            }


            if (
                ativo.categoria ===
                "CRYPTO"
            ) {

                listaCrypto.appendChild(
                    elemento
                );

            }

        }
    );


    // ==============================
    // PATRIMÔNIO
    // ==============================

    document.getElementById(
        "patrimonio-carteira"
    ).textContent =
        formatarMoeda(
            totalAtual,
            "BRL"
        );


    // ==============================
    // LUCRO
    // ==============================

    const lucro =
        totalAtual -
        totalInvestido;


    const elementoLucro =
        document.getElementById(
            "lucro-carteira"
        );


    const elementoRentabilidade =
        document.getElementById(
            "rentabilidade-carteira"
        );


    if (
        elementoLucro
    ) {

        elementoLucro.textContent =
            formatarMoeda(
                lucro,
                "BRL"
            );


        elementoLucro.style.color =
            lucro > 0
                ? "#35d07f"
                : lucro < 0
                    ? "#ff4d4d"
                    : "#888";

    }


    // ==============================
    // RENTABILIDADE
    // ==============================

    if (
        elementoRentabilidade
    ) {

        const rentabilidade =
            totalInvestido > 0

                ? (
                    lucro /
                    totalInvestido
                ) * 100

                : 0;


        elementoRentabilidade.textContent =
            `${
                rentabilidade >= 0
                    ? "+"
                    : ""
            }${rentabilidade.toFixed(
                2
            )}%`;


        elementoRentabilidade.style.color =
            rentabilidade > 0
                ? "#35d07f"
                : rentabilidade < 0
                    ? "#ff4d4d"
                    : "#888";

    }


    atualizarResumoDividendos();


    // ==============================
    // CARTEIRA VAZIA
    // ==============================

    if (
        carteira.length === 0
    ) {

        listaB3.innerHTML =
            '<p class="vazio">Nenhum ativo cadastrado.</p>';


        listaEua.innerHTML =
            '<p class="vazio">Nenhum ativo cadastrado.</p>';


        listaCrypto.innerHTML =
            '<p class="vazio">Nenhum ativo cadastrado.</p>';

    }

}


// ==============================
// CARD DO ATIVO
// ==============================

function criarElementoAtivo(
    ativo,
    precoAtual,
    patrimonioTotal,
    moeda = "BRL"
) {

    const div =
        document.createElement(
            "div"
        );


    div.className =
        "ativo-card";


    let informacaoCotacao =
        "";


    let informacaoResultado =
        "";


    let valorAtualAtivo =
        ativo.quantidade *
        ativo.precoMedio;


    if (
        typeof precoAtual ===
        "number"
    ) {

        valorAtualAtivo =
            ativo.quantidade *
            precoAtual;

    }


    // ==============================
    // PORCENTAGEM
    // ==============================

    let valorAtivoBRL =
        valorAtualAtivo;


    // EUA em USD → BRL

    if (
        moeda ===
        "USD" &&
        cotacaoDolar
    ) {

        valorAtivoBRL =
            valorAtualAtivo *
            cotacaoDolar;

    }


    // ==============================
    // PORCENTAGEM DA CARTEIRA
    // ==============================

    let porcentagemCarteira =
        0;


    if (
        patrimonioTotal > 0
    ) {

        porcentagemCarteira =
            (
                valorAtivoBRL /
                patrimonioTotal
            ) * 100;

    }


    // ==============================
    // COTAÇÃO
    // ==============================

    if (
        typeof precoAtual ===
        "number"
    ) {

        const resultado =
            calcularResultado(
                ativo,
                precoAtual
            );


        const sinal =
            resultado.lucro >= 0
                ? "+"
                : "";


        const cor =
            resultado.lucro > 0
                ? "#35d07f"
                : resultado.lucro < 0
                    ? "#ff4d4d"
                    : "#888";


        informacaoCotacao = `
            <p>
                Cotação:
                ${formatarMoeda(
                    precoAtual,
                    moeda
                )}
            </p>

            <p>
                Valor atual:
                ${formatarMoeda(
                    resultado.valorAtual,
                    moeda
                )}
            </p>
        `;


        informacaoResultado = `
            <p style="
                color: ${cor};
                font-weight: 600;
            ">
                ${sinal}${formatarMoeda(
                    resultado.lucro,
                    moeda
                )}
                (${sinal}${resultado.rentabilidade.toFixed(
                    2
                )}%)
            </p>
        `;

    } else {

        informacaoCotacao = `
            <p>
                Cotação: indisponível
            </p>
        `;

    }


    // ==============================
    // DIVIDENDOS
    // ==============================

    const totalDividendos =
        obterTotalDividendosAtivo(
            ativo.id
        );


    // ==============================
    // HTML
    // ==============================

    div.innerHTML = `

        <div>

            <div class="ativo-titulo">

                <strong>
                    ${ativo.ticker}
                </strong>

                <span class="peso-ativo">
                    ${porcentagemCarteira.toFixed(
                        1
                    )}%
                </span>

            </div>


            <p>
                ${ativo.quantidade}
                unidades
            </p>


            <p>
                PM:
                ${formatarMoeda(
                    ativo.precoMedio,
                    moeda
                )}
            </p>


            ${informacaoCotacao}


            ${informacaoResultado}


            ${
                totalDividendos > 0
                    ? `
                        <p style="
                            color: #35d07f;
                        ">
                            Dividendos:
                            ${formatarMoeda(
                                totalDividendos,
                                moeda
                            )}
                        </p>
                    `
                    : ""
            }

        </div>


        <div class="acoes-ativo">

            <button
                class="dividendo"
                onclick="abrirFormularioDividendo(${ativo.id})"
                title="Registrar dividendo"
            >
                💰
            </button>


            <button
                class="editar"
                onclick="editarAtivo(${ativo.id})"
                title="Editar"
            >
                ✏️
            </button>


            <button
                class="excluir"
                onclick="removerAtivo(${ativo.id})"
                title="Excluir"
            >
                🗑️
            </button>

        </div>

    `;


    return div;

}


// ==============================
// EDITAR ATIVO
// ==============================

function editarAtivo(id) {

    const carteira =
        JSON.parse(
            localStorage.getItem(
                "carteira"
            )
        ) || [];


    const ativo =
        carteira.find(
            ativo =>
                ativo.id === id
        );


    if (!ativo) {

        return;

    }


    idEditando =
        id;


    document.getElementById(
        "categoria"
    ).value =
        ativo.categoria;


    document.getElementById(
        "ticker"
    ).value =
        ativo.ticker;


    document.getElementById(
        "quantidade"
    ).value =
        ativo.quantidade;


    document.getElementById(
        "preco-medio"
    ).value =
        ativo.precoMedio;


    document.querySelector(
        "#formulario .formulario-topo h3"
    ).textContent =
        "Editar ativo";


    document.querySelector(
        "#formulario .salvar-ativo"
    ).textContent =
        "SALVAR ALTERAÇÕES";


    abrirFormulario();


    window.scrollTo({

        top:
            document.body.scrollHeight,

        behavior:
            "smooth"

    });

}


// ==============================
// EXCLUIR ATIVO
// ==============================

function removerAtivo(id) {

    const confirmar =
        confirm(
            "Deseja realmente excluir este ativo?"
        );


    if (!confirmar) {

        return;

    }


    let carteira =
        JSON.parse(
            localStorage.getItem(
                "carteira"
            )
        ) || [];


    carteira =
        carteira.filter(
            ativo =>
                ativo.id !== id
        );


    localStorage.setItem(
        "carteira",
        JSON.stringify(
            carteira
        )
    );


    // ==============================
    // REMOVE DIVIDENDOS
    // ==============================

    let dividendos =
        JSON.parse(
            localStorage.getItem(
                "dividendos"
            )
        ) || [];


    dividendos =
        dividendos.filter(
            dividendo =>
                dividendo.ativoId !== id
        );


    localStorage.setItem(
        "dividendos",
        JSON.stringify(
            dividendos
        )
    );


    carregarCarteira();

}


// ==============================
// DIVIDENDOS
// ==============================

function abrirFormularioDividendo(id) {

    const carteira =
        JSON.parse(
            localStorage.getItem(
                "carteira"
            )
        ) || [];


    const ativo =
        carteira.find(
            ativo =>
                ativo.id === id
        );


    if (!ativo) {

        return;

    }


    idAtivoDividendo =
        id;


    document.getElementById(
        "ativo-dividendo"
    ).textContent =
        ativo.ticker;


    document.getElementById(
        "data-base"
    ).value =
        "";


    document.getElementById(
        "data-pagamento"
    ).value =
        "";


    document.getElementById(
        "tipo-dividendo"
    ).value =
        "DIVIDENDO";


    document.getElementById(
        "quantidade-dividendo"
    ).value =
        ativo.quantidade;


    document.getElementById(
        "valor-dividendo"
    ).value =
        "";


    document.getElementById(
        "valor-por-acao"
    ).textContent =
        formatarMoeda(
            0
        );


    document.getElementById(
        "formulario-dividendo"
    ).classList.add(
        "ativo"
    );


    window.scrollTo({

        top:
            document.body.scrollHeight,

        behavior:
            "smooth"

    });

}


function fecharFormularioDividendo() {

    document.getElementById(
        "formulario-dividendo"
    ).classList.remove(
        "ativo"
    );


    idAtivoDividendo =
        null;

}


// ==============================
// CALCULAR VALOR POR AÇÃO
// ==============================

function calcularValorPorAcao() {

    const quantidade =
        Number(
            document.getElementById(
                "quantidade-dividendo"
            ).value
        );


    const valor =
        Number(
            document.getElementById(
                "valor-dividendo"
            ).value
        );


    const resultado =
        quantidade > 0 &&
        valor > 0

            ? valor /
              quantidade

            : 0;


    document.getElementById(
        "valor-por-acao"
    ).textContent =
        formatarMoeda(
            resultado
        );

}


document.getElementById(
    "quantidade-dividendo"
).addEventListener(
    "input",
    calcularValorPorAcao
);


document.getElementById(
    "valor-dividendo"
).addEventListener(
    "input",
    calcularValorPorAcao
);


// ==============================
// SALVAR DIVIDENDO
// ==============================

function salvarDividendo() {

    if (
        idAtivoDividendo ===
        null
    ) {

        return;

    }


    const dataBase =
        document.getElementById(
            "data-base"
        ).value;


    const dataPagamento =
        document.getElementById(
            "data-pagamento"
        ).value;


    const tipo =
        document.getElementById(
            "tipo-dividendo"
        ).value;


    const quantidade =
        Number(
            document.getElementById(
                "quantidade-dividendo"
            ).value
        );


    const valorTotal =
        Number(
            document.getElementById(
                "valor-dividendo"
            ).value
        );


    if (
        !dataPagamento ||
        quantidade <= 0 ||
        valorTotal <= 0
    ) {

        alert(
            "Preencha a data de pagamento, quantidade e valor recebido."
        );

        return;

    }


    const valorPorAcao =
        valorTotal /
        quantidade;


    let dividendos =
        JSON.parse(
            localStorage.getItem(
                "dividendos"
            )
        ) || [];


    dividendos.push({

        id:
            Date.now(),

        ativoId:
            idAtivoDividendo,

        dataBase:
            dataBase ||
            null,

        dataPagamento,

        tipo,

        quantidade,

        valorTotal,

        valorPorAcao

    });


    localStorage.setItem(
        "dividendos",
        JSON.stringify(
            dividendos
        )
    );


    fecharFormularioDividendo();

    carregarCarteira();

}


// ==============================
// TOTAL DE DIVIDENDOS
// ==============================

function obterTotalDividendosAtivo(
    ativoId
) {

    const dividendos =
        JSON.parse(
            localStorage.getItem(
                "dividendos"
            )
        ) || [];


    return dividendos
        .filter(
            dividendo =>
                dividendo.ativoId ===
                ativoId
        )
        .reduce(
            (
                total,
                dividendo
            ) =>
                total +
                Number(
                    dividendo.valorTotal
                ),
            0
        );

}


// ==============================
// RESUMO DE DIVIDENDOS
// ==============================

function atualizarResumoDividendos() {

    const dividendos =
        JSON.parse(
            localStorage.getItem(
                "dividendos"
            )
        ) || [];


    const total =
        dividendos.reduce(
            (
                soma,
                dividendo
            ) =>
                soma +
                Number(
                    dividendo.valorTotal
                ),
            0
        );


    const elemento =
        document.getElementById(
            "dividendos-carteira"
        );


    if (
        elemento
    ) {

        elemento.textContent =
            formatarMoeda(
                total
            );

    }


    atualizarHistoricoDividendos();

}


// ==============================
// HISTÓRICO
// ==============================

function atualizarHistoricoDividendos() {

    const container =
        document.getElementById(
            "historico-dividendos"
        );


    if (!container) {

        return;

    }


    const dividendos =
        JSON.parse(
            localStorage.getItem(
                "dividendos"
            )
        ) || [];


    if (
        dividendos.length ===
        0
    ) {

        container.innerHTML =
            "";

        return;

    }


    const carteira =
        JSON.parse(
            localStorage.getItem(
                "carteira"
            )
        ) || [];


    const ordenados =
        [...dividendos].sort(
            (a, b) =>
                new Date(
                    b.dataPagamento
                ) -
                new Date(
                    a.dataPagamento
                )
        );


    container.innerHTML = `

        <h3>
            Histórico de dividendos
        </h3>

        ${ordenados.map(
            dividendo => {

                const ativo =
                    carteira.find(
                        item =>
                            item.id ===
                            dividendo.ativoId
                    );


                const nome =
                    ativo
                        ? ativo.ticker
                        : "Ativo removido";


                const data =
                    new Date(
                        dividendo.dataPagamento +
                        "T00:00:00"
                    ).toLocaleDateString(
                        "pt-BR"
                    );


                return `

                    <div class="dividendo-card">

                        <div>

                            <strong>
                                ${nome}
                            </strong>

                            <p>
                                ${dividendo.tipo}
                            </p>

                            <p>
                                Pagamento:
                                ${data}
                            </p>

                        </div>


                        <div>

                            <strong>
                                ${formatarMoeda(
                                    dividendo.valorTotal
                                )}
                            </strong>

                            <p>
                                ${formatarMoeda(
                                    dividendo.valorPorAcao
                                )}
                                / ação
                            </p>

                        </div>

                    </div>

                `;

            }
        ).join("")}

    `;

}


// ==============================
// LIMPAR FORMULÁRIO
// ==============================

function limparFormulario() {

    document.getElementById(
        "ticker"
    ).value =
        "";


    document.getElementById(
        "quantidade"
    ).value =
        "";


    document.getElementById(
        "preco-medio"
    ).value =
        "";

}


// ==============================
// INICIAR
// ==============================

carregarCarteira();