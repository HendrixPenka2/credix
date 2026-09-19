import { Banner } from "@/components/shared/Banner";
import type { ScoreBands } from "@/lib/types";

/** Test de cohérence : la PD moyenne doit décroître quand le score augmente. */
export function CalibrationBanner({ bands }: { bands: ScoreBands }) {
  const sorted = [...bands.tranches].sort((a, b) => a.borne_inf - b.borne_inf);
  const withPd = sorted.filter((t) => t.pd_moyenne != null && t.count > 0);

  let coherent = true;
  for (let i = 1; i < withPd.length; i++) {
    if (withPd[i].pd_moyenne > withPd[i - 1].pd_moyenne + 0.01) {
      coherent = false;
      break;
    }
  }

  return (
    <Banner
      variant={coherent ? "success" : "warning"}
      title={coherent ? "Calibration cohérente" : "Anomalie de calibration détectée"}
      description={
        coherent
          ? "La probabilité de défaut moyenne décroît bien lorsque le score augmente, tranche par tranche."
          : "Au moins une tranche de score supérieur affiche une PD moyenne plus élevée qu'une tranche inférieure — à examiner."
      }
    >
      {bands.note_calibration && <p className="font-body-sm text-on-surface-variant mt-2">{bands.note_calibration}</p>}
    </Banner>
  );
}
