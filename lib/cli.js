#!/usr/bin/env node

const fs = require("fs");
const program = require("commander");

const AUTH_W_GITHUB_URL =
  "https://developer.github.com/v4/guides/forming-calls/" +
  "#authenticating-with-graphql";

program
  .name("deletable-branches")
  .version("0.0.1")
  .option(
    "-t, --token-file <PATH>",
    `Path to a GitHub authentication token, see ${AUTH_W_GITHUB_URL}`
  )
  .parse(process.argv);

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
try {
  fs.accessSync(tokenFile, fs.constants.F_OK & fs.constants.R_OK);
} catch (err) {
  console.error(`Unable to read token file ${tokenFile}.`);
  process.exit(1);
}
const token = fs.readFileSync(tokenFile, "utf8").trim();

delBran.remoteTrackingBranches().forEach(rtb => {
  // console.log(rtb);
});
// delBran.print_user(token);
