"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZipArchive = void 0;
exports.sanitizeCsvValue = sanitizeCsvValue;
exports.generateCsv = generateCsv;
exports.generateExcelWorkbook = generateExcelWorkbook;
const zlib_1 = __importDefault(require("zlib"));
/**
 * CRC32 calculation table for ZIP archives
 */
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    CRC_TABLE[i] = c >>> 0;
}
function calculateCrc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}
/**
 * Lightweight, zero-dependency ZIP archive generator
 * Produces standard PKZIP 2.0 archives fully compliant with OpenXML (.xlsx)
 */
class ZipArchive {
    constructor() {
        this.files = [];
    }
    addFile(name, content) {
        const data = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
        const crc32 = calculateCrc32(data);
        const compressedData = zlib_1.default.deflateRawSync(data, { level: 6 });
        this.files.push({
            name,
            data,
            compressedData,
            crc32,
            offset: 0,
        });
    }
    toBuffer() {
        const chunks = [];
        let currentOffset = 0;
        // 1. Write Local File Headers + File Data
        for (const file of this.files) {
            file.offset = currentOffset;
            const nameBuffer = Buffer.from(file.name, 'utf-8');
            // Local file header (30 bytes + name length)
            const header = Buffer.alloc(30);
            header.writeUInt32LE(0x04034b50, 0); // Local file header signature
            header.writeUInt16LE(20, 4); // Version needed to extract (2.0)
            header.writeUInt16LE(0x0800, 6); // General purpose bit flag (UTF-8 filename)
            header.writeUInt16LE(8, 8); // Compression method (8 = Deflate)
            header.writeUInt16LE(0, 10); // Last mod file time
            header.writeUInt16LE(0, 12); // Last mod file date
            header.writeUInt32LE(file.crc32, 14); // CRC-32
            header.writeUInt32LE(file.compressedData.length, 18); // Compressed size
            header.writeUInt32LE(file.data.length, 22); // Uncompressed size
            header.writeUInt16LE(nameBuffer.length, 26); // File name length
            header.writeUInt16LE(0, 28); // Extra field length
            chunks.push(header);
            chunks.push(nameBuffer);
            chunks.push(file.compressedData);
            currentOffset += header.length + nameBuffer.length + file.compressedData.length;
        }
        const centralDirectoryOffset = currentOffset;
        let centralDirectorySize = 0;
        // 2. Write Central Directory Headers
        for (const file of this.files) {
            const nameBuffer = Buffer.from(file.name, 'utf-8');
            const cdHeader = Buffer.alloc(46);
            cdHeader.writeUInt32LE(0x02014b50, 0); // Central directory header signature
            cdHeader.writeUInt16LE(20, 4); // Version made by
            cdHeader.writeUInt16LE(20, 6); // Version needed to extract
            cdHeader.writeUInt16LE(0x0800, 8); // UTF-8 filename flag
            cdHeader.writeUInt16LE(8, 10); // Deflate
            cdHeader.writeUInt16LE(0, 12); // Mod time
            cdHeader.writeUInt16LE(0, 14); // Mod date
            cdHeader.writeUInt32LE(file.crc32, 16); // CRC-32
            cdHeader.writeUInt32LE(file.compressedData.length, 20); // Compressed size
            cdHeader.writeUInt32LE(file.data.length, 24); // Uncompressed size
            cdHeader.writeUInt16LE(nameBuffer.length, 28); // File name length
            cdHeader.writeUInt16LE(0, 30); // Extra field length
            cdHeader.writeUInt16LE(0, 32); // File comment length
            cdHeader.writeUInt16LE(0, 34); // Disk number start
            cdHeader.writeUInt16LE(0, 36); // Internal file attributes
            cdHeader.writeUInt32LE(0, 38); // External file attributes
            cdHeader.writeUInt32LE(file.offset, 42); // Relative offset of local header
            chunks.push(cdHeader);
            chunks.push(nameBuffer);
            centralDirectorySize += cdHeader.length + nameBuffer.length;
        }
        // 3. Write End of Central Directory Record (22 bytes)
        const eocd = Buffer.alloc(22);
        eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
        eocd.writeUInt16LE(0, 4); // Disk number
        eocd.writeUInt16LE(0, 6); // Disk with central directory
        eocd.writeUInt16LE(this.files.length, 8); // Total entries on this disk
        eocd.writeUInt16LE(this.files.length, 10); // Total entries
        eocd.writeUInt32LE(centralDirectorySize, 12); // Size of central directory
        eocd.writeUInt32LE(centralDirectoryOffset, 16); // Offset of central directory
        eocd.writeUInt16LE(0, 20); // Comment length
        chunks.push(eocd);
        return Buffer.concat(chunks);
    }
}
exports.ZipArchive = ZipArchive;
/**
 * Sanitize cell values for CSV against Spreadsheet Formula Injection (CSV Injection / CWE-1236).
 * Values beginning with '=', '+', '-', '@', or tab/CR (including after leading whitespace or control characters)
 * are escaped with a leading single quote.
 */
function sanitizeCsvValue(val) {
    if (val === null || val === undefined) {
        return '';
    }
    let str = String(val);
    // If value begins with formula characters (including with leading spaces/control chars), neutralize it
    if (/^[\s\x00-\x1f]*[=\+\-@\t\r]/.test(str)) {
        str = `'${str}`;
    }
    // Escape quotes and wrap in quotes if it contains quotes, commas, newlines, or begins with formula prefix quote
    if (/[",\n\r]/.test(str) || str.startsWith(`'`)) {
        str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
/**
 * Generate CSV text with UTF-8 BOM so Indian names and languages render correctly in Excel.
 */
function generateCsv(headers, rows) {
    const lines = [];
    // Header line
    lines.push(headers.map((h) => sanitizeCsvValue(h)).join(','));
    // Data rows
    for (const row of rows) {
        lines.push(row.map((cell) => sanitizeCsvValue(cell)).join(','));
    }
    // Prepend UTF-8 Byte Order Mark (\uFEFF)
    const csvContent = '\uFEFF' + lines.join('\r\n') + '\r\n';
    return Buffer.from(csvContent, 'utf-8');
}
/**
 * XML entity escaping for Excel OpenXML.
 * Strips invalid XML 1.0 control characters and safely encodes special XML symbols.
 */
function escapeXml(unsafe) {
    return unsafe
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
/**
 * Convert 0-indexed column number to Excel column letter (0 -> A, 27 -> AB)
 */
function getColumnLetter(colIndex) {
    let temp = colIndex;
    let letter = '';
    while (temp >= 0) {
        letter = String.fromCharCode((temp % 26) + 65) + letter;
        temp = Math.floor(temp / 26) - 1;
    }
    return letter;
}
/**
 * Generate a multi-sheet OpenXML (.xlsx) binary file using pure Node.js built-ins.
 */
function generateExcelWorkbook(sheets) {
    const archive = new ZipArchive();
    // [Content_Types].xml
    let sheetOverrides = '';
    sheets.forEach((_, idx) => {
        sheetOverrides += `<Override PartName="/xl/worksheets/sheet${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
    });
    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
</Types>`;
    archive.addFile('[Content_Types].xml', contentTypesXml);
    // _rels/.rels
    const packageRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
    archive.addFile('_rels/.rels', packageRelsXml);
    // xl/_rels/workbook.xml.rels
    let workbookRels = '';
    sheets.forEach((_, idx) => {
        workbookRels += `<Relationship Id="rId${idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${idx + 1}.xml"/>`;
    });
    const stylesRelId = `rId${sheets.length + 1}`;
    workbookRels += `<Relationship Id="${stylesRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;
    const workbookXmlRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${workbookRels}
</Relationships>`;
    archive.addFile('xl/_rels/workbook.xml.rels', workbookXmlRels);
    // xl/workbook.xml
    let sheetsXml = '';
    sheets.forEach((sheet, idx) => {
        const cleanSheetName = escapeXml(sheet.sheetName.replace(/[\\/?*\[\]]/g, '').slice(0, 31) || `Sheet${idx + 1}`);
        sheetsXml += `<sheet name="${cleanSheetName}" sheetId="${idx + 1}" r:id="rId${idx + 1}"/>`;
    });
    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheetsXml}
  </sheets>
</workbook>`;
    archive.addFile('xl/workbook.xml', workbookXml);
    // xl/styles.xml with header styling
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font>
      <sz val="11"/>
      <color theme="1"/>
      <name val="Calibri"/>
    </font>
    <font>
      <b/>
      <sz val="11"/>
      <color rgb="FFFFFFFF"/>
      <name val="Calibri"/>
    </font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill>
      <patternFill patternType="solid">
        <fgColor rgb="FFE51F3E"/>
      </patternFill>
    </fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
  </cellXfs>
</styleSheet>`;
    archive.addFile('xl/styles.xml', stylesXml);
    // xl/worksheets/sheetN.xml
    sheets.forEach((sheet, sheetIdx) => {
        let sheetDataRows = '';
        let rowNum = 1;
        // Header row
        let headerCols = '';
        sheet.headers.forEach((h, colIdx) => {
            const cellRef = `${getColumnLetter(colIdx)}${rowNum}`;
            headerCols += `<c r="${cellRef}" s="1" t="inlineStr"><is><t>${escapeXml(String(h))}</t></is></c>`;
        });
        sheetDataRows += `<row r="${rowNum}">${headerCols}</row>`;
        rowNum++;
        // Data rows
        for (const row of sheet.rows) {
            let rowCols = '';
            row.forEach((val, colIdx) => {
                const cellRef = `${getColumnLetter(colIdx)}${rowNum}`;
                const strVal = val === null || val === undefined ? '' : String(val);
                // Sanitize formula injection for spreadsheet safety (including leading spaces/control chars)
                const safeVal = /^[\s\x00-\x1f]*[=\+\-@\t\r]/.test(strVal) ? `'${strVal}` : strVal;
                rowCols += `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(safeVal)}</t></is></c>`;
            });
            sheetDataRows += `<row r="${rowNum}">${rowCols}</row>`;
            rowNum++;
        }
        const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    ${sheetDataRows}
  </sheetData>
</worksheet>`;
        archive.addFile(`xl/worksheets/sheet${sheetIdx + 1}.xml`, worksheetXml);
    });
    return archive.toBuffer();
}
//# sourceMappingURL=dataExportService.js.map