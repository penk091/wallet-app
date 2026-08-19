let cotacaoDolar = null;

let moedaSelecionada =
    localStorage.getItem("moeda") || "BRL";


// ==============================
// BUSCAR DÓLAR
// ==============================

async function buscarDolar() {

    try {

        const resposta = await fetch(
            "https://api.frankfurter.dev/v2/rate/USD/BRL"
        );


        if (!resposta.ok) {

            throw new Error(
                "Erro ao buscar dólar"
            );

        }


        const dados =
            await resposta.json();


        cotacaoDolar =
            dados.rate;


        const elementoCotacao =
            document.getElementById(
                "cotacao-dolar"
            );


        if (elementoCotacao) {

            elementoCotacao.textContent =
                `Dólar: ${formatarMoeda(
                    cotacaoDolar
                )}`;

        }


        const horario =
            new Date().toLocaleTimeString(
                "pt-BR",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );


        const atualizacao =
            document.getElementById(
                "atualizacao-dolar"
            );


        if (atualizacao) {

            atualizacao.textContent =
                `• atualizado às ${horario}`;

        }


        atualizarBotaoMoeda();

        carregarResumo();

    } catch (erro) {

        console.error(
            "Erro ao buscar dólar:",
            erro
        );


        const elementoCotacao =
            document.getElementById(
                "cotacao-dolar"
            );


        if (elementoCotacao) {

            elementoCotacao.textContent =
                "Dólar: indisponível";

        }

    }

}


// ==============================
// CARREGAR RESUMO
// ==============================

async function carregarResumo() {

    const carteira =
        JSON.parse(
            localStorage.getItem("carteira")
        ) || [];


    if (carteira.length === 0) {

        const patrimonio =
            document.querySelector(
                ".patrimonio h2"
            );


        if (patrimonio) {

            patrimonio.textContent =
                formatarMoeda(0);

        }


        return;

    }


    // ==============================
    // B3
    // ==============================

    const tickersB3 =
        carteira
            .filter(
                ativo =>
                    ativo.categoria === "B3"
            )
            .map(
                ativo =>
                    ativo.ticker
            );


    const cotacoesB3 =
        await buscarCotacoesB3(
            tickersB3
        );


    // ==============================
    // CRYPTO
    // ==============================

    const ativosCrypto =
        carteira.filter(
            ativo =>
                ativo.categoria === "CRYPTO"
        );


    const cotacoesCrypto =
        await buscarCotacoesCrypto(
            ativosCrypto
        );


    let totalInvestido = 0;

    let patrimonioAtual = 0;


    // ==============================
    // CALCULAR PATRIMÔNIO
    // ==============================

    carteira.forEach(ativo => {

        const valorInvestido =
            ativo.quantidade *
            ativo.precoMedio;


        totalInvestido +=
            valorInvestido;


        let precoAtual = null;


        // ==============================
        // B3
        // ==============================

        if (
            ativo.categoria === "B3"
        ) {

            precoAtual =
                cotacoesB3[
                    ativo.ticker
                ];

        }


        // ==============================
        // CRYPTO
        // ==============================

        if (
            ativo.categoria === "CRYPTO"
        ) {

            const simbolo =
                normalizarCrypto(
                    ativo.ticker
                );


            const cotacao =
                cotacoesCrypto[
                    simbolo
                ];


            if (cotacao) {

                precoAtual =
                    cotacao.BRL;

            }

        }


        // ==============================
        // VALOR ATUAL
        // ==============================

        if (
            typeof precoAtual === "number"
        ) {

            patrimonioAtual +=
                ativo.quantidade *
                precoAtual;

        } else {

            patrimonioAtual +=
                valorInvestido;

        }

    });


    // ==============================
    // LUCRO
    // ==============================

    const lucro =
        patrimonioAtual -
        totalInvestido;


    const rentabilidade =
        totalInvestido > 0

            ? (
                lucro /
                totalInvestido
            ) * 100

            : 0;


    // ==============================
    // PATRIMÔNIO
    // ==============================

    const patrimonio =
        document.querySelector(
            ".patrimonio h2"
        );


    if (patrimonio) {

        let valorExibido =
            patrimonioAtual;


        let moeda =
            "BRL";


        if (
            moedaSelecionada === "USD" &&
            cotacaoDolar
        ) {

            valorExibido =
                patrimonioAtual /
                cotacaoDolar;


            moeda =
                "USD";

        }


        patrimonio.textContent =
            formatarMoeda(
                valorExibido,
                moeda
            );

    }


    // ==============================
    // RESULTADO
    // ==============================

    const resultado =
        document.querySelector(
            ".resultado"
        );


    if (resultado) {

        const valores =
            resultado.querySelectorAll(
                "span"
            );


        let lucroExibido =
            lucro;


        let moeda =
            "BRL";


        if (
            moedaSelecionada === "USD" &&
            cotacaoDolar
        ) {

            lucroExibido =
                lucro /
                cotacaoDolar;


            moeda =
                "USD";

        }


        valores[0].textContent =
            `${
                lucro >= 0
                    ? "+"
                    : ""
            }${formatarMoeda(
                lucroExibido,
                moeda
            )}`;


        valores[1].textContent =
            `${
                rentabilidade >= 0
                    ? "+"
                    : ""
            }${rentabilidade.toFixed(2)}%`;


        const cor =
            lucro > 0

                ? "#35d07f"

                : lucro < 0

                    ? "#ff4d4d"

                    : "#888";


        valores[0].style.color =
            cor;


        valores[1].style.color =
            cor;

    }

}


// ==============================
// SELECIONAR MOEDA
// ==============================

function selecionarMoeda(moeda) {

    moedaSelecionada =
        moeda;


    localStorage.setItem(
        "moeda",
        moeda
    );


    atualizarBotaoMoeda();

    carregarResumo();

}


// ==============================
// BOTÕES DE MOEDA
// ==============================

function atualizarBotaoMoeda() {

    const btnReal =
        document.getElementById(
            "btn-real"
        );


    const btnDolar =
        document.getElementById(
            "btn-dolar"
        );


    if (
        !btnReal ||
        !btnDolar
    ) {

        return;

    }


    if (
        moedaSelecionada === "BRL"
    ) {

        btnReal.classList.add(
            "moeda-ativa"
        );


        btnDolar.classList.remove(
            "moeda-ativa"
        );

    } else {

        btnDolar.classList.add(
            "moeda-ativa"
        );


        btnReal.classList.remove(
            "moeda-ativa"
        );

    }

}


// ==============================
// GRÁFICO DE PIZZA
// ==============================

async function atualizarPizza() {

    const carteira =
        JSON.parse(
            localStorage.getItem("carteira")
        ) || [];


    if (
        carteira.length === 0
    ) {

        return;

    }


    const tickersB3 =
        carteira
            .filter(
                ativo =>
                    ativo.categoria === "B3"
            )
            .map(
                ativo =>
                    ativo.ticker
            );


    const cotacoes =
        await buscarCotacoesB3(
            tickersB3
        );


    const ativosCrypto =
        carteira.filter(
            ativo =>
                ativo.categoria === "CRYPTO"
        );


    const cotacoesCrypto =
        await buscarCotacoesCrypto(
            ativosCrypto
        );


    let totalB3 = 0;

    let totalEUA = 0;

    let totalCrypto = 0;


    carteira.forEach(ativo => {

        let valor = 0;


        let precoAtual =
            null;


        // ==============================
        // B3
        // ==============================

        if (
            ativo.categoria === "B3"
        ) {

            precoAtual =
                cotacoes[
                    ativo.ticker
                ];

        }


        // ==============================
        // CRYPTO
        // ==============================

        if (
            ativo.categoria === "CRYPTO"
        ) {

            const simbolo =
                normalizarCrypto(
                    ativo.ticker
                );


            const cotacao =
                cotacoesCrypto[
                    simbolo
                ];


            if (cotacao) {

                precoAtual =
                    cotacao.BRL;

            }

        }


        // ==============================
        // VALOR
        // ==============================

        if (
            typeof precoAtual === "number"
        ) {

            valor =
                ativo.quantidade *
                precoAtual;

        } else {

            valor =
                ativo.quantidade *
                ativo.precoMedio;

        }


        if (
            ativo.categoria === "B3"
        ) {

            totalB3 +=
                valor;

        }


        if (
            ativo.categoria === "EUA"
        ) {

            totalEUA +=
                valor;

        }


        if (
            ativo.categoria === "CRYPTO"
        ) {

            totalCrypto +=
                valor;

        }

    });


    const total =
        totalB3 +
        totalEUA +
        totalCrypto;


    if (
        total === 0
    ) {

        return;

    }


    const porcentagemB3 =
        (
            totalB3 /
            total
        ) * 100;


    const porcentagemEUA =
        (
            totalEUA /
            total
        ) * 100;


    const porcentagemCrypto =
        (
            totalCrypto /
            total
        ) * 100;


    const pizza =
        document.getElementById(
            "pizza"
        );


    if (pizza) {

        const inicioEUA =
            porcentagemB3;


        const inicioCrypto =
            porcentagemB3 +
            porcentagemEUA;


        pizza.style.background = `
            conic-gradient(
                #f5c542 0% ${porcentagemB3}%,
                #4d8cff ${porcentagemB3}% ${inicioCrypto}%,
                #ff8c42 ${inicioCrypto}% 100%
            )
        `;

    }


    const elementoB3 =
        document.getElementById(
            "porcentagem-b3"
        );


    const elementoEUA =
        document.getElementById(
            "porcentagem-eua"
        );


    const elementoCrypto =
        document.getElementById(
            "porcentagem-crypto"
        );


    if (elementoB3) {

        elementoB3.textContent =
            `${porcentagemB3.toFixed(1)}%`;

    }


    if (elementoEUA) {

        elementoEUA.textContent =
            `${porcentagemEUA.toFixed(1)}%`;

    }


    if (elementoCrypto) {

        elementoCrypto.textContent =
            `${porcentagemCrypto.toFixed(1)}%`;

    }

}


// ==============================
// HISTÓRICO DO PATRIMÔNIO
// ==============================

function salvarHistorico(patrimonio) {

    let historico =
        JSON.parse(
            localStorage.getItem(
                "historicoPatrimonio"
            )
        ) || [];


    const agora =
        new Date();


    historico.push({

        data:
            agora.toISOString(),

        valor:
            patrimonio

    });


    // Mantém no máximo 2000 registros

    if (
        historico.length > 2000
    ) {

        historico =
            historico.slice(-2000);

    }


    localStorage.setItem(
        "historicoPatrimonio",
        JSON.stringify(historico)
    );

}


// ==============================
// OBTER PATRIMÔNIO
// ==============================

async function obterPatrimonioAtual() {

    const carteira =
        JSON.parse(
            localStorage.getItem("carteira")
        ) || [];


    if (
        carteira.length === 0
    ) {

        return 0;

    }


    const tickersB3 =
        carteira
            .filter(
                ativo =>
                    ativo.categoria === "B3"
            )
            .map(
                ativo =>
                    ativo.ticker
            );


    const cotacoesB3 =
        await buscarCotacoesB3(
            tickersB3
        );


    const ativosCrypto =
        carteira.filter(
            ativo =>
                ativo.categoria === "CRYPTO"
        );


    const cotacoesCrypto =
        await buscarCotacoesCrypto(
            ativosCrypto
        );


    let patrimonio =
        0;


    carteira.forEach(ativo => {

        const valorInvestido =
            ativo.quantidade *
            ativo.precoMedio;


        let precoAtual =
            null;


        if (
            ativo.categoria === "B3"
        ) {

            precoAtual =
                cotacoesB3[
                    ativo.ticker
                ];

        }


        if (
            ativo.categoria === "CRYPTO"
        ) {

            const simbolo =
                normalizarCrypto(
                    ativo.ticker
                );


            const cotacao =
                cotacoesCrypto[
                    simbolo
                ];


            if (cotacao) {

                precoAtual =
                    cotacao.BRL;

            }

        }


        if (
            typeof precoAtual === "number"
        ) {

            patrimonio +=
                ativo.quantidade *
                precoAtual;

        } else {

            patrimonio +=
                valorInvestido;

        }

    });


    return patrimonio;

}


// ==============================
// DESENHAR GRÁFICO
// ==============================

function desenharGrafico() {

    const canvas =
        document.getElementById(
            "grafico-evolucao"
        );


    if (!canvas) {

        return;

    }


    const historico =
        JSON.parse(
            localStorage.getItem(
                "historicoPatrimonio"
            )
        ) || [];


    if (
        historico.length === 0
    ) {

        return;

    }


    const labels =
        historico.map(item => {

            const data =
                new Date(
                    item.data
                );


            return data.toLocaleDateString(
                "pt-BR",
                {
                    day: "2-digit",
                    month: "2-digit"
                }
            );

        });


    const valores =
        historico.map(
            item =>
                item.valor
        );


    new Chart(
        canvas,
        {

            type: "line",

            data: {

                labels: labels,

                datasets: [{

                    label: "Patrimônio",

                    data: valores,

                    borderWidth: 2,

                    tension: 0.35,

                    pointRadius: 0,

                    fill: true

                }]

            },


            options: {

                responsive: true,

                maintainAspectRatio: false,


                plugins: {

                    legend: {

                        display: false

                    }

                },


                scales: {

                    x: {

                        display: true

                    },


                    y: {

                        ticks: {

                            callback:
                                function(valor) {

                                    return valor.toLocaleString(
                                        "pt-BR",
                                        {
                                            style: "currency",
                                            currency: "BRL",
                                            maximumFractionDigits: 0
                                        }
                                    );

                                }

                        }

                    }

                }

            }

        }
    );

}


// ==============================
// REGISTRAR HISTÓRICO
// ==============================

async function registrarHistorico() {

    const patrimonio =
        await obterPatrimonioAtual();


    if (
        patrimonio <= 0
    ) {

        return;

    }


    salvarHistorico(
        patrimonio
    );


    desenharGrafico();

}


// ==============================
// INICIAR HOME
// ==============================

atualizarBotaoMoeda();

buscarDolar();

atualizarPizza();

registrarHistorico();
// ==============================
// ABRIR ANALISTA IA
// ==============================

function abrirAnalistaIA() {

    const carteira =
        JSON.parse(
            localStorage.getItem("carteira")
        ) || [];


    if (carteira.length === 0) {

        alert(
            "Sua carteira está vazia. Adicione ativos antes de usar o Analista IA."
        );

        return;

    }


    window.location.href =
        "ia.html";

}