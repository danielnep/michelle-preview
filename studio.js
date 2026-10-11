/* Estúdio Michelle: gerador determinístico de narrativas executivas. Sem IA externa. */
(() => {
  "use strict";
  const b = window.MichelleBridge;
  if (!b) return;
  const KEY = "michelle.studio.v1";
  const templates = {
    executivo: {
      name: "Resumo executivo",
      about: "Visão estratégica, indicadores-chave, riscos e decisões.",
    },
    operacional: {
      name: "Panorama operacional",
      about: "Fluxo de trabalho, pendências, desempenho e prioridades.",
    },
    resultados: {
      name: "Resultados e evolução",
      about: "Conquistas, tendência, comparativo e próximos passos.",
    },
    comparativo: {
      name: "Comparativo de setores",
      about: "Ranking entre departamentos, diferenças e oportunidades.",
    },
    diretoria: {
      name: "Reunião de diretoria",
      about: "Narrativa curta para decisões, riscos e encaminhamentos.",
    },
  };
  const defaultConfig = () => ({
    title: "Panorama da operação",
    template: "executivo",
    theme: "graphite",
    period: "all",
    quantity: 7,
    scope: "todos",
    sectors: b.getSectors().map((s) => s.id),
    notes: "",
    speaker: "Michelle",
    metricIds: null,
    includeInsights: true,
    focus: "equilibrado",
    detail: "gerencial",
    transition: "fade",
    color: "",
    background: "",
    font: "Inter",
    watermark: { enabled: false, image: "", opacity: 15, x: 80, y: 80 },
    signature: { text: "", image: "", x: 70, y: 85 },
  });
  let st = {
    config: defaultConfig(),
    slides: [],
    selected: 0,
    playing: false,
    position: 0,
    generatedAt: null,
    library: [],
    currentId: null,
    width: 1600,
    height: 900,
    warnings: [],
    saveQueue: Promise.resolve(),
    ready: false,
    saveStatus: "",
    saveRevision: 0,
  };

  let debounce;
  const esc = b.esc,
    sectors = b.getSectors();
  function persist() {
    if (!st.slides.length) return Promise.resolve();
    const revision = ++st.saveRevision;
    st.saveStatus = "Salvando alterações...";
    const visibleStatus = document.getElementById("studio-save-status");
    if (visibleStatus) visibleStatus.textContent = st.saveStatus;
    const item = {
      id: st.currentId || crypto.randomUUID(),
      name: st.config.title,
      origin: st.origin || "created",
      created: st.created || new Date().toISOString(),
      updated: new Date().toISOString(),
      config: structuredClone(st.config),
      slides: structuredClone(st.slides),
      width: st.width,
      height: st.height,
      warnings: st.warnings,
      generatedAt: st.generatedAt,
      fileId: st.fileId || null,
      metricOptions: st.metricOptions || [],
    };
    st.currentId = item.id;
    st.created = item.created;
    st.saveQueue = st.saveQueue
      .catch(() => {})
      .then(async () => {
        await b.S.put("presentations", item);
        const i = st.library.findIndex((p) => p.id === item.id);
        if (i < 0) st.library.unshift(item);
        else st.library[i] = item;
        const status = document.getElementById("studio-save-status");
        if (revision === st.saveRevision) {
          st.saveStatus = "Alterações salvas";
          if (status) status.textContent = st.saveStatus;
        }
      })
      .catch((e) => {
        b.notify("Não foi possível salvar: " + e.message, true);
        const status = document.getElementById("studio-save-status");
        if (revision === st.saveRevision) {
          st.saveStatus = "Alterações não salvas";
          if (status) status.textContent = st.saveStatus;
        }
        throw e;
      });
    return st.saveQueue;
  }
  function sectorLabel(id) {
    return sectors.find((s) => s.id === id)?.name || id;
  }
  function rec() {
    const c = st.config,
      chosen = c.scope === "todos" ? sectors.map((s) => s.id) : c.sectors,
      rows = b.getRecords(
        "geral",
        c.period,
        c.start || c.end
          ? { start: c.start || "", end: c.end || "" }
          : undefined,
      );
    return rows.filter((r) => chosen.includes(r.sector));
  }
  function shape() {
    const r = rec(),
      c = b.counts(r),
      t = b.D.stats(r),
      by = sectors
        .filter(
          (s) =>
            st.config.scope === "todos" || st.config.sectors.includes(s.id),
        )
        .map((sec) => {
          const rows = r.filter((x) => x.sector === sec.id),
            stats = b.D.stats(rows);
          return {
            label: sec.name,
            total: rows.length,
            done: stats.done,
            pending: stats.pending + stats.open,
            known: stats.known,
          };
        })
        .filter((s) => s.total)
        .sort((a, b) => b.total - a.total);
    return {
      r,
      c,
      total: r.length,
      ok: t.rate == null ? "—" : Math.round(t.rate),
      by,
      pending: c.pending + c.open,
      avg: t.avg == null ? "—" : Math.round(t.avg * 100) / 100,
    };
  }
  const newSlide = (
    kind,
    kicker,
    title,
    subtitle = "",
    points = [],
    metrics = [],
  ) => ({
    id: crypto.randomUUID(),
    kind,
    kicker,
    title,
    subtitle,
    points,
    metrics,
  });
  const bullets = (arr) => arr.filter(Boolean).slice(0, 5);
  const pct = (n, d) => (d ? Math.round((n / d) * 100) + "%" : "0%");
  function generate() {
    const c = st.config,
      m = shape();
    if (!m.total) {
      b.notify(
        "Importe dados ou ajuste o recorte antes de gerar slides.",
        true,
      );
      return;
    }
    const selected =
        st.config.scope === "todos"
          ? "oito setores"
          : st.config.sectors.map(sectorLabel).join(", "),
      date = new Date().toLocaleDateString("pt-BR"),
      arr = [];
    let add = (kind, kicker, title, subtitle, points, metrics) =>
      arr.push(
        newSlide(kind, kicker, title, subtitle, points || [], metrics || []),
      );
    const options = b.D.metricOptions(m.r),
      picked = options.filter(
        (o) => c.metricIds === null || c.metricIds.includes(o.id),
      );
    if (!picked.length) {
      b.notify("Selecione ao menos um indicador.", true);
      return;
    }
    const standard = picked.slice(0, 3).map((o) => ({
      value:
        String(Math.round(o.value * 100) / 100) + (o.id === "rate" ? "%" : ""),
      label: o.label,
    }));
    const ranking = m.by
      .slice(0, 5)
      .map((s) => ({ label: s.label, value: s.total }));
    const highlights = bullets([
      `Foram importadas ${m.total} linhas no recorte selecionado.`,
      m.c.known
        ? `${m.c.done} demandas concluídas (${m.ok}% dos status reconhecidos).`
        : "A fonte não informa status para calcular conclusão.",
      m.c.known ? `${m.pending} demandas em aberto.` : null,
      m.by[0] ? `Maior volume observado em ${m.by[0].label}.` : null,
    ]);
    const issues = m.by
      .filter((s) => s.pending)
      .sort((a, b) => b.pending - a.pending)
      .slice(0, 4)
      .map((s) => `${s.label}: ${s.pending} demanda(s) ainda em aberto.`);
    const noData = m.total === 0;
    if (c.template === "executivo") {
      add(
        "cover",
        "RELATÓRIO EXECUTIVO",
        c.title,
        `Resultados de ${c.period === "all" ? "todo o período" : c.period + " dias"} • ${selected}`,
      );
      add(
        "metrics",
        "VISÃO GERAL",
        "Os números que importam",
        "Indicadores calculados com os registros disponíveis.",
        [],
        standard,
      );
      add(
        "bars",
        "PERFIL DA OPERAÇÃO",
        "Volume por departamento",
        "Distribuição dos registros por setor.",
        [],
        ranking,
      );
      add(
        "points",
        "EVOLUÇÃO",
        "O que os indicadores revelam",
        "Síntese operacional do período.",
        highlights,
      );
      add(
        "metrics",
        "SITUAÇÃO ATUAL",
        "Concluído x em aberto",
        "Acompanhe o andamento dos registros.",
        [],
        [
          { value: String(m.c.done), label: "Concluídos" },
          { value: String(m.c.open), label: "Em andamento" },
          { value: String(m.c.pending), label: "Pendentes" },
        ],
      );
      add(
        "points",
        "PONTOS DE ATENÇÃO",
        "Onde concentrar esforços",
        "Prioridades sugeridas pelos registros.",
        issues.length
          ? issues
          : [
              "Sem pendências reconhecidas. Confira se a fonte informa todos os status.",
            ],
      );
      add(
        "points",
        "PRÓXIMAS DECISÕES",
        "Transformar dados em ação",
        "Sugestão de pauta para a próxima reunião.",
        bullets([
          "Definir responsável pelas demandas em aberto.",
          "Revisar os indicadores com maior variação.",
          "Atualizar o painel após novos registros.",
          "Acompanhar evolução no próximo encontro.",
        ]),
      );
      add(
        "final",
        "ENCERRAMENTO",
        "Decisões com mais clareza",
        "Obrigada! • Estúdio de Apresentações Michelle",
      );
    } else if (c.template === "operacional") {
      add(
        "cover",
        "OPERAÇÃO EM FOCO",
        c.title,
        `Acompanhamento operacional • ${c.period === "all" ? "todo o período" : c.period + " dias"}`,
      );
      add(
        "metrics",
        "ROTINA",
        "Volume e produtividade",
        "Panorama das solicitações e atendimentos.",
        [],
        standard,
      );
      add(
        "bars",
        "DEPARTAMENTOS",
        "Onde o trabalho acontece",
        "Volume de registros por equipe.",
        [],
        ranking,
      );
      add(
        "metrics",
        "CONTROLE DE STATUS",
        "Fluxo das demandas",
        "Registros finalizados e em acompanhamento.",
        [],
        [
          { value: String(m.c.done), label: "Encerrados" },
          { value: String(m.c.open), label: "Em andamento" },
          { value: String(m.c.pending), label: "Pendentes" },
        ],
      );
      add(
        "points",
        "GARGALOS",
        "Pendências a acompanhar",
        "Pontos que merecem monitoramento.",
        issues.length
          ? issues
          : ["Não foram identificadas pendências no período."],
      );
      add(
        "points",
        "PLANO DE EXECUÇÃO",
        "Próximos movimentos",
        "Ações sugeridas para a equipe.",
        bullets([
          "Priorizar ocorrências abertas há mais tempo.",
          "Separar demandas urgentes por responsável.",
          "Checar reincidências e causas de atrasos.",
          "Atualizar indicadores ao longo da semana.",
        ]),
      );
      add(
        "final",
        "PRÓXIMA REUNIÃO",
        "Acompanhar. Ajustar. Evoluir.",
        "Atualizar os registros para medir os avanços.",
      );
    } else if (c.template === "resultados") {
      add(
        "cover",
        "RESULTADOS",
        c.title,
        `Balanço de desempenho • ${c.period === "all" ? "todo o período" : c.period + " dias"}`,
      );
      add(
        "metrics",
        "DESTAQUES",
        "Performance do período",
        "Indicadores de produção e conclusão.",
        [],
        standard,
      );
      add(
        "points",
        "LEITURA DOS NÚMEROS",
        "O que conquistamos",
        "Síntese dos resultados observados.",
        highlights,
      );
      add(
        "bars",
        "MIX OPERACIONAL",
        "Contribuição das equipes",
        "Comparação dos volumes por setor.",
        [],
        ranking,
      );
      add(
        "metrics",
        "TEMPO E EXECUÇÃO",
        "Ciclo das solicitações",
        "Média simples de duração e andamento.",
        [],
        [
          { value: m.avg + " min", label: "Duração média registrada" },
          { value: String(m.c.done), label: "Finalizadas" },
          {
            value: m.ok === "—" ? "—" : m.ok + "%",
            label: "Índice de conclusão",
          },
        ],
      );
      add(
        "points",
        "OPORTUNIDADES",
        "Onde podemos melhorar",
        "Oportunidades identificadas.",
        issues.length
          ? issues
          : ["Manter o acompanhamento para preservar os resultados."],
      );
      add(
        "final",
        "PRÓXIMOS PASSOS",
        "Evoluir com consistência",
        "Indicadores que apoiam decisões melhores.",
      );
    } else if (c.template === "comparativo") {
      add(
        "cover",
        "COMPARATIVO",
        c.title,
        `Setores e produtividade • ${c.period === "all" ? "todo o período" : c.period + " dias"}`,
      );
      add(
        "bars",
        "RANKING",
        "Quem movimentou mais registros",
        "Volume dos setores selecionados.",
        [],
        ranking,
      );
      add(
        "metrics",
        "RESULTADO CONSOLIDADO",
        "O panorama completo",
        "Consolidação do conjunto analisado.",
        [],
        standard,
      );
      add(
        "points",
        "DESTAQUES",
        "Equipes em evidência",
        "Diferenças de volume entre setores.",
        bullets(
          m.by
            .slice(0, 4)
            .map(
              (s) =>
                `${s.label}: ${s.total} registros; ${s.known ? "conclusão de " + pct(s.done, s.known) : "status não informado"}.`,
            ),
        ),
      );
      add(
        "points",
        "MELHORIAS",
        "Onde estão as pendências",
        "Acompanhamento por área.",
        issues.length
          ? issues
          : ["Nenhuma demanda em aberto nos setores selecionados."],
      );
      add(
        "final",
        "CONCLUSÕES",
        "Comparar para priorizar",
        "Uma visão integrada das equipes.",
      );
    } else {
      add(
        "cover",
        "REUNIÃO DE DIRETORIA",
        c.title,
        `Material de decisão • ${date}`,
      );
      add(
        "metrics",
        "PAINEL EXECUTIVO",
        "Os números da operação",
        "Visão resumida para tomada de decisão.",
        [],
        standard,
      );
      add(
        "points",
        "DIAGNÓSTICO",
        "Pontos mais relevantes",
        "O que foi observado nos dados.",
        highlights.slice(0, 3),
      );
      add(
        "points",
        "RISCOS E ATENÇÃO",
        "O que pede uma decisão",
        "Demandas ainda abertas.",
        issues.length
          ? issues
          : ["Nenhuma pendência identificada no conjunto selecionado."],
      );
      add(
        "points",
        "ENCAMINHAMENTOS",
        "Decisões propostas",
        "Ações objetivas para deliberação.",
        bullets([
          "Designar responsáveis pelas pendências.",
          "Priorizar o tratamento de casos críticos.",
          "Definir prazo para atualização dos indicadores.",
        ]),
      );
      add(
        "final",
        "PRÓXIMO CICLO",
        "Decidir. Executar. Medir.",
        "Acompanhamento contínuo da operação.",
      );
    }
    if (noData)
      arr.forEach((x) => {
        if (x.kind === "metrics")
          x.subtitle =
            "Nenhum registro disponível no filtro; importe uma planilha ou altere a seleção.";
      });
    // Alguns modelos possuem menos slides nativamente: adiciona slides relevantes de aprofundamento ou reduz conforme quantidade selecionada.
    const extra = [
      newSlide(
        "bars",
        "VISÃO COMPLEMENTAR",
        "Participação das equipes",
        "Distribuição adicional de volume.",
        [],
        ranking,
      ),
      newSlide(
        "points",
        "RECOMENDAÇÕES",
        "Foco da próxima semana",
        "Medidas que ajudam a organizar prioridades.",
        bullets([
          "Revisar dados lançados por setor.",
          "Resolver pendências com data mais antiga.",
          "Apresentar indicadores na próxima reunião.",
        ]),
      ),
      newSlide(
        "metrics",
        "INDICADORES DE STATUS",
        "Demanda e resolução",
        "Consolidado das atividades.",
        [],
        [
          { value: String(m.c.done), label: "Concluídos" },
          { value: String(m.pending), label: "Abertos" },
          { value: m.ok === "—" ? "—" : m.ok + "%", label: "Conclusão" },
        ],
      ),
    ];
    for (const sec of m.by) {
      const rows = m.r.filter(
        (r) => r.sector === sectors.find((s) => s.name === sec.label)?.id,
      );
      extra.push(
        newSlide(
          "points",
          "LEITURA POR SETOR",
          sec.label,
          "Dados específicos do setor selecionado.",
          b.D.insights(rows, {
            sector: rows[0]?.sector,
            goals: b.getSettings().goals,
          })
            .slice(0, 3)
            .map((x) => x.title + " · " + x.text),
        ),
      );
    }
    for (const metric of picked)
      extra.push(
        Object.assign(
          newSlide(
            "metrics",
            "DETALHAMENTO",
            metric.label,
            "Indicador do recorte selecionado.",
            [],
            [
              {
                label: metric.label,
                value:
                  String(Math.round(metric.value * 100) / 100) +
                  (metric.id === "rate" ? "%" : ""),
              },
            ],
          ),
          { detail: true },
        ),
      );
    for (const row of m.r.slice(0, 20))
      extra.push(
        newSlide(
          "points",
          "REGISTRO DA FONTE",
          row.title || "Registro operacional",
          "Informação preservada da planilha.",
          [
            `${row.source} · linha ${row.line}`,
            `Identificação: ${row.id}`,
            `Quantidade / valor: ${row.value}`,
            `Status: ${row.status}`,
          ],
        ),
      );
    while (arr.length < c.quantity && extra.length)
      arr.splice(arr.length - 1, 0, extra.shift());
    if (arr.length < c.quantity) {
      b.notify(
        "Há informação suficiente para " +
          arr.length +
          " slides. Ajuste a quantidade solicitada.",
        true,
      );
      return;
    }
    if (arr.length > c.quantity) {
      const last = arr[arr.length - 1];
      arr.splice(c.quantity - 1);
      arr[c.quantity - 1] = last;
    }
    let metricSlides = arr.filter((x) => x.kind === "metrics" && !x.detail);
    while (picked.length > metricSlides.length * 3 && arr.length < 20) {
      const x = newSlide(
        "metrics",
        "INDICADORES",
        "Indicadores complementares",
        "Continuação dos dados selecionados.",
      );
      arr.splice(arr.length - 1, 0, x);
      metricSlides.push(x);
    }
    if (arr.length > c.quantity) c.quantity = arr.length;
    let mi = 0;
    metricSlides.forEach((x) => {
      x.metricIds = picked.slice(mi, mi + 3).map((o) => o.id);
      x.metrics = picked.slice(mi, mi + 3).map((o) => ({
        value:
          String(Math.round(o.value * 100) / 100) +
          (o.id === "rate" ? "%" : ""),
        label: o.label,
      }));
      mi += 3;
      if (!x.metrics.length) {
        x.kind = "points";
        x.points = [
          "Todos os indicadores selecionados já estão apresentados nos slides anteriores.",
        ];
      }
    });
    const notes = b.D.insights(m.r, {
      goals: b.getSettings().goals,
      all: b.getAll(),
      start: c.start,
      end: c.end,
      detailed: c.detail === "detalhado",
    });
    arr.forEach((slide, i) => {
      slide.transition = c.transition || "fade";
      slide.elements = [];
      const relevant =
        slide.kind === "metrics" && (slide.metricIds || []).length
          ? b.D.insights(
              m.r.filter(
                (r) =>
                  (slide.metricIds || []).includes(r.type) ||
                  (slide.metricIds || []).some((k) =>
                    ["records", "done", "pending", "rate", "duration"].includes(
                      k,
                    ),
                  ),
              ),
              {
                goals: b.getSettings().goals,
                detailed: c.detail === "detalhado",
              },
            )
          : slide.kind === "bars"
            ? [
                {
                  title: "Comparação de volume por setor",
                  text: "Os valores do gráfico contam linhas importadas. As fontes usam unidades diferentes; esse volume não representa desempenho.",
                },
              ]
            : notes;
      slide.insights =
        c.includeInsights && !["cover", "final"].includes(slide.kind)
          ? relevant
              .slice(
                0,
                c.detail === "resumido" ? 1 : c.detail === "detalhado" ? 5 : 3,
              )
              .map((x) => ({
                title: x.title,
                text: c.detail === "resumido" ? "" : x.text,
              }))
          : [];
      if (c.focus === "pendencias")
        slide.insights = slide.insights.filter((x) =>
          /abert|pend|meta|status/i.test(x.title + " " + x.text),
        );
      if (c.focus === "qualidade")
        slide.insights = slide.insights.filter((x) =>
          /status|conclus|meta|volume/i.test(x.title + " " + x.text),
        );
      if (c.notes && slide.kind === "final") slide.subtitle = c.notes;
    });
    st.currentId = null;
    st.created = null;
    st.origin = "created";
    st.fileId = null;
    st.width = 1600;
    st.height = 900;
    st.warnings = [];
    st.metricOptions = structuredClone(picked);
    st.slides = arr;
    st.selected = 0;
    st.generatedAt = new Date().toISOString();
    persist()
      .then(() => {
        b.render();
        b.notify(
          `${arr.length} slides criados e salvos com os indicadores selecionados.`,
        );
      })
      .catch(() => b.render());
    b.render();
  }
  function slideMarkup(slide, index, total, theme = "graphite") {
    if (slide.kind === "imported")
      return `<section class="studio-slide imported-slide" style="aspect-ratio:${st.width}/${st.height}"><img src="${slide.svg}" alt="${esc(slide.title)}">${elementsMarkup(slide)}${overlayMarkup(index, total)}</section>`;
    const isCover = ["cover", "final"].includes(slide.kind);
    let content = "";
    if (slide.kind === "metrics") {
      content = `<div class="slide-nums">${(slide.metrics || [])
        .slice(0, 3)
        .map(
          (m) =>
            `<div class="slide-num"><strong>${esc(m.value)}</strong><span>${esc(m.label)}</span></div>`,
        )
        .join("")}</div>`;
    }
    if (slide.kind === "bars") {
      let bars = (slide.metrics || []).slice(0, 5),
        max = Math.max(1, ...bars.map((x) => x.value || 0));
      content = `<div class="slide-bars">${bars.map((x) => `<div class="slide-bar-row"><span>${esc(x.label)}</span><div class="slide-track"><span class="slide-fill" style="width:${Math.round((100 * x.value) / max)}%"></span></div><b>${esc(x.value)}</b></div>`).join("")}</div>`;
    }
    if (slide.kind === "points")
      content = `<ul class="slide-points">${(slide.points || [])
        .slice(0, 5)
        .map((x) => `<li>${esc(x)}</li>`)
        .join("")}</ul>`;
    return `<section class="studio-slide theme-${esc(theme)} ${isCover ? "cover" : ""}" style="${slideStyle()}" aria-label="Slide ${index + 1}: ${esc(slide.title)}"><div class="slide-topline"><span>MICHELLE / INTELIGÊNCIA OPERACIONAL</span><span>${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}</span></div><div class="slide-main"><div class="slide-kicker">${esc(slide.kicker)}</div><h2 class="slide-title ${slide.layout?.title ? "model-positioned" : ""}" ${modelAttributes(slide, "title")}>${esc(slide.title)}</h2>${slide.subtitle ? `<p class="slide-subtitle ${slide.layout?.subtitle ? "model-positioned" : ""}" ${modelAttributes(slide, "subtitle")}>${esc(slide.subtitle)}</p>` : ""}${content ? `<div class="slide-data-block ${slide.layout?.data ? "model-positioned" : ""}" ${modelAttributes(slide, "data")}>${content}</div>` : ""}${slide.insights?.length ? `<div class="slide-insights ${slide.layout?.insights ? "model-positioned" : ""}" ${modelAttributes(slide, "insights")}><strong>Insights Operacionais</strong>${slide.insights.map((x) => `<p><b>${esc(x.title)}</b>${x.text ? " · " + esc(x.text) : ""}</p>`).join("")}</div>` : ""}</div>${elementsMarkup(slide)}${overlayMarkup(index, total)}<div class="slide-bottomline"><span>POWER BI PAINEL COMPLETO • ${st.config.period === "all" ? "TODO O PERÍODO" : st.config.period + " DIAS"}</span><span></span></div></section>`;
  }
  function page() {
    const c = st.config,
      slide = st.slides[st.selected],
      metrics = b.D.metricOptions(rec());
    return `<section class="overview-head"><div><div class="eyebrow">HORIZON / APRESENTAÇÕES</div><h1 class="title">Estúdio de Apresentações</h1><p class="subtitle">Monte seus slides, personalize e apresente na TV.</p></div></section><div class="studio-container"><div class="studio-intro"><div class="caption-over">MICHELLE CÂNDIDO</div><h2>Seus dados. Sua apresentação.</h2><p>Escolha os indicadores, revise os slides e conduza a reunião.</p></div><section class="studio-panel library-panel"><div class="panel-head"><div><h3>Biblioteca de apresentações</h3><p class="studio-hint">Criadas no aplicativo e importadas do PowerPoint.</p></div><label class="btn">Importar PowerPoint<input type="file" id="studio-pptx" accept=".pptx" hidden></label></div><div class="presentation-library">${st.library.map((p) => `<button class="library-card ${p.id === st.currentId ? "selected" : ""}" data-library-open="${p.id}"><div class="library-thumb">${p.origin === "imported" ? `<img src="${p.slides[0]?.svg}" alt="">` : `<div class="theme-${esc(p.config.theme)}"><strong>${esc(p.slides[0]?.title || p.name)}</strong><span>${p.slides.length} slides</span></div>`}</div><strong>${esc(p.name)}</strong><small>${p.origin === "imported" ? "PowerPoint importado" : "Criada no aplicativo"} · ${p.slides.length} slides</small></button>`).join("") || '<div class="empty">Sua biblioteca está pronta para a primeira apresentação.</div>'}</div></section><div class="studio-layout"><aside class="studio-controls"><section class="studio-panel"><h3>Monte sua Apresentação</h3><div class="studio-field"><label for="studio-title">Título</label><input id="studio-title" value="${esc(c.title)}"></div><div class="studio-field"><label for="studio-template">Modelo</label><select id="studio-template">${Object.entries(
      templates,
    )
      .map(
        ([k, t]) =>
          `<option value="${k}" ${c.template === k ? "selected" : ""}>${t.name}</option>`,
      )
      .join(
        "",
      )}</select><p class="studio-hint" id="studio-template-about">${templates[c.template]?.about || ""}</p></div><div class="studio-field"><label for="studio-theme-select">Tema visual</label><select id="studio-theme-select">${Object.entries(
      themes,
    )
      .map(
        ([k, v]) =>
          `<option value="${k}" ${c.theme === k ? "selected" : ""}>${v}</option>`,
      )
      .join(
        "",
      )}</select></div><div class="studio-field"><label for="studio-period">Período dos indicadores</label><select id="studio-period">${["all", 7, 30, 90, 365].map((n) => `<option value="${n}" ${c.period === n ? "selected" : ""}>${n === "all" ? "Todo o período" : n + " dias"}</option>`).join("")}</select></div><div class="studio-mini-fields"><label>De<input type="date" id="studio-start" value="${esc(c.start || "")}"></label><label>Até<input type="date" id="studio-end" value="${esc(c.end || "")}"></label></div><div class="studio-field"><label for="studio-quantity">Quantidade de slides</label><input id="studio-quantity" type="number" min="3" max="20" value="${c.quantity}"></div><div class="studio-field"><label for="studio-scope">Setores utilizados</label><select id="studio-scope"><option value="todos" ${c.scope === "todos" ? "selected" : ""}>Todos os setores</option><option value="selecionados" ${c.scope === "selecionados" ? "selected" : ""}>Selecionar setores</option></select></div><div class="studio-sector-choices" id="studio-sector-choices" ${c.scope === "todos" ? "hidden" : ""}>${sectors.map((s) => `<label><input type="checkbox" data-studio-sector="${s.id}" ${c.sectors.includes(s.id) ? "checked" : ""}>${s.name}</label>`).join("")}</div><fieldset class="metric-choices"><legend>Indicadores selecionados</legend>${metrics.map((m) => `<label><input type="checkbox" data-studio-metric="${m.id}" ${c.metricIds === null || c.metricIds.includes(m.id) ? "checked" : ""}>${esc(m.label)}</label>`).join("") || "<p>Importe dados para selecionar indicadores.</p>"}</fieldset><label class="checkbox-field"><input type="checkbox" id="studio-insights" ${c.includeInsights ? "checked" : ""}> Incluir insights após os dados</label><div class="studio-field"><label>Foco da análise<select id="studio-focus">${[
      ["equilibrado", "Visão integrada"],
      ["pendencias", "Pendências e prioridades"],
      ["resultados", "Resultados"],
      ["qualidade", "Qualidade e metas"],
    ]
      .map(
        ([k, v]) =>
          `<option value="${k}" ${c.focus === k ? "selected" : ""}>${v}</option>`,
      )
      .join(
        "",
      )}</select></label></div><div class="studio-field"><label>Nível de detalhamento<select id="studio-detail">${[
      ["resumido", "Resumido"],
      ["gerencial", "Gerencial"],
      ["detalhado", "Detalhado"],
    ]
      .map(
        ([k, v]) =>
          `<option value="${k}" ${c.detail === k ? "selected" : ""}>${v}</option>`,
      )
      .join(
        "",
      )}</select></label></div><div class="studio-field"><label>Mensagem de encerramento<textarea id="studio-notes">${esc(c.notes)}</textarea></label></div><button class="btn btn-primary" data-studio-generate ${b.getState().ready ? "" : "disabled"}>Gerar Apresentação</button></section>${settingsMarkup()}</aside><section class="studio-workspace"><section class="studio-panel"><div class="studio-preview-head"><div><h3>${slide ? "Prévia e edição" : "Prévia da apresentação"}</h3><span id="studio-save-status" class="studio-hint">${st.saveStatus || "Crie ou importe uma apresentação"}</span></div><div class="row"><button class="btn" data-studio-save ${slide ? "" : "disabled"}>Salvar</button><button class="btn btn-primary" data-studio-present ${slide ? "" : "disabled"}>Apresentar na TV</button></div></div>${st.warnings.length ? `<div class="notice import-warnings"><b>Avisos da apresentação</b>${st.warnings.map((w) => `<p>${esc(w)}</p>`).join("")}${st.fileId ? '<button class="btn" data-pptx-original>Baixar original</button>' : ""}</div>` : ""}<div class="studio-stage">${slide ? slideMarkup(slide, st.selected, st.slides.length, c.theme) : '<div class="studio-empty"><h3>Panorama da Operação</h3><p>Os slides aparecerão aqui com os dados selecionados.</p></div>'}</div><div class="studio-thumbnails">${st.slides.map((s, i) => `<button class="studio-thumb ${i === st.selected ? "active" : ""}" data-studio-slide="${i}"><span>${i + 1}</span><div class="studio-thumb-screen">${s.kind === "imported" ? `<img src="${s.svg}" alt="">` : esc(s.title)}</div></button>`).join("")}</div></section>${slide ? editorMarkup(slide) : ""}</section></div></div>${positionMarkup()}`;
  }
  function updateCurrent(field, value) {
    if (!st.slides[st.selected]) return;
    st.slides[st.selected][field] = value;
    persist().catch(() => {});
    updatePreview();
  }
  function updatePreview() {
    const slide = st.slides[st.selected];
    if (!slide) return;
    const stage = document.querySelector(".studio-stage");
    if (stage)
      stage.innerHTML = slideMarkup(
        slide,
        st.selected,
        st.slides.length,
        st.config.theme,
      );
    const thumb = document.querySelector(
      `[data-studio-slide="${st.selected}"] .studio-thumb-screen`,
    );
    if (thumb) thumb.textContent = slide.title;
  }
  function start() {
    if (!st.slides.length) return;
    finish();
    st.playing = true;
    st.position = 0;
    document.body.insertAdjacentHTML("beforeend", tvMarkup());
    document.body.classList.add("presenting");
    const el = document.getElementById("tv-presenter");
    el.focus();
    document.body.style.overflow = "hidden";
    if (el.requestFullscreen)
      el.requestFullscreen()
        .then(() => {
          st.hadFullscreen = true;
        })
        .catch(() => {
          st.hadFullscreen = false;
          b.notify(
            "Tela cheia indisponível. Slides ocupam a janela; Esc encerra.",
          );
        });
  }
  function tvMarkup() {
    return `<div class="tv-stage clean-tv" style="--tv-ratio:${st.width / st.height}" id="tv-presenter" role="dialog" tabindex="-1" aria-modal="true" aria-label="Apresentação. Setas para navegar, Esc para sair."><div class="tv-canvas transition-${esc(st.slides[st.position]?.transition || st.config.transition || "fade")}" id="tv-canvas">${slideMarkup(st.slides[st.position], st.position, st.slides.length, st.config.theme)}</div></div>`;
  }
  function refreshTv() {
    if (!st.playing) return;
    const canvas = document.getElementById("tv-canvas");
    if (!canvas) return;
    canvas.className =
      "tv-canvas transition-" +
      (st.slides[st.position]?.transition || st.config.transition || "fade");
    canvas.innerHTML = slideMarkup(
      st.slides[st.position],
      st.position,
      st.slides.length,
      st.config.theme,
    );
    canvas.style.animation = "none";
    void canvas.offsetWidth;
    canvas.style.animation = "";
  }
  function moveTv(n) {
    if (!st.playing) return;
    st.position = Math.max(0, Math.min(st.slides.length - 1, st.position + n));
    refreshTv();
  }
  function finish() {
    if (!st.playing) return;
    st.playing = false;
    document.getElementById("tv-presenter")?.remove();
    document.body.classList.remove("presenting");
    document.body.style.overflow = "";
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    st.hadFullscreen = false;
  }
  function handleClick(e) {
    const t = e.target.closest(
      "[data-studio-generate],[data-studio-slide],[data-studio-move],[data-studio-present],[data-studio-save],[data-library-open],[data-element-add],[data-element-delete],[data-element-position],[data-position-save],[data-position-cancel],[data-position-center],[data-position-nudge],[data-transition-all],[data-pptx-original]",
    );
    if (!t) return;
    if (t.matches("[data-library-open]")) {
      openPresentation(t.dataset.libraryOpen);
      return;
    }
    if (t.matches("[data-studio-save]")) {
      persist()
        .then(() => b.notify("Apresentação salva."))
        .catch(() => {});
      return;
    }
    if (t.matches("[data-studio-present]")) {
      start();
      return;
    }
    if (t.matches("[data-studio-generate]")) {
      if (st.config.scope === "selecionados" && !st.config.sectors.length) {
        b.notify("Selecione ao menos um setor.", true);
        return;
      }
      if (
        !Number.isInteger(st.config.quantity) ||
        st.config.quantity < 3 ||
        st.config.quantity > 20
      ) {
        b.notify("Escolha de 3 a 20 slides.", true);
        return;
      }
      if (st.config.start && st.config.end && st.config.start > st.config.end) {
        b.notify("Período inválido.", true);
        return;
      }
      generate();
      return;
    }
    if (t.hasAttribute("data-studio-slide")) {
      st.selected = Number(t.dataset.studioSlide);
      b.render();
      return;
    }
    if (t.hasAttribute("data-studio-move")) {
      const n = st.selected + Number(t.dataset.studioMove);
      if (n >= 0 && n < st.slides.length) {
        [st.slides[n], st.slides[st.selected]] = [
          st.slides[st.selected],
          st.slides[n],
        ];
        st.selected = n;
        persist().catch(() => {});
        b.render();
      }
      return;
    }
    if (t.matches("[data-element-add]")) {
      const type = document.getElementById("new-element-type").value;
      st.slides[st.selected].elements = st.slides[st.selected].elements || [];
      st.slides[st.selected].elements.push({
        id: crypto.randomUUID(),
        type,
        x: 10,
        y: 10,
        w: type === "text" ? 40 : 20,
        h: type === "text" ? 15 : 20,
        text: type === "text" ? "Seu texto" : type === "icon" ? "star" : "",
        fontSize: 28,
        color: "#26384b",
        image: "",
        metricId: b.D.metricOptions(rec())[0]?.id || "records",
        metricSnapshot: structuredClone(b.D.metricOptions(rec())[0]),
      });
      persist().catch(() => {});
      b.render();
      return;
    }
    if (t.matches("[data-element-delete]")) {
      const slide = st.slides[st.selected];
      slide.elements = slide.elements.filter(
        (x) => x.id !== t.dataset.elementDelete,
      );
      persist().catch(() => {});
      b.render();
      return;
    }
    if (t.matches("[data-element-position]")) {
      openPosition(t.dataset.elementPosition);
      return;
    }
    if (t.matches("[data-position-cancel]")) {
      position = null;
      document.getElementById("position-dialog").close();
      return;
    }
    if (t.matches("[data-position-save]")) {
      savePosition();
      return;
    }
    if (t.matches("[data-position-center]")) {
      position.x = (100 - position.w) / 2;
      position.y = (100 - position.h) / 2;
      refreshPosition();
      return;
    }
    if (t.hasAttribute("data-position-nudge")) {
      const [x, y] = t.dataset.positionNudge.split(",").map(Number);
      position.x += x;
      position.y += y;
      refreshPosition();
      return;
    }
    if (t.matches("[data-transition-all]")) {
      st.slides.forEach((s) => (s.transition = st.config.transition));
      persist().catch(() => {});
      b.notify("Transição aplicada a todos os slides.");
      return;
    }
    if (t.matches("[data-pptx-original]")) downloadOriginal();
  }
  function handleInput(e) {
    const el = e.target,
      c = st.config,
      ids = {
        "studio-title": "title",
        "studio-template": "template",
        "studio-period": "period",
        "studio-quantity": "quantity",
        "studio-scope": "scope",
        "studio-start": "start",
        "studio-end": "end",
        "studio-notes": "notes",
        "studio-theme-select": "theme",
        "studio-focus": "focus",
        "studio-detail": "detail",
        "studio-color": "color",
        "studio-background": "background",
        "studio-font": "font",
        "studio-transition": "transition",
      };
    if (ids[el.id]) {
      c[ids[el.id]] =
        el.id === "studio-quantity"
          ? Number(el.value)
          : el.id === "studio-period" && el.value !== "all"
            ? Number(el.value)
            : el.value;
      if (el.id === "studio-scope") {
        const field = document.getElementById("studio-sector-choices");
        if (field) field.hidden = c.scope === "todos";
      }
      persist().catch(() => {});
      updatePreview();
      if (
        e.type === "change" &&
        [
          "studio-start",
          "studio-end",
          "studio-period",
          "studio-scope",
          "studio-template",
        ].includes(el.id)
      )
        b.render();
      return;
    }
    if (el.dataset.studioSector) {
      c.sectors = sectors
        .filter(
          (s) =>
            document.querySelector(`[data-studio-sector="${s.id}"]`)?.checked,
        )
        .map((s) => s.id);
      persist().catch(() => {});
      if (e.type === "change") b.render();
      return;
    }
    if (el.dataset.studioMetric) {
      c.metricIds = [
        ...document.querySelectorAll("[data-studio-metric]:checked"),
      ].map((x) => x.dataset.studioMetric);
      persist().catch(() => {});
      return;
    }
    if (el.id === "studio-insights") {
      c.includeInsights = el.checked;
      persist().catch(() => {});
      return;
    }
    if (el.id === "studio-slide-title") {
      updateCurrent("title", el.value);
      return;
    }
    if (el.id === "studio-slide-sub") {
      updateCurrent("subtitle", el.value);
      return;
    }
    if (el.id === "studio-slide-content") {
      let slide = st.slides[st.selected],
        items = el.value.split("\n").filter((x) => x.trim());
      if (slide.kind === "points") slide.points = items;
      else if (["metrics", "bars"].includes(slide.kind))
        slide.metrics = items.map((x) => {
          let [a, ...z] = x.split("|");
          return slide.kind === "bars"
            ? { label: a.trim(), value: b.D.number(z.join("|")) || 0 }
            : { value: a.trim(), label: z.join("|").trim() };
        });
      else slide.subtitle = el.value;
      persist().catch(() => {});
      updatePreview();
      return;
    }
    if (el.id === "slide-transition") {
      st.slides[st.selected].transition = el.value;
      persist().catch(() => {});
      return;
    }
    if (el.dataset.elementId) {
      const item = st.slides[st.selected].elements.find(
        (x) => x.id === el.dataset.elementId,
      );
      if (item) {
        item[el.dataset.elementField] = ["fontSize", "w", "h"].includes(
          el.dataset.elementField,
        )
          ? Number(el.value)
          : el.value;
        item.w = Math.min(100 - item.x, Math.max(5, item.w));
        item.h = Math.min(100 - item.y, Math.max(5, item.h));
        persist().catch(() => {});
        updatePreview();
      }
      return;
    }
    if (el.id === "watermark-enabled") c.watermark.enabled = el.checked;
    else if (el.id.startsWith("watermark-") && el.id !== "watermark-image")
      c.watermark[el.id.slice(10)] = Number(el.value);
    else if (el.id === "signature-text") c.signature.text = el.value;
    else if (el.id.startsWith("signature-") && el.id !== "signature-image")
      c.signature[el.id.slice(10)] = Number(el.value);
    else if (el.id === "position-x" || el.id === "position-y") {
      if (position) {
        position[el.id.slice(9)] = Number(el.value);
        refreshPosition();
      }
      return;
    } else return;
    persist().catch(() => {});
    updatePreview();
  }
  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleInput);
  document.addEventListener("keydown", (e) => {
    if (st.playing) {
      if (
        e.key === "ArrowRight" ||
        e.key === "PageDown" ||
        e.key === " " ||
        e.key === "Enter"
      ) {
        e.preventDefault();
        moveTv(1);
      } else if (
        e.key === "ArrowLeft" ||
        e.key === "PageUp" ||
        e.key === "Backspace"
      ) {
        e.preventDefault();
        moveTv(-1);
      } else if (e.key === "Escape") {
        e.preventDefault();
        finish();
      }
    }
  });
  document.addEventListener("fullscreenchange", () => {
    if (st.playing && st.hadFullscreen && !document.fullscreenElement) finish();
  });

  const themes = {
    graphite: "Grafite · padrão",
    executivo: "Executivo",
    minimalista: "Minimalista",
    horizon: "Horizon Modern",
    corporativo: "Corporativo",
    premium: "Premium Dark",
  };
  const transitions = {
    fade: "Fade",
    slide: "Deslizamento",
    zoom: "Zoom suave",
    reveal: "Revelação gradual",
    none: "Sem transição",
  };
  let position = null,
    drag = null;
  const safeColor = (v) => (/^#[0-9a-f]{6}$/i.test(v) ? v : "");
  function slideStyle() {
    const c = st.config;
    return `--slide-accent:${safeColor(c.color) || "#58a4da"};${safeColor(c.background) ? "background:" + c.background + " !important;" : ""}font-family:${["Inter", "Arial", "Georgia", "Verdana"].includes(c.font) ? c.font : "Inter"};`;
  }
  function modelAttributes(slide, key) {
    const p = slide.layout?.[key];
    return p
      ? `data-positionable="required-${key}" style="left:${p.x}%;top:${p.y}%;width:${p.w}%;height:${p.h}%;"`
      : "";
  }
  function elementsMarkup(slide) {
    return (slide.elements || [])
      .map((el) => {
        const color = safeColor(el.color) || "#26384b";
        let body = "";
        if (el.type === "text") body = esc(el.text);
        if (el.type === "image")
          body = el.image
            ? `<img src="${el.image}" alt="${esc(el.text || "Imagem")}">`
            : "<span>Selecione uma imagem</span>";
        if (el.type === "icon") body = inlineIcon(el.text);
        if (el.type === "metric") {
          const metric = el.metricSnapshot;
          body = metric
            ? `<b>${esc(metric.value)}</b><small>${esc(metric.label)}</small>`
            : "<span>Indicador não disponível no recorte</span>";
        }
        return `<div class="slide-element type-${el.type}" data-positionable="${el.id}" style="left:${el.x}%;top:${el.y}%;width:${el.w}%;height:${el.h}%;color:${color};--element-size:${Math.min(120, Math.max(10, el.fontSize || 28)) / 16}cqw">${body}</div>`;
      })
      .join("");
  }
  function inlineIcon(name) {
    const shapes = {
      star: "M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z",
      check: "M4 12l5 5L20 5",
      arrow: "M3 12h18m-7-7 7 7-7 7",
      target:
        "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${shapes[name] || shapes.star}"/></svg>`;
  }
  function overlayMarkup(index, total) {
    const c = st.config,
      w = c.watermark,
      s = c.signature;
    return `${w.enabled && w.image ? `<img class="slide-watermark" src="${w.image}" alt="" style="opacity:${Math.min(100, Math.max(0, w.opacity)) / 100};left:${w.x}%;top:${w.y}%;">` : ""}${index === total - 1 && (s.text || s.image) ? `<div class="slide-signature" style="left:${s.x}%;top:${s.y}%;">${s.image ? `<img src="${s.image}" alt="Assinatura">` : esc(s.text)}</div>` : ""}`;
  }
  function settingsMarkup() {
    const c = st.config;
    return `<section class="studio-panel"><h3>Personalização</h3><div class="studio-mini-fields"><label>Cor dos elementos<input type="color" id="studio-color" value="${c.color || "#58a4da"}"></label><label>Fundo<input type="color" id="studio-background" value="${c.background || "#26323b"}"></label></div><label>Fonte<select id="studio-font">${["Inter", "Arial", "Georgia", "Verdana"].map((f) => `<option ${c.font === f ? "selected" : ""}>${f}</option>`).join("")}</select></label><label>Transição padrão<select id="studio-transition">${Object.entries(
      transitions,
    )
      .map(
        ([k, v]) =>
          `<option value="${k}" ${c.transition === k ? "selected" : ""}>${v}</option>`,
      )
      .join(
        "",
      )}</select></label><button class="btn section-space" data-transition-all>Aplicar a todos os slides</button><p class="studio-hint">O efeito vem configurado. Você controla o avanço dos slides.</p></section><section class="studio-panel"><h3>Marca-d'água</h3><p class="studio-hint">Uma imagem discreta no fundo dos slides para identificar a apresentação.</p><label class="checkbox-field"><input type="checkbox" id="watermark-enabled" ${c.watermark.enabled ? "checked" : ""}> Ativar marca-d'água</label><label>Imagem ou logotipo<input type="file" id="watermark-image" accept="image/png,image/jpeg,image/webp"></label><label>Transparência visual (opacidade)<input type="range" min="0" max="100" id="watermark-opacity" value="${c.watermark.opacity}"></label><div class="studio-mini-fields"><label>Horizontal (%)<input type="number" id="watermark-x" min="0" max="85" value="${c.watermark.x}"></label><label>Vertical (%)<input type="number" id="watermark-y" min="0" max="85" value="${c.watermark.y}"></label></div></section><section class="studio-panel"><h3>Assinatura final</h3><label>Texto<input id="signature-text" value="${esc(c.signature.text)}"></label><label>Ou imagem<input type="file" id="signature-image" accept="image/png,image/jpeg,image/webp"></label><div class="studio-mini-fields"><label>Horizontal (%)<input type="number" id="signature-x" min="0" max="80" value="${c.signature.x}"></label><label>Vertical (%)<input type="number" id="signature-y" min="0" max="90" value="${c.signature.y}"></label></div></section>`;
  }
  function editorMarkup(slide) {
    const metricOptions = st.metricOptions || b.D.metricOptions(rec());
    return `<section class="studio-panel"><div class="panel-head"><h3>Editar slide ${st.selected + 1}</h3><div class="row"><button class="btn" data-studio-move="-1" ${st.selected ? "" : "disabled"}>← Mover</button><button class="btn" data-studio-move="1" ${st.selected < st.slides.length - 1 ? "" : "disabled"}>Mover →</button></div></div><div class="studio-field"><label>Título<input id="studio-slide-title" value="${esc(slide.title)}"></label></div><div class="studio-field"><label>Subtítulo<input id="studio-slide-sub" value="${esc(slide.subtitle || "")}"></label></div>${slide.kind !== "imported" ? `<div class="studio-field"><label>Mensagem / textos complementares<textarea id="studio-slide-content">${esc(slide.kind === "points" ? (slide.points || []).join("\n") : ["bars", "metrics"].includes(slide.kind) ? (slide.metrics || []).map((m) => (slide.kind === "bars" ? m.label + " | " + m.value : m.value + " | " + m.label)).join("\n") : slide.subtitle || "")}</textarea></label></div>` : '<p class="studio-hint">O conteúdo importado mantém a composição do arquivo. Adicione elementos por cima; o original permanece preservado.</p>'}${
      slide.kind !== "imported"
        ? `<div class="required-positions"><p class="studio-hint">Posicionar componentes do modelo</p>${[
            ["title", "Título"],
            ["subtitle", "Subtítulo"],
            ["data", "Dados"],
            ["insights", "Insights"],
          ]
            .filter(([k]) => k !== "insights" || slide.insights?.length)
            .filter(
              ([k]) => k !== "data" || !["cover", "final"].includes(slide.kind),
            )
            .map(
              ([k, label]) =>
                `<button class="btn" data-element-position="required-${k}" aria-label="Posicionar ${label}"><span aria-hidden="true">✥</span> ${label}</button>`,
            )
            .join("")}</div>`
        : ""
    }<label>Transição deste slide<select id="slide-transition">${Object.entries(
      transitions,
    )
      .map(
        ([k, v]) =>
          `<option value="${k}" ${slide.transition === k ? "selected" : ""}>${v}</option>`,
      )
      .join(
        "",
      )}</select></label><div class="add-element"><select id="new-element-type"><option value="text">Texto</option><option value="image">Imagem</option><option value="icon">Ícone</option><option value="metric">Gráfico ou indicador</option></select><button class="btn" data-element-add>+ Adicionar Elemento</button></div><div class="element-list">${(
      slide.elements || []
    )
      .map(
        (el) =>
          `<article class="element-editor"><div class="panel-head"><strong>${{ text: "Texto", image: "Imagem", icon: "Ícone", metric: "Indicador" }[el.type]}</strong><div class="row"><button class="btn position-button" data-element-position="${el.id}" aria-label="Posicionar elemento"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4M18 8l4 4-4 4"/></svg></button><button class="btn" data-element-delete="${el.id}" aria-label="Excluir elemento">Excluir</button></div></div>${
            el.type === "text"
              ? `<textarea data-element-id="${el.id}" data-element-field="text">${esc(el.text)}</textarea>`
              : el.type === "image"
                ? `<input type="file" data-element-image="${el.id}" accept="image/png,image/jpeg,image/webp">`
                : el.type === "icon"
                  ? `<select data-element-id="${el.id}" data-element-field="text">${[
                      ["star", "Estrela"],
                      ["check", "Confirmação"],
                      ["arrow", "Seta"],
                      ["target", "Meta"],
                    ]
                      .map(
                        ([k, v]) =>
                          `<option value="${k}" ${el.text === k ? "selected" : ""}>${v}</option>`,
                      )
                      .join("")}</select>`
                  : `<select data-element-metric="${el.id}">${metricOptions.map((m) => `<option value="${m.id}" ${el.metricId === m.id ? "selected" : ""}>${esc(m.label)}</option>`).join("")}</select>`
          }<div class="studio-mini-fields"><label>Cor<input type="color" data-element-id="${el.id}" data-element-field="color" value="${el.color}"></label><label>Fonte<input type="number" min="10" max="120" data-element-id="${el.id}" data-element-field="fontSize" value="${el.fontSize}"></label><label>Largura (%)<input type="number" min="5" max="100" data-element-id="${el.id}" data-element-field="w" value="${el.w}"></label><label>Altura (%)<input type="number" min="5" max="100" data-element-id="${el.id}" data-element-field="h" value="${el.h}"></label></div></article>`,
      )
      .join("")}</div></section>`;
  }
  function positionMarkup() {
    return `<dialog id="position-dialog" aria-labelledby="position-title"><div class="panel-head"><h3 id="position-title">Posicionar elemento</h3><button class="btn" data-position-cancel>Cancelar</button></div><p>Arraste o elemento ou use as setas. As guias ajudam a centralizar.</p><div class="position-preview" id="position-preview" style="--position-ratio:${st.width / st.height}"></div><div class="position-tools"><button class="btn" data-position-nudge="0,-1" aria-label="Mover acima">↑</button><button class="btn" data-position-nudge="-1,0" aria-label="Mover esquerda">←</button><button class="btn" data-position-center>Centralizar</button><button class="btn" data-position-nudge="1,0" aria-label="Mover direita">→</button><button class="btn" data-position-nudge="0,1" aria-label="Mover abaixo">↓</button><label>X (%)<input type="number" id="position-x" step="0.1" min="0" max="100"></label><label>Y (%)<input type="number" id="position-y" step="0.1" min="0" max="100"></label><button class="btn btn-primary" data-position-save>Salvar posição</button></div></dialog>`;
  }
  function openPosition(id) {
    const slide = st.slides[st.selected],
      key = id.startsWith("required-") ? id.slice(9) : null,
      item = key
        ? slide.layout?.[key] || {
            id,
            key,
            x: 6,
            y: { title: 25, subtitle: 40, data: 48, insights: 75 }[key],
            w: 88,
            h: { title: 13, subtitle: 8, data: 27, insights: 19 }[key],
          }
        : slide.elements.find((x) => x.id === id);
    if (!item) return;
    position = structuredClone(item);
    refreshPosition();
    const dialog = document.getElementById("position-dialog");
    dialog.showModal();
    dialog.addEventListener(
      "cancel",
      () => {
        position = null;
      },
      { once: true },
    );
  }
  function refreshPosition() {
    if (!position) return;
    position.x = Math.min(
      100 - position.w,
      Math.max(0, Math.round(position.x * 10) / 10),
    );
    position.y = Math.min(
      100 - position.h,
      Math.max(0, Math.round(position.y * 10) / 10),
    );
    const clone = structuredClone(st.slides[st.selected]);
    if (position.key)
      clone.layout = { ...clone.layout, [position.key]: position };
    else
      clone.elements = clone.elements.map((x) =>
        x.id === position.id ? position : x,
      );
    const preview = document.getElementById("position-preview");
    preview.innerHTML =
      slideMarkup(clone, st.selected, st.slides.length, st.config.theme) +
      '<i class="guide-horizontal"></i><i class="guide-vertical"></i>';
    document.getElementById("position-x").value = position.x;
    document.getElementById("position-y").value = position.y;
  }
  function savePosition() {
    if (!position) return;
    const slide = st.slides[st.selected];
    if (position.key)
      slide.layout = { ...slide.layout, [position.key]: position };
    else {
      const i = slide.elements.findIndex((x) => x.id === position.id);
      slide.elements[i] = position;
    }
    position = null;
    document.getElementById("position-dialog").close();
    persist().catch(() => {});
    updatePreview();
  }
  async function openPresentation(id) {
    try {
      await st.saveQueue;
      const item = await b.S.read("presentations", id);
      if (!item) throw Error("Apresentação não encontrada.");
      st.currentId = item.id;
      st.created = item.created;
      st.origin = item.origin;
      st.fileId = item.fileId;
      st.config = { ...defaultConfig(), ...item.config };
      if (!Array.isArray(st.config.metricIds)) st.config.metricIds = null;
      st.slides = structuredClone(item.slides);
      st.selected = 0;
      st.width = item.width || 1600;
      st.height = item.height || 900;
      st.warnings = item.warnings || [];
      st.generatedAt = item.generatedAt;
      st.metricOptions = item.metricOptions || [];
      st.saveStatus = "Alterações salvas";
      b.render();
    } catch (e) {
      b.notify(e.message, true);
    }
  }
  async function reload() {
    st.library = (await b.S.all("presentations")).sort((a, z) =>
      String(z.updated).localeCompare(String(a.updated)),
    );
  }
  async function importPptx(file) {
    if (!file) return;
    try {
      b.notify("Processando o PowerPoint...");
      const result = await window.MCPowerPoint.importFile(file),
        id = crypto.randomUUID(),
        fileId = crypto.randomUUID(),
        item = {
          id,
          name: file.name.replace(/\.pptx$/i, ""),
          origin: "imported",
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          fileId,
          config: {
            ...defaultConfig(),
            title: file.name.replace(/\.pptx$/i, ""),
          },
          slides: result.slides,
          width: result.width,
          height: result.height,
          warnings: result.warnings,
        };
      await b.S.batch([
        {
          store: "files",
          value: { id: fileId, name: file.name, bytes: result.bytes },
        },
        { store: "presentations", value: item },
      ]);
      await reload();
      await openPresentation(id);
      b.notify(`${result.slides.length} slides incorporados à biblioteca.`);
    } catch (e) {
      b.notify("Não foi possível importar o PowerPoint: " + e.message, true);
    }
  }
  async function downloadOriginal() {
    try {
      const f = await b.S.read("files", st.fileId);
      if (!f) throw Error("Original não encontrado.");
      const url = URL.createObjectURL(new Blob([f.bytes])),
        a = document.createElement("a");
      a.href = url;
      a.download = f.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      b.notify(e.message, true);
    }
  }
  async function readImage(file) {
    if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type))
      throw Error("Selecione uma imagem PNG, JPG ou WebP.");
    if (file.size > 5 * 1024 * 1024) throw Error("Limite de 5 MB por imagem.");
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(Error("Não foi possível ler a imagem."));
      r.readAsDataURL(file);
    });
  }
  document.addEventListener("change", async (e) => {
    const el = e.target;
    try {
      if (el.id === "studio-pptx") {
        await importPptx(el.files[0]);
        return;
      }
      if (el.id === "watermark-image")
        st.config.watermark.image = await readImage(el.files[0]);
      else if (el.id === "signature-image")
        st.config.signature.image = await readImage(el.files[0]);
      else if (el.dataset.elementImage) {
        const item = st.slides[st.selected].elements.find(
          (x) => x.id === el.dataset.elementImage,
        );
        item.image = await readImage(el.files[0]);
      } else if (el.dataset.elementMetric) {
        const item = st.slides[st.selected].elements.find(
          (x) => x.id === el.dataset.elementMetric,
        );
        item.metricId = el.value;
        item.metricSnapshot = structuredClone(
          (st.metricOptions || b.D.metricOptions(rec())).find(
            (x) => x.id === el.value,
          ),
        );
      } else return;
      await persist();
      updatePreview();
    } catch (e) {
      b.notify(e.message, true);
    }
  });
  document.addEventListener("pointerdown", (e) => {
    if (!position) return;
    const el = e.target.closest(`[data-positionable="${position.id}"]`);
    if (!el || !el.closest("#position-preview")) return;
    e.preventDefault();
    const rect = document
      .getElementById("position-preview")
      .getBoundingClientRect();
    drag = {
      startX: e.clientX,
      startY: e.clientY,
      x: position.x,
      y: position.y,
      rect,
    };
    document
      .getElementById("position-preview")
      .setPointerCapture?.(e.pointerId);
  });
  document.addEventListener("pointermove", (e) => {
    if (!drag || !position) return;
    position.x = drag.x + ((e.clientX - drag.startX) / drag.rect.width) * 100;
    position.y = drag.y + ((e.clientY - drag.startY) / drag.rect.height) * 100;
    if (Math.abs(position.x + position.w / 2 - 50) < 1)
      position.x = (100 - position.w) / 2;
    if (Math.abs(position.y + position.h / 2 - 50) < 1)
      position.y = (100 - position.h) / 2;
    refreshPosition();
  });
  document.addEventListener("pointerup", () => (drag = null));
  async function init() {
    try {
      await reload();
      if (!st.library.length) {
        const old = JSON.parse(localStorage.getItem(KEY) || "null");
        if (old?.slides?.length) {
          st.config = {
            ...defaultConfig(),
            ...old.config,
            theme: old.config?.theme || "graphite",
          };
          st.slides = old.slides.map((s) => ({
            ...s,
            elements: [],
            transition: "fade",
          }));
          st.generatedAt = old.generatedAt;
          st.warnings = [
            "Apresentação migrada da versão anterior. Os números são os que foram gravados naquela versão; confira a fonte antes de usá-los.",
          ];
          await persist();
        }
      }
      st.ready = true;
      if (b.getState().page === "present") b.render();
    } catch (e) {
      b.notify("Não foi possível carregar a biblioteca: " + e.message, true);
    }
  }

  window.MichelleStudio = {
    reload,
    importPptx,
    openPresentation,
    persist,
    start,
    finish,
    moveTv,
    getState: () => st,
    page,
    generate,
    getSlides: () => st.slides,
  };
  init();
  if (b.getState().page === "present") b.render();
})();
