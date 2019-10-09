const child_process = require("child_process");

exports.getRemoteUrl = remote =>
  child_process
    .execSync(`git remote get-url ${remote}`)
    .toString()
    .trim();
