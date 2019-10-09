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
    .version("0.0.1")
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
  // org
  const org = delBran.getOrgName(remoteUrl);

  delBran.remoteTrackingBranches(remote).forEach(rtb => {
    // console.log(rtb);
  });

  // const refNames = await delBran.openPRRefNames(token, remoteUrl, 100);
  // console.log(refNames);
  // console.log(delBran.openPRRefNames(token, remoteUrl));
  // const closedPRs = await delBran.closedPRRefNames(token, remoteUrl, 100);
  // console.log(closedPRs);
  // const mergedPRs = await delBran.mergedPRRefNames(token, remoteUrl, 100);
  // console.log(mergedPRs);
  if (program.notOpen) {
    console.log("no open PRs specified");
  }
  if (program.merged) {
    console.log("merged PRs specified");
  }
  if (program.closed) {
    console.log("closed PRs specified");
  }

  // TODO: starting point should be all RTBs
  // TODO: add option to require branches to be in the output from the
  // commit-tree/cherry commands
  // TODO: add helpers mimicking set operations that require ref name and hash
  // to match

  // Get the set of remote tracking branches
})();
