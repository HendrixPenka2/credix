import { Stepper } from "@/components/shared/Stepper";
import { ClientForm } from "@/components/agent/clients-nouveau/ClientForm";

export default function NouveauClientPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="font-headline-lg text-on-surface">Nouveau client</h2>
        <p className="font-body-sm text-on-surface-variant mt-1">Créez le dossier déclaratif avant de lancer un premier scoring.</p>
      </div>

      <Stepper steps={["Saisie", "Simulation", "Décision"]} currentIndex={0} />

      <ClientForm />
    </div>
  );
}
