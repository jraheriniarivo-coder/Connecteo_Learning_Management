import React, { useState } from 'react';
import { Award, CheckCircle2, Clock, Download, Plus, Users } from 'lucide-react';
import { t } from '../i18n.ts';
import type { DashboardPayload, Lang, Role, ViewId } from '../types.ts';
import { CourseCard } from './CourseCard.tsx';

interface OverviewViewProps {
  lang: Lang;
  data: DashboardPayload;
  effectiveRole: Role;
  actualRole: Role;
  onNavigate: (view: ViewId) => void;
  onOpenCourse: (courseId: number) => void;
  onOpenCreateCourse: () => void;
  onExportCsv: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  lang,
  data,
  effectiveRole,
  actualRole,
  onNavigate,
  onOpenCourse,
  onOpenCreateCourse,
  onExportCsv,
}) => {
  const [period, setPeriod] = useState<'6' | '3'>('6');
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const canCreateCourse =
    effectiveRole === 'admin' ||
    effectiveRole === 'management' ||
    effectiveRole === 'trainer';
  const canExport = effectiveRole !== 'staff';
  const showKpis = effectiveRole !== 'staff';
  const showReportsLink =
    effectiveRole === 'admin' ||
    effectiveRole === 'management' ||
    effectiveRole === 'manager';

  const roleHeadingKey: Record<
    Role,
    'roleManagement' | 'roleTrainer' | 'roleManager' | 'roleStaff' | 'roleAdmin'
  > = {
    management: 'roleManagement',
    trainer: 'roleTrainer',
    manager: 'roleManager',
    staff: 'roleStaff',
    admin: 'roleAdmin',
  };

  const chartPoints = period === '3' ? data.chart.slice(-3) : data.chart;

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-[#0b9892] uppercase mb-1">
            {t(lang, 'dashboard')}
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172b36] tracking-tight">
            {t(lang, roleHeadingKey[effectiveRole])}{' '}
            <span className="text-[#00afa9] font-normal">· {data.user.name}</span>
          </h1>
          <p className="text-xs text-[#64767e] mt-1">{t(lang, 'welcomeSub')}</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {canExport && (
            <button
              type="button"
              onClick={onExportCsv}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#dce6e8] bg-white hover:bg-[#f6f9fa] text-xs font-bold text-[#53666f] transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              {t(lang, 'export')}
            </button>
          )}
          {canCreateCourse && (
            <button
              type="button"
              onClick={onOpenCreateCourse}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#00afa9] hover:bg-[#087d7a] text-white text-xs font-bold transition-colors shadow-sm whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              {t(lang, 'newCourse')}
            </button>
          )}
        </div>
      </div>

      {/* Role Preview Notice or Operational Status */}
      {effectiveRole !== actualRole ? (
        <div className="px-4 py-3 rounded-xl border border-[#f1dfb6] bg-[#fffaf0] text-[#866c35] text-xs flex flex-wrap items-center gap-2">
          <strong>{t(lang, 'previewBannerTitle')} :</strong>
          <span>{t(lang, 'previewBannerText')}</span>
        </div>
      ) : (
        <div className="px-4 py-3 rounded-xl border border-[#dce6e8] bg-white text-[#4c626c] text-xs flex flex-wrap items-center gap-2">
          <strong className="text-[#087d7a]">{t(lang, 'demoMode')} :</strong>
          <span>{t(lang, 'demoText')}</span>
        </div>
      )}

      {/* KPI Grid */}
      {showKpis && (
        <section
          aria-label="Indicateurs clés"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        >
          <article className="bg-white border border-[#e5ecee] rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-[#64777f]">
              <span>{t(lang, 'activeLearners')}</span>
              <span className="w-8 h-8 rounded-lg bg-[#e7f7f5] text-[#087d7a] grid place-items-center">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="text-3xl font-extrabold text-[#172b36] mt-3 mb-1.5 tabular-nums">
              {data.kpis.activeLearners}
            </div>
            <div className="text-[11px] text-[#89999f]">{t(lang, 'vsLastMonth')}</div>
          </article>

          <article className="bg-white border border-[#e5ecee] rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-[#64777f]">
              <span>{t(lang, 'completionRate')}</span>
              <span className="w-8 h-8 rounded-lg bg-[#eaf1ff] text-[#4567b7] grid place-items-center">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="text-3xl font-extrabold text-[#172b36] mt-3 mb-1.5 tabular-nums">
              {data.kpis.completionRate}
              <span className="text-base font-bold ml-0.5">%</span>
            </div>
            <div className="text-[11px] text-[#89999f]">{t(lang, 'vsLastMonth')}</div>
          </article>

          <article className="bg-white border border-[#e5ecee] rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-[#64777f]">
              <span>{t(lang, 'avgScore')}</span>
              <span className="w-8 h-8 rounded-lg bg-[#f0eaff] text-[#7351b3] grid place-items-center">
                <Award className="w-4 h-4" />
              </span>
            </div>
            <div className="text-3xl font-extrabold text-[#172b36] mt-3 mb-1.5 tabular-nums">
              {data.kpis.avgScore !== null ? (
                <>
                  {data.kpis.avgScore}
                  <span className="text-base font-bold ml-0.5">%</span>
                </>
              ) : (
                '—'
              )}
            </div>
            <div className="text-[11px] text-[#89999f]">{t(lang, 'vsLastMonth')}</div>
          </article>

          <article className="bg-white border border-[#e5ecee] rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-[#64777f]">
              <span>{t(lang, 'hoursLearned')}</span>
              <span className="w-8 h-8 rounded-lg bg-[#fff2e4] text-[#b9742a] grid place-items-center">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="text-3xl font-extrabold text-[#172b36] mt-3 mb-1.5 tabular-nums">
              {data.kpis.hoursLearned}
              <span className="text-base font-bold ml-0.5">h</span>
            </div>
            <div className="text-[11px] text-[#89999f]">{t(lang, 'vsLastMonth')}</div>
          </article>
        </section>
      )}

      {/* Chart & Development Priorities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <section className="lg:col-span-7 bg-white border border-[#e5ecee] rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-sm font-bold text-[#172b36]">
                {t(lang, 'learningActivity')}
              </h2>
              <p className="text-xs text-[#64767e] mt-0.5">{t(lang, 'activitySub')}</p>
            </div>
            <select
              aria-label={t(lang, 'learningActivity')}
              value={period}
              onChange={(e) => setPeriod(e.target.value as '6' | '3')}
              className="px-2.5 py-1.5 rounded-lg border border-[#e5ecee] bg-white text-xs text-[#172b36]"
            >
              <option value="6">{t(lang, 'last6')}</option>
              <option value="3">{t(lang, 'last3')}</option>
            </select>
          </div>

          <div className="h-48 flex gap-3">
            <div className="flex flex-col justify-between pb-6 text-[10px] text-[#91a0a6] w-8 text-right tabular-nums">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>
            <div className="relative flex-1 flex flex-col">
              <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
                {[0, 1, 2, 3, 4].map((line) => (
                  <div key={line} className="border-t border-dashed border-[#e9eff0] w-full" />
                ))}
              </div>

              <div className="relative flex-1 flex items-end justify-around gap-3 px-2 pb-6">
                {chartPoints.map((pt) => (
                  <div
                    key={pt.key}
                    onMouseEnter={() => setHoveredMonth(pt.key)}
                    onMouseLeave={() => setHoveredMonth(null)}
                    className="relative h-full flex-1 max-w-[48px] flex items-end gap-1.5"
                  >
                    {hoveredMonth === pt.key && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-[#172b36] text-white text-[10px] font-bold whitespace-nowrap tabular-nums z-10">
                        {pt.actual}% / {pt.target}%
                      </div>
                    )}
                    <div
                      className="w-1/2 rounded-t bg-[#00afa9] transition-all duration-300 min-h-[3px]"
                      style={{ height: `${pt.actual}%` }}
                    />
                    <div
                      className="w-1/2 rounded-t bg-[#d8efed] min-h-[3px]"
                      style={{ height: `${pt.target}%` }}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-around text-[11px] text-[#64767e] pt-1">
                {chartPoints.map((pt) => (
                  <span key={pt.key}>{pt.label[lang]}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 mt-3 text-[11px] text-[#64767e]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#00afa9]" />
              {t(lang, 'completion')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#d8efed]" />
              {t(lang, 'target')}
            </span>
          </div>
        </section>

        <section className="lg:col-span-5 bg-white border border-[#e5ecee] rounded-xl p-5 flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-sm font-bold text-[#172b36]">
                {t(lang, 'prioritySkills')}
              </h2>
              <p className="text-xs text-[#64767e] mt-0.5">{t(lang, 'skillsSub')}</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('skills')}
              className="text-xs font-bold text-[#087d7a] hover:underline whitespace-nowrap shrink-0"
            >
              {t(lang, 'seeAll')}
            </button>
          </div>

          <div className="space-y-5 flex-1">
            {data.skills.map((skill) => (
              <div key={skill.id}>
                <div className="flex items-center justify-between text-xs font-semibold text-[#172b36] mb-1.5">
                  <span>{skill.name[lang]}</span>
                  <span className="text-[#087d7a]">{t(lang, skill.statusKey)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#edf2f3] overflow-hidden">
                  <div
                    className="h-full bg-[#00afa9] rounded-full transition-all duration-300"
                    style={{ width: `${skill.progressPercent}%` }}
                  />
                </div>
                <div className="text-[11px] text-[#89999f] mt-1.5 tabular-nums">
                  {t(lang, 'levelLabel')} {skill.currentLevel} {t(lang, 'of')}{' '}
                  {skill.maxLevel}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Featured Courses */}
      <section className="bg-white border border-[#e5ecee] rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-sm font-bold text-[#172b36]">
              {t(lang, 'featuredCourses')}
            </h2>
            <p className="text-xs text-[#64767e] mt-0.5">{t(lang, 'coursesSub')}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('courses')}
            className="text-xs font-bold text-[#087d7a] hover:underline whitespace-nowrap shrink-0"
          >
            {t(lang, 'viewCatalog')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.courses.slice(0, 3).map((course) => (
            <CourseCard
              key={course.id}
              lang={lang}
              course={course}
              onOpen={onOpenCourse}
            />
          ))}
        </div>
      </section>

      {/* Recent Activity Table */}
      <section className="bg-white border border-[#e5ecee] rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-bold text-[#172b36]">
              {t(lang, 'recentActivity')}
            </h2>
            <p className="text-xs text-[#64767e] mt-0.5">{t(lang, 'recentSub')}</p>
          </div>
          {showReportsLink && (
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs font-bold text-[#087d7a] hover:underline whitespace-nowrap shrink-0"
            >
              {t(lang, 'viewReport')}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-[#e5ecee] text-[10px] font-bold tracking-wider text-[#91a0a6]">
                <th className="py-2.5 px-3">{t(lang, 'learner')}</th>
                <th className="py-2.5 px-3">{t(lang, 'course')}</th>
                <th className="py-2.5 px-3">{t(lang, 'progress')}</th>
                <th className="py-2.5 px-3">{t(lang, 'score')}</th>
                <th className="py-2.5 px-3">{t(lang, 'status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f3f4] text-xs text-[#4c626c]">
              {data.assignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#64767e]">
                    {t(lang, 'noActivity')}
                  </td>
                </tr>
              ) : (
                data.assignments.slice(0, 6).map((item) => (
                  <tr key={item.id} className="hover:bg-[#f6f9fa]/70">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full bg-[#e7f7f5] text-[#087d7a] text-[10px] font-extrabold grid place-items-center shrink-0">
                          {item.learnerInitials}
                        </span>
                        <span className="font-bold text-[#172b36]">
                          {item.learnerName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">{item.courseTitle[lang]}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-[#edf2f3] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#00afa9]"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-[11px]">{item.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 tabular-nums">
                      {item.score !== null ? `${item.score}%` : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[11px] font-bold ${
                          item.status === 'completed'
                            ? 'text-[#16a34a]'
                            : item.status === 'late'
                              ? 'text-[#dc2626]'
                              : 'text-[#087d7a]'
                        }`}
                      >
                        {t(lang, item.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
