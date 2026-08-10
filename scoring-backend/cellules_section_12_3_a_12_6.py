# Ce fichier est un LIVRABLE : 4 blocs = 4 cellules a coller telles quelles
# dans le notebook Kaggle, apres la derniere cellule existante (Section 12.2).
# Ne pas coller ce fichier en une seule cellule : chaque bloc separe par
# "# %% CELL" est UNE cellule de code independante.

# %% CELL 12.3
# ══════════════════════════════════════════════════════════════════════
# SECTION 12.3 — RÔLE DU FILTRE UNIVARIÉ : IV vs MUTUAL INFORMATION
# ------------------------------------------------------------------------
# POURQUOI : le filtre IV (Section 4) sert un objectif précis — la
#            PARCIMONIE / AUDITABILITÉ (éliminer tôt, avant tout le reste,
#            les variables qui n'ont aucun lien avec le défaut PRISES SEULES).
#            On ne cherche PAS à savoir si l'IV "bat" la Mutual Information
#            (MI) : on vérifie que ce RÔLE est robuste au choix de l'outil.
#            Si la MI (un autre filtre univarié, basé sur une autre
#            mathématique) retient à peu près les mêmes variables que l'IV,
#            alors l'étage univarié n'est pas un caprice de l'IV — n'importe
#            quel filtre univarié raisonnable jouerait ce rôle.
# MUTUAL INFORMATION (MI) : mesure statistique de la dépendance entre une
#            variable et la cible, sans supposer de forme particulière
#            (linéaire ou non) — comme l'IV, elle regarde CHAQUE variable
#            seule, jamais les relations entre variables.
# INDICE DE JACCARD : mesure de recoupement entre 2 ensembles = taille de
#            leur intersection / taille de leur union. 1 = ensembles
#            identiques, 0 = aucun point commun.
# ANTI-FUITE : comme l'IV, la MI est calculée sur le TRAIN uniquement.
# ══════════════════════════════════════════════════════════════════════
import pickle
import numpy as np
import pandas as pd
from sklearn.feature_selection import mutual_info_classif
from sklearn.metrics import roc_auc_score
import lightgbm as lgb

print('\n' + '═' * 70)
print('  SECTION 12.3 — IV vs MUTUAL INFORMATION (filtre univarié)')
print('═' * 70)

# --- Rechargements avec garde (pattern identique à 12.0a/12.1/12.2) -------
if 'CAT_FEATURES' not in dir() or not CAT_FEATURES:
    # Fallback si le kernel a été réinitialisé : catégorielles = colonnes
    # de type "objet" (texte), comme construit en Section 1.
    _features_raw_tmp = pd.read_csv(DATA_DIR + 'features_engineered_307k.csv')
    CAT_FEATURES = [c for c in _features_raw_tmp.columns if _features_raw_tmp[c].dtype == object]

if 'X_train' not in dir() or 'X_test' not in dir() or 'y_train' not in dir() or 'y_test' not in dir():
    # Reconstruction A L'IDENTIQUE du split de la Section 3 (même tri
    # temporel, même découpage positionnel 70/15/15 — déterministe, donc
    # sans risque de fuite ni d'incohérence avec le reste du pipeline).
    features_reload = pd.read_csv(DATA_DIR + 'features_engineered_307k.csv')
    EXCLUDE_COLS = ['SK_ID_CURR', 'TARGET', 'DAYS_ID_PUBLISH', 'nb_tx_pos', 'nb_tx_cc']
    feature_cols = [c for c in features_reload.columns if c not in EXCLUDE_COLS]
    features_sorted = features_reload.sort_values('DAYS_ID_PUBLISH').reset_index(drop=True)
    N = len(features_sorted)
    n_train, n_val = int(N * 0.70), int(N * 0.15)
    X_train = features_sorted.iloc[:n_train][feature_cols].reset_index(drop=True)
    X_test  = features_sorted.iloc[n_train + n_val:][feature_cols].reset_index(drop=True)
    y_train = features_sorted.iloc[:n_train]['TARGET'].reset_index(drop=True)
    y_test  = features_sorted.iloc[n_train + n_val:]['TARGET'].reset_index(drop=True)

if 'X_test_nap' not in dir():
    X_test_nap = pd.read_csv(DATA_DIR + 'X_test_nap.csv')
if 'lgbm_final' not in dir():
    with open(ART_DIR + 'lgbm_final.pkl', 'rb') as f:
        lgbm_final = pickle.load(f)

df_iv_ref = pd.read_csv(ART_DIR + 'iv_scores_final.csv')
if 'features_iv' not in dir():
    features_iv = df_iv_ref[df_iv_ref['decision'] == 'retained']['feature'].tolist()

y_train_a = np.asarray(y_train)
y_test_a  = np.asarray(y_test)

# --- Colonnes candidates = exactement celles soumises à l'IV (Section 4) -
feature_cols_mi = [c for c in X_train.columns if c not in ('SK_ID_CURR', 'TARGET')]
print(f'  Colonnes candidates (identiques à la Section 4) : {len(feature_cols_mi)}')
print(f'  Variables retenues par IV (référence)            : {len(features_iv)}')

# ══════════════════════════════════════════════════════════════════════
# 1) SÉLECTION UNIVARIÉE PAR MUTUAL INFORMATION (sur le TRAIN)
# ══════════════════════════════════════════════════════════════════════
# mutual_info_classif n'accepte pas les NaN et veut des valeurs numériques.
# CHOIX TECHNIQUE LOCAL (documenté ici, SANS impact sur le pipeline réel) :
#   - NaN numériques -> imputés par la MÉDIANE DU TRAIN, uniquement pour ce
#     calcul de MI. Le pipeline réel garde le bin "Manquant" du WOE
#     (Section 5) — on n'y touche pas, c'est une décision figée.
#   - Catégorielles -> encodées en codes entiers (.cat.codes) pour que MI
#     puisse les traiter ; MI ne suppose pas de relation d'ordre entre les
#     codes, donc cet encodage arbitraire ne biaise pas le calcul.
X_mi = X_train[feature_cols_mi].copy()
for col in feature_cols_mi:
    if col in CAT_FEATURES:
        X_mi[col] = X_mi[col].astype('category').cat.codes
    else:
        X_mi[col] = X_mi[col].fillna(X_mi[col].median())

mi_scores = mutual_info_classif(X_mi, y_train_a, random_state=42)
df_mi = pd.DataFrame({'feature': feature_cols_mi, 'mi': mi_scores}).sort_values(
    'mi', ascending=False).reset_index(drop=True)

# CRITÈRE DE SÉLECTION MI (documenté) : top-k, k = nombre de variables
# retenues par l'IV. Choisi plutôt qu'un seuil arbitraire sur la MI car les
# échelles IV et MI ne sont PAS comparables (unités différentes) — comparer
# "à effectif égal" est plus robuste et plus lisible.
K_MI = len(features_iv)
features_mi = df_mi.head(K_MI)['feature'].tolist()
print(f'\n  Critère MI retenu : top-{K_MI} (même effectif que l\'IV — pas un seuil MI arbitraire)')
print(f'  Variables retenues par MI : {len(features_mi)}')

# ══════════════════════════════════════════════════════════════════════
# 2) COMPARAISON DES DEUX SÉLECTIONS
# ══════════════════════════════════════════════════════════════════════
set_iv, set_mi = set(features_iv), set(features_mi)
intersection = set_iv & set_mi
union        = set_iv | set_mi
jaccard      = len(intersection) / len(union) if union else 0.0
iv_only = sorted(set_iv - set_mi)
mi_only = sorted(set_mi - set_iv)

print(f'\n  |IV|={len(set_iv)}  |MI|={len(set_mi)}  |IV ∩ MI|={len(intersection)}  |IV ∪ MI|={len(union)}')
print(f'  Indice de Jaccard (recoupement) : {jaccard:.3f}  ({jaccard*100:.1f} %)')
print(f'\n  Retenues par IV mais PAS par MI ({len(iv_only)}) : {iv_only}')
print(f'  Retenues par MI mais PAS par IV ({len(mi_only)}) : {mi_only}')

# ══════════════════════════════════════════════════════════════════════
# 3) AUC TEST DE CHAQUE SÉLECTION (Option 1 — comparaison légère)
# ══════════════════════════════════════════════════════════════════════
# IV : c'est le pipeline EXISTANT (IV -> WOE -> NAP -> lgbm_final). On
# recalcule l'AUC test à partir du modèle déjà entraîné — pas de
# ré-entraînement, juste la mesure de référence pour la comparaison.
auc_iv = roc_auc_score(y_test_a, lgbm_final.predict_proba(X_test_nap)[:, 1])
print(f'\n  AUC test — pipeline IV existant (référence, n={X_test_nap.shape[1]} features) : {auc_iv:.4f}')
print(f'  (rappel run canonique v3, Phase 0 : AUC test = 0.7510)')

# MI : comparaison INDICATIVE, PAS un pipeline complet. Reconstruire le WOE
# (un OptimalBinning par variable, fitté sur le train) pour les seules
# features MI serait coûteux à dupliquer ici et sort du périmètre "Option 1
# - léger" imposé pour cette Phase 2. On entraîne donc un LightGBM AUX
# MÊMES HYPERPARAMÈTRES que lgbm_final (récupérés via get_params(), pas de
# nouveau réglage), sur les features MI encodées SIMPLEMENT (médiane +
# codes catégoriels, comme ci-dessus). Cette mesure teste le RECOUVREMENT
# DE SIGNAL entre les 2 sélections, pas la performance finale du pipeline
# (qui reste celle de lgbm_final, sur les 27 features WOE+NAP).
memes_hyperparametres = lgbm_final.get_params()
# LightGBM ne veut pas d'un paramètre None explicite dans certains cas —
# on filtre les clés à valeur None avant de reconstruire le classifieur.
memes_hyperparametres = {k: v for k, v in memes_hyperparametres.items() if v is not None}
lgbm_mi = lgb.LGBMClassifier(**memes_hyperparametres)

X_train_mi_final = X_mi[features_mi]
X_test_mi_final = X_test[feature_cols_mi].copy()
for col in features_mi:
    if col in CAT_FEATURES:
        X_test_mi_final[col] = X_test_mi_final[col].astype('category').cat.codes
    else:
        X_test_mi_final[col] = X_test_mi_final[col].fillna(X_mi[col].median())
X_test_mi_final = X_test_mi_final[features_mi]

lgbm_mi.fit(X_train_mi_final, y_train_a)
auc_mi = roc_auc_score(y_test_a, lgbm_mi.predict_proba(X_test_mi_final)[:, 1])
ecart_auc = abs(auc_iv - auc_mi)
print(f'  AUC test — sélection MI (indicatif, encodage simple, n={len(features_mi)}) : {auc_mi:.4f}')
print(f'  Écart |AUC_IV - AUC_MI| : {ecart_auc:.4f}')
print(f'  [!] Comparaison INDICATIVE : la voie MI n\'est PAS passée par le WOE réel (voir POURQUOI ci-dessus).')

# ══════════════════════════════════════════════════════════════════════
# 4) FIGURE — recoupement IV/MI + texte AUC
# ══════════════════════════════════════════════════════════════════════
fig, axes = plt.subplots(1, 2, figsize=(14, 6))

axes[0].bar(['IV\n(retenues)', 'MI\n(retenues)', 'Communes\n(IV ∩ MI)'],
            [len(set_iv), len(set_mi), len(intersection)],
            color=[COLORS['primary'], COLORS['secondary'], COLORS['success']])
axes[0].set_ylabel('Nombre de variables')
axes[0].set_title(f'Recoupement IV vs MI — Jaccard = {jaccard:.2f}', fontweight='bold')
for i, v in enumerate([len(set_iv), len(set_mi), len(intersection)]):
    axes[0].text(i, v + 0.1, str(v), ha='center', fontweight='bold')

axes[1].axis('off')
texte_synth = (
    f"AUC test — sélection IV  : {auc_iv:.4f}\n"
    f"AUC test — sélection MI  : {auc_mi:.4f}  (indicatif)\n"
    f"Écart AUC                : {ecart_auc:.4f}\n\n"
    f"Recoupement (Jaccard)    : {jaccard*100:.1f} %\n"
    f"Variables communes       : {len(intersection)} / {len(union)}\n"
)
axes[1].text(0.05, 0.6, texte_synth, fontsize=12, family='monospace', va='center')
axes[1].set_title('Synthèse chiffrée', fontweight='bold')

plt.suptitle('Section 12.3 — Robustesse du filtre univarié (IV vs MI)', fontsize=13, fontweight='bold')
plt.tight_layout()
plt.savefig(OUTPUT_DIR + 'fig12_3_iv_vs_mi.png', dpi=150, bbox_inches='tight')
plt.show()

# ══════════════════════════════════════════════════════════════════════
# 5) SYNTHÈSE — pas de conclusion imposée, juste le rapport des chiffres
# ══════════════════════════════════════════════════════════════════════
print('\n' + '─' * 70)
print('  SYNTHÈSE SECTION 12.3')
print('─' * 70)
print(f'  Recoupement IV/MI (Jaccard)        : {jaccard*100:.1f} %')
print(f'  Écart AUC test (IV vs MI, indicatif) : {ecart_auc:.4f}')
print('  Lecture proposée (à confirmer avec les chiffres ci-dessus, pas imposée) :')
print('    recoupement élevé + AUC comparables -> l\'étage univarié est robuste au choix')
print('    de l\'outil (IV ou MI joueraient le même rôle de parcimonie/auditabilité).')
print('    Si le recoupement est faible ou l\'écart d\'AUC important, cette lecture ne')
print('    tient pas et doit être nuancée avec l\'auteur avant toute conclusion.')
print(f'\n  ★ Figure sauvegardée : fig12_3_iv_vs_mi.png')
print('\nOK SECTION 12.3 TERMINÉE')


# %% CELL 12.4
# ══════════════════════════════════════════════════════════════════════
# SECTION 12.4 — RÔLE DU FILTRE MULTIVARIÉ : NAP vs VIF
# ------------------------------------------------------------------------
# POURQUOI : le filtre NAP (Section 6) sert un objectif précis — la
#            STABILITÉ / ANTI-REDONDANCE (repérer les variables qui,
#            UNE FOIS LES AUTRES PRÉSENTES, n'apportent plus rien — deux
#            variables à bon IV peuvent raconter la même chose). NAP a
#            tout gardé (27/27) sur ce run = rôle CONFIRMATOIRE (garde-fou
#            qui n'a rien trouvé à élaguer), pas un rôle d'élagage agressif.
#            On vérifie ici qu'une AUTRE approche multivariée (le VIF) fait
#            un constat cohérent sur la redondance de ces 27 features.
# VIF (Variance Inflation Factor) : pour une variable j, on régresse j sur
#            TOUTES les autres variables ; VIF_j = 1 / (1 - R²_j). Plus
#            R²_j est proche de 1 (j est bien "expliquée" par les autres),
#            plus VIF_j est grand -> j est redondante avec le reste.
#            Règle usuelle : VIF > 5 = colinéarité forte, VIF > 10 = très forte.
# TSFFS (Munkhdalai et al. 2019 ; voir aussi Hapfelmeier) : une AUTRE
#            méthode de sélection multivariée (recherche de sous-ensembles
#            de features par un critère de stabilité). Citée ici comme
#            alternative documentée de la même famille que NAP/VIF — PAS
#            codée dans cette cellule (hors périmètre "Option 1 - léger").
# ANTI-FUITE : le VIF est calculé sur les 27 features NAP du TRAIN (espace
#            WOE, sans NaN par construction du WOE — Section 5).
# ══════════════════════════════════════════════════════════════════════
import pickle
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.linear_model import LinearRegression
import lightgbm as lgb

print('\n' + '═' * 70)
print('  SECTION 12.4 — NAP vs VIF (filtre multivarié)')
print('═' * 70)

# --- Rechargements avec garde -------------------------------------------
if 'X_train_nap' not in dir():
    X_train_nap = pd.read_csv(DATA_DIR + 'X_train_nap.csv')
if 'X_test_nap' not in dir():
    X_test_nap = pd.read_csv(DATA_DIR + 'X_test_nap.csv')
if 'y_test' not in dir():
    y_test = pd.read_csv(DATA_DIR + 'y_test.csv').squeeze()
if 'y_train' not in dir():
    y_train = pd.read_csv(DATA_DIR + 'y_train.csv').squeeze()
if 'features_nap' not in dir():
    with open(ART_DIR + 'nap_features.pkl', 'rb') as f:
        features_nap = pickle.load(f)
if 'lgbm_final' not in dir():
    with open(ART_DIR + 'lgbm_final.pkl', 'rb') as f:
        lgbm_final = pickle.load(f)

y_train_a = np.asarray(y_train)
y_test_a  = np.asarray(y_test)

print(f'  Features NAP (finales, espace WOE) : {len(features_nap)} — NAP en a gardé 27/27 (confirmatoire)')
assert X_train_nap[features_nap].isna().sum().sum() == 0, \
    "l'espace WOE ne doit contenir aucun NaN (bin Manquant déjà encodé) — vérifier la Section 5"

# ══════════════════════════════════════════════════════════════════════
# 1) CALCUL DU VIF SUR LES 27 FEATURES NAP (espace WOE, TRAIN)
# ══════════════════════════════════════════════════════════════════════
def vif_statsmodels(X):
    """VIF via statsmodels (si le package est disponible sur l'image Kaggle)."""
    from statsmodels.stats.outliers_influence import variance_inflation_factor
    from statsmodels.tools.tools import add_constant
    X_const = add_constant(X)
    vifs = {}
    for i, col in enumerate(X.columns):
        vifs[col] = variance_inflation_factor(X_const.values, i + 1)  # +1 : colonne const en position 0
    return pd.Series(vifs)

def vif_manuel(X):
    """Secours SANS statsmodels : VIF_j = 1 / (1 - R²_j) par régression
    linéaire (OLS) de j sur toutes les autres colonnes (sklearn)."""
    vifs = {}
    cols = list(X.columns)
    for col in cols:
        autres = [c for c in cols if c != col]
        reg = LinearRegression().fit(X[autres], X[col])
        r2 = min(reg.score(X[autres], X[col]), 0.999999)  # garde-fou division quasi-nulle
        vifs[col] = 1.0 / (1.0 - r2)
    return pd.Series(vifs)

try:
    vif_series = vif_statsmodels(X_train_nap[features_nap])
    methode_vif = 'statsmodels (variance_inflation_factor)'
except ImportError:
    vif_series = vif_manuel(X_train_nap[features_nap])
    methode_vif = 'secours manuel (1 / (1 - R²) par régression OLS)'

vif_series = vif_series.sort_values(ascending=False)
print(f'\n  Méthode VIF utilisée : {methode_vif}')
print(f'\n  VIF par feature (trié décroissant) :')
for feat, v in vif_series.items():
    marker = '‼' if v > 10 else ('!' if v > 5 else ' ')
    print(f'  {marker} {feat:<40} VIF = {v:>8.2f}')

# ══════════════════════════════════════════════════════════════════════
# 2) COMPARAISON NAP vs VIF
# ══════════════════════════════════════════════════════════════════════
exclues_seuil5  = vif_series[vif_series > 5].index.tolist()
exclues_seuil10 = vif_series[vif_series > 10].index.tolist()
print(f'\n  NAP a gardé {len(features_nap)}/{len(features_nap)} (rôle confirmatoire, aucun élagage).')
print(f'  Une sélection VIF>5  écarterait  {len(exclues_seuil5)} variable(s)  : {exclues_seuil5}')
print(f'  Une sélection VIF>10 écarterait  {len(exclues_seuil10)} variable(s) : {exclues_seuil10}')

if exclues_seuil5:
    features_post_vif = [f for f in features_nap if f not in exclues_seuil5]
    memes_hyperparametres = {k: v for k, v in lgbm_final.get_params().items() if v is not None}
    lgbm_vif = lgb.LGBMClassifier(**memes_hyperparametres)
    lgbm_vif.fit(X_train_nap[features_post_vif], y_train_a)
    auc_vif = roc_auc_score(y_test_a, lgbm_vif.predict_proba(X_test_nap[features_post_vif])[:, 1])
    auc_nap = roc_auc_score(y_test_a, lgbm_final.predict_proba(X_test_nap)[:, 1])
    print(f'\n  AUC test — NAP (27 features)                     : {auc_nap:.4f}')
    print(f'  AUC test — après exclusion VIF>5 (n={len(features_post_vif)})      : {auc_vif:.4f}')
    print(f'  Écart AUC : {abs(auc_nap - auc_vif):.4f}')
    coherence_msg = "VIF identifie une redondance que NAP n'a pas élaguée — à examiner (n reporté ci-dessus)."
else:
    auc_nap = roc_auc_score(y_test_a, lgbm_final.predict_proba(X_test_nap)[:, 1])
    print(f'\n  Aucune variable avec VIF > 5 -> AUCUNE exclusion VIF.')
    print(f'  AUC test — NAP (27 features, référence) : {auc_nap:.4f}')
    coherence_msg = "NAP et VIF sont D'ACCORD : aucune redondance forte détectée par les 2 approches."

# ══════════════════════════════════════════════════════════════════════
# 3) FIGURE — VIF par feature + lignes de seuil 5/10
# ══════════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(10, max(6, len(features_nap) * 0.3)))
couleurs_vif = [COLORS['danger'] if v > 10 else (COLORS['secondary'] if v > 5 else COLORS['success'])
                for v in vif_series.values]
ax.barh(range(len(vif_series)), vif_series.values[::-1], color=couleurs_vif[::-1])
ax.set_yticks(range(len(vif_series)))
ax.set_yticklabels(vif_series.index[::-1], fontsize=8)
ax.axvline(5, color=COLORS['secondary'], linestyle='--', linewidth=1.5, label='Seuil VIF = 5')
ax.axvline(10, color=COLORS['danger'], linestyle='--', linewidth=1.5, label='Seuil VIF = 10')
ax.set_xlabel('VIF (Variance Inflation Factor)')
ax.set_title(f'VIF des {len(features_nap)} features NAP (espace WOE, train) — méthode : {methode_vif}',
             fontweight='bold')
ax.legend()
plt.tight_layout()
plt.savefig(OUTPUT_DIR + 'fig12_4_nap_vs_vif.png', dpi=150, bbox_inches='tight')
plt.show()

# ══════════════════════════════════════════════════════════════════════
# 4) SYNTHÈSE
# ══════════════════════════════════════════════════════════════════════
print('\n' + '─' * 70)
print('  SYNTHÈSE SECTION 12.4')
print('─' * 70)
print(f'  {coherence_msg}')
print('  Note (non codée) : TSFFS (Munkhdalai et al. 2019 ; Hapfelmeier) est une autre')
print('  méthode de sélection multivariée de la même famille que NAP/VIF — citée comme')
print('  alternative documentée, hors périmètre de cette comparaison légère.')
print(f'\n  ★ Figure sauvegardée : fig12_4_nap_vs_vif.png')
print('\nOK SECTION 12.4 TERMINÉE')


# %% CELL 12.5
# ══════════════════════════════════════════════════════════════════════
# SECTION 12.5 — COMPLÉMENTARITÉ UNIVARIÉ × MULTIVARIÉ
# ------------------------------------------------------------------------
# POURQUOI : montrer que les 2 étages de filtrage NE FONT PAS double
#            emploi. L'univarié (IV, Section 12.3) coupe le bruit évident —
#            une variable SEULE sans lien avec le défaut. Le multivarié
#            (VIF, Section 12.4) coupe la redondance cachée — une variable
#            qui A un signal seule, mais qui dit la même chose qu'une autre
#            déjà présente. Ce ne sont PAS les mêmes variables visées : si
#            c'était le cas, un seul étage suffirait.
# DÉPEND DE : Section 12.3 (rejected_by_iv) et Section 12.4 (exclues_seuil5).
#            Si le kernel a été réinitialisé, ces objets sont rechargés
#            depuis les artefacts/CSV ci-dessous.
# ══════════════════════════════════════════════════════════════════════
import pandas as pd

print('\n' + '═' * 70)
print('  SECTION 12.5 — COMPLÉMENTARITÉ UNIVARIÉ x MULTIVARIÉ')
print('═' * 70)

# --- Rechargements avec garde -------------------------------------------
if 'df_iv_ref' not in dir():
    df_iv_ref = pd.read_csv(ART_DIR + 'iv_scores_final.csv')
rejetees_par_iv = set(df_iv_ref[df_iv_ref['decision'] == 'rejected']['feature'])

if 'exclues_seuil5' not in dir():
    raise RuntimeError(
        "'exclues_seuil5' n'existe pas en mémoire -> exécute d'abord la SECTION 12.4 "
        "(NAP vs VIF) dans cette même session, puis reviens ici."
    )
ciblees_par_multivarie = set(exclues_seuil5)

# ══════════════════════════════════════════════════════════════════════
# 1) LES DEUX ENSEMBLES SONT-ILS LES MÊMES ?
# ══════════════════════════════════════════════════════════════════════
intersection_12_5 = rejetees_par_iv & ciblees_par_multivarie
print(f'\n  Rejetées par l\'univarié (IV, "pas de signal seule")   : {len(rejetees_par_iv)}')
print(f'    -> {sorted(rejetees_par_iv)}')
print(f'\n  Ciblées par le multivarié (VIF>5, "signal seul mais redondant") : {len(ciblees_par_multivarie)}')
print(f'    -> {sorted(ciblees_par_multivarie)}')
print(f'\n  Intersection des deux ensembles : {len(intersection_12_5)} -> {sorted(intersection_12_5)}')

# --- Petit tableau récapitulatif -----------------------------------------
tableau_complementarite = pd.DataFrame({
    'ensemble': ['Rejetées par IV (univarié)', 'Ciblées par VIF>5 (multivarié)', 'Intersection'],
    'effectif': [len(rejetees_par_iv), len(ciblees_par_multivarie), len(intersection_12_5)],
    'objectif_vise': ['Parcimonie / auditabilité', 'Stabilité / anti-redondance', '—'],
})
print('\n  Tableau récapitulatif :')
print(tableau_complementarite.to_string(index=False))

# ══════════════════════════════════════════════════════════════════════
# 2) FIGURE (optionnelle) — schéma des deux zones
# ══════════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(9, 5))
categories = ['Rejetées\npar IV\n(univarié)', 'Communes\n(les deux)', 'Ciblées\npar VIF\n(multivarié)']
effectifs = [len(rejetees_par_iv - ciblees_par_multivarie), len(intersection_12_5),
             len(ciblees_par_multivarie - rejetees_par_iv)]
couleurs_zones = [COLORS['primary'], COLORS['danger'], COLORS['secondary']]
ax.bar(categories, effectifs, color=couleurs_zones)
for i, v in enumerate(effectifs):
    ax.text(i, v + 0.05, str(v), ha='center', fontweight='bold')
ax.set_ylabel('Nombre de variables')
ax.set_title('Section 12.5 — Zones visées par chaque étage de filtrage', fontweight='bold')
plt.tight_layout()
plt.savefig(OUTPUT_DIR + 'fig12_5_complementarite.png', dpi=150, bbox_inches='tight')
plt.show()

# ══════════════════════════════════════════════════════════════════════
# 3) SYNTHÈSE
# ══════════════════════════════════════════════════════════════════════
print('\n' + '─' * 70)
print('  SYNTHÈSE SECTION 12.5')
print('─' * 70)
if len(intersection_12_5) == 0:
    print('  Les deux ensembles sont DISJOINTS sur ce run : l\'univarié et le multivarié')
else:
    print(f'  Les deux ensembles se recoupent sur {len(intersection_12_5)} variable(s), mais restent')
    print('  majoritairement distincts : l\'univarié et le multivarié')
print('  ne coupent pas (ou peu) les mêmes variables -> chacun sert un objectif distinct')
print('  (parcimonie vs anti-redondance) -> les deux étages ont une place propre dans le')
print('  pipeline, ce ne sont pas deux versions du même filtre.')
print(f'\n  ★ Figure sauvegardée : fig12_5_complementarite.png')
print('\nOK SECTION 12.5 TERMINÉE')


# %% CELL 12.6 (BONUS — a ne coller que si 12.3/12.4/12.5 sont propres)
# ══════════════════════════════════════════════════════════════════════
# SECTION 12.6 — BINNING OPTIMAL vs QUANTILES (WOE) [BONUS, INDICATIF]
# ------------------------------------------------------------------------
# POURQUOI : le WOE lui-même n'est PAS remis en cause ici (déjà prouvé,
#            cf. Tâche 6 et RAPPORT_DECISIONS). Cette cellule teste juste
#            le CHOIX DU DÉCOUPAGE utilisé par le WOE : le binning optimal
#            actuel (OptimalBinning, Section 5) vs un découpage plus simple
#            par quantiles, sur quelques variables. Léger, indicatif —
#            n'affecte PAS le pipeline final (lgbm_final n'est pas touché).
# BINNING : découper une variable continue en tranches ("bins") avant de
#            calculer le WOE de chaque tranche. "Optimal" = les bornes des
#            tranches sont choisies pour maximiser le pouvoir prédictif
#            (IV) sous contrainte de monotonie. "Quantiles" = tranches de
#            taille égale (ex. 5 tranches de 20% des observations chacune),
#            sans optimisation, plus simple mais potentiellement moins
#            lisible (le taux de défaut par tranche peut ne pas être
#            monotone).
# SOUPAPE : si cette cellule alourdit inutilement le notebook, elle peut
#            être laissée en perspective (mémoire, section limites) sans
#            être exécutée — elle n'est pas requise pour la thèse Phase 2.
# ══════════════════════════════════════════════════════════════════════
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
import lightgbm as lgb

print('\n' + '═' * 70)
print('  SECTION 12.6 — BINNING OPTIMAL vs QUANTILES (bonus, indicatif)')
print('═' * 70)

# --- Rechargements avec garde -------------------------------------------
if 'X_train_iv' not in dir():
    X_train_iv = pd.read_csv(DATA_DIR + 'X_train_iv.csv')
if 'X_test_iv' not in dir():
    X_test_iv = pd.read_csv(DATA_DIR + 'X_test_iv.csv')
if 'y_train' not in dir():
    y_train = pd.read_csv(DATA_DIR + 'y_train.csv').squeeze()
if 'y_test' not in dir():
    y_test = pd.read_csv(DATA_DIR + 'y_test.csv').squeeze()
if 'features_nap' not in dir():
    import pickle
    with open(ART_DIR + 'nap_features.pkl', 'rb') as f:
        features_nap = pickle.load(f)

# On teste le découpage sur quelques variables NUMÉRIQUES du modèle final
# (échantillon léger, pas les 27 -- objectif indicatif, pas exhaustif).
VARS_TEST_BINNING = [f for f in features_nap if f not in CAT_FEATURES][:5]
print(f'  Variables testées (échantillon léger) : {VARS_TEST_BINNING}')

resultats_binning = []
for col in VARS_TEST_BINNING:
    serie_train = X_train_iv[col].fillna(X_train_iv[col].median())
    # Découpage par quantiles (5 tranches, duplicates="drop" si trop de valeurs identiques)
    bins_q = pd.qcut(serie_train, q=5, duplicates='drop')
    taux_defaut_q = y_train.groupby(bins_q, observed=True).mean()
    monotone_q = taux_defaut_q.is_monotonic_increasing or taux_defaut_q.is_monotonic_decreasing
    resultats_binning.append({
        'feature': col,
        'nb_bins_quantiles': bins_q.cat.categories.size,
        'monotone_quantiles': monotone_q,
    })

df_binning = pd.DataFrame(resultats_binning)
print('\n  Résultat du découpage par quantiles (comparé qualitativement au binning optimal')
print('  déjà utilisé en Section 5, dont les résultats -- IV, nb bins, monotonie -- sont')
print('  disponibles dans iv_scores_final.csv et les sorties de la Section 5) :')
print(df_binning.to_string(index=False))

print('\n  [!] Cellule volontairement légère (soupape activée si nécessaire) : pas de')
print('  ré-entraînement complet du pipeline sur un WOE-quantiles ici. Si l\'auteur veut')
print('  aller plus loin, comparer l\'AUC test d\'un pipeline WOE-quantiles complet contre')
print('  0.7510 -- mais ce n\'est pas requis pour la thèse Phase 2 (place des filtres).')
print('\nOK SECTION 12.6 TERMINÉE (bonus)')
