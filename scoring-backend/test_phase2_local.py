"""
Test local de la logique des cellules CREDIX Phase 2 (Section 12.3 -> 12.6).
Donnees 100% factices, seed 42. Ne touche a aucun fichier du projet.
Objectif : prouver que le CODE tourne sans erreur (dimensions, NaN, types,
recoupements, VIF avec/sans statsmodels, entrainement LightGBM) AVANT de le
coller dans le notebook. Ce script n'est PAS livre dans le notebook.
"""
import numpy as np
import pandas as pd
from sklearn.feature_selection import mutual_info_classif
from sklearn.metrics import roc_auc_score
from sklearn.linear_model import LinearRegression
import lightgbm as lgb

RANDOM_STATE = 42
rng = np.random.RandomState(RANDOM_STATE)

# ============================================================
# 0) FABRICATION DE DONNEES FACTICES
#    - features signal (liees a y)
#    - features redondantes par paires (correlees entre elles -> VIF)
#    - features bruit (aucun lien avec y -> IV/MI doivent les rejeter)
#    - 2 categorielles avec NaN
#    - quelques NaN dans le numerique
# ============================================================
N_TRAIN, N_TEST = 800, 300
N = N_TRAIN + N_TEST

latent = rng.normal(size=N)  # facteur de risque latent qui pilote y
proba = 1 / (1 + np.exp(-(0.9 * latent - 0.2)))
y_all = rng.binomial(1, proba)

df = pd.DataFrame(index=range(N))
for i in range(1, 6):
    df[f'feat_signal_{i}'] = latent * rng.uniform(0.5, 1.0) + rng.normal(scale=0.8, size=N)

for i in range(1, 4):
    base = latent * 0.7 + rng.normal(scale=0.5, size=N)
    df[f'feat_redund_{i}a'] = base + rng.normal(scale=0.05, size=N)   # quasi-copie
    df[f'feat_redund_{i}b'] = base * 1.02 + rng.normal(scale=0.05, size=N)

for i in range(1, 6):
    df[f'feat_noise_{i}'] = rng.normal(size=N)  # pur bruit, aucun lien avec y

df['cat_a'] = rng.choice(['A', 'B', 'C'], size=N)
df['cat_b'] = rng.choice(['X', 'Y'], size=N)

# NaN injectes (numerique + categoriel) - doivent etre geres sans planter
nan_idx = rng.choice(N, size=int(0.1 * N), replace=False)
df.loc[nan_idx, 'feat_signal_1'] = np.nan
nan_idx2 = rng.choice(N, size=int(0.15 * N), replace=False)
df.loc[nan_idx2, 'cat_a'] = np.nan

df['TARGET'] = y_all
df['SK_ID_CURR'] = range(N)

feature_cols = [c for c in df.columns if c not in ('TARGET', 'SK_ID_CURR')]
CAT_FEATURES = ['cat_a', 'cat_b']

train_df = df.iloc[:N_TRAIN].reset_index(drop=True)
test_df = df.iloc[N_TRAIN:].reset_index(drop=True)

X_train = train_df[feature_cols].copy()
y_train = train_df['TARGET'].copy()
X_test = test_df[feature_cols].copy()
y_test = test_df['TARGET'].copy()

print('=' * 70)
print('0) DONNEES FACTICES CONSTRUITES')
print('=' * 70)
print(f'  X_train : {X_train.shape} | X_test : {X_test.shape}')
print(f'  NaN dans X_train : {X_train.isna().sum().sum()} (attendu > 0)')
print(f'  Colonnes candidates (feature_cols) : {len(feature_cols)}')
assert X_train.isna().sum().sum() > 0, "le test doit contenir des NaN volontaires"

# ============================================================
# 1) SIMULATION DE LA SORTIE DE LA SECTION 4 (IV) -- deja figee,
#    on ne re-teste PAS OptimalBinning ici (hors perimetre Phase 2).
#    On fabrique un df_iv plausible : retained = signal + redondantes
#    (elles ont un signal seul), rejected = bruit pur.
# ============================================================
retained_design = [c for c in feature_cols if c.startswith(('feat_signal', 'feat_redund'))] + CAT_FEATURES
rejected_design = [c for c in feature_cols if c.startswith('feat_noise')]

iv_rows = []
for c in feature_cols:
    dtype = 'categorical' if c in CAT_FEATURES else 'numerical'
    iv_val = 0.08 if c in retained_design else 0.005
    decision = 'retained' if c in retained_design else 'rejected'
    iv_rows.append({'feature': c, 'iv': iv_val, 'dtype': dtype, 'decision': decision})
df_iv_fake = pd.DataFrame(iv_rows)
features_iv = df_iv_fake[df_iv_fake['decision'] == 'retained']['feature'].tolist()
print('\n' + '=' * 70)
print('1) IV FACTICE (mimique iv_scores_final.csv)')
print('=' * 70)
print(f'  features_iv (retenues) : {len(features_iv)} / {len(feature_cols)}')

# ============================================================
# 2) LOGIQUE DE LA CELLULE SECTION 12.3 -- IV vs MUTUAL INFORMATION
# ============================================================
print('\n' + '=' * 70)
print('2) TEST LOGIQUE SECTION 12.3 (IV vs MI)')
print('=' * 70)

X_train_mi_input = X_train.copy()
# Imputation mediane TRAIN, uniquement pour ce calcul de MI (documente dans la cellule)
for c in feature_cols:
    if c in CAT_FEATURES:
        X_train_mi_input[c] = X_train_mi_input[c].astype('category').cat.codes
    else:
        med = X_train_mi_input[c].median()
        X_train_mi_input[c] = X_train_mi_input[c].fillna(med)

assert X_train_mi_input.isna().sum().sum() == 0, "plus aucun NaN attendu avant MI"
print(f'  NaN restants avant MI : {X_train_mi_input.isna().sum().sum()} (attendu 0)')

mi_scores = mutual_info_classif(X_train_mi_input, y_train, random_state=RANDOM_STATE)
df_mi = pd.DataFrame({'feature': feature_cols, 'mi': mi_scores}).sort_values('mi', ascending=False)

k = len(features_iv)  # meme nombre de variables que l'IV (critere "top-k")
features_mi = df_mi.head(k)['feature'].tolist()
print(f'  Variables retenues par MI (top-k, k=len(features_iv)) : {len(features_mi)}')

set_iv, set_mi = set(features_iv), set(features_mi)
inter = set_iv & set_mi
union = set_iv | set_mi
jaccard = len(inter) / len(union) if union else 0.0
divergent_iv_only = sorted(set_iv - set_mi)
divergent_mi_only = sorted(set_mi - set_iv)

print(f'  |IV ∩ MI| = {len(inter)} | |IV ∪ MI| = {len(union)} | Jaccard = {jaccard:.3f}')
print(f'  Dans IV mais pas MI : {divergent_iv_only}')
print(f'  Dans MI mais pas IV : {divergent_mi_only}')

# AUC test (Option 1, entrainement leger, MEMES hyperparametres pour les 2 selections)
base_params = dict(n_estimators=50, max_depth=3, num_leaves=15, learning_rate=0.1,
                    random_state=RANDOM_STATE, verbosity=-1)

def train_eval(features, label):
    Xtr = X_train_mi_input[features]
    Xte = X_test.copy()
    for c in features:
        if c in CAT_FEATURES:
            Xte[c] = Xte[c].astype('category').cat.codes
        else:
            Xte[c] = Xte[c].fillna(X_train_mi_input[c].median() if c not in CAT_FEATURES else 0)
    Xte = Xte[features]
    model = lgb.LGBMClassifier(**base_params)
    model.fit(Xtr, y_train)
    auc = roc_auc_score(y_test, model.predict_proba(Xte)[:, 1])
    print(f'  AUC test ({label}, n={len(features)}) = {auc:.4f}')
    return auc

auc_iv = train_eval(features_iv, 'selection IV')
auc_mi = train_eval(features_mi, 'selection MI')
print(f'  Ecart AUC |IV - MI| = {abs(auc_iv - auc_mi):.4f}')
assert 0 <= auc_iv <= 1 and 0 <= auc_mi <= 1

# get_params() round-trip (utilise dans la vraie cellule pour cloner lgbm_final)
clone_params = lgb.LGBMClassifier(**base_params).get_params()
lgb.LGBMClassifier(**{k: v for k, v in clone_params.items() if v is not None})
print('  OK : get_params() -> reconstruction LightGBM (memes hyperparametres) sans erreur')

# ============================================================
# 3) LOGIQUE DE LA CELLULE SECTION 12.4 -- NAP vs VIF
# ============================================================
print('\n' + '=' * 70)
print('3) TEST LOGIQUE SECTION 12.4 (NAP vs VIF)')
print('=' * 70)

# Espace "NAP" simule : les features retenues par IV, encodees simplement
# (dans le vrai notebook c'est l'espace WOE, deja sans NaN)
features_nap = features_iv  # NAP a tout garde (rôle confirmatoire), comme dans le vrai run
X_train_nap = X_train_mi_input[features_nap].copy()
X_test_nap = X_test.copy()
for c in features_nap:
    if c in CAT_FEATURES:
        X_test_nap[c] = X_test_nap[c].astype('category').cat.codes
    else:
        X_test_nap[c] = X_test_nap[c].fillna(X_train_mi_input[c].median())
X_test_nap = X_test_nap[features_nap]

assert X_train_nap.isna().sum().sum() == 0, "espace NAP simule : ne doit pas avoir de NaN"

def compute_vif_statsmodels(X):
    from statsmodels.stats.outliers_influence import variance_inflation_factor
    from statsmodels.tools.tools import add_constant
    Xc = add_constant(X)
    vifs = []
    for i, col in enumerate(X.columns):
        v = variance_inflation_factor(Xc.values, i + 1)  # +1 car colonne const en 0
        vifs.append(v)
    return pd.Series(vifs, index=X.columns)

def compute_vif_manual(X):
    """Secours si statsmodels absent : VIF_j = 1 / (1 - R2_j) via OLS maison (sklearn)."""
    vifs = {}
    cols = list(X.columns)
    for j, col in enumerate(cols):
        others = [c for c in cols if c != col]
        reg = LinearRegression().fit(X[others], X[col])
        r2 = reg.score(X[others], X[col])
        r2 = min(r2, 0.999999)  # garde-fou division par ~0
        vifs[col] = 1.0 / (1.0 - r2)
    return pd.Series(vifs)

vif_sm = compute_vif_statsmodels(X_train_nap)
vif_manual = compute_vif_manual(X_train_nap)
print('  VIF (statsmodels) calcule sur', len(vif_sm), 'features -- OK')
print('  VIF (secours manuel) calcule sur', len(vif_manual), 'features -- OK')

ecart_vif = (vif_sm.sort_index() - vif_manual.sort_index()).abs()
print(f'  Ecart max |VIF_statsmodels - VIF_manuel| = {ecart_vif.max():.4f} (attendu proche de 0)')
assert ecart_vif.max() < 1.0, "les deux methodes de VIF doivent converger"

vif_sorted = vif_sm.sort_values(ascending=False)
print('\n  VIF trie decroissant (top 8) :')
print(vif_sorted.head(8).to_string())

excl_seuil5 = vif_sorted[vif_sorted > 5].index.tolist()
excl_seuil10 = vif_sorted[vif_sorted > 10].index.tolist()
print(f'\n  Variables VIF > 5  : {len(excl_seuil5)} -> {excl_seuil5}')
print(f'  Variables VIF > 10 : {len(excl_seuil10)} -> {excl_seuil10}')

# Verification : les paires redondantes fabriquees doivent ressortir a fort VIF
redund_cols = [c for c in features_nap if c.startswith('feat_redund')]
assert any(c in excl_seuil5 for c in redund_cols), \
    "les colonnes redondantes fabriquees devraient avoir un VIF eleve (>5)"
print('  OK : les colonnes redondantes fabriquees ressortent bien a VIF>5')

if excl_seuil5:
    features_post_vif = [c for c in features_nap if c not in excl_seuil5]
    Xtr_vif = X_train_nap[features_post_vif]
    Xte_vif = X_test_nap[features_post_vif]
    model_vif = lgb.LGBMClassifier(**base_params)
    model_vif.fit(Xtr_vif, y_train)
    auc_vif = roc_auc_score(y_test, model_vif.predict_proba(Xte_vif)[:, 1])
    print(f'  AUC test apres exclusion VIF>5 (n={len(features_post_vif)}) = {auc_vif:.4f}')
else:
    print('  Aucune variable exclue par VIF>5 -> NAP et VIF d\'accord (pas de redondance forte)')

# ============================================================
# 4) LOGIQUE DE LA CELLULE SECTION 12.5 -- COMPLEMENTARITE
# ============================================================
print('\n' + '=' * 70)
print('4) TEST LOGIQUE SECTION 12.5 (complementarite univarie x multivarie)')
print('=' * 70)

rejected_by_iv = set(df_iv_fake[df_iv_fake['decision'] == 'rejected']['feature'])
targeted_by_vif = set(excl_seuil5)

overlap = rejected_by_iv & targeted_by_vif
print(f'  Rejetees par IV (univarie)      : {len(rejected_by_iv)} -> {sorted(rejected_by_iv)}')
print(f'  Ciblees par VIF>5 (multivarie)   : {len(targeted_by_vif)} -> {sorted(targeted_by_vif)}')
print(f'  Intersection des deux ensembles : {len(overlap)} -> {sorted(overlap)}')
assert len(overlap) == 0, "par construction du jeu de test, les 2 ensembles doivent etre disjoints"
print('  OK : les deux ensembles sont bien disjoints sur ce jeu de test factice')

# ============================================================
# 5) LOGIQUE DE LA CELLULE BONUS SECTION 12.6 -- BINNING QUANTILES
#    (indicatif -- pas d'OptimalBinning ici, teste juste pd.qcut + WOE simplifie)
# ============================================================
print('\n' + '=' * 70)
print('5) TEST LOGIQUE SECTION 12.6 (bonus -- binning quantiles, indicatif)')
print('=' * 70)
col_test = 'feat_signal_2'
serie = X_train[col_test].fillna(X_train[col_test].median())
bins_q = pd.qcut(serie, q=5, duplicates='drop')
print(f'  {col_test} decoupe en {bins_q.cat.categories.size} bins quantiles (duplicates="drop")')
taux_par_bin = y_train.groupby(bins_q, observed=True).mean()
monotone_q = taux_par_bin.is_monotonic_increasing or taux_par_bin.is_monotonic_decreasing
print(f'  Taux de defaut par bin monotone (quantiles) : {monotone_q}')
print('  (le binning OPTIMAL reel utilise OptimalBinning, non teste ici -- absent en local ;')
print('   la cellule notebook le documentera comme tel)')

print('\n' + '=' * 70)
print('TOUS LES TESTS LOCAUX SONT PASSES (aucune assertion levee)')
print('=' * 70)
