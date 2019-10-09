exports.getRepoName = (remoteUrl, orgName) => {
  const re = new RegExp(`(?<=git@github.com:${orgName}/).*(?=[.]git$)`);
  const m = remoteUrl.match(re);
  if (!m || !m.length) return "";
  return m[0];
};
