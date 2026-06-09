import type { ProjectFormData } from './types';
import type { ProjectInput } from './documents/suggest';

export function projectInputFromForm(form: ProjectFormData): ProjectInput {
  return {
    drivsystem: form.drivsystem,
    installasjonsmiljo: form.installasjonsmiljo,
    marked: form.marked,
    styring: form.styring,
    maskin: form.maskin,
    beskrivelse: form.beskrivelse,
    tiltenktbruk: form.tiltenktbruk,
    certifications: form.certifications,
    addedDocuments: form.addedDocuments,
  };
}
