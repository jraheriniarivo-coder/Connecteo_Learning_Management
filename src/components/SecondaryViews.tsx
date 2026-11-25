import React, { useState } from 'react';
import { Download, Plus, Search, ShieldCheck, UserPlus } from 'lucide-react';
import { createAssignmentApi, createUserApi, updateUserRoleApi } from '../api.ts';
import { roleLabels, t } from '../i18n.ts';
import type { DashboardPayload, Lang, Role } from '../types.ts';
import { CourseCard } from './CourseCard.tsx';

interface SecondaryViewProps {
  lang: Lang;
  token: string;
  data: DashboardPayload;
  effectiveRole: Role;
  onOpenCourse: (courseId: number) => void;
  onOpenCreateCourse: () => void;
  onRefresh: () => Promise<void>;
  onExportCsv: () => void;
  onToggleLang: () => void;
  onToast: (msg: string) => void;
}

export const CoursesCatalogView: React.FC<SecondaryViewProps> = ({
  lang,
  data,
  effectiveRole,
  onOpenCourse,
  onOpenCreateCourse,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'inProgress' | 'notStarted' | 'completed'>('all');

  const canCreate =
    effectiveRole === 'admin' ||
    effectiveRole === 'management' ||
    effectiveRole === 'trainer';

  const filtered = data.courses.filter((c) => {
    const matchesQuery = c.title[lang].toLowerCase().includes(query.toLowerCase());
    if (!matchesQuery) return false;
    if (filter === 'inProgress') return c.userProgress > 0 && c.userProgress < 100;
    if (filter === 'notStarted') return c.userProgress === 0;
    if (filter === 'completed') return c.userProgress >= 100;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172b36] tracking-tight">
            {t(lang, 'courses')}
          </h1>
          <p className="text-xs text-[#64767e] mt-1">{t(lang, 'coursesSub')}</p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={onOpenCreateCourse}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#00afa9] hover:bg-[#087d7a] text-white text-xs font-bold whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {t(lang, 'newCourse')}
          </button>
        )}
      </div>

      <div className="bg-white border border-[#e5ecee] rounded-xl p-5 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#91a0a6] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(lang, 'searchCourses')}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#f6f9fa] border border-[#e5ecee] rounded-lg focus:outline-none focus:border-[#00afa9]"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#f6f9fa] border border-[#e5ecee] rounded-lg overflow-x-auto">
            {(
              [
                ['all', 'filterAll'],
                ['inProgress', 'filterInProgress'],
                ['notStarted', 'filterNotStarted'],
                ['completed', 'filterCompleted'],
              ] as const
            ).map(([key, labelKey]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  filter === key
                    ? 'bg-white text-[#087d7a] shadow-sm'
                    : 'text-[#64767e] hover:text-[#172b36]'
                }`}
              >
                {t(lang, labelKey)}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#64767e] border border-dashed border-[#dce6e8] rounded-xl">
            {lang === 'fr' ? 'Aucun cours ne correspond à votre recherche.' : 'No courses match your filter.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((course) => (
              <CourseCard
                key={course.id}
                lang={lang}
                course={course}
                onOpen={onOpenCourse}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const AssignmentsView: React.FC<SecondaryViewProps> = ({
  lang,
  token,
  data,
  effectiveRole,
  onOpenCourse,
  onRefresh,
  onToast,
}) => {
  const canAssign =
    effectiveRole === 'admin' ||
    effectiveRole === 'management' ||
    effectiveRole === 'trainer' ||
    effectiveRole === 'manager';

  const usersList = data.users ?? [data.user];
  const [learnerId, setLearnerId] = useState(usersList[0]?.id ?? data.user.id);
  const [courseId, setCourseId] = useState(data.courses[0]?.id ?? 1);
  const [dueDate, setDueDate] = useState('2026-12-20');
  const [submitting, setSubmitting] = useState(false);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createAssignmentApi(token, { learnerId, courseId: Number(courseId), dueDate });
      onToast(lang === 'fr' ? 'Formation affectée avec succès.' : 'Course assigned successfully.');
      await onRefresh();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-[#172b36] tracking-tight">
          {t(lang, 'assignments')}
        </h1>
        <p className="text-xs text-[#64767e] mt-1">
          {lang === 'fr'
            ? 'Planification des parcours, échéances et suivi individuel.'
            : 'Path scheduling, deadlines, and individual progress tracking.'}
        </p>
      </div>

      {canAssign && (
        <form
          onSubmit={handleAssign}
          className="bg-white border border-[#e5ecee] rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-bold text-[#64767e] mb-1">
              {t(lang, 'selectLearner')}
            </label>
            <select
              value={learnerId}
              onChange={(e) => setLearnerId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#f6f9fa] border border-[#e5ecee] rounded-lg"
            >
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({roleLabels[u.role][lang]})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#64767e] mb-1">
              {t(lang, 'selectCourse')}
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-[#f6f9fa] border border-[#e5ecee] rounded-lg"
            >
              {data.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title[lang]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#64767e] mb-1">
              {t(lang, 'dueDate')}
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs bg-[#f6f9fa] border border-[#e5ecee] rounded-lg"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-[#00afa9] hover:bg-[#087d7a] text-white text-xs font-bold whitespace-nowrap"
          >
            {submitting ? '...' : t(lang, 'assignSubmit')}
          </button>
        </form>
      )}

      <div className="bg-white border border-[#e5ecee] rounded-xl p-5 overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b border-[#e5ecee] text-[10px] font-bold tracking-wider text-[#91a0a6]">
              <th className="py-2.5 px-3">{t(lang, 'learner')}</th>
              <th className="py-2.5 px-3">{t(lang, 'course')}</th>
              <th className="py-2.5 px-3">{t(lang, 'dueDate')}</th>
              <th className="py-2.5 px-3">{t(lang, 'progress')}</th>
              <th className="py-2.5 px-3">{t(lang, 'status')}</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f3f4] text-xs text-[#4c626c]">
            {data.assignments.map((asg) => (
              <tr key={asg.id} className="hover:bg-[#f6f9fa]/70">
                <td className="py-3 px-3 font-bold text-[#172b36]">{asg.learnerName}</td>
                <td className="py-3 px-3">{asg.courseTitle[lang]}</td>
                <td className="py-3 px-3 tabular-nums">{asg.dueDate}</td>
                <td className="py-3 px-3 tabular-nums">{asg.progress}%</td>
                <td className="py-3 px-3">
                  <span
                    className={`font-bold ${
                      asg.status === 'completed'
                        ? 'text-[#16a34a]'
                        : asg.status === 'late'
                          ? 'text-[#dc2626]'
                          : 'text-[#087d7a]'
                    }`}
                  >
                    {t(lang, asg.status)}
                  </span>
                </td>
                <td className="py-3 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => onOpenCourse(asg.courseId)}
                    className="text-xs font-bold text-[#087d7a] hover:underline"
                  >
                    {t(lang, 'open')} →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const SkillsView: React.FC<SecondaryViewProps> = ({ lang, data, onOpenCourse }) => (
  <div className="space-y-5">
    <div>
      <h1 className="text-2xl font-extrabold text-[#172b36] tracking-tight">
        {t(lang, 'skills')}
      </h1>
      <p className="text-xs text-[#64767e] mt-1">
        {lang === 'fr'
          ? 'Référentiel de compétences Connecteo et progression par niveau.'
          : 'Connecteo competency framework and level progression.'}
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {data.skills.map((skill) => (
        <article
          key={skill.id}
          className="bg-white border border-[#e5ecee] rounded-xl p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold text-[#087d7a]">
                {t(lang, skill.statusKey)}
              </span>
              <span className="text-[11px] font-bold text-[#64767e] tabular-nums">
                {t(lang, 'levelLabel')} {skill.currentLevel}/{skill.maxLevel}
              </span>
            </div>
            <h2 className="text-base font-bold text-[#172b36] mb-1.5">{skill.name[lang]}</h2>
            <p className="text-xs text-[#64767e] leading-relaxed mb-4">
              {skill.description[lang]}
            </p>
          </div>

          <div className="space-y-3">
            <div className="h-2 rounded-full bg-[#edf2f3] overflow-hidden">
              <div
                className="h-full bg-[#00afa9] rounded-full transition-all duration-300"
                style={{ width: `${skill.progressPercent}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => onOpenCourse(skill.linkedCourseId)}
              className="w-full py-2 px-3 rounded-lg border border-[#dce6e8] text-xs font-bold text-[#087d7a] hover:bg-[#effaf8]"
            >
              {lang === 'fr' ? 'Ouvrir le parcours associé →' : 'Open linked course →'}
            </button>
          </div>
        </article>
      ))}
    </div>
  </div>
);

export const ReportsView: React.FC<SecondaryViewProps> = ({ lang, data, onExportCsv }) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'inProgress' | 'completed' | 'late'>('all');

  const rows = data.assignments.filter((a) =>
    statusFilter === 'all' ? true : a.status === statusFilter
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172b36] tracking-tight">
            {t(lang, 'reports')}
          </h1>
          <p className="text-xs text-[#64767e] mt-1">
            {lang === 'fr'
              ? 'Suivi détaillé des résultats et export CSV sécurisé.'
              : 'Detailed performance tracking and sanitized CSV export.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onExportCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#00afa9] hover:bg-[#087d7a] text-white text-xs font-bold whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          {t(lang, 'export')}
        </button>
      </div>

      <div className="bg-white border border-[#e5ecee] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-1 p-1 bg-[#f6f9fa] border border-[#e5ecee] rounded-lg w-fit">
          {(['all', 'inProgress', 'completed', 'late'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-white text-[#087d7a] shadow-sm'
                  : 'text-[#64767e] hover:text-[#172b36]'
              }`}
            >
              {st === 'all' ? t(lang, 'filterAll') : t(lang, st)}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-[#e5ecee] text-[10px] font-bold tracking-wider text-[#91a0a6]">
                <th className="py-2.5 px-3">{t(lang, 'learner')}</th>
                <th className="py-2.5 px-3">{t(lang, 'course')}</th>
                <th className="py-2.5 px-3">{t(lang, 'progress')}</th>
                <th className="py-2.5 px-3">{t(lang, 'score')}</th>
                <th className="py-2.5 px-3">{t(lang, 'dueDate')}</th>
                <th className="py-2.5 px-3">{t(lang, 'status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f3f4] text-xs text-[#4c626c]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#64767e]">
                    {t(lang, 'noActivity')}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 px-3 font-bold text-[#172b36]">{r.learnerName}</td>
                    <td className="py-3 px-3">{r.courseTitle[lang]}</td>
                    <td className="py-3 px-3 tabular-nums">{r.progress}%</td>
                    <td className="py-3 px-3 tabular-nums">
                      {r.score !== null ? `${r.score}%` : '—'}
                    </td>
                    <td className="py-3 px-3 tabular-nums">{r.dueDate}</td>
                    <td className="py-3 px-3 font-bold">{t(lang, r.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const SettingsView: React.FC<SecondaryViewProps> = ({
  lang,
  token,
  data,
  onRefresh,
  onToggleLang,
  onToast,
}) => {
  const isAdmin = data.user.role === 'admin' || data.user.role === 'management';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('staff');
  const [creating, setCreating] = useState(false);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createUserApi(token, { name, email, password, role });
      setName('');
      setEmail('');
      setPassword('');
      onToast(lang === 'fr' ? 'Compte utilisateur créé.' : 'User account created.');
      await onRefresh();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, nextRole: Role) => {
    try {
      await updateUserRoleApi(token, userId, nextRole);
      onToast(lang === 'fr' ? 'Rôle mis à jour.' : 'Role updated.');
      await onRefresh();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erreur.');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-[#172b36] tracking-tight">
          {t(lang, 'settings')}
        </h1>
        <p className="text-xs text-[#64767e] mt-1">
          {lang === 'fr'
            ? 'Préférences d’affichage, gestion des comptes et sécurité.'
            : 'Display preferences, account management, and security.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-[#e5ecee] rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-[#172b36]">{t(lang, 'languagePref')}</h2>
          <p className="text-xs text-[#64767e]">
            {data.user.name} · {data.user.email} · {roleLabels[data.user.role][lang]}
          </p>
          <button
            type="button"
            onClick={onToggleLang}
            className="px-4 py-2 rounded-lg border border-[#dce6e8] bg-white hover:bg-[#f6f9fa] text-xs font-bold text-[#172b36]"
          >
            {lang === 'fr' ? 'Passer en Anglais (EN)' : 'Switch to French (FR)'}
          </button>
        </div>

        <div className="bg-white border border-[#e5ecee] rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-[#087d7a]">
            <ShieldCheck className="w-4 h-4" />
            <h2>{t(lang, 'securitySummaryTitle')}</h2>
          </div>
          <p className="text-xs text-[#64767e] leading-relaxed">
            {t(lang, 'securitySummaryDesc')}
          </p>
        </div>
      </div>

      {isAdmin && data.users && (
        <div className="bg-white border border-[#e5ecee] rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#087d7a]" />
            <h2 className="text-sm font-bold text-[#172b36]">{t(lang, 'usersManagement')}</h2>
          </div>

          <form
            onSubmit={handleAddUser}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
          >
            <input
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(lang, 'nameLabel')}
              className="px-3 py-2 text-xs bg-[#f6f9fa] border border-[#e5ecee] rounded-lg"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@connecteo.fr"
              className="px-3 py-2 text-xs bg-[#f6f9fa] border border-[#e5ecee] rounded-lg"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(lang, 'passwordLabel')}
              className="px-3 py-2 text-xs bg-[#f6f9fa] border border-[#e5ecee] rounded-lg"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="px-3 py-2 text-xs bg-[#f6f9fa] border border-[#e5ecee] rounded-lg"
            >
              {(Object.keys(roleLabels) as Role[]).map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r][lang]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-lg bg-[#00afa9] hover:bg-[#087d7a] text-white text-xs font-bold whitespace-nowrap"
            >
              {creating ? '...' : t(lang, 'addUser')}
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#e5ecee] text-[10px] font-bold tracking-wider text-[#91a0a6]">
                  <th className="py-2 px-3">{t(lang, 'nameLabel')}</th>
                  <th className="py-2 px-3">{t(lang, 'emailLabel')}</th>
                  <th className="py-2 px-3">{t(lang, 'roleLabel')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f3f4] text-xs text-[#4c626c]">
                {data.users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2.5 px-3 font-bold text-[#172b36]">{u.name}</td>
                    <td className="py-2.5 px-3">{u.email}</td>
                    <td className="py-2.5 px-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                        className="px-2.5 py-1 text-xs border border-[#e5ecee] rounded-md bg-white"
                      >
                        {(Object.keys(roleLabels) as Role[]).map((r) => (
                          <option key={r} value={r}>
                            {roleLabels[r][lang]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
