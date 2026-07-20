import { useQuery } from '@tanstack/react-query';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SfCourseModule {
  Id: string;
  Name: string;
  Course__c: string;
  Order__c: number | null;
  Status__c: string | null;
  PercentCompleted__c: number | null;
}

export interface SfCourse {
  Id: string;
  Name: string;
  Course_Title__c: string | null;
  Status__c: string | null;
  Estimated_Start_Date__c: string | null;
  Estimated_End_Date__c: string | null;
  Total_Modules__c: number | null;
  Overview__c: string | null;
  Learning_Goals__c: string | null;
  Structure__c: string | null;
  Google_Drive_Folder__c: string | null;
  Canva_Course_Folder__c: string | null;
}

export interface SfCourseByProgramResponse {
  course: Pick<SfCourse, 'Id' | 'Name' | 'Course_Title__c' | 'Status__c' | 'Total_Modules__c'> | null;
  fromCache: boolean;
}

export interface SfCurriculumResponse {
  course: SfCourse | null;
  modules: SfCourseModule[];
  fromCache: boolean;
}

export interface SfLmsCourse {
  Id: string;
  Name: string;
  Course_Title__c: string | null;
  Status__c: string | null;
  Total_Modules__c: number | null;
  Estimated_Start_Date__c: string | null;
  Estimated_End_Date__c: string | null;
  modules: SfCourseModule[];
}

export interface SfLmsCoursesResponse {
  courses: SfLmsCourse[];
  fromCache: boolean;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Look up a Course__c record by program name (name-pattern LIKE match). */
export function useSfCourseByProgram(programName: string | null) {
  return useQuery<SfCourseByProgramResponse>({
    queryKey: ['sf-course-by-program', programName],
    enabled: !!programName,
    queryFn: async () => {
      const res = await fetch(
        `/api/salesforce/curriculum/by-program/${encodeURIComponent(programName!)}`
      );
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<SfCourseByProgramResponse>;
    },
    staleTime:       4 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });
}

/** Fetch all Course__c records with their child Course_Module__c records. */
export function useSfLmsCourses() {
  return useQuery<SfLmsCoursesResponse>({
    queryKey: ['sf-lms-courses'],
    queryFn: async () => {
      const res = await fetch('/api/lms/courses');
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<SfLmsCoursesResponse>;
    },
    staleTime:       4 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });
}

/** Fetch a full Course__c record + all child Course_Module__c records. */
export function useSfCurriculum(courseId: string | null) {
  return useQuery<SfCurriculumResponse>({
    queryKey: ['sf-curriculum', courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const res = await fetch(`/api/salesforce/curriculum/course/${courseId}`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<SfCurriculumResponse>;
    },
    staleTime:       4 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });
}
