const QRCode = require("qrcode");
const { Stream } = require("stream");
const hbs = require("handlebars");
const { engine } = require("express-handlebars");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
var express = require("express");
var app = express();
const port = 6500;
const muhammara = require('muhammara')
const memoryStreams = require('memory-streams');

app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", path.resolve(__dirname, "./views"));
app.use(express.static("public"));

app.get("/", async (req, res) => {
  const exchanges = [
    {
      date: "28/02/2023",
      number: "SAV1",
      status: "Exchanged",
      product: "10.11 Hammer",
    },
    {
      date: "27/02/2023",
      number: "SAV2",
      status: "Recycled",
      product: "10.11 Hammer",
    },
    {
      date: "26/02/2023",
      number: "SAV3",
      status: "Refused",
      product: "10.11 Hammer",
    },
  ];

  const next = [
    {
      date: "28/02/2023",
      number: "SAV4",
      status: "aaaaa",
      product: "10.11 Hammer",
    },
    {
      date: "27/02/2023",
      number: "SAV5",
      status: "sssss",
      product: "10.11 Hammer",
    },
    {
      date: "26/02/2023",
      number: "SAV6",
      status: "ddddd",
      product: "10.11 Hammer",
    },
  ];

  const pdfBuffer1 = await generatePDF(exchanges);
  const pdfBuffer2 = await generatePDF(next);

  const finalBuffer = combinePDFBuffers([pdfBuffer1, pdfBuffer2]);

  const readStream = new Stream.PassThrough();
  readStream.end(finalBuffer);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=example.pdf");
  readStream.pipe(res);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

const generateQRCode = async () => {
  const a = await QRCode.toDataURL(
    `https://tasty.fcadmin.soportesbd.com/exchanges?ids=640b9036b1ce090011d4b767,640b52795521fc00119c6824`
  );
  return a;
};

const generateHtml = async (qr, variable, exchanges) => {
  const filePath = path.join(__dirname, "templates", "example.hbs");
  const html = await fs.readFileSync(filePath, { encoding: "utf-8" });
  const hbsCompleted = hbs.compile(html)({
    imagen: qr,
    exchanges,
    z: "asdada",
  });

  return hbsCompleted;
};

const generatePDF = async (data) => {
  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
    headless: true,
  });

  const context = await browser.createIncognitoBrowserContext();
  const page = await context.newPage();
  const qr = await generateQRCode();
  const content = await generateHtml(qr, "Facom", data);

  await page.goto(`data: text/html, ${content}`, {
    waitUntil: "networkidle0",
  });

  await page.setContent(content);
  await page.emulateMediaType("screen");
  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
  });

  await context.close();
  return pdf;
};

const combinePDFBuffers = (buffers) => {
  const [first] = buffers;

  const outStream = new memoryStreams.WritableStream();
  const firstPdfStream = new muhammara.PDFRStreamForBuffer(first);

  const pdfWriter = muhammara.createWriterToModify(
    firstPdfStream,
    new muhammara.PDFStreamForResponse(outStream),
  );

  buffers.shift();
  buffers.forEach(buffer => {
    const newPdfStream = new muhammara.PDFRStreamForBuffer(buffer);
    pdfWriter.appendPDFPagesFromPDF(newPdfStream);
  });

  pdfWriter.end();
  return outStream.toBuffer();
}