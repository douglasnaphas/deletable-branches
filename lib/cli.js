#!/usr/bin/env node

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
  .option(
    "-o, --org <ORGANIZATION>",
    "GitHub organization name, default parsed from " +
      "`git remote get-url <remote>`"
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
console.log(`remote: ${remote}`);
// remoteUrl
const remoteUrl = delBran.getRemoteUrl(remote);
console.log(`remoteUrl: ${remoteUrl}`);
// org
const org = program.org || delBran.getOrgName(remoteUrl);

console.log(`org: ${org}`);

delBran.remoteTrackingBranches().forEach(rtb => {
  // console.log(rtb);
});
// delBran.print_user(token);
