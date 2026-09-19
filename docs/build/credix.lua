-- Filtre pandoc pour les PDF CREDIX : sommaire manuel, images manquantes, tableaux, liens de fichiers.
local system = require 'pandoc.system'

-- 1. Retire le sommaire manuel entre <!-- toc --> et <!-- /toc --> (le PDF a son propre sommaire)
function Pandoc(doc)
  local out, skipping = {}, false
  for _, b in ipairs(doc.blocks) do
    if b.t == 'RawBlock' and b.text:match('<!%-%-%s*toc%s*%-%->') then
      skipping = true
    elseif b.t == 'RawBlock' and b.text:match('<!%-%-%s*/toc%s*%-%->') then
      skipping = false
    elseif not skipping then
      table.insert(out, b)
    end
  end
  doc.blocks = out
  return doc
end

-- 2. Image absente : cadre « CAPTURE À INSÉRER » ; image présente : largeur bornée
local function latex_escape(s)
  s = s:gsub('\\', '\\textbackslash{}')
  s = s:gsub('([%%%$#&_{}])', '\\%1')
  s = s:gsub('~', '\\textasciitilde{}'):gsub('%^', '\\textasciicircum{}')
  return s
end

function Image(img)
  if img.src:match('^https?://') then return nil end
  if not system.get_working_directory or true then
    local f = io.open(img.src, 'rb')
    if f then
      f:close()
      img.attributes['width'] = '100%'
      return img
    end
  end
  local alt = pandoc.utils.stringify(img.caption)
  if alt == '' then alt = 'Capture' end
  return pandoc.RawInline('latex', '\\CaptureManquante{' .. latex_escape(alt) .. '}{' .. latex_escape(img.src) .. '}')
end

-- 3. Largeurs de colonnes proportionnelles au contenu (les tableaux Markdown n'en fournissent pas)
local function cell_len(cell) return #pandoc.utils.stringify(cell.contents) end
function Table(tbl)
  local n = #tbl.colspecs
  if n < 2 then return nil end
  local maxlen = {}
  for j = 1, n do maxlen[j] = 3 end
  local function scan(rows)
    for _, row in ipairs(rows) do
      for j, cell in ipairs(row.cells) do
        if j <= n then
          local l = cell_len(cell)
          if l > maxlen[j] then maxlen[j] = l end
        end
      end
    end
  end
  scan(tbl.head.rows)
  for _, b in ipairs(tbl.bodies) do scan(b.body) end
  local biggest = 0
  for j = 1, n do if maxlen[j] > biggest then biggest = maxlen[j] end end
  if biggest <= 24 then return nil end   -- tableau court : laisser pandoc décider
  local w, total = {}, 0
  for j = 1, n do
    w[j] = math.max(math.min(maxlen[j], 70), 9)
    total = total + w[j]
  end
  for j = 1, n do
    tbl.colspecs[j] = { tbl.colspecs[j][1], (w[j] / total) * 0.97 }
  end
  return tbl
end

-- 4. Liens vers des fichiers du dépôt : on garde le texte (un lien relatif n'a pas de sens dans un PDF)
function Link(l)
  local t = l.target
  if t:match('^https?://') or t:match('^#') or t:match('^mailto:') then return nil end
  return l.content
end

-- 5. Blocs de code : filet bleu à gauche, retour à la ligne automatique
local mermaid_n = 0
function CodeBlock(cb)
  if cb.classes:includes('mermaid') then
    mermaid_n = mermaid_n + 1
    local path = '../images/mermaid/' .. (os.getenv('DOCNAME') or 'doc') .. '_' .. mermaid_n .. '.png'
    local f = io.open(path, 'rb')
    if f then
      f:close()
      return pandoc.Para({ pandoc.Image({}, path, '', { width = '95%' }) })
    end
  end
  local opts = 'breaklines=true,breakanywhere=true,fontsize=\\footnotesize,frame=leftline,framerule=1.6pt,rulecolor=\\color{credixblue},framesep=3mm,xleftmargin=2mm,xrightmargin=1mm'
  return pandoc.RawBlock('latex', '\\begin{Verbatim}[' .. opts .. ']\n' .. cb.text .. '\n\\end{Verbatim}')
end
