const child_process = require("child_process");

exports.remoteTrackingBranches = remote =>
  child_process
    .execSync(`git branch -r --list ${remote}/*`)
    .toString()
    .trim()
    .split("\n")
    .map(rtb => rtb.trim())
    .filter(rtb => rtb.length > 0)
    .filter(rtb => !rtb.includes("origin/HEAD -> "));
