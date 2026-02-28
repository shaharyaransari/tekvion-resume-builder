const path = require('path');

/**
 * Generate file paths for a user-generated template.
 * 
 * @param {string} userId - User ID
 * @param {string} resumeId - Resume ID
 * @param {string} [initialTemplateId] - Initial template ID (optional — enables multiple templates per resume)
 * @returns {{ htmlFilePath: string, pdfFilePath: string, previewImagePath: string }}
 */
module.exports = function generateTemplatePaths(userId, resumeId, initialTemplateId) {
  const baseDir = path.join('user-templates', userId.toString(), resumeId.toString());

  // If an initialTemplateId is provided, nest files under a template-specific subfolder
  // This allows multiple templates per resume
  if (initialTemplateId) {
    const templateDir = path.join(baseDir, initialTemplateId.toString());
    return {
      htmlFilePath: path.join(templateDir, 'resume.html'),
      pdfFilePath: path.join(templateDir, 'resume.pdf'),
      previewImagePath: path.join(templateDir, 'preview.png')
    };
  }

  // Legacy fallback (raw HTML flow — no template ID)
  return {
    htmlFilePath: path.join(baseDir, 'resume.html'),
    pdfFilePath: path.join(baseDir, 'resume.pdf'),
    previewImagePath: path.join(baseDir, 'preview.png')
  };
};
