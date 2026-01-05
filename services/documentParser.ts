import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// Configuration du worker PDF.js
// Pour éviter les problèmes de build complexes avec Vite, on pointe vers un CDN fiable pour le worker uniquement.
// Cela permet au code principal d'être bundlé proprement tout en chargeant le worker dynamiquement.
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

/**
 * Extrait le texte d'un fichier PDF
 */
const parsePDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
  }
  return fullText;
};

/**
 * Extrait le texte d'un fichier Word (.docx)
 */
const parseDocx = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
  return result.value;
};

/**
 * Extrait le texte d'un fichier Excel (.xlsx, .csv)
 * Convertit chaque feuille en CSV brut
 */
const parseExcel = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer);
  let fullText = "";

  workbook.SheetNames.forEach((sheetName: string) => {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    fullText += `--- Feuille: ${sheetName} ---\n${csv}\n\n`;
  });
  return fullText;
};

/**
 * Lit un fichier texte simple (.txt, .md, .json, etc.)
 */
const parseTextFile = async (file: File): Promise<string> => {
  return await file.text();
};

/**
 * Fonction principale qui détecte le type et parse le fichier
 */
export const extractTextFromDocument = async (file: File): Promise<string> => {
  const type = file.type;
  const name = file.name.toLowerCase();

  try {
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      return await parsePDF(file);
    } else if (
      type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      name.endsWith('.docx')
    ) {
      return await parseDocx(file);
    } else if (
      type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
      name.endsWith('.xlsx') ||
      name.endsWith('.xls') ||
      name.endsWith('.csv')
    ) {
      return await parseExcel(file);
    } else if (type.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.json')) {
      return await parseTextFile(file);
    } else {
      throw new Error("Format de document non supporté par Anita.");
    }
  } catch (error) {
    console.error("Erreur lors du parsing du document:", error);
    throw new Error(`Impossible de lire le fichier ${file.name}. Il est peut-être corrompu ou protégé.`);
  }
};