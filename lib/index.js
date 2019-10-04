const axios = require("axios");
const child_process = require("child_process");

const GITHUB_URL = "https://api.github.com/graphql";

exports.get_post_1 = async () => {
  await axios.get("https://jsonplaceholder.typicode.com/posts/1").then(r => {
    console.log(r.data);
  });
};

exports.print_user = async token => {
  await axios
    .post(
      GITHUB_URL,
      {
        query: `query { 
          viewer { 
            login } }`
      },
      {
        headers: {
          Authorization: `bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    )
    .then(r => {
      console.log(r.data);
    })
    .catch(err => {
      console.error(`problem encountered getting the user`);
      process.exit(1);
    });
};

exports.printGitBranchR = () => {
  const rtbs = child_process.execSync("git branch -r").toString();
  console.log(rtbs);
};

exports.remoteTrackingBranches = () =>
  child_process
    .execSync("git branch -r")
    .toString()
    .trim()
    .split("\n")
    .map(rtb => rtb.trim())
    .filter(rtb => rtb.length > 0)
    .filter(rtb => !rtb.includes("origin/HEAD -> "));

exports.getRemoteUrl = remote =>
  child_process
    .execSync(`git remote get-url ${remote}`)
    .toString()
    .trim();

exports.getOrgName = remoteUrl => {
  const m = remoteUrl.match(/(?<=git@github.com:)[^\/]*(?=\/)/);
  if (!m || !m.length) return "";
  return m[0];
};

exports.getRepoName = () => {};

exports.openPRRefNames = async token => {
  await axios
    .post(
      GITHUB_URL,
      {
        query: `query {
          organization(login: "${exports.getOrgName()}") {
            repository(name: "${exports.getReporName()}") {
              pullRequests(states: OPEN, first: 100) {
                edges {
                  node {
                    headRefName
                  }
                }
              }
            }
          }
        }`
      },
      {
        headers: {
          Authorization: `bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    )
    .then(r => {
      console.log(r.data);
    })
    .catch(err => {
      console.error(`problem encountered getting the user`);
      process.exit(1);
    });
};

exports.deletableBranches = () => exports.remoteTrackingBranches();
// you are deletable if you are:
// not in an open PR
