const { getPresentation } = require('./presentation');

const mediaPath = value => {
  const path = typeof value === 'string' ? value : value?.path;
  return typeof path === 'string' && path.trim() ? path.trim() : null;
};

const siteMetadata = async documents => {
  const presentation = await getPresentation(documents);
  const value = key => documents.find(document => document.key === key)?.value;
  const legacyDescription = value('site.description');
  return {
    title: presentation.brand.name.zh,
    description: !value('site.presentation') && typeof legacyDescription === 'string'
      ? legacyDescription : presentation.brand.description.zh,
    favicon: mediaPath(value('site.favicon')),
    logo: mediaPath(value('site.logo')),
  };
};

module.exports = { siteMetadata };
