exports.getOrgName = remoteUrl => {
  const m = remoteUrl.match(/(?<=git@github.com:)[^\/]*(?=\/)/);
  if (!m || !m.length) return "";
  return m[0];
};
