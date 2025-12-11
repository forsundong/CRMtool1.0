import { CourseUpdateTask } from '../types';

// Constants based on screenshot
const JENKINS_BASE = 'http://10.218.229.30:8080';
const JOB_URL = `${JENKINS_BASE}/jenkins/job/%E8%AF%BE%E7%A8%8B%E7%A8%8B%E5%BA%8F%E6%89%93%E5%8C%85%E2%80%94%E5%8F%AF%E9%80%89%E5%8F%82%E6%95%B0/build?delay=0sec`;
const ZIP_BASE_URL = `${JENKINS_BASE}/zip/`;

export const JenkinsService = {
  /**
   * Trigger a Jenkins build for a specific course unit
   * Uses mode: 'no-cors' to bypass browser restrictions.
   * This is a "fire-and-forget" request. We won't know if it truly succeeded or failed server-side,
   * but it won't crash the UI.
   */
  triggerBuild: async (task: CourseUpdateTask, crumb: string): Promise<void> => {
    // Construct Form Data
    const formData = new URLSearchParams();
    const jsonParam = {
      parameter: [
        { name: "unitId", value: task.unitId },
        { name: "folderName", value: task.folderName },
        { name: "games", value: task.gameName || "nogame" },
        { name: "juanzhou1", value: "yes" },
        { name: "juanzhou2", value: "no" },
        { name: "juanzhou3", value: "no" },
        { name: "ggbConfig", value: "no" },
        { name: "realDir", value: "" },
        { name: "kplib", value: "false" }
      ],
      statusCode: "303",
      redirectTo: "."
    };

    formData.append('name', 'unitId'); formData.append('value', task.unitId);
    formData.append('name', 'folderName'); formData.append('value', task.folderName);
    formData.append('name', 'games'); formData.append('value', task.gameName || "nogame");
    formData.append('name', 'juanzhou1'); formData.append('value', 'yes');
    formData.append('name', 'juanzhou2'); formData.append('value', 'no');
    formData.append('name', 'juanzhou3'); formData.append('value', 'no');
    formData.append('name', 'ggbConfig'); formData.append('value', 'no');
    formData.append('name', 'realDir'); formData.append('value', '');
    formData.append('name', 'kplib'); formData.append('value', 'false');
    formData.append('statusCode', '303');
    formData.append('redirectTo', '.');
    // Jenkins accepts the crumb as a form field 'Jenkins-Crumb'
    formData.append('Jenkins-Crumb', crumb);
    formData.append('json', JSON.stringify(jsonParam));
    formData.append('Submit', 'Build');

    try {
      await fetch(JOB_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
        mode: 'no-cors', // Essential for internal IP requests without CORS
      });
    } catch (error) {
      console.error("Jenkins build trigger failed", error);
      throw error;
    }
  },

  /**
   * Generates the predictable download URL for the zip file.
   * Does NOT check if it exists (avoids CORS error).
   */
  getDownloadUrl: (folderName: string): string => {
    return `${ZIP_BASE_URL}course_new_${folderName}.zip`;
  }
};