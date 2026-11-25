export type Role = 'management' | 'trainer' | 'manager' | 'staff' | 'admin';

export type Lang = 'fr' | 'en';

export type ViewId =
  | 'overview'
  | 'courses'
  | 'assignments'
  | 'skills'
  | 'reports'
  | 'settings';

export type AssignmentStatus = 'inProgress' | 'completed' | 'late';

export interface BilingualText {
  fr: string;
  en: string;
}

export interface QuizQuestion {
  id: string;
  question: BilingualText;
  options: BilingualText[];
  correctIndex: number;
}

export interface CourseLevel {
  num: number;
  title: BilingualText;
  summary: BilingualText;
  scenario: BilingualText;
  durationMinutes: number;
  quiz: QuizQuestion[];
}

export interface Course {
  id: number;
  title: BilingualText;
  category: BilingualText;
  duration: BilingualText;
  owner: string;
  skillId: string;
  imageUrl: string;
  accentTheme: 'teal' | 'blue' | 'orange';
  levels: CourseLevel[];
  userProgress: number;
  completedLevels: number[];
  lastScore: number | null;
}

export interface Assignment {
  id: string;
  learnerId: string;
  learnerName: string;
  learnerInitials: string;
  courseId: number;
  courseTitle: BilingualText;
  dueDate: string;
  progress: number;
  score: number | null;
  status: AssignmentStatus;
  assignedBy: string;
}

export interface SkillSummary {
  id: string;
  name: BilingualText;
  description: BilingualText;
  currentLevel: number;
  maxLevel: number;
  progressPercent: number;
  statusKey: 'inProgress' | 'completed' | 'skillGap';
  linkedCourseId: number;
}

export interface NotificationItem {
  id: string;
  message: BilingualText;
  createdAt: string;
  read: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: Role;
  title: BilingualText;
}

export interface MonthlyPoint {
  key: string;
  label: BilingualText;
  actual: number;
  target: number;
}

export interface DashboardPayload {
  user: UserProfile;
  kpis: {
    activeLearners: number;
    completionRate: number;
    avgScore: number | null;
    hoursLearned: number;
  };
  chart: MonthlyPoint[];
  courses: Course[];
  assignments: Assignment[];
  skills: SkillSummary[];
  notifications: NotificationItem[];
  users?: UserProfile[];
}
