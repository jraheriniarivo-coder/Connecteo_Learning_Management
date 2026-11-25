import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  Lock,
  PlayCircle,
  RotateCw,
} from 'lucide-react';
import { motion } from 'motion/react';
import { submitLevelQuizApi } from '../api.ts';
import { t } from '../i18n.ts';
import type { Course, CourseLevel, Lang } from '../types.ts';

interface CoursePlayerViewProps {
  lang: Lang;
  token: string;
  course: Course;
  onBack: () => void;
  onProgressUpdated: () => Promise<void>;
  onToast: (msg: string) => void;
}

export const CoursePlayerView: React.FC<CoursePlayerViewProps> = ({
  lang,
  token,
  course,
  onBack,
  onProgressUpdated,
  onToast,
}) => {
  const firstPendingLevel =
    course.levels.find((l) => !course.completedLevels.includes(l.num))?.num ?? 1;
  const [activeLevelNum, setActiveLevelNum] = useState<number>(firstPendingLevel);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  const [heroImgError, setHeroImgError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const activeLevel: CourseLevel | undefined = course.levels.find(
    (l) => l.num === activeLevelNum
  );

  const heroImageUrl = activeLevel?.imageUrl || course.imageUrl;

  const isLevelUnlocked = (num: number): boolean => {
    if (num === 1) return true;
    return (
      course.completedLevels.includes(num) ||
      course.completedLevels.includes(num - 1)
    );
  };

  const handleSelectLevel = (num: number) => {
    setActiveLevelNum(num);
    setSelectedAnswers({});
    setFlippedCards({});
    setActiveStepIdx(0);
    setHeroImgError(false);
  };

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleValidateLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLevel) return;

    const answers = activeLevel.quiz.map((q) => selectedAnswers[q.id]);
    if (answers.some((a) => a === undefined)) {
      onToast(
        lang === 'fr'
          ? 'Veuillez répondre à chaque question avant de valider.'
          : 'Please answer every question before submitting.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitLevelQuizApi(
        token,
        course.id,
        activeLevel.num,
        answers as number[]
      );
      if (result.passed) {
        onToast(
          lang === 'fr'
            ? `Module ${activeLevel.num} validé avec un score de ${result.score}% !`
            : `Module ${activeLevel.num} completed with ${result.score}%!`
        );
        await onProgressUpdated();
        const nextNum = activeLevel.num + 1;
        if (nextNum <= course.levels.length) {
          handleSelectLevel(nextNum);
        }
      } else {
        onToast(
          lang === 'fr'
            ? `Score de ${result.score}%. Relisez la mise en situation et réessayez.`
            : `Score ${result.score}%. Review the scenario and try again.`
        );
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erreur de validation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#087d7a] hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t(lang, 'backToOverview')}
          </button>
          <h1 className="text-2xl font-extrabold text-[#172b36] tracking-tight">
            {course.title[lang]}
          </h1>
          <p className="text-xs text-[#64767e] mt-1">
            {course.formatLabel || 'Articulate 360'} · {course.category[lang]} ·{' '}
            {course.duration[lang]} · {course.owner}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white border border-[#e5ecee] rounded-xl px-4 py-3">
          <div className="text-right">
            <div className="text-[11px] font-semibold text-[#64767e]">
              {t(lang, 'progress')}
            </div>
            <div className="text-lg font-extrabold text-[#172b36] tabular-nums">
              {course.userProgress}%
            </div>
          </div>
          <div className="w-24 h-2 bg-[#edf2f3] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00afa9] transition-all duration-300"
              style={{ width: `${course.userProgress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Modules Rail */}
        <div className="lg:col-span-4 bg-white border border-[#e5ecee] rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-[#172b36] mb-3">
            {lang === 'fr'
              ? `Parcours en ${course.levels.length} modules`
              : `${course.levels.length}-module learning path`}
          </h2>
          {course.levels.map((lvl) => {
            const done = course.completedLevels.includes(lvl.num);
            const unlocked = isLevelUnlocked(lvl.num);
            const selected = activeLevelNum === lvl.num;

            return (
              <button
                key={lvl.num}
                type="button"
                disabled={!unlocked}
                onClick={() => handleSelectLevel(lvl.num)}
                className={`w-full text-left p-4 rounded-xl border transition-colors flex items-start justify-between gap-3 ${
                  selected
                    ? 'border-[#00afa9] bg-[#e7f7f5]/50'
                    : unlocked
                      ? 'border-[#e5ecee] bg-white hover:border-[#b7e4e0]'
                      : 'border-[#e5ecee] bg-[#f6f9fa] opacity-65 cursor-not-allowed'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#172b36] leading-snug">
                    {lvl.title[lang]}
                  </div>
                  <div className="text-[11px] text-[#64767e] mt-1 tabular-nums">
                    {lvl.durationMinutes} min ·{' '}
                    {done
                      ? t(lang, 'completed')
                      : unlocked
                        ? t(lang, 'unlocked')
                        : t(lang, 'locked')}
                  </div>
                </div>
                <span className="shrink-0 mt-0.5">
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-[#087d7a]" />
                  ) : unlocked ? (
                    <PlayCircle className="w-4 h-4 text-[#00afa9]" />
                  ) : (
                    <Lock className="w-4 h-4 text-[#91a0a6]" />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Interactive Rise-style Module + Quiz */}
        <div className="lg:col-span-8 bg-white border border-[#e5ecee] rounded-xl overflow-hidden">
          {activeLevel && (
            <motion.form
              key={activeLevel.num}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              onSubmit={handleValidateLevel}
              className="space-y-5"
            >
              {/* Hero banner */}
              <div className="relative h-44 w-full bg-[#edf4f5] overflow-hidden border-b border-[#e5ecee]">
                {!heroImgError && heroImageUrl ? (
                  <img
                    src={heroImageUrl}
                    alt={activeLevel.title[lang]}
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#d8f5ef] to-[#8adbd0] flex items-center justify-center text-[#087d7a]">
                    <BookOpen className="w-10 h-10 opacity-80" />
                  </div>
                )}
              </div>

              <div className="px-6 pb-6 space-y-5">
                <div>
                  <div className="text-[11px] font-bold text-[#087d7a] uppercase tracking-wider mb-1">
                    {t(lang, 'levelLabel')} {activeLevel.num} {t(lang, 'of')}{' '}
                    {course.levels.length} · {activeLevel.durationMinutes} min
                  </div>
                  <h2 className="text-xl font-extrabold text-[#172b36]">
                    {activeLevel.title[lang]}
                  </h2>
                  <p className="text-sm text-[#4c626c] mt-2 leading-relaxed">
                    {activeLevel.summary[lang]}
                  </p>
                </div>

                {/* Interactive Flashcards Block */}
                {activeLevel.blockType === 'flashcards' &&
                  activeLevel.flashcards &&
                  activeLevel.flashcards.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="text-xs font-bold text-[#172b36]">
                        {t(lang, 'flashcardsTitle')}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeLevel.flashcards.map((card, idx) => {
                          const flipped = Boolean(flippedCards[idx]);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() =>
                                setFlippedCards((prev) => ({
                                  ...prev,
                                  [idx]: !prev[idx],
                                }))
                              }
                              className={`text-left p-4 rounded-xl border transition-colors min-h-[108px] flex flex-col justify-between ${
                                flipped
                                  ? 'border-[#00afa9] bg-[#effaf8]'
                                  : 'border-[#e5ecee] bg-[#f6f9fa] hover:border-[#b7e4e0]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-[#087d7a]">
                                <span>
                                  {flipped
                                    ? lang === 'fr'
                                      ? 'Réponse clé'
                                      : 'Key answer'
                                    : lang === 'fr'
                                      ? 'Notion à découvrir'
                                      : 'Concept to reveal'}
                                </span>
                                <RotateCw className="w-3.5 h-3.5 shrink-0" />
                              </div>
                              <div className="text-xs font-semibold text-[#172b36] leading-relaxed mt-2">
                                {flipped ? card.back[lang] : card.front[lang]}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* Interactive Process Steps Block */}
                {activeLevel.blockType === 'steps' &&
                  activeLevel.steps &&
                  activeLevel.steps.length > 0 && (
                    <div className="space-y-3 p-4 rounded-xl bg-[#f6f9fa] border border-[#e5ecee]">
                      <div className="text-xs font-bold text-[#172b36]">
                        {t(lang, 'stepsTitle')}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activeLevel.steps.map((step, idx) => {
                          const isCurrent = activeStepIdx === idx;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveStepIdx(idx)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                isCurrent
                                  ? 'border-[#00afa9] bg-[#00afa9] text-white'
                                  : 'border-[#dce6e8] bg-white text-[#4c626c] hover:border-[#00afa9]'
                              }`}
                            >
                              {step.title[lang]}
                            </button>
                          );
                        })}
                      </div>
                      {activeLevel.steps[activeStepIdx] && (
                        <div className="p-3.5 rounded-lg bg-white border border-[#e5ecee] text-xs text-[#172b36] leading-relaxed">
                          {activeLevel.steps[activeStepIdx].detail[lang]}
                        </div>
                      )}
                    </div>
                  )}

                {/* Key Takeaway Callout */}
                {activeLevel.takeaway && (
                  <div className="p-4 rounded-xl bg-[#effaf8] border border-[#b7e4e0] flex items-start gap-3">
                    <Lightbulb className="w-4 h-4 text-[#087d7a] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-[#087d7a] mb-0.5">
                        {t(lang, 'takeawayTitle')}
                      </div>
                      <p className="text-xs text-[#172b36] leading-relaxed">
                        {activeLevel.takeaway[lang]}
                      </p>
                    </div>
                  </div>
                )}

                {/* Scenario */}
                <div className="p-4 rounded-xl bg-[#f6f9fa] border border-[#e5ecee]">
                  <div className="text-xs font-bold text-[#172b36] mb-1">
                    {t(lang, 'scenarioTitle')}
                  </div>
                  <p className="text-xs text-[#4c626c] leading-relaxed">
                    {activeLevel.scenario[lang]}
                  </p>
                </div>

                {/* Quiz */}
                <div className="pt-2 border-t border-[#e5ecee] space-y-4">
                  <h3 className="text-sm font-bold text-[#172b36]">
                    {t(lang, 'quizTitle')}
                  </h3>
                  {activeLevel.quiz.map((q, qIndex) => (
                    <div key={q.id} className="space-y-2">
                      <p className="text-xs font-semibold text-[#172b36]">
                        {qIndex + 1}. {q.question[lang]}
                      </p>
                      <div className="space-y-1.5">
                        {q.options.map((opt, oIndex) => {
                          const checked = selectedAnswers[q.id] === oIndex;
                          return (
                            <label
                              key={oIndex}
                              className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                                checked
                                  ? 'border-[#00afa9] bg-[#e7f7f5]/60 text-[#172b36] font-semibold'
                                  : 'border-[#e5ecee] text-[#4c626c] hover:bg-[#f6f9fa]'
                              }`}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                checked={checked}
                                onChange={() => handleSelectOption(q.id, oIndex)}
                                className="accent-[#00afa9]"
                              />
                              <span>{opt[lang]}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-lg bg-[#00afa9] hover:bg-[#087d7a] text-white text-xs font-bold transition-colors disabled:opacity-60 whitespace-nowrap"
                  >
                    {submitting ? '...' : t(lang, 'validateLevel')}
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </div>
      </div>
    </div>
  );
};
