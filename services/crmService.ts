

import {
  CreateClassPayload,
  CreateClassResponse,
  GlobalConfig,
  GetCoursePlanResponse,
  UnlockUnitPayload,
  AddStudentPayload,
  AddStudentResponse,
  CreateLevelPayload,
  CreateLevelResponse,
  TemplatePageResponse,
  TemplateTreeResponse,
  CopyUnitResponse,
  UnitPageResponse,
  StartEditResponse,
  UnitDetailResponse,
  UpdateUnitPayload,
  CreateTemplatePayload,
  CreateTemplateResponse,
  CreateSaleUnitPayload,
  CreateSaleUnitResponse,
  UpdateTreePayload,
  UpdateTreeResponse,
  SubmitTemplateAuditResponse
} from '../types';

const CRM_BASE_URL = 'https://crm-mx.xueqiulearning.com/crm-api/v1';
const OAA_BASE_URL = 'https://crm-mx.xueqiulearning.com/oaa-service/v1';
const CRM_CLASSCENTER_BASE_URL = 'https://crm-mx.xueqiulearning.com/crmclasscenter/v1';
const TMS_BASE_URL = 'https://tms-mx.xueqiulearning.com/merton-backend';
const TMS_TEMPLATE_BASE_URL = 'https://tms-mx.xueqiulearning.com/math-template';

// Helper to format Auth token based on input
const getAuthHeader = (token: string) => {
  if (!token) return '';
  const cleanToken = token.trim();
  if (cleanToken.startsWith('Bearer ')) return cleanToken;
  if (cleanToken.startsWith('ey')) return cleanToken;
  return `Bearer ${cleanToken}`;
};

// TMS Header Helper: Centralize headers for TMS requests to ensure consistency
const getTmsHeaders = (config: GlobalConfig, isJson = false) => {
  const headers: Record<string, string> = {
    'Authorization': getAuthHeader(config.authToken),
    'Accept': isJson ? 'application/json' : '*/*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  };
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

// Common fetch options for TMS to bypass CORS * + Credentials conflict
const tmsFetchOptions = {
  credentials: 'omit' as RequestCredentials,
  referrer: 'https://tms-mx.xueqiulearning.com/',
};

export const CrmService = {
  /**
   * Creates a new class via the CRM API
   */
  createClass: async (payload: CreateClassPayload, config: GlobalConfig): Promise<CreateClassResponse> => {
    try {
      const response = await fetch(`${CRM_BASE_URL}/class`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader(config.authToken),
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating class:', error);
      throw error;
    }
  },

  /**
   * Fetch the course plan (schedule) for a class
   */
  getCoursePlan: async (classId: number, config: GlobalConfig): Promise<GetCoursePlanResponse> => {
    try {
      const response = await fetch(`${OAA_BASE_URL}/class/${classId}/coursePlan`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader(config.authToken),
          'Accept': 'application/json, text/plain, */*',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting course plan:', error);
      throw error;
    }
  },

  /**
   * Unlock a specific course unit
   */
  unlockUnit: async (payload: UnlockUnitPayload, config: GlobalConfig): Promise<any> => {
    try {
      const response = await fetch(`${OAA_BASE_URL}/coursePlan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader(config.authToken),
          'Accept': 'application/json, text/plain, */*',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error unlocking unit:', error);
      throw error;
    }
  },

  /**
   * Add students to a class
   * @param overrideOperatorId If provided, uses this ID as the Operator-UserId header instead of the global config ID
   */
  addStudents: async (classId: number, userIds: number[], config: GlobalConfig, overrideOperatorId?: number): Promise<AddStudentResponse> => {
    try {
      const payload: AddStudentPayload = {
        businessType: 1,
        users: userIds.map(id => ({
          userId: id,
          remark: "批量进班",
          orderNo: ""
        }))
      };

      const operatorIdStr = overrideOperatorId ? overrideOperatorId.toString() : config.operatorId.toString();

      const response = await fetch(`${CRM_CLASSCENTER_BASE_URL}/userclass/classes/${classId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader(config.authToken),
          'Accept': 'application/json, text/plain, */*',
          'Operator-UserId': operatorIdStr
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error adding students:', error);
      throw error;
    }
  },

  /**
   * Create a level (checkpoint) with bound questions
   */
  createLevel: async (payload: CreateLevelPayload, config: GlobalConfig): Promise<CreateLevelResponse> => {
    try {
      const response = await fetch(`${TMS_BASE_URL}/checkpoint/insert`, {
        method: 'POST',
        headers: getTmsHeaders(config, true),
        body: JSON.stringify(payload),
        ...tmsFetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating level:', error);
      throw error;
    }
  },

  /**
   * Get Template Detail by ID
   */
  getTemplateById: async (id: string | number, config: GlobalConfig): Promise<any> => {
    try {
      const url = `${TMS_TEMPLATE_BASE_URL}/unitTemplate/${id}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getTmsHeaders(config, false),
        ...tmsFetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting template detail:', error);
      throw error;
    }
  },

  /**
   * Step 1: Query Template Info
   */
  getTemplatePage: async (templateId: string, config: GlobalConfig): Promise<TemplatePageResponse> => {
    try {
      const url = `${TMS_TEMPLATE_BASE_URL}/unitTemplate/page?pageNo=1&pageSize=10&subjectId=${config.subjectId}&auditStateList=2&templateId=${templateId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': getAuthHeader(config.authToken),
          'Accept': '*/*',
        },
        ...tmsFetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching template info:', error);
      throw error;
    }
  },

  /**
   * Step 2: Query Template Tree Data
   */
  getTemplateTree: async (templateId: string, config: GlobalConfig): Promise<TemplateTreeResponse> => {
    try {
      const url = `${TMS_TEMPLATE_BASE_URL}/unitCombinationData/tree?id=${templateId}&subjectId=${config.subjectId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': getAuthHeader(config.authToken),
          'Accept': '*/*',
        },
        ...tmsFetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching template tree:', error);
      throw error;
    }
  },

  /**
   * Create Course Template
   */
  createTemplate: async (payload: CreateTemplatePayload, config: GlobalConfig): Promise<CreateTemplateResponse> => {
    try {
      const url = `${TMS_TEMPLATE_BASE_URL}/unitTemplate`;
      const response = await fetch(url, {
        method: 'POST',
        headers: getTmsHeaders(config, true),
        body: JSON.stringify(payload),
        ...tmsFetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  },

  /**
   * Search Template Content Unit
   */
  searchTemplateUnit: async (unitId: string | number, config: GlobalConfig): Promise<any> => {
    try {
      const cleanId = unitId.toString().trim();
      const url = `${TMS_TEMPLATE_BASE_URL}/unit/list?subjectId=${config.subjectId}&unitId=${cleanId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getTmsHeaders(config, false),
        ...tmsFetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error searching template unit:', error);
      throw error;
    }
  },

  /**
   * Create Sale Unit (Lesson)
   */
  createSaleUnit: async (payload: CreateSaleUnitPayload, config: GlobalConfig): Promise<CreateSaleUnitResponse> => {
    try {
      const url = `${TMS_TEMPLATE_BASE_URL}/sale/unit`;
      const response = await fetch(url, {
        method: 'POST',
        headers: getTmsHeaders(config, true),
        body: JSON.stringify(payload),
        ...tmsFetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating sale unit:', error);
      throw error;
    }
  },

  /**
   * Update Template Tree Structure
   */
  updateTemplateTree: async (payload: UpdateTreePayload, config: GlobalConfig): Promise<UpdateTreeResponse> => {
    try {
      const url = `${TMS_TEMPLATE_BASE_URL}/unitCombinationData/updateTree`;
      const response = await fetch(url, {
        method: 'POST',
        headers: getTmsHeaders(config, true),
        body: JSON.stringify(payload),
        ...tmsFetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating template tree:', error);
      throw error;
    }
  },

  /**
   * Submit Template for Audit
   */
  submitTemplateAudit: async (templateId: number, config: GlobalConfig): Promise<SubmitTemplateAuditResponse> => {
    try {
      const url = `${TMS_TEMPLATE_BASE_URL}/audit/submitAudit?id=${templateId}&forceSubmit=false`;
      const response = await fetch(url, {
        method: 'POST',
        headers: getTmsHeaders(config, true),
        body: JSON.stringify({}), // Empty body usually required for POST even if params are in query
        ...tmsFetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error submitting template audit:', error);
      throw error;
    }
  },

  /**
   * Copy a course unit
   * GET /merton-backend/teaching/unit/copy?id={id}
   */
  copyUnit: async (unitId: string | number, config: GlobalConfig): Promise<CopyUnitResponse> => {
    try {
      const cleanId = unitId.toString().trim();
      const url = `${TMS_BASE_URL}/teaching/unit/copy?id=${cleanId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getTmsHeaders(config, false),
        ...tmsFetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error copying unit:', error);
      throw error;
    }
  },

  /**
   * Search Unit Page to get internal ID
   */
  getUnitPage: async (unitId: string | number, config: GlobalConfig): Promise<UnitPageResponse> => {
    try {
      const cleanId = unitId.toString().trim();
      const url = `${TMS_BASE_URL}/teaching/unit/page?subjectId=${config.subjectId}&syllabus=${config.subjectId}-1&level=1&unitId=${cleanId}&pageNum=1&pageSize=20`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getTmsHeaders(config, false),
        ...tmsFetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error searching unit page:', error);
      throw error;
    }
  },

  /**
   * Start Edit
   */
  startEdit: async (id: number, config: GlobalConfig): Promise<StartEditResponse> => {
    try {
      const url = `${TMS_BASE_URL}/teaching/unit/startEdit/${id}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: getTmsHeaders(config, false),
        ...tmsFetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error starting edit:', error);
      throw error;
    }
  },

  /**
   * Get Unit Detail
   */
  getUnitDetail: async (id: number, config: GlobalConfig): Promise<UnitDetailResponse> => {
    try {
      const url = `${TMS_BASE_URL}/teaching/unit/detail/${id}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getTmsHeaders(config, false),
        ...tmsFetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting unit detail:', error);
      throw error;
    }
  },

  /**
   * Update Unit (Rename & Save)
   */
  updateUnit: async (payload: UpdateUnitPayload, config: GlobalConfig): Promise<StartEditResponse> => {
    try {
      const url = `${TMS_BASE_URL}/teaching/unit/update`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: getTmsHeaders(config, true),
        body: JSON.stringify(payload),
        ...tmsFetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating unit:', error);
      throw error;
    }
  },

  /**
   * Submit Audit
   */
  submitAudit: async (id: number, description: string = "1", config: GlobalConfig): Promise<StartEditResponse> => {
    try {
      const url = `${TMS_BASE_URL}/teaching/unit/submitAudit`;
      const response = await fetch(url, {
        method: 'POST',
        headers: getTmsHeaders(config, true),
        body: JSON.stringify({
          id,
          description,
          iterationType: 0
        }),
        ...tmsFetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error submitting audit:', error);
      throw error;
    }
  },

  /**
   * Audit Pass
   */
  auditUnitPass: async (id: number, config: GlobalConfig): Promise<StartEditResponse> => {
    try {
      const url = `${TMS_BASE_URL}/teaching/unit/auditUnitPass`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: getTmsHeaders(config, true),
        body: JSON.stringify({
          id,
          description: "1"
        }),
        ...tmsFetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error auditing pass:', error);
      throw error;
    }
  },

  /**
   * Pre Online
   */
  preOnline: async (id: number, config: GlobalConfig): Promise<StartEditResponse> => {
    try {
      const url = `${TMS_BASE_URL}/teaching/unit/preOnline/${id}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: getTmsHeaders(config, false),
        ...tmsFetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error pre-online:', error);
      throw error;
    }
  },

  /**
   * Publication Online
   */
  publicationOnline: async (id: number, config: GlobalConfig): Promise<StartEditResponse> => {
    try {
      const url = `${TMS_BASE_URL}/teaching/unit/publicationOnline/${id}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: getTmsHeaders(config, false),
        ...tmsFetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error publication online:', error);
      throw error;
    }
  }

};