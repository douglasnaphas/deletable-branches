const child_process = require("child_process");

exports.remoteTrackingBranches = remote => {
  const m = new Map();
  child_process
    .execSync(
      `git branch -r --format="%(objectname) %(refname:lstrip=3)" --list ${remote}/*`
    )
    .toString()
    .trim()
    .split("\n")
    .map(rtb => rtb.trim())
    .filter(rtb => rtb.length > 0)
    .filter(rtb => !rtb.match(/^[a-f0-9]+ HEAD$/))
    .forEach(rtb => {
      const fields = rtb.split(" ");
      m.set(fields[1], fields[0]);
    });
  return m;
};
