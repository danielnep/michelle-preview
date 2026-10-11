/* Leitor OOXML local. Preserva o original; sinaliza os recursos sem renderização fiel. */
(function (root) {
  "use strict";
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c],
    );
  const descendants = (n, name) =>
      Array.from(n?.getElementsByTagNameNS("*", name) || []),
    first = (n, name) => descendants(n, name)[0],
    children = (n, name) =>
      Array.from(n?.children || n?.childNodes || []).filter(
        (c) => c.nodeType === 1 && (!name || c.localName === name),
      ),
    attr = (n, k, def = "") => n?.getAttribute(k) ?? def,
    num = (n, k, def = 0) => Number(attr(n, k, def)),
    text = (n) => n?.textContent || "",
    rid = (n) =>
      n?.getAttributeNS(
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        "id",
      ) || n?.getAttribute("r:id");
  const path = (base, target) => {
    if (target.startsWith("/")) return target.slice(1);
    const parts = (base.slice(0, base.lastIndexOf("/") + 1) + target).split(
        "/",
      ),
      out = [];
    for (const p of parts) {
      if (p === "..") out.pop();
      else if (p && p !== ".") out.push(p);
    }
    return out.join("/");
  };
  const relPath = (p) =>
    p.slice(0, p.lastIndexOf("/") + 1) +
    "_rels/" +
    p.slice(p.lastIndexOf("/") + 1) +
    ".rels";
  const decode = (s) => btoa(unescape(encodeURIComponent(s)));
  async function importFile(file) {
    if (!/\.pptx$/i.test(file.name))
      throw Error("Selecione um arquivo PowerPoint .pptx.");
    if (file.size > 50 * 1024 * 1024)
      throw Error("Limite de 50 MB por apresentação.");
    const bytes = await file.arrayBuffer(),
      zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
    const entries = Object.values(zip.files);
    if (
      entries.length > 10000 ||
      entries.reduce((n, f) => n + (f._data?.uncompressedSize || 0), 0) >
        256 * 1024 * 1024
    )
      throw Error("Apresentação muito grande após descompactação.");
    const cache = new Map(),
      warnings = new Set([
        "Fontes, quebras de linha e formatação de texto podem variar. O arquivo original permanece intacto.",
      ]);
    async function xml(p) {
      if (!p) return null;
      if (cache.has(p)) return cache.get(p);
      if (!zip.file(p)) return null;
      const doc = new DOMParser().parseFromString(
        await zip.file(p).async("string"),
        "application/xml",
      );
      if (first(doc, "parsererror"))
        throw Error("XML inválido no PowerPoint: " + p);
      cache.set(p, doc);
      return doc;
    }
    async function rels(p) {
      const doc = await xml(relPath(p)),
        m = new Map();
      for (const r of descendants(doc, "Relationship")) {
        if (attr(r, "TargetMode") === "External") {
          warnings.add("Vínculos externos não são carregados.");
          continue;
        }
        m.set(attr(r, "Id"), {
          path: path(p, attr(r, "Target")),
          type: attr(r, "Type").split("/").at(-1),
        });
      }
      return m;
    }
    const presentation = await xml("ppt/presentation.xml");
    if (!presentation)
      throw Error("O arquivo não contém uma apresentação PPTX válida.");
    const size = first(presentation, "sldSz"),
      W = num(size, "cx", 12192000) / 9525,
      H = num(size, "cy", 6858000) / 9525,
      pr = await rels("ppt/presentation.xml"),
      themeDoc = await xml("ppt/theme/theme1.xml"),
      scheme = first(themeDoc, "clrScheme"),
      colors = {
        dk1: "000000",
        lt1: "FFFFFF",
        dk2: "1F2937",
        lt2: "F3F4F6",
        accent1: "328EDD",
        accent2: "22AA99",
        accent3: "D99A38",
        accent4: "8B6ED8",
        accent5: "D9676B",
        accent6: "50A6AC",
        tx1: "000000",
        bg1: "FFFFFF",
      };
    for (const c of children(scheme)) {
      const v = children(c)[0];
      colors[c.localName] = attr(v, "val", attr(v, "lastClr", "000000"));
    }
    colors.tx1 = colors.dk1;
    colors.bg1 = colors.lt1;
    colors.tx2 = colors.dk2;
    colors.bg2 = colors.lt2;
    const defaultFont = attr(
      first(first(themeDoc, "minorFont"), "latin"),
      "typeface",
      "Arial",
    );
    function color(n, def = "#26384b") {
      const c = children(n).find((x) =>
        ["srgbClr", "schemeClr", "sysClr", "prstClr"].includes(x.localName),
      );
      if (!c) return def;
      let v =
        c.localName === "schemeClr"
          ? colors[attr(c, "val")]
          : c.localName === "sysClr"
            ? attr(c, "lastClr")
            : attr(c, "val");
      if (!v) return def;
      if (/^[0-9a-f]{6}$/i.test(v)) v = "#" + v;
      else if (!/^[a-z]+$/i.test(v)) return def;
      const lum = num(first(c, "lumMod"), "val", 100000) / 100000,
        off = num(first(c, "lumOff"), "val", 0) / 100000;
      if (/^#[0-9a-f]{6}$/i.test(v) && (lum !== 1 || off)) {
        let rgb = v
          .slice(1)
          .match(/../g)
          .map((x) =>
            Math.round(Math.min(255, parseInt(x, 16) * lum + 255 * off)),
          );
        v = "#" + rgb.map((x) => x.toString(16).padStart(2, "0")).join("");
      }
      return v;
    }
    function fill(n) {
      if (first(n, "noFill")) return "none";
      const solid = first(n, "solidFill");
      if (solid) return color(solid);
      const gradient = first(n, "gradFill");
      if (gradient) {
        warnings.add("Gradientes são renderizados com a cor inicial.");
        return color(first(gradient, "gs"));
      }
      return "none";
    }
    function box(shape, inherit) {
      const x =
          first(
            first(shape, "spPr") || first(shape, "xfrm")?.parentNode || shape,
            "xfrm",
          ) || first(inherit, "xfrm"),
        off = first(x, "off"),
        ext = first(x, "ext");
      return {
        x: num(off, "x") / 9525,
        y: num(off, "y") / 9525,
        w: num(ext, "cx", 914400) / 9525,
        h: num(ext, "cy", 457200) / 9525,
        rot: num(x, "rot") / 60000,
        flipH: attr(x, "flipH") === "1",
        flipV: attr(x, "flipV") === "1",
      };
    }
    async function image(p) {
      if (!p || !zip.file(p)) return "";
      const ext = p.split(".").at(-1).toLowerCase(),
        mime = {
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          gif: "image/gif",
          webp: "image/webp",
        }[ext];
      if (!mime) {
        warnings.add(
          `Imagem ${ext.toUpperCase()} sem renderização: o original foi preservado.`,
        );
        return "";
      }
      return `data:${mime};base64,${await zip.file(p).async("base64")}`;
    }
    function paragraphs(shape, b, inherit) {
      const body = first(shape, "txBody") || first(inherit, "txBody");
      if (!body) return "";
      const bp = first(body, "bodyPr"),
        left = num(bp, "lIns", 91440) / 9525,
        right = num(bp, "rIns", 91440) / 9525,
        top = num(bp, "tIns", 45720) / 9525,
        bottom = num(bp, "bIns", 45720) / 9525,
        width = Math.max(5, b.w - left - right),
        lines = [];
      for (const p of children(body, "p")) {
        const pp = first(p, "pPr"),
          def =
            first(pp, "defRPr") || first(first(inherit, "txBody"), "defRPr"),
          runs = children(p).filter(
            (r) => r.localName === "r" || r.localName === "fld",
          );
        const size =
            (num(first(runs[0], "rPr") || def, "sz", 1800) * 96) / 7200,
          words = runs.map((r) => text(first(r, "t"))).join("");
        const maxChars = Math.max(1, Math.floor(width / (size * 0.53)));
        const pieces = words.split(/\s+/),
          wrapped = [];
        let line = "";
        for (const word of pieces) {
          if ((line + " " + word).trim().length > maxChars && line) {
            wrapped.push(line);
            line = word;
          } else line = (line + " " + word).trim();
        }
        wrapped.push(line);
        for (const line of wrapped) {
          const rp = first(runs[0], "rPr") || def;
          lines.push({
            line,
            size,
            align: attr(pp, "algn", "l"),
            bold: attr(rp, "b") === "1",
            italic: attr(rp, "i") === "1",
            color: color(first(rp, "solidFill")),
            font: attr(first(rp, "latin"), "typeface", defaultFont),
            bullet: !!first(pp, "buChar"),
          });
        }
      }
      const height = lines.reduce((n, l) => n + l.size * 1.25, 0),
        anchor = attr(bp, "anchor", "t"),
        offset =
          anchor === "ctr"
            ? (b.h - height) / 2
            : anchor === "b"
              ? b.h - bottom - height
              : top;
      let y = Math.max(top, offset);
      return lines
        .map((l) => {
          y += l.size;
          const x =
            l.align === "ctr" ? b.w / 2 : l.align === "r" ? b.w - right : left;
          const out = `<text x="${x}" y="${y}" font-size="${l.size}" font-family="${esc(l.font)}" fill="${esc(l.color)}" font-weight="${l.bold ? "700" : "400"}" font-style="${l.italic ? "italic" : "normal"}" text-anchor="${l.align === "ctr" ? "middle" : l.align === "r" ? "end" : "start"}">${esc((l.bullet ? "• " : "") + l.line)}</text>`;
          y += l.size * 0.25;
          return out;
        })
        .join("");
    }
    async function chart(p, b) {
      warnings.add(
        "Os gráficos são reconstruídos com os valores armazenados no arquivo; estilos podem variar.",
      );
      const doc = await xml(p);
      if (!doc) return "";
      const plot = first(doc, "plotArea"),
        type = children(plot).find((x) => /Chart$/.test(x.localName)),
        series = descendants(type, "ser").map((s, i) => {
          const vals = descendants(
              first(s, "val") || first(s, "yVal"),
              "pt",
            ).map((pt) => Number(text(first(pt, "v"))) || 0),
            cats = descendants(first(s, "cat") || first(s, "xVal"), "pt").map(
              (pt) => text(first(pt, "v")),
            ),
            name = text(first(first(s, "tx"), "v")) || `Série ${i + 1}`;
          return {
            vals,
            cats,
            name,
            color: ["#328edd", "#22aa99", "#d99a38", "#8b6ed8", "#d9676b"][
              i % 5
            ],
          };
        }),
        cw = b.w,
        ch = b.h,
        left = 36,
        bottom = 35,
        top = 15,
        max = Math.max(0, ...series.flatMap((s) => s.vals)),
        min = Math.min(0, ...series.flatMap((s) => s.vals)),
        span = max - min || 1,
        n = Math.max(1, ...series.map((s) => s.vals.length));
      const yValue = (value) =>
        top + ((max - value) / span) * (ch - bottom - top);
      const zero = yValue(0);
      let out = `<rect width="${cw}" height="${ch}" fill="white"/><path d="M${left} ${top}V${ch - bottom}H${cw - 8}" fill="none" stroke="#ccd5dd"/>`;
      if (min < 0)
        out += `<path d="M${left} ${zero}H${cw - 8}" fill="none" stroke="#8898a8"/>`;
      if (
        type?.localName === "pieChart" ||
        type?.localName === "doughnutChart"
      ) {
        let a = 0,
          s = series[0],
          sum = s?.vals.reduce((n, v) => n + v, 0) || 1,
          cx = cw * 0.45,
          cy = ch * 0.48,
          r = Math.min(cw, ch) * 0.33;
        for (let i = 0; i < (s?.vals.length || 0); i++) {
          const next = a + (s.vals[i] / sum) * Math.PI * 2,
            x1 = cx + r * Math.cos(a),
            y1 = cy + r * Math.sin(a),
            x2 = cx + r * Math.cos(next),
            y2 = cy + r * Math.sin(next);
          out +=
            s.vals[i] === sum
              ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${series[0].color}"/>`
              : `<path d="M${cx} ${cy}L${x1} ${y1}A${r} ${r} 0 ${next - a > Math.PI ? 1 : 0} 1 ${x2} ${y2}Z" fill="${["#328edd", "#22aa99", "#d99a38", "#8b6ed8", "#d9676b"][i % 5]}"/>`;
          a = next;
        }
        if (type.localName === "doughnutChart")
          out += `<circle cx="${cx}" cy="${cy}" r="${r * 0.5}" fill="white"/>`;
      } else if (
        type?.localName === "lineChart" ||
        type?.localName === "areaChart"
      ) {
        series.forEach((s) => {
          out += `<polyline points="${s.vals.map((v, i) => `${left + (i / Math.max(n - 1, 1)) * (cw - left - 12)},${yValue(v)}`).join(" ")}" fill="none" stroke="${s.color}" stroke-width="3"/>`;
        });
      } else {
        if (type?.localName !== "barChart")
          warnings.add(
            "Um gráfico avançado foi convertido para barras usando os valores do arquivo.",
          );
        series.forEach((s, j) =>
          s.vals.forEach((v, i) => {
            const w = ((cw - left - 15) / n / Math.max(1, series.length)) * 0.8,
              x = left + (i * (cw - left - 15)) / n + j * w,
              y = yValue(v),
              h = Math.abs(zero - y);
            out += `<rect x="${x}" y="${Math.min(zero, y)}" width="${w}" height="${h}" fill="${s.color}"/>`;
          }),
        );
      }
      for (let i = 0; i < Math.min(n, 12); i++)
        out += `<text x="${left + (i * (cw - left - 15)) / n}" y="${ch - 12}" font-size="10" fill="#536270">${esc((series[0]?.cats[i] || String(i + 1)).slice(0, 12))}</text>`;
      out += `<text x="${left}" y="12" font-size="10" fill="#536270">${series.map((s) => esc(s.name)).join(" · ")}</text>`;
      return out;
    }
    async function shapes(tree, relationships, layout) {
      let out = "";
      for (const s of children(tree)) {
        const kind = s.localName;
        if (["nvGrpSpPr", "grpSpPr", "extLst"].includes(kind)) continue;
        if (kind === "grpSp") {
          const x = first(s, "xfrm"),
            off = first(x, "off"),
            ext = first(x, "ext"),
            co = first(x, "chOff"),
            ce = first(x, "chExt"),
            sx = num(ext, "cx", 1) / num(ce, "cx", 1),
            sy = num(ext, "cy", 1) / num(ce, "cy", 1);
          out += `<g transform="translate(${num(off, "x") / 9525} ${num(off, "y") / 9525}) scale(${sx} ${sy}) translate(${-num(co, "x") / 9525} ${-num(co, "y") / 9525})">${await shapes(s, relationships, layout)}</g>`;
          continue;
        }
        const ph = first(s, "ph"),
          inherit = ph
            ? descendants(layout, "sp").find(
                (x) =>
                  attr(first(x, "ph"), "idx", "0") === attr(ph, "idx", "0") &&
                  attr(first(x, "ph"), "type", "body") ===
                    attr(ph, "type", "body"),
              )
            : null,
          b = box(s, inherit),
          center = `rotate(${b.rot} ${b.w / 2} ${b.h / 2})`,
          flip =
            b.flipH || b.flipV
              ? `translate(${b.flipH ? b.w : 0} ${b.flipV ? b.h : 0}) scale(${b.flipH ? -1 : 1} ${b.flipV ? -1 : 1})`
              : "";
        let content = "";
        const sp = first(s, "spPr");
        if (kind === "pic") {
          if (first(s, "srcRect"))
            warnings.add(
              "Recorte de imagem do PowerPoint pode variar na visualização.",
            );
          const blip = first(s, "blip"),
            id =
              blip?.getAttributeNS(
                "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
                "embed",
              ) || attr(blip, "r:embed"),
            uri = await image(relationships.get(id)?.path);
          if (uri)
            content = `<image width="${b.w}" height="${b.h}" href="${uri}" preserveAspectRatio="none"/>`;
        } else if (kind === "sp" || kind === "cxnSp") {
          const f = fill(sp),
            ln = first(sp, "ln"),
            stroke =
              ln && !first(ln, "noFill")
                ? color(first(ln, "solidFill"))
                : "none",
            sw = num(ln, "w", 12700) / 9525,
            geometry = attr(first(sp, "prstGeom"), "prst", "rect");
          if (geometry === "ellipse")
            content = `<ellipse cx="${b.w / 2}" cy="${b.h / 2}" rx="${b.w / 2}" ry="${b.h / 2}" fill="${f}" stroke="${stroke}" stroke-width="${sw}"/>`;
          else if (kind === "cxnSp" || geometry === "line")
            content = `<line x1="0" y1="0" x2="${b.w}" y2="${b.h}" stroke="${stroke === "none" ? "#596879" : stroke}" stroke-width="${sw}"/>`;
          else {
            if (!["rect", "roundRect"].includes(geometry))
              warnings.add(
                `A forma ${geometry} foi aproximada por um retângulo.`,
              );
            content = `<rect width="${b.w}" height="${b.h}" rx="${geometry === "roundRect" ? Math.min(b.w, b.h) * 0.1 : 0}" fill="${f}" stroke="${stroke}" stroke-width="${sw}"/>`;
          }
          content += paragraphs(s, b, inherit);
        } else if (kind === "graphicFrame") {
          const g = first(s, "graphicData"),
            c = first(g, "chart"),
            tbl = first(g, "tbl");
          if (c) content = await chart(relationships.get(rid(c))?.path, b);
          else if (tbl) {
            const rows = children(tbl, "tr"),
              widths = children(first(tbl, "tblGrid"), "gridCol").map(
                (c) => num(c, "w") / 9525,
              );
            let y = 0;
            for (const row of rows) {
              const h = num(row, "h", 457200) / 9525;
              let x = 0;
              for (const [i, cell] of children(row, "tc").entries()) {
                const w = widths[i] || b.w / Math.max(1, widths.length);
                content += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill(first(cell, "tcPr")) === "none" ? "#f5f7fa" : fill(first(cell, "tcPr"))}" stroke="#c8d2db"/><g transform="translate(${x} ${y})">${paragraphs(cell, { w, h })}</g>`;
                x += w;
              }
              y += h;
            }
          } else
            warnings.add(
              "SmartArt / objeto incorporado sem renderização: original preservado.",
            );
        } else {
          warnings.add(
            `Elemento ${kind} sem renderização: original preservado.`,
          );
        }
        out += `<g transform="translate(${b.x} ${b.y}) ${center} ${flip}">${content}</g>`;
      }
      return out;
    }
    const ids = descendants(presentation, "sldId");
    if (ids.length > 200) throw Error("Limite de 200 slides por apresentação.");
    const slides = [];
    for (let i = 0; i < ids.length; i++) {
      const p = pr.get(rid(ids[i]))?.path;
      if (!p) throw Error("Referência de slide ausente.");
      const doc = await xml(p),
        rr = await rels(p),
        layoutPath = [...rr.values()].find(
          (r) => r.type === "slideLayout",
        )?.path,
        layout = layoutPath ? await xml(layoutPath) : null,
        lr = layoutPath ? await rels(layoutPath) : new Map(),
        masterPath = [...lr.values()].find(
          (r) => r.type === "slideMaster",
        )?.path,
        master = masterPath ? await xml(masterPath) : null,
        mr = masterPath ? await rels(masterPath) : new Map();
      const background =
          first(doc, "bg") || first(layout, "bg") || first(master, "bg"),
        bg = fill(background),
        bgBlip = first(background, "blip"),
        bgId = bgBlip?.getAttributeNS(
          "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
          "embed",
        ),
        bgUri = bgId
          ? await image(
              rr.get(bgId)?.path || lr.get(bgId)?.path || mr.get(bgId)?.path,
            )
          : "";
      let content = `<rect width="${W}" height="${H}" fill="${bg === "none" ? "#fff" : bg}"/>${bgUri ? `<image width="${W}" height="${H}" href="${bgUri}" preserveAspectRatio="none"/>` : ""}`;
      for (const [layer, relsMap] of [
        [master, mr],
        [layout, lr],
      ]) {
        const tree = first(layer, "spTree");
        if (tree) {
          const clone = tree.cloneNode(true);
          for (const shape of children(clone))
            if (first(shape, "ph")) shape.remove();
          content += await shapes(clone, relsMap, null);
        }
      }
      content += await shapes(first(doc, "spTree"), rr, layout);
      if (first(doc, "timing"))
        warnings.add("Animações internas do PowerPoint não são reproduzidas.");
      const title =
          descendants(doc, "t").map(text).find(Boolean) || `Slide ${i + 1}`,
        svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${content}</svg>`;
      slides.push({
        id: crypto.randomUUID(),
        kind: "imported",
        title: title.slice(0, 120),
        svg: "data:image/svg+xml;base64," + decode(svg),
        transition: "fade",
        elements: [],
      });
    }
    if (!slides.length) throw Error("A apresentação não contém slides.");
    return { bytes, width: W, height: H, slides, warnings: [...warnings] };
  }
  root.MCPowerPoint = { importFile };
})(typeof window !== "undefined" ? window : globalThis);
