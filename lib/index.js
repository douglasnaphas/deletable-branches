const axios = require("axios");
const child_process = require("child_process");

exports.index_description = "the index";

exports.get_post_1 = async () => {
  await axios.get("https://jsonplaceholder.typicode.com/posts/1").then(r => {
    console.log(r.data);
  });
};

exports.print_user = async token => {
  await axios
    .post(
      "https://api.github.com/graphql",
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
    .filter(rtb => !rtb.includes("origin/HEAD -> "));

exports.getOrgName = remoteUrl => {
  const m = remoteUrl.match(/(?<=git@github.com:)[^\/]*(?=\/)/);
  if (!m || !m.length) return "";
  return m[0];
};

exports.getRepoName = () => {};

exports.openPRRefNames = async token => {
  await axios
    .post(
      "https://api.github.com/graphql",
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
