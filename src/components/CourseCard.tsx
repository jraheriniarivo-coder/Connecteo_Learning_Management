import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { t } from '../i18n.ts';
import type { Course, Lang } from '../types.ts';

interface CourseCardProps {
  lang: Lang;
  course: Course;
  onOpen: (courseId: number) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ lang, course, onOpen }) => {
  const [imgError, setImgError] = useState(false);

  const fallbackClass =
    course.accentTheme === 'blue'
      ? 'from-[#e6eeff] to-[#b9caff] text-[#355194]'
      : course.accentTheme === 'orange'
        ? 'from-[#fff0d9] to-[#f5cc91] text-[#985c22]'
        : 'from-[#d8f5ef] to-[#8adbd0] text-[#087d7a]';

  const statusLabel =
    course.userProgress >= 100
      ? t(lang, 'completed')
      : course.userProgress > 0
        ? t(lang, 'inProgress')
        : t(lang, 'start');

  const actionLabel =
    course.userProgress >= 100
      ? t(lang, 'open')
      : course.userProgress > 0
        ? t(lang, 'continue')
        : t(lang, 'start');

  return (
    <article className="bg-white border border-[#e5ecee] rounded-xl overflow-hidden flex flex-col transition-colors hover:border-[#b7e4e0]">
      <div className="relative h-28 w-full overflow-hidden bg-[#f6f9fa]">
        {!imgError && course.imageUrl ? (
          <img
            src={course.imageUrl}
            alt={course.title[lang]}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${fallbackClass} flex items-center justify-center`}
          >
            <BookOpen className="w-8 h-8 opacity-80" />
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="text-[11px] font-medium text-[#64767e] flex items-center gap-1.5 mb-1.5">
          <span>{course.category[lang]}</span>
          <span aria-hidden="true">·</span>
          <span>{course.duration[lang]}</span>
        </div>

        <h3 className="text-sm font-bold text-[#172b36] leading-snug mb-1 line-clamp-2 min-h-[2.5rem]">
          {course.title[lang]}
        </h3>

        <div className="text-[11px] text-[#89999f] mb-4">{course.owner}</div>

        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#64767e]">
            <span>{statusLabel}</span>
            <strong className="text-[#172b36] tabular-nums">{course.userProgress}%</strong>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#edf2f3] overflow-hidden">
            <div
              className="h-full bg-[#00afa9] rounded-full transition-all duration-300"
              style={{ width: `${course.userProgress}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => onOpen(course.id)}
            className="mt-3 w-full py-2 px-3 rounded-lg border border-[#dce6e8] bg-white hover:bg-[#effaf8] hover:border-[#00afa9] text-[#087d7a] text-xs font-bold transition-colors whitespace-nowrap"
          >
            {actionLabel} →
          </button>
        </div>
      </div>
    </article>
  );
};
