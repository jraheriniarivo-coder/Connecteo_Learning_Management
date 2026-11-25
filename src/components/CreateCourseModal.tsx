import React, { useState } from 'react';
import { X } from 'lucide-react';
import { createCourseApi } from '../api.ts';
import { t } from '../i18n.ts';
import type { Lang, SkillSummary } from '../types.ts';

interface CreateCourseModalProps {
  lang: Lang;
  token: string;
  skills: SkillSummary[];
  onClose: () => void;
  onCreated: () => Promise<void>;
  onToast: (msg: string) => void;
}

export const CreateCourseModal: React.FC<CreateCourseModalProps> = ({
  lang,
  token,
  skills,
  onClose,
  onCreated,
  onToast,
}) => {
  const [titleFr, setTitleFr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [categoryFr, setCategoryFr] = useState('Parcours');
  const [duration, setDuration] = useState('4 Modules · 1h30');
  const [skillId, setSkillId] = useState(skills[0]?.id ?? 'intellectual-agility');
  const [level1, setLevel1] = useState('');
  const [level2, setLevel2] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createCourseApi(token, {
        titleFr,
        titleEn: titleEn || titleFr,
        categoryFr,
        duration,
        skillId,
        levelTitles: [level1, level2].filter(Boolean),
      });
      onToast(
        lang === 'fr' ? 'Nouveau parcours créé avec succès.' : 'New course created successfully.'
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#172b36]/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-course-heading"
    >
      <div className="bg-white border border-[#e5ecee] rounded-xl shadow-lg w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 id="create-course-heading" className="text-base font-extrabold text-[#172b36]">
            {t(lang, 'createCourseTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(lang, 'cancel')}
            className="p-1.5 rounded-lg text-[#64767e] hover:bg-[#f6f9fa]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#64767e] mb-1">
                {lang === 'fr' ? 'Titre Niveau 1 (optionnel)' : 'Level 1 title (optional)'}
              </label>
              <input
                type="text"
                value={level1}
                onChange={(e) => setLevel1(e.target.value)}
                placeholder={lang === 'fr' ? 'Fondamentaux' : 'Fundamentals'}
                className="w-full px-3 py-2 text-xs bg-[#f6f9fa] border border-[#e5ecee] rounded-lg focus:outline-none focus:border-[#00afa9]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#64767e] mb-1">
                {lang === 'fr' ? 'Titre Niveau 2 (optionnel)' : 'Level 2 title (optional)'}
              </label>
              <input
                type="text"
                value={level2}
                onChange={(e) => setLevel2(e.target.value)}
                placeholder={lang === 'fr' ? 'Mise en pratique' : 'Practice'}
                className="w-full px-3 py-2 text-xs bg-[#f6f9fa] border border-[#e5ecee] rounded-lg focus:outline-none focus:border-[#00afa9]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5ecee]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#dce6e8] bg-white text-xs font-bold text-[#53666f] hover:bg-[#f6f9fa]"
            >
              {t(lang, 'cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-[#00afa9] hover:bg-[#087d7a] text-white text-xs font-bold disabled:opacity-60"
            >
              {submitting ? '...' : t(lang, 'saveCourse')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
