-- Filtre pandoc pour les PDF CREDIX : sommaire manuel, images manquantes, tableaux, liens de fichiers.

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

-- Chemin d'une image, exprimé par rapport au dossier des fichiers .tex (variable TEXDIR),
-- pour que le .tex fourni se compile tel quel depuis son dossier.
local function normalize(p)
  local out = {}
  for seg in p:gmatch('[^/]+') do
    if seg == '..' then table.remove(out) elseif seg ~= '.' then out[#out + 1] = seg end
  end
  return out
end

local function relpath(target_abs, base_abs)
  local t, b = normalize(target_abs), normalize(base_abs)
  local i = 1
  while i <= #t and i <= #b and t[i] == b[i] do i = i + 1 end
  local parts = {}
  for _ = i, #b do parts[#parts + 1] = '..' end
  for j = i, #t do parts[#parts + 1] = t[j] end
  return table.concat(parts, '/')
end

local function tex_path(src)
  local mddir = os.getenv('MDDIR') or '.'
  local texdir = os.getenv('TEXDIR')
  if not texdir then return src end
  return relpath(mddir .. '/' .. src, texdir)
end

-- L'image est cherchée au moment de la compilation LaTeX (macro \CredixCapture) :
-- présente, elle est insérée ; absente, un cadre « CAPTURE À INSÉRER » la remplace.
function Image(img)
  if img.src:match('^https?://') then return nil end
  local alt = pandoc.utils.stringify(img.caption)
  if alt == '' then alt = 'Capture' end
  return pandoc.RawInline('latex', '\\CredixCapture{' .. latex_escape(alt) .. '}{' .. tex_path(img.src) .. '}')
end

-- 3. Largeurs de colonnes : proportionnelles au contenu, mais jamais plus étroites que le plus long mot
--    de la colonne (sinon le texte déborde sur la colonne voisine)
local function words_max(cell)
  local m = 0
  for w in pandoc.utils.stringify(cell.contents):gmatch('%S+') do
    if #w > m then m = #w end
  end
  return m
end

function Table(tbl)
  local n = #tbl.colspecs
  if n < 2 then return nil end
  local maxlen, maxword = {}, {}
  for j = 1, n do maxlen[j] = 3; maxword[j] = 1 end
  local function scan(rows)
    for _, row in ipairs(rows) do
      for j, cell in ipairs(row.cells) do
        if j <= n then
          local l = #pandoc.utils.stringify(cell.contents)
          if l > maxlen[j] then maxlen[j] = l end
          local w = words_max(cell)
          if w > maxword[j] then maxword[j] = w end
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
  local fr, fixed, fixed_sum, free_sum = {}, {}, 0, 0
  for j = 1, n do
    local floor = math.min(maxword[j] * 0.0125 + 0.05, 0.4)
    local f = (w[j] / total) * 0.97
    if f < floor then
      fixed[j] = true; fr[j] = floor; fixed_sum = fixed_sum + floor
    else
      fr[j] = f; free_sum = free_sum + f
    end
  end
  local avail = 0.97 - fixed_sum
  if free_sum > avail and free_sum > 0 and avail > 0 then
    local k = avail / free_sum
    for j = 1, n do if not fixed[j] then fr[j] = fr[j] * k end end
  end
  for j = 1, n do tbl.colspecs[j] = { tbl.colspecs[j][1], fr[j] } end
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
    local src = '../images/mermaid/' .. (os.getenv('DOCNAME') or 'doc') .. '_' .. mermaid_n .. '.png'
    local f = io.open((os.getenv('MDDIR') or '.') .. '/' .. src, 'rb')
    if f then
      f:close()
      return pandoc.RawBlock('latex', '\\CredixFigure{' .. tex_path(src) .. '}')
    end
  end
  local opts = 'breaklines=true,breakanywhere=true,fontsize=\\footnotesize,frame=leftline,framerule=1.6pt,rulecolor=\\color{credixblue},framesep=3mm,xleftmargin=2mm,xrightmargin=1mm'
  return pandoc.RawBlock('latex', '\\begin{Verbatim}[' .. opts .. ']\n' .. cb.text .. '\n\\end{Verbatim}')
end

-- 6. Noms de fichiers et identifiants en police à chasse fixe : coupure autorisée après _ . / -
--    (sans cela, un long nom déborde de sa colonne). Les autres codes en ligne restent gérés par pandoc.
function Code(c)
  if c.text:match('^[%w_%.%-/:=@+]+$') and #c.text > 14 then
    local t = c.text:gsub('_', '\\_'):gsub('([%.%-/])', '%1\\allowbreak{}'):gsub('(\\_)', '%1\\allowbreak{}')
    return pandoc.RawInline('latex', '\\texttt{' .. t .. '}')
  end
  return nil
end
