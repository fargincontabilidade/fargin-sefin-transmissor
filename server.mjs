import http from "node:http";
import https from "node:https";

const PORT = Number(process.env.PORT || 10000);
const RELAY_SECRET = process.env.RELAY_SECRET || "";
const SEFIN_URL =
  process.env.SEFIN_URL ||
  "https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional/nfse";

function responder(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    const partes = [];
    req.on("data", (parte) => partes.push(parte));
    req.on("end", () => resolve(Buffer.concat(partes)));
    req.on("error", reject);
  });
}

function enviarSefin(payload, pfx, senha) {
  return new Promise((resolve, reject) => {
    const url = new URL(SEFIN_URL);

    const requisicao = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: "POST",
        pfx,
        passphrase: senha,
        minVersion: "TLSv1.2",
        rejectUnauthorized: true,
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          "content-length": Buffer.byteLength(payload),
        },
      },
      (retorno) => {
        const partes = [];
        retorno.on("data", (parte) => partes.push(parte));
        retorno.on("end", () =>
          resolve({
            status: retorno.statusCode || 502,
            tipo: retorno.headers["content-type"] || "application/json",
            corpo: Buffer.concat(partes),
          }),
        );
      },
    );

    requisicao.setTimeout(45000, () =>
      requisicao.destroy(new Error("Tempo limite excedido na SEFIN.")),
    );
    requisicao.on("error", reject);
    requisicao.end(payload);
  });
}

const servidor = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return responder(res, 200, {
      ok: true,
      service: "fargin-sefin-transmissor",
      environment: "homologacao",
    });
  }

  if (req.method !== "POST" || req.url !== "/nfse") {
    return responder(res, 404, { error: "Rota não encontrada." });
  }

  if (
    !RELAY_SECRET ||
    req.headers.authorization !== `Bearer ${RELAY_SECRET}`
  ) {
    return responder(res, 401, { error: "Não autorizado." });
  }

  try {
    const entrada = JSON.parse((await lerCorpo(req)).toString("utf8"));
    const dps = String(entrada.dpsXmlGZipB64 || "");
    const certificado = String(entrada.certificatePfxB64 || "");
    const senha = String(entrada.certificatePassword || "");

    if (!dps || !certificado || !senha) {
      return responder(res, 400, {
        error: "DPS, certificado e senha são obrigatórios.",
      });
    }

    const retorno = await enviarSefin(
      JSON.stringify({ dpsXmlGZipB64: dps }),
      Buffer.from(certificado, "base64"),
      senha,
    );

    res.writeHead(retorno.status, {
      "content-type": retorno.tipo,
      "cache-control": "no-store",
    });
    res.end(retorno.corpo);
  } catch (erro) {
    responder(res, 502, {
      error: erro instanceof Error ? erro.message : "Falha interna.",
    });
  }
});

servidor.listen(PORT, "0.0.0.0", () => {
  console.log(`Fargin SEFIN Transmissor ativo na porta ${PORT}`);
});
