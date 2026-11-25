import crypto from 'node:crypto';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import type {
  Assignment,
  AssignmentStatus,
  BilingualText,
  BulkImportResult,
  Course,
  CourseLevel,
  InteractiveBlockType,
  MonthlyPoint,
  NotificationItem,
  Role,
  SkillSummary,
  UserProfile,
} from '../src/types.ts';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const VALID_ROLES: Role[] = ['management', 'trainer', 'manager', 'staff', 'admin'];
const VALID_BLOCK_TYPES: InteractiveBlockType[] = ['narrative', 'flashcards', 'steps'];
const COURSE_IMAGES = [
  '/src/assets/images/course_intellectual_agility_1795592939066.jpg',
  '/src/assets/images/course_customer_excellence_1795592938902.jpg',
  '/src/assets/images/course_data_security_1795592939925.jpg',
];

interface StoredUser extends UserProfile {
  passwordHash: string;
}

interface TokenClaims {
  sid: string;
  uid: string;
  name: string;
  email: string;
  initials: string;
  role: Role;
  exp: number;
}

interface UserCourseProgress {
  completedLevels: number[];
  scores: Record<number, number>;
  hoursSpent: number;
}

interface StoredCourse {
  id: number;
  title: BilingualText;
  category: BilingualText;
  duration: BilingualText;
  owner: string;
  skillId: string;
  imageUrl: string;
  accentTheme: 'teal' | 'blue' | 'orange';
  formatLabel?: string;
  levels: CourseLevel[];
}

interface StoredAssignment {
  id: string;
  learnerId: string;
  courseId: number;
  dueDate: string;
  statusOverride?: AssignmentStatus;
  assignedBy: string;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = crypto.scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function safeCompareStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CL';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 120;
}

function isSafeImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^\/src\/assets\/images\/[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$/.test(trimmed)) {
    return trimmed;
  }
  if (
    trimmed.length <= 2_800_000 &&
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(trimmed)
  ) {
    return trimmed;
  }
  return undefined;
}

function csvCell(value: unknown): string {
  let str = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replaceAll('"', '""')}"`;
}

function signToken(claims: TokenClaims): string {
  const payload = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): TokenClaims | null {
  const dotIndex = token.indexOf('.');
  if (dotIndex <= 0) return null;
  const payload = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  if (!safeCompareStrings(sig, expectedSig)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as TokenClaims;
    if (!parsed || typeof parsed.uid !== 'string' || typeof parsed.exp !== 'number') return null;
    if (!VALID_ROLES.includes(parsed.role)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function defaultTitleForRole(role: Role): BilingualText {
  switch (role) {
    case 'admin':
      return { fr: 'Administrateur plateforme', en: 'Platform administrator' };
    case 'management':
      return { fr: 'Responsable du projet', en: 'Project owner' };
    case 'trainer':
      return { fr: 'Formateur référent', en: 'Lead trainer' };
    case 'manager':
      return { fr: "Manager d'équipe", en: 'Team manager' };
    default:
      return { fr: 'Apprenant Connecteo', en: 'Connecteo learner' };
  }
}

export function createApiApp() {
  const app = express();
  app.use(express.json({ limit: '6mb' }));

  const users = new Map<string, StoredUser>();
  const revokedSessions = new Set<string>();
  const progressByUser = new Map<string, Map<number, UserCourseProgress>>();
  const notificationsByUser = new Map<string, NotificationItem[]>();
  let adminClaimed = false;

  const skillsCatalog: Array<{
    id: string;
    name: BilingualText;
    description: BilingualText;
    linkedCourseId: number;
  }> = [
    {
      id: 'intellectual-agility',
      name: { fr: 'Agilité intellectuelle', en: 'Intellectual Agility' },
      description: {
        fr: 'Analyser rapidement une situation nouvelle et ajuster sa réponse opérationnelle.',
        en: 'Quickly analyze new situations and adapt operational responses.',
      },
      linkedCourseId: 1,
    },
    {
      id: 'customer-relations',
      name: { fr: 'Relation client d’excellence', en: 'Customer Relations Excellence' },
      description: {
        fr: 'Transformer chaque interaction client en expérience mémorable et personnalisée.',
        en: 'Turn every customer interaction into a memorable, personalized experience.',
      },
      linkedCourseId: 2,
    },
    {
      id: 'data-security',
      name: { fr: "Sécurité de l'information", en: 'Information Security' },
      description: {
        fr: 'Protéger les données clients, appliquer le RGPD et prévenir l’ingénierie sociale.',
        en: 'Protect customer data, apply GDPR compliance, and prevent social engineering.',
      },
      linkedCourseId: 3,
    },
  ];

  const courses: StoredCourse[] = [
    {
      id: 1,
      title: { fr: 'Agilité intellectuelle', en: 'Intellectual Agility' },
      category: { fr: 'Parcours', en: 'Learning Path' },
      duration: { fr: '4 Modules · 2h00', en: '4 Modules · 2h00' },
      owner: 'Connecteo Learning',
      skillId: 'intellectual-agility',
      imageUrl: COURSE_IMAGES[0],
      accentTheme: 'teal',
      formatLabel: 'Articulate 360',
      levels: [
        {
          num: 1,
          title: {
            fr: 'Niveau 1 : Comprendre rapidement une situation nouvelle',
            en: 'Level 1: Quickly understand a new situation',
          },
          summary: {
            fr: 'Identifier les signaux clés d’une demande client inhabituelle et structurer un diagnostic en moins de 60 secondes.',
            en: 'Identify key signals in an unfamiliar customer request and structure a diagnosis in under 60 seconds.',
          },
          scenario: {
            fr: 'Un client grand compte appelle suite à une anomalie multi-canal non documentée. Comment prioriser les faits avant d’agir ?',
            en: 'An enterprise client calls about an undocumented cross-channel issue. How do you prioritize facts before acting?',
          },
          durationMinutes: 30,
          imageUrl: COURSE_IMAGES[0],
          blockType: 'flashcards',
          takeaway: {
            fr: 'Toujours distinguer les faits vérifiés des suppositions avant de proposer un plan d’action.',
            en: 'Always separate verified facts from assumptions before proposing an action plan.',
          },
          flashcards: [
            {
              front: { fr: 'Réflexe 1 · Cadrage rapide', en: 'Reflex 1 · Rapid framing' },
              back: {
                fr: 'Reformuler la situation en 1 phrase et faire valider par le client.',
                en: 'Rephrase the situation in 1 sentence and confirm with the customer.',
              },
            },
            {
              front: { fr: 'Réflexe 2 · Tri des signaux', en: 'Reflex 2 · Signal triage' },
              back: {
                fr: 'Isoler impact métier, urgence réelle et canal d’origine.',
                en: 'Isolate business impact, real urgency, and source channel.',
              },
            },
          ],
          quiz: [
            {
              id: 'q1-1',
              question: {
                fr: 'Quelle est la première étape face à une demande client imprévue ?',
                en: 'What is the first step when facing an unexpected customer request?',
              },
              options: [
                { fr: 'Reformuler le besoin et isoler les faits vérifiés', en: 'Rephrase the need and isolate verified facts' },
                { fr: 'Transférer immédiatement sans qualifier', en: 'Transfer immediately without qualifying' },
                { fr: 'Appliquer un script standard sans écouter', en: 'Apply a standard script without listening' },
              ],
              correctIndex: 0,
            },
            {
              id: 'q1-2',
              question: {
                fr: 'Quel indicateur confirme une bonne compréhension initiale ?',
                en: 'Which indicator confirms a solid initial understanding?',
              },
              options: [
                { fr: 'La validation explicite du client après reformulation', en: 'Explicit client confirmation after rephrasing' },
                { fr: 'La durée brute de l’appel uniquement', en: 'Raw call duration alone' },
                { fr: 'L’envoi automatique d’un formulaire générique', en: 'Sending an automated generic form' },
              ],
              correctIndex: 0,
            },
          ],
        },
        {
          num: 2,
          title: {
            fr: 'Niveau 2 : Adapter sa réponse face aux changements',
            en: 'Level 2: Adapt response to changes',
          },
          summary: {
            fr: 'Ajuster son discours et ses outils en temps réel lorsqu’une procédure ou contrainte évolue pendant l’échange.',
            en: 'Adjust tone and tools in real time when a procedure or constraint shifts mid-conversation.',
          },
          scenario: {
            fr: 'Une nouvelle règle commerciale entre en vigueur le matin même alors que le client attend une solution immédiate.',
            en: 'A new commercial policy goes live the same morning while a customer expects an immediate resolution.',
          },
          durationMinutes: 30,
          imageUrl: COURSE_IMAGES[1],
          blockType: 'steps',
          takeaway: {
            fr: 'Expliquer le bénéfice client de la nouvelle procédure avant d’en détailler les modalités.',
            en: 'Explain the customer benefit of the new policy before detailing steps.',
          },
          steps: [
            {
              title: { fr: '1. Accuser réception', en: '1. Acknowledge' },
              detail: {
                fr: 'Valider l’attente immédiate du client sans minimiser la contrainte.',
                en: 'Validate the customer’s immediate expectation without minimizing friction.',
              },
            },
            {
              title: { fr: '2. Présenter l’alternative', en: '2. Present option' },
              detail: {
                fr: 'Exposer l’option active la plus avantageuse avec un vocabulaire positif.',
                en: 'Present the strongest available option using positive phrasing.',
              },
            },
            {
              title: { fr: '3. Tracer par écrit', en: '3. Confirm in writing' },
              detail: {
                fr: 'Envoyer un récapitulatif daté pour verrouiller la confiance.',
                en: 'Send a timestamped summary to lock in trust.',
              },
            },
          ],
          quiz: [
            {
              id: 'q2-1',
              question: {
                fr: 'Face à un changement de procédure en direct, quelle posture adopter ?',
                en: 'When a procedure changes live, what stance should you adopt?',
              },
              options: [
                { fr: 'Expliquer clairement la valeur de l’option disponible', en: 'Clearly explain the value of the available option' },
                { fr: 'Blâmer l’outil ou la direction devant le client', en: 'Blame tools or management in front of the client' },
                { fr: 'Promettre un délai non vérifié', en: 'Promise an unverified timeline' },
              ],
              correctIndex: 0,
            },
            {
              id: 'q2-2',
              question: {
                fr: 'Comment sécuriser la transition entre deux solutions ?',
                en: 'How do you secure the transition between two solutions?',
              },
              options: [
                { fr: 'Confirmer par écrit les étapes et l’échéance', en: 'Confirm steps and deadline in writing' },
                { fr: 'Clore le ticket sans suivi', en: 'Close the ticket without follow-up' },
                { fr: 'Attendre que le client relance', en: 'Wait for the customer to follow up' },
              ],
              correctIndex: 0,
            },
          ],
        },
        {
          num: 3,
          title: {
            fr: 'Niveau 3 : Analyser des situations complexes',
            en: 'Level 3: Analyze complex situations',
          },
          summary: {
            fr: 'Décomposer un incident impliquant plusieurs équipes et formuler une recommandation actionnable.',
            en: 'Break down a multi-team incident and formulate an actionable recommendation.',
          },
          scenario: {
            fr: 'Trois réclamations récurrentes montrent une friction entre logistique et facturation. Identifiez la cause racine.',
            en: 'Three recurring complaints point to friction between logistics and billing. Identify the root cause.',
          },
          durationMinutes: 30,
          quiz: [
            {
              id: 'q3-1',
              question: {
                fr: 'Quel outil permet de remonter à la cause racine d’un incident ?',
                en: 'Which method helps trace an incident to its root cause?',
              },
              options: [
                { fr: 'La méthode des 5 Pourquoi sur faits datés', en: 'The 5 Whys method on timestamped facts' },
                { fr: 'Le ressenti individuel sans données', en: 'Individual guesswork without data' },
                { fr: 'La moyenne des appels mensuels', en: 'Monthly average call volume' },
              ],
              correctIndex: 0,
            },
            {
              id: 'q3-2',
              question: {
                fr: 'Que doit contenir une escalade interne efficace ?',
                en: 'What must an effective internal escalation contain?',
              },
              options: [
                { fr: 'Contexte, impact client, actions déjà tentées', en: 'Context, customer impact, actions already attempted' },
                { fr: 'Un simple message « Urgent svp »', en: 'A brief "Urgent please" message' },
                { fr: 'Uniquement le numéro de téléphone du client', en: 'Only the customer phone number' },
              ],
              correctIndex: 0,
            },
          ],
        },
        {
          num: 4,
          title: {
            fr: 'Niveau 4 : Devenir une référence dans la résolution',
            en: 'Level 4: Become a reference in resolution',
          },
          summary: {
            fr: 'Capitaliser sur les cas complexes pour enrichir la base de connaissances et accompagner ses pairs.',
            en: 'Capitalize on complex cases to enrich the knowledge base and coach peers.',
          },
          scenario: {
            fr: 'Vous animez un point équipe de 10 minutes pour partager une nouvelle bonne pratique validée sur le terrain.',
            en: 'You lead a 10-minute team huddle to share a field-validated best practice.',
          },
          durationMinutes: 30,
          quiz: [
            {
              id: 'q4-1',
              question: {
                fr: 'Comment pérenniser une solution trouvée sur un cas rare ?',
                en: 'How do you make a rare-case solution sustainable?',
              },
              options: [
                { fr: 'Documenter une fiche claire dans la base partagée', en: 'Document a clear guide in the shared knowledge base' },
                { fr: 'Garder la solution dans ses notes personnelles', en: 'Keep the solution in personal notes' },
                { fr: 'Attendre le prochain audit annuel', en: 'Wait for the next annual audit' },
              ],
              correctIndex: 0,
            },
            {
              id: 'q4-2',
              question: {
                fr: 'Quel comportement incarne le mieux l’excellence Connecteo ?',
                en: 'Which behavior best embodies Connecteo excellence?',
              },
              options: [
                { fr: 'Partager proactivement et mesurer l’impact client', en: 'Proactively share and measure customer impact' },
                { fr: 'Traiter les tickets en silence', en: 'Process tickets in isolation' },
                { fr: 'Éviter les retours d’expérience', en: 'Avoid retrospectives' },
              ],
              correctIndex: 0,
            },
          ],
        },
      ],
    },
    {
      id: 2,
      title: { fr: 'Relation client d’excellence', en: 'Customer Relations Excellence' },
      category: { fr: 'Culture Client', en: 'Customer Culture' },
      duration: { fr: '4 Modules · 1h40', en: '4 Modules · 1h40' },
      owner: 'Connecteo Academy',
      skillId: 'customer-relations',
      imageUrl: COURSE_IMAGES[1],
      accentTheme: 'blue',
      formatLabel: 'Articulate 360',
      levels: [
        {
          num: 1,
          title: { fr: 'Niveau 1 : L’accueil et l’écoute active', en: 'Level 1: Greeting and active listening' },
          summary: {
            fr: 'Maîtriser les 30 premières secondes de contact pour instaurer un climat de confiance immédiat.',
            en: 'Master the first 30 seconds of contact to establish immediate trust.',
          },
          scenario: {
            fr: 'Un client exprime de la frustration dès l’ouverture de l’appel. Quelle phrase d’ancrage utiliser ?',
            en: 'A customer expresses frustration right as the call starts. Which grounding phrase works best?',
          },
          durationMinutes: 25,
          imageUrl: COURSE_IMAGES[1],
          blockType: 'steps',
          takeaway: {
            fr: 'Une écoute active sans interruption réduit de moitié la durée totale de résolution.',
            en: 'Active listening without interrupting cuts total resolution time in half.',
          },
          steps: [
            {
              title: { fr: '1. Voix posée & accueil', en: '1. Warm greeting' },
              detail: {
                fr: 'Sourire audible, prénom du conseiller et disponibilité immédiate.',
                en: 'Audible warmth, advisor name, and immediate readiness.',
              },
            },
            {
              title: { fr: '2. Écoute sans coupure', en: '2. Uninterrupted listening' },
              detail: {
                fr: 'Laisser le client vider son contexte pendant les 20 premières secondes.',
                en: 'Let the customer share context uninterrupted for the first 20 seconds.',
              },
            },
            {
              title: { fr: '3. Reformulation miroir', en: '3. Mirror rephrasing' },
              detail: {
                fr: 'Confirmer le ressenti et l’objectif concret avant de consulter le dossier.',
                en: 'Confirm emotion and concrete goal before checking the record.',
              },
            },
          ],
          quiz: [
            {
              id: 'q2-1-1',
              question: { fr: 'Quel est le rôle clé de l’écoute active ?', en: 'What is the key role of active listening?' },
              options: [
                { fr: 'Capter l’émotion et le besoin réel sans interrompre', en: 'Capture emotion and real need without interrupting' },
                { fr: 'Couper la parole pour gagner du temps', en: 'Interrupt to save time' },
                { fr: 'Lire les conditions générales mot à mot', en: 'Read terms verbatim' },
              ],
              correctIndex: 0,
            },
          ],
        },
        {
          num: 2,
          title: { fr: 'Niveau 2 : Personnaliser chaque expérience', en: 'Level 2: Personalize every experience' },
          summary: {
            fr: 'Adapter le niveau de langage et le canal au profil et à l’historique du client.',
            en: 'Adapt language register and channel to the customer profile and history.',
          },
          scenario: {
            fr: 'Le client a déjà écrit deux emails avant d’appeler. Comment valoriser son historique CRM ?',
            en: 'The customer already sent two emails before calling. How do you leverage CRM history?',
          },
          durationMinutes: 25,
          quiz: [
            {
              id: 'q2-2-1',
              question: { fr: 'Pourquoi consulter l’historique avant de questionner ?', en: 'Why review history before asking questions?' },
              options: [
                { fr: 'Éviter au client de répéter sa demande', en: 'Prevent the customer from repeating themselves' },
                { fr: 'Allonger le temps de traitement', en: 'Extend handling time' },
                { fr: 'Ignorer les messages précédents', en: 'Ignore previous messages' },
              ],
              correctIndex: 0,
            },
          ],
        },
        {
          num: 3,
          title: { fr: 'Niveau 3 : Désamorcer les situations sensibles', en: 'Level 3: De-escalate sensitive situations' },
          summary: {
            fr: 'Utiliser la méthode DESC et l’empathie structurée pour transformer une tension en coopération.',
            en: 'Use structured empathy to turn tension into cooperation.',
          },
          scenario: {
            fr: 'Un client menace de résilier suite à un retard de livraison.',
            en: 'A customer threatens to cancel following a delivery delay.',
          },
          durationMinutes: 25,
          quiz: [
            {
              id: 'q2-3-1',
              question: { fr: 'Quelle réponse apaise efficacement une tension ?', en: 'Which response effectively de-escalates tension?' },
              options: [
                { fr: 'Reconnaître l’impact puis proposer une action concrète datée', en: 'Acknowledge impact then propose a concrete dated action' },
                { fr: 'Dire « Ce n’est pas notre faute »', en: 'Say "It is not our fault"' },
                { fr: 'Raccrocher pour calmer la situation', en: 'Hang up to cool down' },
              ],
              correctIndex: 0,
            },
          ],
        },
        {
          num: 4,
          title: { fr: 'Niveau 4 : Clôture mémorable et fidélisation', en: 'Level 4: Memorable closing & retention' },
          summary: {
            fr: 'Valider la satisfaction complète et anticiper la prochaine étape.',
            en: 'Confirm complete satisfaction and anticipate the next step.',
          },
          scenario: {
            fr: 'Votre résolution est acceptée. Comment conclure avec signature Connecteo ?',
            en: 'Your resolution is accepted. How do you close with Connecteo signature care?',
          },
          durationMinutes: 25,
          quiz: [
            {
              id: 'q2-4-1',
              question: { fr: 'Que vérifier avant de clore l’échange ?', en: 'What should you verify before closing?' },
              options: [
                { fr: 'Que le client est satisfait et connaît la suite exacte', en: 'That the customer is satisfied and knows exact next steps' },
                { fr: 'Uniquement l’heure de fin d’appel', en: 'Only the end timestamp' },
                { fr: 'Rien si le ticket est fermé', en: 'Nothing once the ticket is closed' },
              ],
              correctIndex: 0,
            },
          ],
        },
      ],
    },
    {
      id: 3,
      title: { fr: "Sécurité de l'information & RGPD", en: 'Information Security & GDPR' },
      category: { fr: 'Conformité', en: 'Compliance' },
      duration: { fr: '4 Modules · 1h20', en: '4 Modules · 1h20' },
      owner: 'Connecteo Security',
      skillId: 'data-security',
      imageUrl: COURSE_IMAGES[2],
      accentTheme: 'orange',
      formatLabel: 'Articulate 360',
      levels: [
        {
          num: 1,
          title: { fr: 'Niveau 1 : Hygiène des accès et mots de passe', en: 'Level 1: Access & password hygiene' },
          summary: {
            fr: 'Protéger son poste de travail, verrouiller sa session et gérer des identifiants uniques.',
            en: 'Protect workstations, lock sessions, and manage unique credentials.',
          },
          scenario: {
            fr: 'Vous quittez votre bureau 3 minutes en open space. Quel réflexe appliquer ?',
            en: 'You leave your desk for 3 minutes in an open office. What habit applies?',
          },
          durationMinutes: 20,
          imageUrl: COURSE_IMAGES[2],
          blockType: 'flashcards',
          takeaway: {
            fr: 'Win+L (ou Ctrl+Cmd+Q) doit devenir un automatisme dès que vous quittez votre écran.',
            en: 'Locking your screen should be automatic every single time you step away.',
          },
          flashcards: [
            {
              front: { fr: 'Règle Poste Clair', en: 'Clean Desk Rule' },
              back: {
                fr: 'Aucune donnée client imprimée ou mot de passe visible sur le bureau.',
                en: 'No printed customer records or passwords left visible on the desk.',
              },
            },
            {
              front: { fr: 'Mots de passe uniques', en: 'Unique passwords' },
              back: {
                fr: '12+ caractères uniques par outil, gérés dans le coffre d’équipe.',
                en: '12+ unique characters per tool stored in the team password vault.',
              },
            },
          ],
          quiz: [
            {
              id: 'q3-1-1',
              question: { fr: 'Quel réflexe est obligatoire avant de quitter son poste ?', en: 'What reflex is mandatory before leaving your workstation?' },
              options: [
                { fr: 'Verrouiller l’écran immédiatement', en: 'Lock the screen immediately' },
                { fr: 'Laisser le CRM ouvert', en: 'Leave CRM open' },
                { fr: 'Noter son mot de passe sur un post-it', en: 'Write password on a sticky note' },
              ],
              correctIndex: 0,
            },
          ],
        },
        {
          num: 2,
          title: { fr: 'Niveau 2 : Détecter le phishing et l’ingénierie sociale', en: 'Level 2: Spot phishing & social engineering' },
          summary: {
            fr: 'Repérer les urgences artificielles, domaines usurpés et demandes d’identifiants.',
            en: 'Spot artificial urgency, spoofed domains, and credential requests.',
          },
          scenario: {
            fr: 'Un email « Support IT » demande votre mot de passe sous 15 minutes.',
            en: 'An "IT Support" email asks for your password within 15 minutes.',
          },
          durationMinutes: 20,
          quiz: [
            {
              id: 'q3-2-1',
              question: { fr: 'Que faire face à un lien suspect ?', en: 'What should you do with a suspicious link?' },
              options: [
                { fr: 'Ne pas cliquer et signaler à l’équipe sécurité', en: 'Do not click and report to the security team' },
                { fr: 'Tester en navigation privée', en: 'Test in incognito mode' },
                { fr: 'Transférer à toute l’équipe', en: 'Forward to the entire team' },
              ],
              correctIndex: 0,
            },
          ],
        },
        {
          num: 3,
          title: { fr: 'Niveau 3 : Protection des données clients (RGPD)', en: 'Level 3: Customer data protection (GDPR)' },
          summary: {
            fr: 'Appliquer la minimisation des données et vérifier l’identité de l’interlocuteur.',
            en: 'Apply data minimization and verify caller identity.',
          },
          scenario: {
            fr: 'Un tiers demande l’adresse d’un client sans vérification d’identité.',
            en: 'A third party asks for a customer address without identity verification.',
          },
          durationMinutes: 20,
          quiz: [
            {
              id: 'q3-3-1',
              question: { fr: 'Peut-on communiquer une donnée personnelle sans authentification ?', en: 'Can personal data be shared without authentication?' },
              options: [
                { fr: 'Non, jamais avant vérification complète', en: 'No, never before full verification' },
                { fr: 'Oui si la personne insiste', en: 'Yes if the person insists' },
                { fr: 'Oui par messagerie publique', en: 'Yes via public chat' },
              ],
              correctIndex: 0,
            },
          ],
        },
        {
          num: 4,
          title: { fr: 'Niveau 4 : Réagir en cas d’incident', en: 'Level 4: Incident response' },
          summary: {
            fr: 'Connaître la chaîne d’alerte interne pour contenir tout incident en moins de 15 minutes.',
            en: 'Know the internal alert chain to contain any incident within 15 minutes.',
          },
          scenario: {
            fr: 'Un fichier contenant des emails clients a été envoyé au mauvais destinataire.',
            en: 'A file containing customer emails was sent to the wrong recipient.',
          },
          durationMinutes: 20,
          quiz: [
            {
              id: 'q3-4-1',
              question: { fr: 'Quelle action immédiate entreprendre après une erreur d’envoi ?', en: 'What immediate action should follow a misdirected email?' },
              options: [
                { fr: 'Alerter immédiatement le DPO / responsable sécurité', en: 'Immediately alert the DPO / security lead' },
                { fr: 'Supprimer le message envoyé de son dossier', en: 'Delete the sent message from your folder' },
                { fr: 'Attendre la fin de semaine', en: 'Wait until the end of the week' },
              ],
              correctIndex: 0,
            },
          ],
        },
      ],
    },
  ];

  let nextCourseId = 4;
  const assignmentsStore: StoredAssignment[] = [];

  const baseMonths: MonthlyPoint[] = [
    { key: 'may', label: { fr: 'Mai', en: 'May' }, actual: 0, target: 85 },
    { key: 'jun', label: { fr: 'Juin', en: 'Jun' }, actual: 0, target: 85 },
    { key: 'jul', label: { fr: 'Juil.', en: 'Jul' }, actual: 0, target: 85 },
    { key: 'aug', label: { fr: 'Août', en: 'Aug' }, actual: 0, target: 85 },
    { key: 'sep', label: { fr: 'Sept.', en: 'Sep' }, actual: 0, target: 85 },
    { key: 'oct', label: { fr: 'Oct.', en: 'Oct' }, actual: 25, target: 85 },
  ];

  function ensureUserSeedState(userId: string) {
    if (!progressByUser.has(userId)) {
      const map = new Map<number, UserCourseProgress>();
      map.set(1, { completedLevels: [1], scores: { 1: 100 }, hoursSpent: 0.5 });
      progressByUser.set(userId, map);
    }
    if (!notificationsByUser.has(userId)) {
      notificationsByUser.set(userId, [
        {
          id: `notif-welcome-${userId}`,
          message: {
            fr: 'Parcours « Agilité intellectuelle » ouvert : Niveau 1 complété.',
            en: '"Intellectual Agility" path opened: Level 1 completed.',
          },
          createdAt: new Date().toISOString(),
          read: false,
        },
      ]);
    }
    const hasAssignment = assignmentsStore.some((a) => a.learnerId === userId && a.courseId === 1);
    if (!hasAssignment) {
      assignmentsStore.push({
        id: `asg-${userId}-1`,
        learnerId: userId,
        courseId: 1,
        dueDate: '2026-12-15',
        assignedBy: 'Connecteo Learning',
      });
    }
  }

  function getCourseMetricsForUser(userId: string, course: StoredCourse) {
    const userMap = progressByUser.get(userId);
    const entry = userMap?.get(course.id);
    const completedLevels = entry ? [...entry.completedLevels].sort((a, b) => a - b) : [];
    const totalLevels = Math.max(1, course.levels.length);
    const userProgress = Math.round((completedLevels.length / totalLevels) * 100);
    const scoreValues = entry ? Object.values(entry.scores) : [];
    const lastScore =
      scoreValues.length > 0
        ? Math.round(scoreValues.reduce((acc, s) => acc + s, 0) / scoreValues.length)
        : null;
    return {
      userProgress,
      completedLevels,
      lastScore,
      hoursSpent: entry?.hoursSpent ?? 0,
    };
  }

  function resolveAssignmentStatus(progress: number, dueDate: string, override?: AssignmentStatus): AssignmentStatus {
    if (progress >= 100) return 'completed';
    if (override) return override;
    const today = new Date().toISOString().slice(0, 10);
    if (dueDate < today && progress < 100) return 'late';
    return 'inProgress';
  }

  function buildAssignmentsList(viewer: StoredUser): Assignment[] {
    const isStaff = viewer.role === 'staff';
    const relevant = isStaff
      ? assignmentsStore.filter((a) => a.learnerId === viewer.id)
      : assignmentsStore;

    return relevant
      .map((asg) => {
        const learner = users.get(asg.learnerId);
        const course = courses.find((c) => c.id === asg.courseId);
        if (!learner || !course) return null;
        const metrics = getCourseMetricsForUser(learner.id, course);
        return {
          id: asg.id,
          learnerId: learner.id,
          learnerName: learner.name,
          learnerInitials: learner.initials,
          courseId: course.id,
          courseTitle: course.title,
          dueDate: asg.dueDate,
          progress: metrics.userProgress,
          score: metrics.lastScore,
          status: resolveAssignmentStatus(metrics.userProgress, asg.dueDate, asg.statusOverride),
          assignedBy: asg.assignedBy,
        };
      })
      .filter((item): item is Assignment => item !== null);
  }

  function computeKpis(viewer: StoredUser, assignments: Assignment[]) {
    const isStaff = viewer.role === 'staff';
    const scopedUserIds = isStaff ? [viewer.id] : Array.from(users.keys());
    const activeLearners = Math.max(1, scopedUserIds.length);

    let progressSum = 0;
    let progressCount = 0;
    let scoreSum = 0;
    let scoreCount = 0;
    let totalHours = 0;

    for (const uid of scopedUserIds) {
      const userProgressMap = progressByUser.get(uid);
      if (!userProgressMap) continue;
      for (const course of courses) {
        const m = getCourseMetricsForUser(uid, course);
        if (m.completedLevels.length > 0 || assignments.some((a) => a.learnerId === uid && a.courseId === course.id)) {
          progressSum += m.userProgress;
          progressCount += 1;
        }
        if (m.lastScore !== null) {
          scoreSum += m.lastScore;
          scoreCount += 1;
        }
        totalHours += m.hoursSpent;
      }
    }

    return {
      activeLearners,
      completionRate: progressCount > 0 ? Math.round(progressSum / progressCount) : 0,
      avgScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
      hoursLearned: Math.round(totalHours * 10) / 10,
    };
  }

  function buildSkillsForUser(userId: string): SkillSummary[] {
    return skillsCatalog.map((skill) => {
      const linked = courses.find((c) => c.id === skill.linkedCourseId);
      const metrics = linked ? getCourseMetricsForUser(userId, linked) : { userProgress: 0, completedLevels: [] };
      const totalLevels = linked ? linked.levels.length : 4;
      const currentLevel = metrics.completedLevels.length;
      const statusKey: SkillSummary['statusKey'] =
        currentLevel >= totalLevels ? 'completed' : currentLevel > 0 ? 'inProgress' : 'skillGap';
      return {
        id: skill.id,
        name: skill.name,
        description: skill.description,
        currentLevel,
        maxLevel: totalLevels,
        progressPercent: metrics.userProgress,
        statusKey,
        linkedCourseId: skill.linkedCourseId,
      };
    });
  }

  function publicUser(user: StoredUser): UserProfile {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      initials: user.initials,
      role: user.role,
      title: user.title,
    };
  }

  function issueTokenForUser(user: StoredUser): string {
    return signToken({
      sid: crypto.randomUUID(),
      uid: user.id,
      name: user.name,
      email: user.email,
      initials: user.initials,
      role: user.role,
      exp: Date.now() + SESSION_TTL_MS,
    });
  }

  interface AuthedRequest extends Request {
    authUser?: StoredUser;
    authSessionId?: string;
  }

  function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentification requise.' });
      return;
    }
    const token = header.slice(7).trim();
    const claims = verifyToken(token);
    if (!claims) {
      res.status(401).json({ error: 'Jeton de session invalide.' });
      return;
    }
    if (claims.exp < Date.now() || revokedSessions.has(claims.sid)) {
      res.status(401).json({ error: 'Session expirée. Veuillez vous reconnecter.' });
      return;
    }

    let user = users.get(claims.uid);
    if (!user) {
      // Rehydrate verified user state after serverless cold start when SESSION_SECRET is shared
      user = {
        id: claims.uid,
        name: claims.name,
        email: claims.email,
        initials: claims.initials,
        role: claims.role,
        title: defaultTitleForRole(claims.role),
        passwordHash: '',
      };
      users.set(user.id, user);
      if (claims.role === 'admin') {
        adminClaimed = true;
      }
      ensureUserSeedState(user.id);
    }

    req.authUser = user;
    req.authSessionId = claims.sid;
    next();
  }

  function requireRole(allowed: Role[]) {
    return (req: AuthedRequest, res: Response, next: NextFunction) => {
      if (!req.authUser || !allowed.includes(req.authUser.role)) {
        res.status(403).json({ error: 'Accès refusé pour votre rôle.' });
        return;
      }
      next();
    };
  }

  app.get('/api/auth/status', (_req, res) => {
    const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();
    const needsAdminSetup = !adminClaimed && envPasscode.length === 0;
    res.json({
      needsAdminSetup,
      hasEnvPasscode: envPasscode.length > 0,
    });
  });

  app.post('/api/auth/setup-admin', (req, res) => {
    const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();
    if (adminClaimed || envPasscode.length > 0) {
      res.status(409).json({ error: 'Le compte administrateur initial est déjà configuré.' });
      return;
    }

    const name = sanitizeText(req.body?.name, 80);
    const email = sanitizeText(req.body?.email, 120).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (name.length < 2 || !isValidEmail(email) || password.length < 6) {
      res.status(400).json({ error: 'Nom (2+ caractères), email valide et mot de passe (6+ caractères) requis.' });
      return;
    }

    const userId = crypto.randomUUID();
    const adminUser: StoredUser = {
      id: userId,
      name,
      email,
      initials: computeInitials(name),
      role: 'admin',
      title: defaultTitleForRole('admin'),
      passwordHash: hashPassword(password),
    };
    users.set(userId, adminUser);
    adminClaimed = true;
    ensureUserSeedState(userId);

    const token = issueTokenForUser(adminUser);
    res.status(201).json({ token, user: publicUser(adminUser) });
  });

  app.post('/api/auth/login', (req, res) => {
    const email = sanitizeText(req.body?.email, 120).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!isValidEmail(email) || !password) {
      res.status(400).json({ error: 'Adresse email et mot de passe requis.' });
      return;
    }

    const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();
    let matchedUser = Array.from(users.values()).find((u) => u.email === email);

    if (envPasscode.length > 0 && safeCompareStrings(password, envPasscode)) {
      if (!matchedUser) {
        const userId = crypto.randomUUID();
        const inferredName = email.split('@')[0]?.replace(/[._-]+/g, ' ') || 'Administrateur';
        const formattedName = inferredName.replace(/\b\w/g, (c) => c.toUpperCase());
        matchedUser = {
          id: userId,
          name: formattedName,
          email,
          initials: computeInitials(formattedName),
          role: 'admin',
          title: defaultTitleForRole('admin'),
          passwordHash: hashPassword(password),
        };
        users.set(userId, matchedUser);
        adminClaimed = true;
        ensureUserSeedState(userId);
      } else if (matchedUser.role !== 'admin' && matchedUser.role !== 'management') {
        res.status(401).json({ error: 'Identifiants invalides.' });
        return;
      }
      const token = issueTokenForUser(matchedUser);
      res.json({ token, user: publicUser(matchedUser) });
      return;
    }

    if (!matchedUser || !verifyPassword(password, matchedUser.passwordHash)) {
      res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
      return;
    }

    ensureUserSeedState(matchedUser.id);
    const token = issueTokenForUser(matchedUser);
    res.json({ token, user: publicUser(matchedUser) });
  });

  app.post('/api/auth/register', (req, res) => {
    const name = sanitizeText(req.body?.name, 80);
    const email = sanitizeText(req.body?.email, 120).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (name.length < 2 || !isValidEmail(email) || password.length < 6) {
      res.status(400).json({ error: 'Nom (2+ caractères), email valide et mot de passe (6+ caractères) requis.' });
      return;
    }

    if (Array.from(users.values()).some((u) => u.email === email)) {
      res.status(409).json({ error: 'Un compte existe déjà avec cette adresse email.' });
      return;
    }

    const userId = crypto.randomUUID();
    const learner: StoredUser = {
      id: userId,
      name,
      email,
      initials: computeInitials(name),
      role: 'staff',
      title: defaultTitleForRole('staff'),
      passwordHash: hashPassword(password),
    };
    users.set(userId, learner);
    ensureUserSeedState(userId);

    const token = issueTokenForUser(learner);
    res.status(201).json({ token, user: publicUser(learner) });
  });

  app.post('/api/auth/logout', requireAuth, (req: AuthedRequest, res) => {
    if (req.authSessionId) {
      revokedSessions.add(req.authSessionId);
    }
    res.json({ ok: true });
  });

  app.get('/api/dashboard', requireAuth, (req: AuthedRequest, res) => {
    const viewer = req.authUser!;
    ensureUserSeedState(viewer.id);

    const userCourses: Course[] = courses.map((c) => {
      const m = getCourseMetricsForUser(viewer.id, c);
      return {
        ...c,
        userProgress: m.userProgress,
        completedLevels: m.completedLevels,
        lastScore: m.lastScore,
      };
    });

    const assignments = buildAssignmentsList(viewer);
    const kpis = computeKpis(viewer, assignments);
    const skills = buildSkillsForUser(viewer.id);
    const chart = baseMonths.map((pt, idx) =>
      idx === baseMonths.length - 1 ? { ...pt, actual: kpis.completionRate } : pt
    );
    const notifications = notificationsByUser.get(viewer.id) ?? [];
    const canSeeDirectory =
      viewer.role === 'admin' ||
      viewer.role === 'management' ||
      viewer.role === 'trainer' ||
      viewer.role === 'manager';

    res.json({
      user: publicUser(viewer),
      kpis,
      chart,
      courses: userCourses,
      assignments,
      skills,
      notifications,
      users: canSeeDirectory ? Array.from(users.values()).map(publicUser) : undefined,
    });
  });

  app.post('/api/courses', requireAuth, requireRole(['admin', 'management', 'trainer']), (req: AuthedRequest, res) => {
    const titleFr = sanitizeText(req.body?.titleFr, 100);
    const titleEn = sanitizeText(req.body?.titleEn, 100) || titleFr;
    const categoryFr = sanitizeText(req.body?.categoryFr, 40) || 'Parcours';
    const categoryEn = sanitizeText(req.body?.categoryEn, 40) || categoryFr;
    const duration = sanitizeText(req.body?.duration, 40) || '4 Modules · 1h30';
    const skillId = sanitizeText(req.body?.skillId, 60) || 'intellectual-agility';
    const formatLabel = sanitizeText(req.body?.formatLabel, 40) || 'Articulate 360';

    if (titleFr.length < 3) {
      res.status(400).json({ error: 'Le titre du cours doit contenir au moins 3 caractères.' });
      return;
    }

    const themes: Array<'teal' | 'blue' | 'orange'> = ['teal', 'blue', 'orange'];
    const idx = (nextCourseId - 1) % COURSE_IMAGES.length;
    const safeCoverUrl = isSafeImageUrl(req.body?.imageUrl) ?? COURSE_IMAGES[idx];

    const rawModules = Array.isArray(req.body?.modules) ? req.body.modules.slice(0, 4) : [];
    const courseId = nextCourseId++;

    const buildFallbackLevel = (num: number, customTitle?: string): CourseLevel => ({
      num,
      title: {
        fr: customTitle || `Module ${num} : Maîtrise opérationnelle ${num}`,
        en: customTitle || `Module ${num}: Operational mastery ${num}`,
      },
      summary: {
        fr: `Module interactif ${num} pour développer vos compétences sur « ${titleFr} ».`,
        en: `Interactive module ${num} to build your skills in "${titleEn}".`,
      },
      scenario: {
        fr: `Cas pratique Connecteo appliqué au module ${num} de « ${titleFr} ».`,
        en: `Connecteo field scenario applied to module ${num} of "${titleEn}".`,
      },
      durationMinutes: 25,
      imageUrl: safeCoverUrl,
      blockType: num % 2 === 1 ? 'flashcards' : 'steps',
      takeaway: {
        fr: `Retenez la démarche structurée du module ${num} avant d’agir auprès du client.`,
        en: `Remember the structured approach from module ${num} before acting with the customer.`,
      },
      flashcards: [
        {
          front: { fr: 'Réflexe terrain', en: 'Field reflex' },
          back: {
            fr: `Appliquer les principes clés de « ${titleFr} » dès l’accueil.`,
            en: `Apply key principles from "${titleEn}" right from greeting.`,
          },
        },
        {
          front: { fr: 'Point de contrôle', en: 'Checkpoint' },
          back: {
            fr: 'Valider la compréhension mutuelle avant de conclure.',
            en: 'Confirm mutual understanding before closing.',
          },
        },
      ],
      steps: [
        {
          title: { fr: '1. Observer', en: '1. Observe' },
          detail: { fr: 'Identifier les faits vérifiés sans a priori.', en: 'Identify verified facts objectively.' },
        },
        {
          title: { fr: '2. Ajuster', en: '2. Adapt' },
          detail: { fr: 'Choisir la réponse la plus adaptée au profil client.', en: 'Select the best response for the customer.' },
        },
        {
          title: { fr: '3. Capitaliser', en: '3. Capitalize' },
          detail: { fr: 'Tracer l’issue et partager les retours clés.', en: 'Log outcome and share key insights.' },
        },
      ],
      quiz: [
        {
          id: `custom-${courseId}-${num}-1`,
          question: {
            fr: `Quel principe clé devez-vous appliquer dans le module ${num} ?`,
            en: `Which key principle should you apply in module ${num}?`,
          },
          options: [
            { fr: 'Analyser le besoin client puis agir avec méthode', en: 'Analyze customer need then act methodically' },
            { fr: 'Ignorer les retours terrain', en: 'Ignore field feedback' },
            { fr: 'Appliquer une réponse non vérifiée', en: 'Apply an unverified response' },
          ],
          correctIndex: 0,
        },
      ],
    });

    let levels: CourseLevel[];
    if (rawModules.length > 0) {
      levels = rawModules.map((mod: Record<string, unknown>, i: number) => {
        const num = i + 1;
        const modTitle = sanitizeText(mod?.title, 120) || `Module ${num} : Séquence interactive`;
        const modSummary =
          sanitizeText(mod?.summary, 500) ||
          `Séquence interactive ${num} du parcours « ${titleFr} ».`;
        const modScenario =
          sanitizeText(mod?.scenario, 500) ||
          `Mise en situation Connecteo appliquée au module ${num}.`;
        const modTakeaway = sanitizeText(mod?.takeaway, 320);
        const modImageUrl = isSafeImageUrl(mod?.imageUrl) ?? safeCoverUrl;
        const rawBlock = mod?.blockType as InteractiveBlockType;
        const blockType: InteractiveBlockType = VALID_BLOCK_TYPES.includes(rawBlock)
          ? rawBlock
          : 'narrative';

        const rawFlashcards = Array.isArray(mod?.flashcards) ? mod.flashcards.slice(0, 4) : [];
        const flashcards = rawFlashcards
          .map((fc: Record<string, unknown>) => {
            const front = sanitizeText(fc?.front, 120);
            const back = sanitizeText(fc?.back, 260);
            if (!front && !back) return null;
            return {
              front: { fr: front || 'Notion clé', en: front || 'Key concept' },
              back: { fr: back || modSummary, en: back || modSummary },
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        const rawSteps = Array.isArray(mod?.steps) ? mod.steps.slice(0, 5) : [];
        const steps = rawSteps
          .map((st: Record<string, unknown>, stIdx: number) => {
            const stTitle = sanitizeText(st?.title, 100);
            const detail = sanitizeText(st?.detail, 260);
            if (!stTitle && !detail) return null;
            return {
              title: { fr: stTitle || `Étape ${stIdx + 1}`, en: stTitle || `Step ${stIdx + 1}` },
              detail: { fr: detail || modSummary, en: detail || modSummary },
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        const qText =
          sanitizeText(mod?.quizQuestion, 240) ||
          `Quel réflexe prioriser dans « ${modTitle} » ?`;
        const rawOptions = Array.isArray(mod?.quizOptions)
          ? mod.quizOptions.map((o: unknown) => sanitizeText(o, 180)).filter(Boolean).slice(0, 4)
          : [];
        const optionsText =
          rawOptions.length >= 2
            ? rawOptions
            : [
                'Appliquer la méthode structurée Connecteo et vérifier le besoin client',
                'Traiter la demande sans vérification préalable',
                'Ignorer les étapes de suivi',
              ];
        const rawCorrect = Number(mod?.correctIndex);
        const correctIndex =
          Number.isInteger(rawCorrect) && rawCorrect >= 0 && rawCorrect < optionsText.length
            ? rawCorrect
            : 0;

        return {
          num,
          title: { fr: modTitle, en: modTitle },
          summary: { fr: modSummary, en: modSummary },
          scenario: { fr: modScenario, en: modScenario },
          durationMinutes: 25,
          imageUrl: modImageUrl,
          blockType,
          takeaway: modTakeaway ? { fr: modTakeaway, en: modTakeaway } : undefined,
          flashcards:
            flashcards.length > 0
              ? flashcards
              : blockType === 'flashcards'
                ? buildFallbackLevel(num, modTitle).flashcards
                : undefined,
          steps:
            steps.length > 0
              ? steps
              : blockType === 'steps'
                ? buildFallbackLevel(num, modTitle).steps
                : undefined,
          quiz: [
            {
              id: `custom-${courseId}-${num}-1`,
              question: { fr: qText, en: qText },
              options: optionsText.map((txt: string) => ({ fr: txt, en: txt })),
              correctIndex,
            },
          ],
        };
      });
    } else {
      const levelTitles: string[] = Array.isArray(req.body?.levelTitles)
        ? req.body.levelTitles.map((l: unknown) => sanitizeText(l, 120)).filter(Boolean)
        : [];
      levels = [1, 2, 3, 4].map((num) => buildFallbackLevel(num, levelTitles[num - 1]));
    }

    const newCourse: StoredCourse = {
      id: courseId,
      title: { fr: titleFr, en: titleEn },
      category: { fr: categoryFr, en: categoryEn },
      duration: { fr: duration, en: duration },
      owner: req.authUser!.name,
      skillId,
      imageUrl: safeCoverUrl,
      accentTheme: themes[idx],
      formatLabel,
      levels,
    };

    courses.push(newCourse);
    const list = notificationsByUser.get(req.authUser!.id) ?? [];
    list.unshift({
      id: `notif-course-${newCourse.id}-${Date.now()}`,
      message: {
        fr: `Nouveau parcours Articulate 360 publié : « ${titleFr} ».`,
        en: `New Articulate 360 course published: "${titleEn}".`,
      },
      createdAt: new Date().toISOString(),
      read: false,
    });
    notificationsByUser.set(req.authUser!.id, list.slice(0, 20));

    res.status(201).json({ course: newCourse });
  });

  app.post('/api/courses/:id/levels/:levelNum/submit', requireAuth, (req: AuthedRequest, res) => {
    const courseId = Number(req.params.id);
    const levelNum = Number(req.params.levelNum);
    const course = courses.find((c) => c.id === courseId);
    if (!course) {
      res.status(404).json({ error: 'Formation introuvable.' });
      return;
    }

    const level = course.levels.find((l) => l.num === levelNum);
    if (!level) {
      res.status(404).json({ error: 'Niveau introuvable.' });
      return;
    }

    const userId = req.authUser!.id;
    ensureUserSeedState(userId);
    const userProgressMap = progressByUser.get(userId)!;
    const entry = userProgressMap.get(courseId) ?? { completedLevels: [], scores: {}, hoursSpent: 0 };

    if (levelNum > 1 && !entry.completedLevels.includes(levelNum - 1) && !entry.completedLevels.includes(levelNum)) {
      res.status(400).json({ error: 'Complétez le niveau précédent avant de débloquer celui-ci.' });
      return;
    }

    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    if (answers.length !== level.quiz.length) {
      res.status(400).json({ error: 'Veuillez répondre à toutes les questions du module.' });
      return;
    }

    let correctCount = 0;
    level.quiz.forEach((q, idx) => {
      if (Number(answers[idx]) === q.correctIndex) {
        correctCount += 1;
      }
    });

    const score = Math.round((correctCount / Math.max(1, level.quiz.length)) * 100);
    const passed = score >= 50;

    if (passed) {
      if (!entry.completedLevels.includes(levelNum)) {
        entry.completedLevels.push(levelNum);
        entry.hoursSpent += Math.round((level.durationMinutes / 60) * 10) / 10;
      }
      entry.scores[levelNum] = Math.max(entry.scores[levelNum] ?? 0, score);
      userProgressMap.set(courseId, entry);

      const hasAsg = assignmentsStore.some((a) => a.learnerId === userId && a.courseId === courseId);
      if (!hasAsg) {
        assignmentsStore.push({
          id: `asg-${userId}-${courseId}`,
          learnerId: userId,
          courseId,
          dueDate: '2026-12-31',
          assignedBy: req.authUser!.name,
        });
      }

      const list = notificationsByUser.get(userId) ?? [];
      list.unshift({
        id: `notif-lvl-${courseId}-${levelNum}-${Date.now()}`,
        message: {
          fr: `Niveau ${levelNum} validé sur « ${course.title.fr} » (${score}%).`,
          en: `Level ${levelNum} completed on "${course.title.en}" (${score}%).`,
        },
        createdAt: new Date().toISOString(),
        read: false,
      });
      notificationsByUser.set(userId, list.slice(0, 20));
    }

    res.json({ passed, score, completedLevels: entry.completedLevels });
  });

  app.post(
    '/api/assignments',
    requireAuth,
    requireRole(['admin', 'management', 'trainer', 'manager']),
    (req: AuthedRequest, res) => {
      const learnerId = sanitizeText(req.body?.learnerId, 80);
      const courseId = Number(req.body?.courseId);
      const dueDate = sanitizeText(req.body?.dueDate, 20);

      if (!users.has(learnerId)) {
        res.status(404).json({ error: 'Apprenant introuvable.' });
        return;
      }
      const course = courses.find((c) => c.id === courseId);
      if (!course) {
        res.status(404).json({ error: 'Cours introuvable.' });
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        res.status(400).json({ error: 'Date d’échéance invalide (AAAA-MM-JJ).' });
        return;
      }

      const existing = assignmentsStore.find((a) => a.learnerId === learnerId && a.courseId === courseId);
      if (existing) {
        existing.dueDate = dueDate;
        existing.assignedBy = req.authUser!.name;
      } else {
        assignmentsStore.push({
          id: `asg-${crypto.randomUUID().slice(0, 8)}`,
          learnerId,
          courseId,
          dueDate,
          assignedBy: req.authUser!.name,
        });
      }

      const targetNotifs = notificationsByUser.get(learnerId) ?? [];
      targetNotifs.unshift({
        id: `notif-asg-${Date.now()}`,
        message: {
          fr: `Nouvelle formation affectée : « ${course.title.fr} » (échéance ${dueDate}).`,
          en: `New course assigned: "${course.title.en}" (due ${dueDate}).`,
        },
        createdAt: new Date().toISOString(),
        read: false,
      });
      notificationsByUser.set(learnerId, targetNotifs.slice(0, 20));

      res.status(201).json({ ok: true });
    }
  );

  app.post('/api/users', requireAuth, requireRole(['admin', 'management']), (req: AuthedRequest, res) => {
    const name = sanitizeText(req.body?.name, 80);
    const email = sanitizeText(req.body?.email, 120).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const role = req.body?.role as Role;

    if (name.length < 2 || !isValidEmail(email) || password.length < 6 || !VALID_ROLES.includes(role)) {
      res.status(400).json({ error: 'Champs invalides (nom, email, mot de passe 6+ caractères, rôle valide).' });
      return;
    }

    if (Array.from(users.values()).some((u) => u.email === email)) {
      res.status(409).json({ error: 'Cette adresse email est déjà utilisée.' });
      return;
    }

    const userId = crypto.randomUUID();
    const created: StoredUser = {
      id: userId,
      name,
      email,
      initials: computeInitials(name),
      role,
      title: defaultTitleForRole(role),
      passwordHash: hashPassword(password),
    };
    users.set(userId, created);
    ensureUserSeedState(userId);
    res.status(201).json({ user: publicUser(created) });
  });

  app.post('/api/users/import', requireAuth, requireRole(['admin', 'management']), (req: AuthedRequest, res) => {
    const rawUsers = Array.isArray(req.body?.users) ? req.body.users : [];
    const defaultPassword = typeof req.body?.defaultPassword === 'string' ? req.body.defaultPassword : '';

    if (rawUsers.length === 0 || rawUsers.length > 200) {
      res.status(400).json({ error: 'Fournissez entre 1 et 200 utilisateurs à importer.' });
      return;
    }

    const existingEmails = new Set(Array.from(users.values()).map((u) => u.email.toLowerCase()));
    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rawUsers.length; i += 1) {
      const row = rawUsers[i] as Record<string, unknown>;
      const name = sanitizeText(row?.name, 80);
      const email = sanitizeText(row?.email, 120).toLowerCase();
      const role = row?.role as Role;
      const rowPassword = typeof row?.password === 'string' && row.password.length >= 6
        ? row.password
        : defaultPassword;

      if (name.length < 2 || !isValidEmail(email) || !VALID_ROLES.includes(role)) {
        errors.push(`Ligne ${i + 1} ignorée (${email || name || 'invalide'}).`);
        continue;
      }

      if (rowPassword.length < 6) {
        res.status(400).json({ error: 'Un mot de passe initial d’au moins 6 caractères est requis pour l’import.' });
        return;
      }

      if (existingEmails.has(email)) {
        skippedCount += 1;
        continue;
      }

      const userId = crypto.randomUUID();
      const created: StoredUser = {
        id: userId,
        name,
        email,
        initials: computeInitials(name),
        role,
        title: defaultTitleForRole(role),
        passwordHash: hashPassword(rowPassword),
      };
      users.set(userId, created);
      existingEmails.add(email);
      ensureUserSeedState(userId);
      importedCount += 1;
    }

    if (importedCount > 0) {
      const list = notificationsByUser.get(req.authUser!.id) ?? [];
      list.unshift({
        id: `notif-import-${Date.now()}`,
        message: {
          fr: `Import massif terminé : ${importedCount} utilisateur(s) ajouté(s).`,
          en: `Bulk import completed: ${importedCount} user(s) added.`,
        },
        createdAt: new Date().toISOString(),
        read: false,
      });
      notificationsByUser.set(req.authUser!.id, list.slice(0, 20));
    }

    const result: BulkImportResult = { importedCount, skippedCount, errors };
    res.status(201).json(result);
  });

  app.patch('/api/users/:id/role', requireAuth, requireRole(['admin', 'management']), (req: AuthedRequest, res) => {
    const targetId = sanitizeText(req.params.id, 80);
    const newRole = req.body?.role as Role;
    const target = users.get(targetId);

    if (!target || !VALID_ROLES.includes(newRole)) {
      res.status(400).json({ error: 'Utilisateur ou rôle invalide.' });
      return;
    }

    if (target.role === 'admin' && newRole !== 'admin') {
      const adminCount = Array.from(users.values()).filter((u) => u.role === 'admin').length;
      if (adminCount <= 1) {
        res.status(400).json({ error: 'Impossible de retirer le rôle du dernier administrateur.' });
        return;
      }
    }

    target.role = newRole;
    target.title = defaultTitleForRole(newRole);
    res.json({ user: publicUser(target) });
  });

  app.post('/api/notifications/read', requireAuth, (req: AuthedRequest, res) => {
    const list = notificationsByUser.get(req.authUser!.id) ?? [];
    list.forEach((n) => {
      n.read = true;
    });
    res.json({ ok: true });
  });

  app.get(
    '/api/reports/export',
    requireAuth,
    requireRole(['admin', 'management', 'trainer', 'manager']),
    (req: AuthedRequest, res) => {
      const lang = req.query.lang === 'en' ? 'en' : 'fr';
      const assignments = buildAssignmentsList(req.authUser!);
      const header =
        lang === 'en'
          ? ['Learner', 'Course', 'Progress', 'Score', 'Due Date', 'Status']
          : ['Apprenant', 'Formation', 'Progression', 'Score', 'Echeance', 'Statut'];

      const statusText = (s: AssignmentStatus) => {
        if (lang === 'en') return s === 'completed' ? 'Completed' : s === 'late' ? 'Overdue' : 'In progress';
        return s === 'completed' ? 'Terminé' : s === 'late' ? 'En retard' : 'En cours';
      };

      const rows = assignments.map((a) => [
        a.learnerName,
        a.courseTitle[lang],
        `${a.progress}%`,
        a.score !== null ? `${a.score}%` : '-',
        a.dueDate,
        statusText(a.status),
      ]);

      const csv = [header.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="connecteo-learning-report.csv"');
      res.send(`\ufeff${csv}`);
    }
  );

  return app;
}
