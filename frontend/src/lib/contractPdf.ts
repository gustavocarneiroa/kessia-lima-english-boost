import { formatDateBr } from "@/lib/quote";
import type { ContractData } from "@/lib/contract";

export function contractFileName(data: ContractData) {
  const d = (key: string) => formatDateBr(key).replace(/\//g, "-");
  return `${data.student.fullName} - CONTRATO (${d(data.startDate)} a ${d(data.endDate)}).pdf`;
}

// Monta o PDF a partir das folhas do contrato na tela (uma imagem por folha A4).
// As bibliotecas só são baixadas quando alguém precisa do PDF.
async function buildContractPdf(root: HTMLElement) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pages = [...root.querySelectorAll<HTMLElement>("[data-pdf-page]")];

  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], {
      scale: 2,
      backgroundColor: "#ffffff",
      windowWidth: 1024,
      // no celular a tela é estreita: monta sempre na largura de uma folha A4
      onclone: (doc) => {
        doc.querySelectorAll<HTMLElement>("[data-contract-root]").forEach((clone) => {
          clone.style.width = "794px";
          clone.style.maxWidth = "none";
        });
      },
    });
    let width = 210;
    let height = (canvas.height * width) / canvas.width;
    if (height > 297) {
      width = (width * 297) / height;
      height = 297;
    }
    if (i > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", (210 - width) / 2, 0, width, height);
  }
  return pdf;
}

export async function downloadContractPdf(root: HTMLElement, fileName: string) {
  (await buildContractPdf(root)).save(fileName);
}

// Base64 puro (sem "data:application/pdf;base64,"), no formato que o ZapSign pede.
export async function contractPdfBase64(root: HTMLElement) {
  const dataUri = (await buildContractPdf(root)).output("datauristring");
  return dataUri.slice(dataUri.indexOf(",") + 1);
}
