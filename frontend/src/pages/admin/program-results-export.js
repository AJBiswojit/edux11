function xmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function pdfEscape(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)')
}

export function fileStub(name) {
  return String(name || 'examination_results').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'examination_results'
}

export function resultHeaders(subjects) {
  return [
    'Sl No.',
    'Roll No.',
    'Name',
    ...subjects.map((s) => s.code),
    'Total',
    'NCA',
    'NWA',
    'NUQ',
    'NQ',
    '%age',
    ...subjects.map((s) => `${s.code} Rank`),
    'Overall Rank',
  ]
}

export function resultRowValues(row, subjects) {
  return [
    row.slNo,
    row.rollNo,
    row.name,
    ...subjects.map((s) => (row.subjects?.[s.code] || {}).score ?? 0),
    row.total,
    row.nca,
    row.nwa,
    row.nuq,
    row.nq,
    Number(row.percentage).toFixed(2),
    ...subjects.map((s) => (row.subjects?.[s.code] || {}).rank ?? row.subjectRanks?.[s.code]),
    row.overallRank,
  ]
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function isNumericCell(index, headers) {
  const label = headers[index] || ''
  return label !== 'Name' && label !== 'Roll No.'
}

export function downloadResultsExcel({ title, examName, examDate, scheme, rows, subjects }) {
  const headers = resultHeaders(subjects)
  const merge = Math.max(headers.length - 1, 0)
  const headerRow = headers
    .map((h) => `<Cell ss:StyleID="Head"><Data ss:Type="String">${xmlEscape(h)}</Data></Cell>`)
    .join('')
  const body = rows
    .map((row, index) => {
      const style = index % 2 === 0 ? 'Odd' : 'Even'
      const cells = resultRowValues(row, subjects)
        .map((value, col) => {
          const rankCol = headers[col] === 'Overall Rank'
          const sid = rankCol ? 'Rank' : style
          if (isNumericCell(col, headers) && value !== '' && value != null && !Number.isNaN(Number(value))) {
            return `<Cell ss:StyleID="${sid}"><Data ss:Type="Number">${Number(value)}</Data></Cell>`
          }
          return `<Cell ss:StyleID="${sid}"><Data ss:Type="String">${xmlEscape(value ?? '')}</Data></Cell>`
        })
        .join('')
      return `<Row>${cells}</Row>`
    })
    .join('')

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Title"><Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="12"/><Interior ss:Color="#12345C" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="Head"><Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="9"/><Interior ss:Color="#1D4F8C" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/></Style>
  <Style ss:ID="Odd"><Alignment ss:Horizontal="Center"/><Font ss:Size="9"/></Style>
  <Style ss:ID="Even"><Alignment ss:Horizontal="Center"/><Font ss:Size="9"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Rank"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Size="9"/><Interior ss:Color="#FDE68A" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="Results">
  <Table>
   <Row ss:Height="22"><Cell ss:MergeAcross="${merge}" ss:StyleID="Title"><Data ss:Type="String">${xmlEscape(`EXAMINATION RESULTS — ${title}`)}</Data></Cell></Row>
   <Row>${headerRow}</Row>
   ${body}
  </Table>
 </Worksheet>
</Workbook>`

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' })
  triggerDownload(blob, `${fileStub(examName || scheme?.family)}_results_${examDate || 'sheet'}.xls`)
}

function pdfTextWidth(text, size) {
  return String(text || '').length * size * 0.52
}

function buildPdf(title, headers, dataRows) {
  const pageW = 842
  const pageH = 595
  const margin = 28
  const tableW = pageW - margin * 2
  const nameIndex = headers.indexOf('Name')
  const weights = headers.map((h, i) => {
    if (i === nameIndex) return 3.4
    if (h === 'Roll No.') return 1.6
    if (h === 'Overall Rank') return 1.3
    if (h.includes('Rank')) return 1.15
    if (h === 'Sl No.') return 0.85
    return 1
  })
  const sum = weights.reduce((a, b) => a + b, 0)
  const widths = weights.map((w) => (w / sum) * tableW)
  const rowH = 12
  const titleH = 22
  const headerH = 16
  const top = pageH - margin
  const usable = top - margin - titleH - headerH - 8
  const perPage = Math.max(1, Math.floor(usable / rowH))
  const pages = Math.max(1, Math.ceil(dataRows.length / perPage) || 1)

  const objects = []
  const add = (body) => {
    objects.push(body)
    return objects.length
  }
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

  const pageIds = []
  const contentIds = []

  for (let p = 0; p < pages; p += 1) {
    const slice = dataRows.slice(p * perPage, (p + 1) * perPage)
    const ops = []
    const drawRect = (x, y, w, h, fill, stroke) => {
      if (fill) ops.push(`${fill} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`)
      if (stroke) ops.push(`${stroke} RG 0.4 w ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`)
    }
    const drawCentered = (text, x, y, w, size, bold, color) => {
      const t = pdfEscape(text)
      const tw = pdfTextWidth(t, size)
      const tx = x + Math.max(2, (w - tw) / 2)
      ops.push(`${color} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${tx.toFixed(2)} ${y.toFixed(2)} Td (${t}) Tj ET`)
    }
    const drawLeft = (text, x, y, size, bold, color) => {
      ops.push(`${color} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${(x + 3).toFixed(2)} ${y.toFixed(2)} Td (${pdfEscape(text)}) Tj ET`)
    }

    drawRect(margin, top - titleH, tableW, titleH, '0.07 0.20 0.36', '0.07 0.20 0.36')
    drawCentered(`EXAMINATION RESULTS — ${title}`, margin, top - 15, tableW, 10, true, '1 1 1')

    let x = margin
    const headY = top - titleH - headerH
    headers.forEach((h, i) => {
      const fill = h === 'Overall Rank' ? '0.99 0.80 0.19' : '0.11 0.31 0.55'
      const color = h === 'Overall Rank' ? '0.07 0.10 0.18' : '1 1 1'
      drawRect(x, headY, widths[i], headerH, fill, '0.2 0.2 0.2')
      drawCentered(h, x, headY + 5, widths[i], 6.5, true, color)
      x += widths[i]
    })

    slice.forEach((values, r) => {
      const y = headY - (r + 1) * rowH
      let cx = margin
      const fill = r % 2 === 0 ? '1 1 1' : '0.97 0.98 0.99'
      values.forEach((value, i) => {
        const isRank = headers[i] === 'Overall Rank'
        drawRect(cx, y, widths[i], rowH, isRank ? '1 0.96 0.82' : fill, '0.35 0.35 0.35')
        if (i === nameIndex) drawLeft(value, cx, y + 3.5, 6.5, true, '0.07 0.10 0.18')
        else drawCentered(value, cx, y + 3.5, widths[i], 6.5, isRank, '0.07 0.10 0.18')
        cx += widths[i]
      })
    })

    const stream = ops.join('\n')
    const contentId = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
    contentIds.push(contentId)
    pageIds.push(null)
  }

  const pagesObjIndex = objects.length
  objects.push('')
  const catalogId = add('')

  pageIds.forEach((_, i) => {
    const id = add(
      `<< /Type /Page /Parent ${pagesObjIndex + 1} 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 ${font} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`,
    )
    pageIds[i] = id
  })
  objects[pagesObjIndex] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesObjIndex + 1} 0 R >>`

  const encoder = new TextEncoder()
  const chunks = [encoder.encode('%PDF-1.4\n')]
  const offsets = [0]
  let pos = chunks[0].length
  objects.forEach((body, i) => {
    const block = encoder.encode(`${i + 1} 0 obj\n${body}\nendobj\n`)
    offsets.push(pos)
    chunks.push(block)
    pos += block.length
  })
  const xrefStart = pos
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  const xrefBytes = encoder.encode(xref)
  chunks.push(xrefBytes)
  pos += xrefBytes.length
  chunks.push(
    encoder.encode(
      `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`,
    ),
  )
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let o = 0
  chunks.forEach((c) => {
    out.set(c, o)
    o += c.length
  })
  return out
}

export function downloadResultsPdf({ title, examName, examDate, scheme, rows, subjects }) {
  const headers = resultHeaders(subjects)
  const dataRows = rows.map((row) => resultRowValues(row, subjects).map((v) => (v === 0 || v ? String(v) : '')))
  const bytes = buildPdf(title, headers, dataRows)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  triggerDownload(blob, `${fileStub(examName || scheme?.family)}_results_${examDate || 'sheet'}.pdf`)
}
