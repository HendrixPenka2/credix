-- Filtre pandoc pour les PDF CREDIX : sommaire manuel, images manquantes, tableaux, liens de fichiers.

-- 1. (voir la fonction Pandoc, plus bas : sommaire manuel et figures)

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

-- Figures : chaque image (et chaque schéma Mermaid déjà fabriqué) devient un vrai bloc LaTeX
--   \begin{figure}[H] ... \includegraphics{fichier} ... \caption{légende} ... \end{figure}
-- que l'auteur peut modifier à la main : il suffit de changer le nom du fichier dans \includegraphics.
-- La légende est reprise du paragraphe « *Figure N. ...* » qui suit l'image dans le Markdown.
local function file_exists(path)
  local f = io.open(path, 'rb')
  if f then f:close(); return true end
  return false
end

-- Largeur (en pixels) d'un fichier PNG, lue dans son en-tête ; nil si illisible
local function png_width(path)
  local f = io.open(path, 'rb')
  if not f then return nil end
  local head = f:read(24)
  f:close()
  if not head or #head < 24 or head:sub(2, 4) ~= 'PNG' then return nil end
  local b1, b2, b3, b4 = head:byte(17, 20)
  return ((b1 * 256 + b2) * 256 + b3) * 256 + b4
end

-- Largeur d'affichage : la taille naturelle (96 points par pouce) si l'image est petite, sinon la largeur du texte
local function display_width(path, full)
  local px = png_width(path)
  if px and px / 96 < 6.2 then return string.format('%.2fin', px / 96) end
  return full
end

local function lone_image(b)
  if b.t ~= 'Para' and b.t ~= 'Plain' then return nil end
  local img, other = nil, false
  for _, il in ipairs(b.content) do
    if il.t == 'Image' and not img then img = il
    elseif il.t ~= 'Space' and il.t ~= 'SoftBreak' then other = true end
  end
  if img and not other and not img.src:match('^https?://') then return img end
  return nil
end

-- Paragraphe « *Figure N. texte* » : renvoie le texte sans le préfixe « Figure N. »
local function caption_inlines(b)
  if not b or b.t ~= 'Para' or #b.content ~= 1 or b.content[1].t ~= 'Emph' then return nil end
  local il = pandoc.List(b.content[1].content)
  if #il >= 3 and il[1].t == 'Str' and il[1].text == 'Figure' and il[2].t == 'Space'
     and il[3].t == 'Str' and il[3].text:match('^%d+[%.:]?$') then
    il:remove(1); il:remove(1); il:remove(1)
    if il[1] and il[1].t == 'Space' then il:remove(1) end
    return il
  end
  return nil
end

local function latex_of(inlines)
  local s = pandoc.write(pandoc.Pandoc({ pandoc.Plain(inlines) }), 'latex')
  s = s:gsub('%s+$', '')
  s = s:gsub('\n', ' ')
  return s
end

local function figure_latex(fig, caption)
  local base = fig.src:match('([^/]+)$') or fig.src
  local L = {}
  L[#L + 1] = '% ' .. string.rep('-', 68)
  L[#L + 1] = '% ' .. fig.kind .. ' : ' .. base .. (fig.alt ~= '' and (' : ' .. fig.alt:gsub('\n', ' ')) or '')
  L[#L + 1] = '% Pour mettre votre image : changez seulement le nom du fichier dans \\includegraphics{...}'
  L[#L + 1] = '\\begin{figure}[H]'
  L[#L + 1] = '  \\centering'
  L[#L + 1] = '  \\includegraphics[width=' .. fig.width .. ',height=' .. fig.height .. ',keepaspectratio]{' .. fig.src .. '}'
  if caption then L[#L + 1] = '  \\caption{' .. caption .. '}' end
  L[#L + 1] = '\\end{figure}'
  return table.concat(L, '\n')
end

local mermaid_seen = 0
function Pandoc(doc)
  local blocks, out, skipping, i = doc.blocks, {}, false, 1
  local docname = os.getenv('DOCNAME') or 'doc'
  local mddir = os.getenv('MDDIR') or '.'
  while i <= #blocks do
    local b = blocks[i]
    if b.t == 'RawBlock' and b.text:match('<!%-%-%s*toc%s*%-%->') then
      skipping = true     -- retire le sommaire manuel (le PDF a son propre sommaire)
    elseif b.t == 'RawBlock' and b.text:match('<!%-%-%s*/toc%s*%-%->') then
      skipping = false
    elseif not skipping then
      local fig = nil
      local img = lone_image(b)
      if img then
        local alt = pandoc.utils.stringify(img.caption)
        local abs = mddir .. '/' .. img.src
        if file_exists(abs) or os.getenv('FIGURES_ABSENTES') then
          fig = { kind = 'CAPTURE', src = tex_path(img.src), alt = alt == '' and 'Capture' or alt,
                  width = display_width(abs, '\\linewidth'), height = '0.75\\textheight' }
        else
          -- image absente : on n'insère aucune figure, le texte autour reste ; la légende qui suit est retirée
          io.stderr:write('  (image absente, figure ignorée : ' .. img.src .. ')\n')
          if caption_inlines(blocks[i + 1]) then i = i + 1 end
          i = i + 1
          goto continue
        end
      elseif b.t == 'CodeBlock' and b.classes:includes('mermaid') then
        mermaid_seen = mermaid_seen + 1
        local src = '../images/mermaid/' .. docname .. '_' .. mermaid_seen .. '.png'
        if file_exists(mddir .. '/' .. src) then
          fig = { kind = 'SCHEMA', src = tex_path(src), alt = '', width = '0.95\\linewidth', height = '0.8\\textheight' }
        end
      end
      if fig then
        local cap = caption_inlines(blocks[i + 1])
        local caption = nil
        if cap then caption = latex_of(cap); i = i + 1 end
        -- un titre en gras juste avant l'image reste avec elle (pas de titre seul en bas de page)
        local prev = out[#out]
        if prev and prev.t == 'Para' and #prev.content == 1 and prev.content[1].t == 'Strong' then
          table.insert(out, #out, pandoc.RawBlock('latex', '\\needspace{0.5\\textheight}'))
        end
        table.insert(out, pandoc.RawBlock('latex', figure_latex(fig, caption)))
      else
        table.insert(out, b)
      end
    end
    i = i + 1
    ::continue::
  end
  doc.blocks = out
  return doc
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
    local floor = math.min(maxword[j] * 0.0155 + 0.05, 0.4)
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
    if file_exists((os.getenv('MDDIR') or '.') .. '/' .. src) then
      return nil          -- traité par la fonction Pandoc (figure)
    end
  end
  local opts = 'breaklines=true,breakanywhere=true,fontsize=\\small,frame=leftline,framerule=1.6pt,rulecolor=\\color{credixblue},framesep=3mm,xleftmargin=2mm,xrightmargin=1mm'
  return pandoc.RawBlock('latex', '\\begin{Verbatim}[' .. opts .. ']\n' .. cb.text .. '\n\\end{Verbatim}')
end

-- 6. Noms de fichiers et identifiants en police à chasse fixe : coupure autorisée après _ . / -
--    (sans cela, un long nom déborde de sa colonne). Les autres codes en ligne restent gérés par pandoc.
function Code(c)
  if c.text:match('^[%w_%.%-/:=@+ ",]+$') and #c.text > 14 then
    local t = c.text:gsub('_', '\\_'):gsub('([%.%-/=,])', '%1\\allowbreak{}'):gsub('(\\_)', '%1\\allowbreak{}'):gsub(' ', '\\ ')
    return pandoc.RawInline('latex', '\\texttt{' .. t .. '}')
  end
  return nil
end
