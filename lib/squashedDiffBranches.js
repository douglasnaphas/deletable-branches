const child_process = require("child_process");

exports.squashedDiffBranches = remote => {
  const m = new Map();
  child_process
    .execSync(
      `git branch --format="%(objectname) %(refname:lstrip=-2)" --list` +
        ` -r + ${remote}/*` +
        ` | ` +
        `grep -v "${remote}/HEAD" ` +
        ` | ` +
        `while read line ; ` +
        `do ` +
        `branch=$(echo $line | awk '{print $2}') ; ` +
        `mergeBase=$(git merge-base master $branch) && ` +
        `[[ ` +
        `$(git cherry master ` +
        `$(git commit-tree ` +
        `$(git rev-parse $branch^{tree}) ` +
        `-p $mergeBase -m _)) ` +
        `== ` +
        `"-"* ` +
        `]] ` +
        `&& ` +
        `echo $line | sed 's/^\\([a-f0-9]\\{40\\} \\)${remote}\\//\\1/' ; ` +
        `done`
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
