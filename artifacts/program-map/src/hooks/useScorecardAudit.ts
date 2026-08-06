/**
 * useScorecardAudit — Computes real content-health grades for the Quality Scorecard.
 *
 * Grade sources (no fabricated seed data):
 *  1. Salesforce LMS — does the program have a matched course? how many modules?
 *  2. Builder localStorage — which content sections has the program admin filled in?
 *  3. Salesforce Knowledge — are there published KB articles in the org?
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type SfLmsCourse } from './useSfCurriculum';
import { curriculumPrograms } from '@/data/curriculumData';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CellGrade = 'pass' | 'partial' | 'fail' | 'na';

export interface ModuleAuditDetail {
  id: string;
  name: string;
  status: string | null;
  missingObjectives: boolean;   // std-module, std-lesson indirectly
  missingAssessment: boolean;   // std-assessment
  missingReflection: boolean;   // std-reflection-prompt
  missingLesson: boolean;       // std-lesson (concepts + activities)
}

export interface CellAuditDetail {
  grade: CellGrade;
  /** How many modules / items fully satisfy this standard */
  passCount: number;
  /** Total number of modules / items checked */
  totalCount: number;
  /** Per-module breakdown (populated for module-level standards) */
  modules: ModuleAuditDetail[];
  courseFound: boolean;
  /** Salesforce course ID for the matched course (if any) */
  courseId?: string;
  /** Human-readable issues explaining the grade */
  issues: string[];
}

export interface ScorecardAuditResult {
  grades:  Record<string, Record<string, CellGrade>>;
  details: Record<string, Record<string, CellAuditDetail>>;
  /** True while the KB article check is still loading */
  kbLoading: boolean;
}

// ── Builder section min-lengths (mirror BUILDER_SECTIONS in ProgramHub) ────────

const MIN_LENGTHS: Record<string, number> = {
  overview:    40,
  objectives:  60,
  concepts:    50,
  activities:  50,
  assessments: 50,
  penny:       60,
};

function meets(val: string | undefined, key: string): boolean {
  const min = MIN_LENGTHS[key] ?? 1;
  return !!(val && val.trim().length >= min);
}

// ── Course → program matching ─────────────────────────────────────────────────

function matchCourse(progName: string, courses: SfLmsCourse[]): SfLmsCourse | null {
  const words = progName
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3);

  return (
    courses.find(c => {
      const title = (c.Course_Title__c ?? c.Name).toLowerCase();
      return words.some(w => title.includes(w));
    }) ?? null
  );
}

// ── Module detail builder ─────────────────────────────────────────────────────

function buildModuleDetails(
  course: SfLmsCourse,
  allVals: Record<string, Record<string, string>>
): ModuleAuditDetail[] {
  return course.modules.map(mod => {
    const v = allVals[mod.Id] ?? {};
    return {
      id:  mod.Id,
      name: mod.Name,
      status: mod.Status__c,
      missingObjectives: !meets(v['objectives'], 'objectives'),
      missingAssessment: !meets(v['assessments'], 'assessments'),
      missingReflection: !meets(v['penny'],       'penny'),
      missingLesson:     !meets(v['concepts'],    'concepts') || !meets(v['activities'], 'activities'),
    };
  });
}

// ── Per-standard graders ───────────────────────────────────────────────────────

function gradeBlueprint(
  course: SfLmsCourse | null,
  courseVals: Record<string, string>
): { grade: CellGrade; issues: string[] } {
  const issues: string[] = [];

  if (!course) {
    issues.push('No matching course found in Salesforce');
    return { grade: 'fail', issues };
  }

  const hasModules    = (course.Total_Modules__c ?? course.modules.length) > 0;
  const hasOverview   = meets(courseVals['overview'],   'overview');
  const hasObjectives = meets(courseVals['objectives'], 'objectives');

  if (!hasModules)    issues.push('No modules linked in the LMS');
  if (!hasOverview)   issues.push('Overview section not yet completed in Builder');
  if (!hasObjectives) issues.push('Learning Objectives section not yet completed in Builder');

  if (hasModules && hasOverview && hasObjectives) return { grade: 'pass', issues };
  if (hasModules || hasOverview || hasObjectives) return { grade: 'partial', issues };
  return { grade: 'fail', issues };
}

function gradeModules(
  course: SfLmsCourse | null,
  allVals: Record<string, Record<string, string>>
): { grade: CellGrade; mods: ModuleAuditDetail[] } {
  if (!course || course.modules.length === 0) return { grade: 'na', mods: [] };

  const mods = buildModuleDetails(course, allVals);
  const full = mods.filter(d => !d.missingObjectives && !d.missingAssessment && !d.missingReflection);
  const any  = mods.some(d => !d.missingObjectives || !d.missingAssessment || !d.missingReflection);

  if (full.length === mods.length) return { grade: 'pass', mods };
  if (any) return { grade: 'partial', mods };
  return { grade: 'fail', mods };
}

function gradeLessons(
  course: SfLmsCourse | null,
  allVals: Record<string, Record<string, string>>
): { grade: CellGrade; mods: ModuleAuditDetail[] } {
  if (!course || course.modules.length === 0) return { grade: 'na', mods: [] };

  const mods = buildModuleDetails(course, allVals);
  const full = mods.filter(d => !d.missingLesson);
  const any  = full.length > 0;
  // Also credit the course-level sections
  const cv = allVals[course.Id] ?? {};
  const courseOk = meets(cv['concepts'], 'concepts') && meets(cv['activities'], 'activities');

  if (full.length === mods.length && courseOk) return { grade: 'pass', mods };
  if (any || courseOk) return { grade: 'partial', mods };
  return { grade: 'fail', mods };
}

function gradeAssessments(
  course: SfLmsCourse | null,
  allVals: Record<string, Record<string, string>>
): { grade: CellGrade; mods: ModuleAuditDetail[] } {
  if (!course || course.modules.length === 0) return { grade: 'na', mods: [] };

  const mods    = buildModuleDetails(course, allVals);
  const passed  = mods.filter(d => !d.missingAssessment);

  if (passed.length === mods.length) return { grade: 'pass', mods };
  if (passed.length > 0)             return { grade: 'partial', mods };
  return { grade: 'fail', mods };
}

function gradeReflections(
  course: SfLmsCourse | null,
  allVals: Record<string, Record<string, string>>
): { grade: CellGrade; mods: ModuleAuditDetail[] } {
  if (!course || course.modules.length === 0) return { grade: 'na', mods: [] };

  const mods   = buildModuleDetails(course, allVals);
  const passed = mods.filter(d => !d.missingReflection);

  if (passed.length === mods.length) return { grade: 'pass', mods };
  if (passed.length > 0)             return { grade: 'partial', mods };
  return { grade: 'fail', mods };
}

function gradeKbArticles(
  course: SfLmsCourse | null,
  kbCount: number
): { grade: CellGrade; issues: string[] } {
  const issues: string[] = [];
  if (!course) {
    issues.push('No matching course found in Salesforce');
    return { grade: 'fail', issues };
  }
  if (kbCount === 0) {
    issues.push('No published knowledge articles found in Salesforce');
    return { grade: 'fail', issues };
  }
  if (kbCount < 5) {
    issues.push(`Only ${kbCount} published article${kbCount !== 1 ? 's' : ''} — recommend at least 5 per program`);
    return { grade: 'partial', issues };
  }
  return { grade: 'pass', issues };
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useScorecardAudit(
  courses: SfLmsCourse[],
  allSectionValues: Record<string, Record<string, string>>
): ScorecardAuditResult {
  // Lightweight KB article presence check — cached 10 min, non-blocking
  const { data: kbData, isLoading: kbLoading } = useQuery<unknown>({
    queryKey: ['sf-kb-articles-count'],
    queryFn: async () => {
      const res = await fetch('/api/knowledge/sf-articles?status=online');
      if (!res.ok) return { records: [] };
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
    retry: 0,
  });

  // Normalise response shape: the SF articles endpoint returns { records: [] }
  const kbCount: number = (() => {
    if (!kbData) return 0;
    if (Array.isArray(kbData)) return kbData.length;
    const d = kbData as Record<string, unknown>;
    if (Array.isArray(d['records'])) return (d['records'] as unknown[]).length;
    return 0;
  })();

  const result = useMemo<Pick<ScorecardAuditResult, 'grades' | 'details'>>(() => {
    const grades:  Record<string, Record<string, CellGrade>>        = {};
    const details: Record<string, Record<string, CellAuditDetail>>  = {};

    for (const prog of curriculumPrograms) {
      const course    = matchCourse(prog.name, courses);
      const courseVals = course ? (allSectionValues[course.Id] ?? {}) : {};
      grades[prog.id]  = {};
      details[prog.id] = {};

      // ── Blueprint ────────────────────────────────────────────────────────
      const bp = gradeBlueprint(course, courseVals);
      grades[prog.id]['std-program-blueprint'] = bp.grade;
      details[prog.id]['std-program-blueprint'] = {
        grade: bp.grade, passCount: bp.issues.length === 0 ? 1 : 0, totalCount: 1,
        modules: [], courseFound: !!course, courseId: course?.Id, issues: bp.issues,
      };

      // ── Modules ──────────────────────────────────────────────────────────
      const mod = gradeModules(course, allSectionValues);
      const modPass = mod.mods.filter(d => !d.missingObjectives && !d.missingAssessment && !d.missingReflection).length;
      grades[prog.id]['std-module'] = mod.grade;
      details[prog.id]['std-module'] = {
        grade: mod.grade, passCount: modPass, totalCount: mod.mods.length,
        modules: mod.mods, courseFound: !!course, courseId: course?.Id,
        issues: mod.grade === 'na' ? ['No modules configured in Salesforce LMS'] : [],
      };

      // ── Lessons ──────────────────────────────────────────────────────────
      const les = gradeLessons(course, allSectionValues);
      const lesPass = les.mods.filter(d => !d.missingLesson).length;
      grades[prog.id]['std-lesson'] = les.grade;
      details[prog.id]['std-lesson'] = {
        grade: les.grade, passCount: lesPass, totalCount: les.mods.length,
        modules: les.mods, courseFound: !!course, courseId: course?.Id,
        issues: les.grade === 'na' ? ['No modules to check'] : [],
      };

      // ── Assessments ──────────────────────────────────────────────────────
      const asmnt = gradeAssessments(course, allSectionValues);
      const asmntPass = asmnt.mods.filter(d => !d.missingAssessment).length;
      grades[prog.id]['std-assessment'] = asmnt.grade;
      details[prog.id]['std-assessment'] = {
        grade: asmnt.grade, passCount: asmntPass, totalCount: asmnt.mods.length,
        modules: asmnt.mods, courseFound: !!course, courseId: course?.Id,
        issues: asmnt.grade === 'na' ? ['No modules to check'] : [],
      };

      // ── KB Articles ──────────────────────────────────────────────────────
      const kb = gradeKbArticles(course, kbCount);
      grades[prog.id]['std-knowledge-article'] = kb.grade;
      details[prog.id]['std-knowledge-article'] = {
        grade: kb.grade, passCount: kb.grade === 'pass' ? 1 : 0, totalCount: 1,
        modules: [], courseFound: !!course, courseId: course?.Id, issues: kb.issues,
      };

      // ── Reflection prompts ───────────────────────────────────────────────
      const refl = gradeReflections(course, allSectionValues);
      const reflPass = refl.mods.filter(d => !d.missingReflection).length;
      grades[prog.id]['std-reflection-prompt'] = refl.grade;
      details[prog.id]['std-reflection-prompt'] = {
        grade: refl.grade, passCount: reflPass, totalCount: refl.mods.length,
        modules: refl.mods, courseFound: !!course, courseId: course?.Id,
        issues: refl.grade === 'na' ? ['No modules to check'] : [],
      };
    }

    return { grades, details };
  }, [courses, allSectionValues, kbCount]);

  return { ...result, kbLoading };
}
