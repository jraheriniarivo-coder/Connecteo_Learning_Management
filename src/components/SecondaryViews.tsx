import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  bulkImportUsersApi,
  createAssignmentApi,
  createUserApi,
  updateUserRoleApi,
} from '../api.ts';
import { roleLabels, t } from '../i18n.ts';
import type {
  BulkImportResult,
  BulkImportUserRow,
  DashboardPayload,
  Lang,
  Role,
} from '../types.ts';
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

interface DraftImportRow extends BulkImportUserRow {
  selected: boolean;
}

const PRESET_ROSTER: BulkImportUserRow[] = [
  { name: 'Claire Martin', email: 'claire.martin@connecteo.fr', role: 'trainer' },
  { name: 'Karim Benali', email: 'karim.benali@connecteo.fr', role: 'manager' },
  { name: 'Sophie Laurent', email: 'sophie.laurent@connecteo.fr', role: 'management' },
  { name: 'Lucas Moreau', email: 'lucas.moreau@connecteo.fr', role: 'staff' },
  { name: 'Emma Petit', email: 'emma.petit@connecteo.fr', role: 'staff' },
];

function normalizeImportedRole(raw: string): Role {
  const value = raw.trim().toLowerCase();
  if (['formateur', 'trainer', 'formatrice'].includes(value)) return 'trainer';
  if (['manager', 'chef d\'équipe', 'team lead'].includes(value)) return 'manager';
  if (['management', 'direction', 'responsable'].includes(value)) return 'management';
  if (['admin', 'administrateur', 'administrator'].includes(value)) return 'admin';
  return 'staff';
}

function parseUsersFileText(content: string): DraftImportRow[] {
  const cleaned = content.replace(/^\uFEFF/, '');
  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const first = lines[0];
  const delimiter = first.includes(';') ? ';' : first.includes('\t') ? '\t' : ',';

  const rows: DraftImportRow[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const cols = lines[i]
      .split(delimiter)
      .map((cell) => cell.trim().replace(/^["']|["']$/g, ''));
    if (cols.length < 2) continue;

    const col0Lower = cols[0].toLowerCase();
    const col1Lower = cols[1].toLowerCase();
    if (
      i === 0 &&
      (col0Lower.includes('nom') || col0Lower === 'name' || col1Lower === 'email')
    ) {
      continue;
    }

    const name = cols[0];
    const email = cols[1].toLowerCase();
    const role = normalizeImportedRole(cols[2] ?? 'apprenant');
    const password = cols[3] && cols[3].length >= 6 ? cols[3] : undefined;
    if (!name || !email.includes('@')) continue;

    rows.push({
      selected: true,
      name,
      email,
      role,
      password,
    });
  }
  return rows;
}

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

  const [importRows, setImportRows] = useState<DraftImportRow[]>([]);
  const [defaultImportPassword, setDefaultImportPassword] = useState('');
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<BulkImportResult | null>(null);

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

  const handleLoadPresetRoster = () => {
    setImportRows(PRESET_ROSTER.map((u) => ({ ...u, selected: true })));
    setImportSummary(null);
    onToast(
      lang === 'fr'
        ? 'Liste pré-établie Connecteo chargée. Définissez un mot de passe initial pour importer.'
        : 'Pre-built Connecteo roster loaded. Set an initial password to import.'
    );
  };

  const handleDownloadTemplate = () => {
    const header = 'Nom complet,Email,Role\r\n';
    const body = PRESET_ROSTER.map(
      (u) => `${u.name},${u.email},${roleLabels[u.role][lang]}`
    ).join('\r\n');
    const blob = new Blob([`\uFEFF${header}${body}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'connecteo-import-utilisateurs.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 512 * 1024) {
      onToast(
        lang === 'fr'
          ? 'Fichier trop volumineux (maximum 512 Ko).'
          : 'File is too large (maximum 512 KB).'
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const parsed = parseUsersFileText(text);
      if (parsed.length === 0) {
        onToast(
          lang === 'fr'
            ? 'Aucune ligne valide détectée. Format attendu : Nom,Email,Rôle.'
            : 'No valid rows found. Expected format: Name,Email,Role.'
        );
        return;
      }
      setImportRows(parsed);
      setImportSummary(null);
      onToast(
        lang === 'fr'
          ? `${parsed.length} utilisateur(s) détecté(s) dans le fichier.`
          : `${parsed.length} user(s) parsed from file.`
      );
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleBulkImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selected = importRows
      .filter((r) => r.selected)
      .map(({ name: uName, email: uEmail, role: uRole, password: uPass }) => ({
        name: uName,
        email: uEmail,
        role: uRole,
        password: uPass,
      }));
    if (selected.length === 0) {
      onToast(
        lang === 'fr'
          ? 'Sélectionnez au moins un utilisateur à importer.'
          : 'Select at least one user to import.'
      );
      return;
    }
    const missingPassword = selected.some(
      (u) => (!u.password || u.password.length < 6) && defaultImportPassword.length < 6
    );
    if (missingPassword) {
      onToast(
        lang === 'fr'
          ? 'Renseignez un mot de passe initial commun d’au moins 6 caractères.'
          : 'Enter a shared initial password of at least 6 characters.'
      );
      return;
    }

    setImporting(true);
    try {
      const result = await bulkImportUsersApi(token, {
        users: selected,
        defaultPassword: defaultImportPassword,
      });
      setImportSummary(result);
      onToast(
        lang === 'fr'
          ? `Import terminé : ${result.importedCount} ajouté(s), ${result.skippedCount} déjà existant(s).`
          : `Import completed: ${result.importedCount} added, ${result.skippedCount} skipped.`
      );
      await onRefresh();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erreur import.');
    } finally {
      setImporting(false);
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

          {/* Bulk import by file + Pre-established roster */}
          <div className="pt-5 border-t border-[#e5ecee] space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#087d7a]" />
                  <h3 className="text-sm font-bold text-[#172b36]">
                    {t(lang, 'bulkImportTitle')}
                  </h3>
                </div>
                <p className="text-xs text-[#64767e] mt-1">{t(lang, 'bulkImportDesc')}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadPresetRoster}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#b7e4e0] bg-[#effaf8] hover:bg-[#e1f5f2] text-xs font-bold text-[#087d7a] whitespace-nowrap"
                >
                  <Users className="w-3.5 h-3.5" />
                  {t(lang, 'loadPresetRoster')}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#dce6e8] bg-white hover:bg-[#f6f9fa] text-xs font-bold text-[#172b36] whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t(lang, 'downloadCsvTemplate')}
                </button>
                <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#172b36] hover:bg-[#233f4e] text-white text-xs font-bold cursor-pointer whitespace-nowrap">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t(lang, 'uploadCsvFile')}</span>
                  <input
                    type="file"
                    accept=".csv,.txt,text/csv,text/plain"
                    className="sr-only"
                    onChange={(e) => {
                      handleImportFile(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>

            {importRows.length > 0 && (
              <form onSubmit={handleBulkImportSubmit} className="space-y-3">
                <div className="overflow-x-auto border border-[#e5ecee] rounded-xl">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-[#f6f9fa] border-b border-[#e5ecee] text-[10px] font-bold tracking-wider text-[#91a0a6]">
                        <th className="py-2 px-3 w-10">
                          <input
                            type="checkbox"
                            checked={importRows.every((r) => r.selected)}
                            onChange={(e) =>
                              setImportRows((prev) =>
                                prev.map((r) => ({ ...r, selected: e.target.checked }))
                              )
                            }
                            aria-label="Tout sélectionner"
                            className="accent-[#00afa9]"
                          />
                        </th>
                        <th className="py-2 px-3">{t(lang, 'nameLabel')}</th>
                        <th className="py-2 px-3">{t(lang, 'emailLabel')}</th>
                        <th className="py-2 px-3">{t(lang, 'roleLabel')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f3f4] text-xs">
                      {importRows.map((row, idx) => (
                        <tr key={`${row.email}-${idx}`}>
                          <td className="py-2 px-3">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={(e) =>
                                setImportRows((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, selected: e.target.checked } : item
                                  )
                                )
                              }
                              className="accent-[#00afa9]"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) =>
                                setImportRows((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, name: e.target.value } : item
                                  )
                                )
                              }
                              className="px-2 py-1 text-xs bg-[#f6f9fa] border border-[#e5ecee] rounded-md w-44"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="email"
                              value={row.email}
                              onChange={(e) =>
                                setImportRows((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, email: e.target.value } : item
                                  )
                                )
                              }
                              className="px-2 py-1 text-xs bg-[#f6f9fa] border border-[#e5ecee] rounded-md w-56"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={row.role}
                              onChange={(e) =>
                                setImportRows((prev) =>
                                  prev.map((item, i) =>
                                    i === idx
                                      ? { ...item, role: e.target.value as Role }
                                      : item
                                  )
                                )
                              }
                              className="px-2 py-1 text-xs bg-white border border-[#e5ecee] rounded-md"
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

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#f6f9fa] border border-[#e5ecee]">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
                    <label className="text-xs font-bold text-[#172b36] whitespace-nowrap">
                      {t(lang, 'defaultImportPassword')}
                    </label>
                    <input
                      type="password"
                      minLength={6}
                      value={defaultImportPassword}
                      onChange={(e) => setDefaultImportPassword(e.target.value)}
                      placeholder="••••••"
                      className="px-3 py-1.5 text-xs bg-white border border-[#e5ecee] rounded-lg w-full sm:w-52"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setImportRows([]);
                        setImportSummary(null);
                      }}
                      className="px-3 py-2 rounded-lg border border-[#dce6e8] bg-white text-xs font-bold text-[#53666f]"
                    >
                      {t(lang, 'cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={importing}
                      className="px-4 py-2 rounded-lg bg-[#00afa9] hover:bg-[#087d7a] text-white text-xs font-bold whitespace-nowrap disabled:opacity-60"
                    >
                      {importing ? '...' : t(lang, 'confirmBulkImport')}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {importSummary && (
              <div className="p-3 rounded-lg bg-[#effaf8] border border-[#b7e4e0] text-xs text-[#087d7a] font-semibold">
                {lang === 'fr'
                  ? `Résultat : ${importSummary.importedCount} utilisateur(s) importé(s), ${importSummary.skippedCount} doublon(s) ignoré(s).`
                  : `Result: ${importSummary.importedCount} user(s) imported, ${importSummary.skippedCount} duplicate(s) skipped.`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
