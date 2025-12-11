

// API Payload Types based on the screenshot
export interface CreateClassPayload {
  className: string;
  classopenTime: string; // ISO String
  counselorId: number; // Also operatorId
  operatorId: number;
  courseGroup: number; // Default 2
  coursePackageId: string; // "2498"
  courseTreeTemplateId: string; // "9505"
  daytime: number; // 4
  grade: string; // "ONE"
  phase: number; // 3
  tags: number[]; // [9]
  termId: number; // 13137
  test: number; // 0
  weekday: number; // 1
}

export interface CreateClassResponse {
  errCode: number;
  errMsg: string;
  success: boolean;
  data: {
    classId: number;
    className: string;
    // ... other fields if needed
  };
}

export interface CoursePlanItem {
  id: number;
  name: string;
  sequence?: number;
  courseSequence?: number;
  [key: string]: any;
}

export interface GetCoursePlanResponse {
  errcode: number;
  errmsg?: string;
  data?: {
    CoursePlan: CoursePlanItem[];
  };
}

export interface UnlockUnitPayload {
  classId: number;
  courseSequence: number;
  runTime: number;
  periodDay: number; // usually 0
  isLevel: boolean; // usually true
}

export interface AddStudentPayload {
  businessType: number; // 1
  users: {
    userId: number;
    remark: string; // "测试"
    orderNo: string; // ""
  }[];
}

export interface AddStudentResponse {
  errCode?: number; // inconsistent API naming in screenshots, handling optional
  errcode?: number;
  errMsg?: string;
  errmsg?: string;
  success?: boolean;
}

// Level Creation Types
export interface CreateLevelPayload {
  subjectId: number; // 14
  writeCheckpointType: string; // "NORMAL"
  name: string;
  grade: number; // 1
  stage: number; // 1
  week: number; // 1
  day: number; // 1
  limitTime: number; // 30
  difficulty: number; // 1
  errorCount: number; // 3
  noPassType: string; // "NO_RULE"
  number: number; // 1
  passMaxNum: number; // 3
  passType: string; // "NO_RULE"
  questionIdList: string[];
  reachRightNum: number; // 2
  targetRightNum: number; // 6
  upGradeStarBaseNum: number; // 1
  upGradeStarWrongNum: number; // 1
  description?: string; // Optional field based on UI
}

export interface CreateLevelResponse {
  code: number;
  message: string;
  data: boolean;
}

// Course Updater Types
export interface CourseUpdateTask {
  id: string; // unique ID for tracking
  unitId: string; // Path ID from Excel Col C
  folderName: string; // Folder Name from Excel Col F
  gameName: string; // Games from Excel Col E (default "nogame")
  status: 'pending' | 'building' | 'done' | 'error';
  downloadUrl?: string;
  error?: string;
}

// Template Validator Types
export interface TemplateRecord {
  id: number;
  name: string;
  templateId: number;
  unitCombinationId: number;
  // Add other fields from records if needed
}

export interface TemplatePageResponse {
  code: number;
  message: string;
  success: boolean;
  data: {
    records: TemplateRecord[];
    total: number;
  };
}

export interface SaleUnitDTO {
  id: number; // This corresponds to the internal ID, check if unitId is present
  name: string;
  unitId: number; // This is the unitID we need
  unitType: string;
  deductClass?: number;
  sequence: number;
  // ... other fields
}

export interface TemplateTreeItem {
  name: string; // e.g. "第十一单元"
  level: number;
  sequence: number;
  saleUnitDTOList: SaleUnitDTO[];
  unitCombinationId: number;
  customId?: string;
  // ... other fields
}

export interface TemplateTreeResponse {
  code: number;
  message: string;
  success: boolean;
  data: TemplateTreeItem[];
}

export interface FlattenedUnitItem {
  level: number;
  unitSequence: number; // Sequence of the unit container
  unitName: string; // "第十一单元"
  lessonName: string; // "六年级W11D1"
  unitId: number; // The actual ID to display
  lessonId: number; // The internal ID
}

// Template Creator Types
export interface CreateTemplatePayload {
  name: string;
  unitCombinationName: string;
  courseGroup: number;
  avatarUrl: string;
  businessLabel: string;
  description: string;
  direction: number;
  grade: string;
  groupType: string;
  label: string;
  phase: number;
  subjectId: number;
}

export interface CreateTemplateResponse {
  code: number;
  message: string;
  data: {
    unitTemplateId: number;
    unitCombinationId: number;
  };
  success: boolean;
}

// Sale Unit (Lesson) Creation
export interface CreateSaleUnitPayload {
  name: string;
  unitName: string;
  unitType: string; // "常规"
  deductClass: number;
  description: string;
  lastUnit: number; // 0 or 1
  sequence: number;
  subjectId: number; // 14
  unitId: number; // Content Unit ID (e.g., 142973)
}

export interface CreateSaleUnitResponse {
  code: number;
  message: string;
  data: number; // The created Sale Unit ID
  success: boolean;
}

// Tree Update
export interface TemplateTreeItemDTO {
  id?: number; // Optional ID if it's an existing node
  name: string;
  type: number; // 1
  level: number;
  sequence: number;
  unitCombinationId: number;
  saleUnitIdList: number[];
  subjectId?: number; // Subject ID is crucial for backend persistence
  description?: string;
  avatar?: string;
  customId?: string;
  saleUnitDTOList?: any[]; // Optional for UI or partial updates
}

export interface UpdateTreePayload {
  id: number; // Template ID
  unitCombinationDataSavedDTOList: TemplateTreeItemDTO[];
}

export interface UpdateTreeResponse {
  code: number;
  message: string;
  data: boolean;
  success: boolean;
}

export interface SubmitTemplateAuditResponse {
  code: number;
  message: string;
  data: boolean;
  success: boolean;
  traceId: string;
}

// Course Creator (Copy Unit) Types
export interface CopyUnitResponse {
  code: number;
  message: string;
  data: {
    newUnitId: number;
    oldUnitId: number;
    description?: string;
  };
}

// Unit Page/Edit Types
export interface UnitPageRecord {
  id: number;
  unitId: number;
  name: string;
  // Add other fields if necessary
}

export interface UnitPageResponse {
  code: number;
  message?: string;
  data?: {
    records: UnitPageRecord[];
    total: number;
  };
}

export interface StartEditResponse {
  code: number;
  message: string;
  data?: any;
}

export interface UnitDetailInfo {
  name: string;
  [key: string]: any;
}

export interface UnitDetailData {
  id: number;
  normalDetailInfo: UnitDetailInfo;
  [key: string]: any;
}

export interface UnitDetailResponse {
  code: number;
  message?: string;
  data?: UnitDetailData;
}

export interface UpdateUnitPayload {
  id: number;
  normalDetailInfo?: any;
  [key: string]: any;
}

// Application Configuration Types
export interface GlobalConfig {
  authToken: string;
  operatorId: number; // Used for both operatorId and counselorId based on screenshot logic
  jenkinsCrumb?: string; // Added for Course Updater
}

export enum GradeEnum {
  ONE = "ONE",
  TWO = "TWO",
  THREE = "THREE",
  FOUR = "FOUR",
  FIVE = "FIVE",
  SIX = "SIX"
}

export enum PhaseEnum {
  PHASE_1 = 1,
  PHASE_2 = 2,
  PHASE_3 = 3,
  PHASE_4 = 4,
  PHASE_5 = 5,
  PHASE_6 = 6
}
