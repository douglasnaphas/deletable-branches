const child_process = require("child_process");

exports.remoteTrackingBranches = remote =>
  child_process
    .execSync(
      `git branch -r --format="%(refname:lstrip=-1)" --list ${remote}/*`
    )
    .toString()
    .trim()
    .split("\n")
    .map(rtb => rtb.trim())
    .filter(rtb => rtb.length > 0)
    .filter(rtb => !rtb.match(/^HEAD$/));
