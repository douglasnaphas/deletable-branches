#!/usr/bin/env node
(async () => {
  const fs = require("fs");
  const program = require("commander");

  const AUTH_W_GITHUB_URL =
    "https://developer.github.com/v4/guides/forming-calls/" +
    "#authenticating-with-graphql";
  const defaults = {
    remote: "origin"
  };

  program
    .name("deletable-branches")
    .version("0.1.4")
    .option(
      "-t, --token-file <PATH>",
      `Path to a GitHub authentication token, see ${AUTH_W_GITHUB_URL}`
    )
    .option(
      "-r, --remote <REMOTE>",
      `Git remote name, default ${defaults.remote}`,
      defaults.remote
    )
    .option("--merged", `Print branches only if they are in merged PRs`)
    .option("--closed", `Print branches only if they are in closed PRs`)
    .option("--not-open", `Print branches only if they are NOT in open PRs`)
    .option(
      "--squashed-diff",
      `Print branches only if they would be listed` +
        ` by the NPM package git-delete-squashed, adapted to 1) print branches` +
        ` instead of deleting them, and 2) list remote tracking instead of ` +
        `local branches`
    )
    .parse(process.argv);

  // Set inputs
  // token
  const delBran = require("./index.js");
  if (!program.tokenFile) {
    console.error(
      `A file with a GitHub authentication token must be specified` +
        ` with -t or --token-file. See ${AUTH_W_GITHUB_URL}.`
    );
    process.exit(1);
  }
  const { tokenFile } = program;
  if (!fs.existsSync(tokenFile)) {
    console.error(`Token file ${tokenFile} does not exist.`);
    process.exit(1);
  }
  let token;
  try {
    fs.accessSync(tokenFile, fs.constants.F_OK & fs.constants.R_OK);
    token = fs.readFileSync(tokenFile, "utf8").trim();
  } catch (err) {
    console.error(`Unable to read token file ${tokenFile}.`);
    process.exit(1);
  }
  // remote
  const { remote } = program;
  // remoteUrl
  let remoteUrl;
  try {
    remoteUrl = delBran.getRemoteUrl(remote);
  } catch (err) {
    console.error(
      `Unable to find remote ${remote}. Does \`git remote\` list ` +
        `${remote}?`
    );
    process.exit(1);
  }

  let rtbs = delBran.remoteTrackingBranches(remote);

  if (rtbs.size && program.squashedDiff) {
    const squashedDiffResults = delBran.squashedDiffBranches(remote);
    rtbs = delBran.mapIntersection(rtbs, squashedDiffResults);
  }

  if (rtbs.size && program.notOpen) {
    const openPRBranches = await delBran.openPRRefNames(token, remoteUrl, 100);
    rtbs = delBran.mapDifference(rtbs, openPRBranches);
  }
  if (rtbs.size && program.merged) {
    const mergedPRBranches = await delBran.mergedPRRefNames(
      token,
      remoteUrl,
      100
    );
    rtbs = delBran.mapIntersection(rtbs, mergedPRBranches);
  }
  if (rtbs.size && program.closed) {
    const closedPRBranches = await delBran.closedPRRefNames(
      token,
      remoteUrl,
      100
    );
    rtbs = delBran.mapIntersection(rtbs, closedPRBranches);
  }

  rtbs.forEach((h, b) => {
    console.log(`${h} ${b}`);
  });
})().catch(err => {
  console.error("error encountered:");
  console.error(err);
  process.exit(1);
});
