import React, { useState } from 'react';
import {
  BookOpen,
  ImagePlus,
  Layers,
  ListOrdered,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { createCourseApi } from '../api.ts';
import { t } from '../i18n.ts';
import type {
  CreateCourseModuleInput,
  InteractiveBlockType,
  Lang,
  SkillSummary,
} from '../types.ts';

interface CreateCourseModalProps {
  lang: Lang;
  token: string;
  skills: SkillSummary[];
  onClose: () => void;
  onCreated: () => Promise<void>;
  onToast: (msg: string) => void;
}

const GALLERY_IMAGES = [
  {
    url: '/src/assets/images/course_intellectual_agility_1795592939066.jpg',
    labelFr: 'Agilité & Collaboration',
    labelEn: 'Agility & Collaboration',
  },
  {
    url: '/src/assets/images/course_customer_excellence_1795592938902.jpg',
    labelFr: 'Relation Client',
    labelEn: 'Customer Relations',
  },
  {
    url: '/src/assets/images/course_data_security_1795592939925.jpg',
    labelFr: 'Sécurité & Conformité',
    labelEn: 'Security & Compliance',
  },
];

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

function createEmptyModule(index: number, coverUrl: string): CreateCourseModuleInput {
  return {
    title: `Module ${index + 1} : Séquence interactive`,
    summary: '',
    scenario: '',
    imageUrl: coverUrl,
    blockType: index % 2 === 0 ? 'flashcards' : 'steps',
    takeaway: '',
    flashcards: [
      { front: 'Réflexe terrain', back: '' },
      { front: 'Point de contrôle', back: '' },
    ],
    steps: [
      { title: '1. Observer', detail: '' },
      { title: '2. Agir avec méthode', detail: '' },
      { title: '3. Confirmer la satisfaction', detail: '' },
    ],
    quizQuestion: '',
    quizOptions: ['', '', ''],
    correctIndex: 0,
  };
}

export const CreateCourseModal: React.FC<CreateCourseModalProps> = ({
  lang,
  token,
  skills,
  onClose,
  onCreated,
  onToast,
}) => {
  const [studioTab, setStudioTab] = useState<'identity' | 'modules'>('identity');
  const [titleFr, setTitleFr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [categoryFr, setCategoryFr] = useState('Parcours');
  const [duration, setDuration] = useState('4 Modules · 1h30');
  const [skillId, setSkillId] = useState(skills[0]?.id ?? 'intellectual-agility');
  const [coverImageUrl, setCoverImageUrl] = useState(GALLERY_IMAGES[0].url);
  const [modules, setModules] = useState<CreateCourseModuleInput[]>([
    createEmptyModule(0, GALLERY_IMAGES[0].url),
    createEmptyModule(1, GALLERY_IMAGES[1].url),
  ]);
  const [activeModIdx, setActiveModIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const activeMod = modules[activeModIdx] ?? modules[0];

  const handleImageFile = (
    file: File | undefined,
    onSuccess: (dataUrl: string) => void
  ) => {
    if (!file) return;
    if (!ALLOWED_IMAGE_MIME.has(file.type)) {
      onToast(
        lang === 'fr'
          ? 'Format non pris en charge. Utilisez PNG, JPG ou WebP.'
          : 'Unsupported format. Use PNG, JPG, or WebP.'
      );
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      onToast(
        lang === 'fr'
          ? 'Image trop volumineuse (maximum 2 Mo).'
          : 'Image is too large (maximum 2 MB).'
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onSuccess(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const updateActiveModule = (patch: Partial<CreateCourseModuleInput>) => {
    setModules((prev) =>
      prev.map((m, idx) => (idx === activeModIdx ? { ...m, ...patch } : m))
    );
  };

  const handleAddModule = () => {
    if (modules.length >= 4) return;
    const nextIdx = modules.length;
    setModules((prev) => [...prev, createEmptyModule(nextIdx, coverImageUrl)]);
    setActiveModIdx(nextIdx);
  };

  const handleRemoveModule = (idxToRemove: number) => {
    if (modules.length <= 1) return;
    setModules((prev) => prev.filter((_, i) => i !== idxToRemove));
    setActiveModIdx((prev) => Math.max(0, Math.min(prev, modules.length - 2)));
  };

  const handleLoadArticulatePreset = () => {
    setTitleFr('Onboarding Expérience Client Connecteo');
    setTitleEn('Connecteo Customer Experience Onboarding');
    setCategoryFr('Culture Client');
    setDuration('3 Modules · 1h15');
    setSkillId(skills[1]?.id ?? skills[0]?.id ?? 'customer-relations');
    setCoverImageUrl(GALLERY_IMAGES[1].url);
    setModules([
      {
        title: 'Module 1 : Posture d’accueil & écoute active',
        summary:
          'Maîtriser les 30 premières secondes d’un contact entrant pour instaurer une relation chaleureuse et structurée.',
        scenario:
          'Un client appelle avec impatience après un délai de traitement. Comment ancrer la confiance dès le premier mot ?',
        imageUrl: GALLERY_IMAGES[1].url,
        blockType: 'flashcards',
        takeaway:
          'Valider l’émotion puis reformuler le besoin factuel avant d’ouvrir le dossier CRM.',
        flashcards: [
          {
            front: 'Ouverture en 3 temps',
            back: 'Salutation chaleureuse, prénom du conseiller, disponibilité immédiate.',
          },
          {
            front: 'Reformulation miroir',
            back: '« Si je comprends bien, votre priorité aujourd’hui est… »',
          },
        ],
        steps: [
          { title: '1. Accueillir', detail: 'Sourire audible et ton posé.' },
          { title: '2. Écouter', detail: 'Zéro interruption pendant 20 secondes.' },
          { title: '3. Valider', detail: 'Confirmer l’objectif concret.' },
        ],
        quizQuestion:
          'Quelle action renforce le plus la confiance dans les 30 premières secondes ?',
        quizOptions: [
          'Reformuler le besoin client avant toute recherche technique',
          'Demander de patienter sans explication',
          'Lire un script générique',
        ],
        correctIndex: 0,
      },
      {
        title: 'Module 2 : Résolution agile multi-canal',
        summary:
          'Passer fluidement de l’appel à l’écrit avec un suivi clair, daté et orienté solution.',
        scenario:
          'Un dossier nécessite l’intervention d’une équipe partenaire sous 24 heures.',
        imageUrl: GALLERY_IMAGES[0].url,
        blockType: 'steps',
        takeaway:
          'Un engagement daté et tracé par écrit réduit de 60 % les relances entrantes.',
        flashcards: [
          {
            front: 'Escalade qualifiée',
            back: 'Contexte, impact client, actions déjà réalisées.',
          },
          {
            front: 'Suivi proactif',
            back: 'Créneau exact de rappel annoncé avant de raccrocher.',
          },
        ],
        steps: [
          {
            title: '1. Qualifier les faits',
            detail: 'Documenter les éléments datés sans jargon interne.',
          },
          {
            title: '2. Annoncer le délai réel',
            detail: 'Donner une fenêtre horaire réaliste et engageante.',
          },
          {
            title: '3. Envoyer le récapitulatif',
            detail: 'Confirmer par email la prochaine étape et votre contact.',
          },
        ],
        quizQuestion:
          'Que doit impérativement recevoir le client lors d’une escalade interne ?',
        quizOptions: [
          'Un récapitulatif écrit avec une échéance précise',
          'Uniquement un numéro de ticket brut',
          'L’organigramme complet du service',
        ],
        correctIndex: 0,
      },
      {
        title: 'Module 3 : Protection des données en direct',
        summary:
          'Appliquer les vérifications d’identité RGPD sans alourdir l’expérience client.',
        scenario:
          'Un interlocuteur demande une modification de coordonnées bancaires par téléphone.',
        imageUrl: GALLERY_IMAGES[2].url,
        blockType: 'narrative',
        takeaway:
          'Aucune donnée sensible ne se communique ni ne se modifie sans double contrôle.',
        flashcards: [
          {
            front: 'Double vérification',
            back: 'Confirmer deux informations non publiques avant toute action.',
          },
          {
            front: 'Minimisation',
            back: 'Ne consulter que les champs strictement utiles au dossier.',
          },
        ],
        steps: [
          { title: '1. Expliquer la sécurité', detail: 'Présenter la vérification comme une protection client.' },
          { title: '2. Contrôler 2 facteurs', detail: 'Valider l’identité avant modification.' },
          { title: '3. Tracer dans le CRM', detail: 'Horodater la vérification.' },
        ],
        quizQuestion:
          'Comment présenter la vérification d’identité au client ?',
        quizOptions: [
          'Comme une mesure dédiée à la protection de son compte',
          'Comme une contrainte administrative imposée',
          'En la contournant si le client est pressé',
        ],
        correctIndex: 0,
      },
    ]);
    setActiveModIdx(0);
    onToast(
      lang === 'fr'
        ? 'Modèle Articulate 360 chargé ! Vous pouvez personnaliser chaque bloc.'
        : 'Articulate 360 template loaded! You can customize every block.'
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (titleFr.trim().length < 3) {
      setStudioTab('identity');
      onToast(
        lang === 'fr'
          ? 'Renseignez un titre de cours d’au moins 3 caractères.'
          : 'Please enter a course title of at least 3 characters.'
      );
      return;
    }

    setSubmitting(true);
    try {
      await createCourseApi(token, {
        titleFr: titleFr.trim(),
        titleEn: titleEn.trim() || titleFr.trim(),
        categoryFr: categoryFr.trim() || 'Parcours',
        duration: duration.trim() || `${modules.length} Modules · 1h30`,
        skillId,
        imageUrl: coverImageUrl,
        formatLabel: 'Articulate 360',
        modules: modules.map((m, idx) => ({
          ...m,
          title: m.title.trim() || `Module ${idx + 1}`,
          summary:
            m.summary.trim() ||
            `Séquence interactive ${idx + 1} sur « ${titleFr.trim()} ».`,
          scenario:
            m.scenario.trim() ||
            `Cas terrain Connecteo pour le module ${idx + 1}.`,
          imageUrl: m.imageUrl || coverImageUrl,
          quizOptions: (m.quizOptions ?? []).map((o) => o.trim()).filter(Boolean),
        })),
      });
      onToast(
        lang === 'fr'
          ? 'Parcours Articulate 360 publié avec succès.'
          : 'Articulate 360 course published successfully.'
      );
      await onCreated();
      onClose();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erreur lors de la création.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#172b36]/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-course-heading"
    >
      <div className="bg-white border border-[#e5ecee] rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e5ecee] flex items-center justify-between gap-4 shrink-0">
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-[#087d7a]">
              Articulate 360 · Connecteo Studio
            </div>
            <h2 id="create-course-heading" className="text-base font-extrabold text-[#172b36]">
              {t(lang, 'createCourseTitle')}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadArticulatePreset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#b7e4e0] bg-[#effaf8] hover:bg-[#e1f5f2] text-[#087d7a] text-xs font-bold whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {lang === 'fr' ? 'Charger un modèle Articulate 360' : 'Load Articulate 360 template'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={t(lang, 'cancel')}
              className="p-1.5 rounded-lg text-[#64767e] hover:bg-[#f6f9fa]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Studio Tabs */}
        <div className="px-6 pt-3 pb-0 border-b border-[#e5ecee] flex items-center gap-2 bg-[#f6f9fa]/60 shrink-0">
          <button
            type="button"
            onClick={() => setStudioTab('identity')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              studioTab === 'identity'
                ? 'border-[#00afa9] text-[#087d7a]'
                : 'border-transparent text-[#64767e] hover:text-[#172b36]'
            }`}
          >
            1. {lang === 'fr' ? 'Identité & Couverture visuelle' : 'Identity & Visual Cover'}
          </button>
          <button
            type="button"
            onClick={() => setStudioTab('modules')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              studioTab === 'modules'
                ? 'border-[#00afa9] text-[#087d7a]'
                : 'border-transparent text-[#64767e] hover:text-[#172b36]'
            }`}
          >
            2. {lang === 'fr' ? `Modules interactifs (${modules.length})` : `Interactive Modules (${modules.length})`}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {studioTab === 'identity' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#64767e] mb-1">
                    {t(lang, 'courseTitleFr')}
                  </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    value={titleFr}
                    onChange={(e) => setTitleFr(e.target.value)}
                    placeholder="Communication assertive"
                    className="w-full px-3 py-2 text-xs bg-[#f6f9fa] border border-[#e5ecee] rounded-lg focus:outline-none focus:border-[#00afa9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#64767e] mb-1">
                    {t(lang, 'courseTitleEn')}
                  </label>
                  <input
                    type="text"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="Assertive communication"
                    className="w-full px-3 py-2 text-xs bg-[#f6f9fa] border border-[#e5ecee] rounded-lg focus:outline-none focus:border-[#00afa9]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#64767e] mb-1">
                    {t(lang, 'courseCategoryFr')}
                  </label>
                  <input
                    type="text"
                    value={categoryFr}
                    onChange={(e) => setCategoryFr(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#f6f9fa] border border-[#e5ecee] rounded-lg focus:outline-none focus:border-[#00afa9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#64767e] mb-1">
                    {t(lang, 'courseDurationFr')}
                  </label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#f6f9fa] border border-[#e5ecee] rounded-lg focus:outline-none focus:border-[#00afa9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#64767e] mb-1">
                    {t(lang, 'courseSkillLabel')}
                  </label>
                  <select
                    value={skillId}
                    onChange={(e) => setSkillId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#f6f9fa] border border-[#e5ecee] rounded-lg focus:outline-none focus:border-[#00afa9]"
                  >
                    {skills.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name[lang]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cover image picker + upload */}
              <div className="pt-2 border-t border-[#e5ecee] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-[#172b36]">
                      {lang === 'fr' ? 'Image de couverture du parcours' : 'Course cover image'}
                    </h3>
                    <p className="text-[11px] text-[#64767e]">
                      {lang === 'fr'
                        ? 'Choisissez un visuel Connecteo ou importez votre propre image (PNG, JPG, WebP · max 2 Mo).'
                        : 'Select a Connecteo visual or upload your own image (PNG, JPG, WebP · max 2 MB).'}
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#dce6e8] bg-white hover:bg-[#f6f9fa] text-xs font-bold text-[#172b36] cursor-pointer whitespace-nowrap">
                    <ImagePlus className="w-3.5 h-3.5 text-[#087d7a]" />
                    <span>{lang === 'fr' ? 'Importer une image' : 'Upload image'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(e) =>
                        handleImageFile(e.target.files?.[0], (url) => setCoverImageUrl(url))
                      }
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {GALLERY_IMAGES.map((img) => {
                    const selected = coverImageUrl === img.url;
                    return (
                      <button
                        key={img.url}
                        type="button"
                        onClick={() => setCoverImageUrl(img.url)}
                        className={`rounded-lg overflow-hidden border text-left transition-colors ${
                          selected
                            ? 'border-[#00afa9] ring-2 ring-[#00afa9]/20'
                            : 'border-[#e5ecee] hover:border-[#b7e4e0]'
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={lang === 'fr' ? img.labelFr : img.labelEn}
                          referrerPolicy="no-referrer"
                          className="w-full h-20 object-cover"
                        />
                        <div className="px-2 py-1.5 text-[11px] font-semibold text-[#172b36] truncate">
                          {lang === 'fr' ? img.labelFr : img.labelEn}
                        </div>
                      </button>
                    );
                  })}

                  <div className="rounded-lg overflow-hidden border border-[#e5ecee] bg-[#f6f9fa]">
                    <img
                      src={coverImageUrl}
                      alt={lang === 'fr' ? 'Aperçu couverture' : 'Cover preview'}
                      referrerPolicy="no-referrer"
                      className="w-full h-20 object-cover"
                    />
                    <div className="px-2 py-1.5 text-[11px] font-bold text-[#087d7a] truncate">
                      {lang === 'fr' ? 'Aperçu actif' : 'Active preview'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Module switcher bar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {modules.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveModIdx(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${
                        activeModIdx === idx
                          ? 'bg-[#e7f7f5] border-[#00afa9] text-[#087d7a]'
                          : 'bg-white border-[#e5ecee] text-[#64767e] hover:text-[#172b36]'
                      }`}
                    >
                      Module {idx + 1}
                    </button>
                  ))}
                  {modules.length < 4 && (
                    <button
                      type="button"
                      onClick={handleAddModule}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-[#00afa9] text-xs font-bold text-[#087d7a] hover:bg-[#effaf8] whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {lang === 'fr' ? 'Ajouter' : 'Add'}
                    </button>
                  )}
                </div>

                {modules.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveModule(activeModIdx)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#dc2626] hover:bg-[#fef2f2] whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {lang === 'fr' ? 'Supprimer ce module' : 'Remove module'}
                  </button>
                )}
              </div>

              {activeMod && (
                <div className="space-y-4 pt-2 border-t border-[#e5ecee]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#64767e] mb-1">
                        {lang === 'fr' ? 'Titre du module' : 'Module title'}
                      </label>
                      <input
                        type="text"
                        value={activeMod.title}
                        onChange={(e) => updateActiveModule({ title: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-[#f6f9fa] border border-[#e5ecee] rounded-lg focus:outline-none focus:border-[#00afa9]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#64767e] mb-1">
                        {lang === 'fr' ? 'Illustration du module' : 'Module illustration'}
                      </label>
                      <div className="flex items-center gap-2">
                        <img
                          src={activeMod.imageUrl || coverImageUrl}
                          alt={activeMod.title}
                          referrerPolicy="no-referrer"
                          className="w-12 h-9 rounded-md object-cover border border-[#e5ecee] shrink-0"
                        />
                        <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#dce6e8] bg-white hover:bg-[#f6f9fa] text-xs font-bold text-[#172b36] cursor-pointer whitespace-nowrap">
                          <ImagePlus className="w-3.5 h-3.5 text-[#087d7a]" />
                          <span>{lang === 'fr' ? 'Changer l’image' : 'Change image'}</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="sr-only"
                            onChange={(e) =>
                              handleImageFile(e.target.files?.[0], (url) =>
                                updateActiveModule({ imageUrl: url })
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Articulate 360 Block Type */}
                  <div>
                    <label className="block text-xs font-bold text-[#64767e] mb-1.5">
                      {lang === 'fr'
                        ? 'Bloc interactif Articulate 360'
                        : 'Articulate 360 interactive block'}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(
                        [
                          {
                            id: 'flashcards',
                            icon: Layers,
                            fr: 'Cartes à retourner',
                            en: 'Flip Flashcards',
                          },
                          {
                            id: 'steps',
                            icon: ListOrdered,
                            fr: 'Étapes guidées',
                            en: 'Interactive Steps',
                          },
                          {
                            id: 'narrative',
                            icon: BookOpen,
                            fr: 'Fiche visuelle',
                            en: 'Visual Narrative',
                          },
                        ] as Array<{
                          id: InteractiveBlockType;
                          icon: React.ComponentType<{ className?: string }>;
                          fr: string;
                          en: string;
                        }>
                      ).map((opt) => {
                        const Icon = opt.icon;
                        const selected = activeMod.blockType === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => updateActiveModule({ blockType: opt.id })}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-colors ${
                              selected
                                ? 'border-[#00afa9] bg-[#e7f7f5] text-[#087d7a]'
                                : 'border-[#e5ecee] bg-[#f6f9fa] text-[#53666f] hover:border-[#b7e4e0]'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{opt[lang]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {activeMod.blockType === 'flashcards' && (
                    <div className="space-y-2 p-3.5 rounded-xl bg-[#f6f9fa] border border-[#e5ecee]">
                      <div className="text-xs font-bold text-[#172b36]">
                        {lang === 'fr'
                          ? 'Contenu des cartes à retourner (Recto / Verso)'
                          : 'Flip flashcards content (Front / Back)'}
                      </div>
                      {(activeMod.flashcards ?? []).map((fc, fIdx) => (
                        <div key={fIdx} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={fc.front}
                            onChange={(e) => {
                              const next = [...(activeMod.flashcards ?? [])];
                              next[fIdx] = { ...fc, front: e.target.value };
                              updateActiveModule({ flashcards: next });
                            }}
                            placeholder={lang === 'fr' ? `Recto carte ${fIdx + 1}` : `Card ${fIdx + 1} front`}
                            className="px-3 py-1.5 text-xs bg-white border border-[#e5ecee] rounded-lg"
                          />
                          <input
                            type="text"
                            value={fc.back}
                            onChange={(e) => {
                              const next = [...(activeMod.flashcards ?? [])];
                              next[fIdx] = { ...fc, back: e.target.value };
                              updateActiveModule({ flashcards: next });
                            }}
                            placeholder={lang === 'fr' ? `Verso carte ${fIdx + 1}` : `Card ${fIdx + 1} back`}
                            className="px-3 py-1.5 text-xs bg-white border border-[#e5ecee] rounded-lg"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {activeMod.blockType === 'steps' && (
                    <div className="space-y-2 p-3.5 rounded-xl bg-[#f6f9fa] border border-[#e5ecee]">
                      <div className="text-xs font-bold text-[#172b36]">
                        {lang === 'fr'
                          ? 'Étapes interactives (1 à 3)'
                          : 'Interactive steps (1 to 3)'}
                      </div>
                      {(activeMod.steps ?? []).map((st, sIdx) => (
                        <div key={sIdx} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={st.title}
                            onChange={(e) => {
                              const next = [...(activeMod.steps ?? [])];
                              next[sIdx] = { ...st, title: e.target.value };
                              updateActiveModule({ steps: next });
                            }}
                            placeholder={lang === 'fr' ? `Titre étape ${sIdx + 1}` : `Step ${sIdx + 1} title`}
                            className="px-3 py-1.5 text-xs bg-white border border-[#e5ecee] rounded-lg"
                          />
                          <input
                            type="text"
                            value={st.detail}
                            onChange={(e) => {
                              const next = [...(activeMod.steps ?? [])];
                              next[sIdx] = { ...st, detail: e.target.value };
                              updateActiveModule({ steps: next });
                            }}
                            placeholder={lang === 'fr' ? `Explication détaillée` : `Detailed explanation`}
                            className="sm:col-span-2 px-3 py-1.5 text-xs bg-white border border-[#e5ecee] rounded-lg"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#64767e] mb-1">
                        {lang === 'fr' ? 'Synthèse pédagogique' : 'Learning summary'}
                      </label>
                      <textarea
                        rows={2}
                        value={activeMod.summary}
                        onChange={(e) => updateActiveModule({ summary: e.target.value })}
                        placeholder={
                          lang === 'fr'
                            ? 'Objectif concret de ce module...'
                            : 'Concrete objective of this module...'
                        }
                        className="w-full px-3 py-2 text-xs bg-[#f6f9fa] border border-[#e5ecee] rounded-lg focus:outline-none focus:border-[#00afa9]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#64767e] mb-1">
                        {t(lang, 'scenarioTitle')}
                      </label>
                      <textarea
                        rows={2}
                        value={activeMod.scenario}
                        onChange={(e) => updateActiveModule({ scenario: e.target.value })}
                        placeholder={
                          lang === 'fr'
                            ? 'Cas pratique Connecteo sur le terrain...'
                            : 'Connecteo field case...'
                        }
                        className="w-full px-3 py-2 text-xs bg-[#f6f9fa] border border-[#e5ecee] rounded-lg focus:outline-none focus:border-[#00afa9]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#64767e] mb-1">
                      {t(lang, 'takeawayTitle')}
                    </label>
                    <input
                      type="text"
                      value={activeMod.takeaway ?? ''}
                      onChange={(e) => updateActiveModule({ takeaway: e.target.value })}
                      placeholder={
                        lang === 'fr'
                          ? 'Ex. Toujours reformuler avant d’agir.'
                          : 'E.g. Always rephrase before acting.'
                      }
                      className="w-full px-3 py-2 text-xs bg-[#f6f9fa] border border-[#e5ecee] rounded-lg focus:outline-none focus:border-[#00afa9]"
                    />
                  </div>

                  {/* Quiz Editor */}
                  <div className="p-3.5 rounded-xl bg-[#f6f9fa] border border-[#e5ecee] space-y-2.5">
                    <div className="text-xs font-bold text-[#172b36]">
                      {t(lang, 'quizTitle')}
                    </div>
                    <input
                      type="text"
                      value={activeMod.quizQuestion ?? ''}
                      onChange={(e) => updateActiveModule({ quizQuestion: e.target.value })}
                      placeholder={
                        lang === 'fr'
                          ? 'Question de validation du module...'
                          : 'Module check question...'
                      }
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#e5ecee] rounded-lg"
                    />
                    <div className="space-y-1.5">
                      {(activeMod.quizOptions ?? ['', '', '']).map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${activeModIdx}`}
                            checked={(activeMod.correctIndex ?? 0) === oIdx}
                            onChange={() => updateActiveModule({ correctIndex: oIdx })}
                            aria-label={`Option ${oIdx + 1}`}
                            className="accent-[#00afa9]"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const next = [...(activeMod.quizOptions ?? ['', '', ''])];
                              next[oIdx] = e.target.value;
                              updateActiveModule({ quizOptions: next });
                            }}
                            placeholder={
                              lang === 'fr'
                                ? `Réponse ${oIdx + 1}${(activeMod.correctIndex ?? 0) === oIdx ? ' (bonne réponse)' : ''}`
                                : `Option ${oIdx + 1}${(activeMod.correctIndex ?? 0) === oIdx ? ' (correct)' : ''}`
                            }
                            className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#e5ecee] rounded-lg"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#e5ecee]">
            <div className="text-[11px] text-[#64767e]">
              {studioTab === 'identity'
                ? lang === 'fr'
                  ? 'Étape 1/2 · Personnalisez ensuite vos modules interactifs.'
                  : 'Step 1/2 · Next customize your interactive modules.'
                : `${modules.length} ${lang === 'fr' ? 'module(s) prêt(s)' : 'module(s) ready'}`}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-[#dce6e8] bg-white text-xs font-bold text-[#53666f] hover:bg-[#f6f9fa]"
              >
                {t(lang, 'cancel')}
              </button>
              {studioTab === 'identity' && (
                <button
                  type="button"
                  onClick={() => setStudioTab('modules')}
                  className="px-4 py-2 rounded-lg border border-[#00afa9] text-[#087d7a] hover:bg-[#effaf8] text-xs font-bold whitespace-nowrap"
                >
                  {lang === 'fr' ? 'Configurer les modules →' : 'Configure modules →'}
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-[#00afa9] hover:bg-[#087d7a] text-white text-xs font-bold disabled:opacity-60 whitespace-nowrap"
              >
                {submitting ? '...' : t(lang, 'saveCourse')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
