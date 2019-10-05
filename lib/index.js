const axios = require("axios");
const child_process = require("child_process");

const GITHUB_URL = "https://api.github.com/graphql";
const PAGE_SIZE = 100;

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

exports.remoteTrackingBranches = remote =>
  child_process
    .execSync(`git branch -r --list ${remote}`)
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

exports.getRepoName = (remoteUrl, orgName) => {
  const re = new RegExp(`(?<=git@github.com:${orgName}/).*(?=[.]git$)`);
  const m = remoteUrl.match(re);
  if (!m || !m.length) return "";
  return m[0];
};

exports.openPRRefNames = async (token, remoteUrl) => {
  const orgLogin = exports.getOrgName(remoteUrl);
  const repoName = exports.getRepoName(remoteUrl, orgLogin);
  console.log(`attempting with orgLogin: ${orgLogin}, repoName: ${repoName}`);
  const refNames = await axios
    .post(
      GITHUB_URL,
      {
        query: `query {
          organization(login: "${orgLogin}") {
            repository(name: "${repoName}") {
              pullRequests(states: OPEN, first: ${PAGE_SIZE}) {
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
      return r.data;
    })
    .catch(err => {
      console.error(`problem encountered getting the user`);
      process.exit(1);
    });
  const refSet = new Set();
  if (
    refNames &&
    refNames.data &&
    refNames.data.organization &&
    refNames.data.organization.repository &&
    refNames.data.organization.repository.pullRequests &&
    Array.isArray(refNames.data.organization.repository.pullRequests.edges)
  ) {
    refNames.data.organization.repository.pullRequests.edges.forEach(pr => {
      if (pr && pr.node && pr.node.headRefName) refSet.add(pr.node.headRefName);
    });
  }
  return refSet;
};

exports.deletableBranches = () => exports.remoteTrackingBranches();
// you are deletable if you are:
// not in an open PR

// to make sure all the remote tracking branches are on the remote of interest,
// we should also ask a question of the remote...with some git remote command
