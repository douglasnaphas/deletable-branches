const axios = require("axios");
const child_process = require("child_process");

const remoteTrackingBranches = require("./remoteTrackingBranches")
  .remoteTrackingBranches;
exports.remoteTrackingBranches = remoteTrackingBranches;

const getRemoteUrl = require("./getRemoteUrl").getRemoteUrl;
exports.getRemoteUrl = getRemoteUrl;

const GITHUB_URL = "https://api.github.com/graphql";
exports.GITHUB_URL = GITHUB_URL;
const PAGE_SIZE = 100;
exports.PAGE_SIZE = PAGE_SIZE;

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

const getOrgName = require("./getOrgName").getOrgName;
exports.getOrgName = getOrgName;

const getRepoName = require("./getRepoName").getRepoName;
exports.getRepoName = getRepoName;

exports.openPRRefNames = async (token, remoteUrl) => {
  const orgLogin = exports.getOrgName(remoteUrl);
  const repoName = exports.getRepoName(remoteUrl, orgLogin);
  const refNames = await axios
    .post(
      GITHUB_URL,
      {
        query: `query {
          organization(login: "${orgLogin}") {
            repository(name: "${repoName}") {
              pullRequests(states: OPEN, first: ${PAGE_SIZE}) {
                totalCount
                pageInfo {
                  endCursor
                  hasNextPage
                }
                edges {
                  node {
                    headRefName
                    commits(last: 1) {
                      edges {
                        node {
                          commit {
                            oid
                          }
                        }
                      }
                    }
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
  const refMap = new Map();
  if (
    refNames &&
    refNames.data &&
    refNames.data.organization &&
    refNames.data.organization.repository &&
    refNames.data.organization.repository.pullRequests &&
    Array.isArray(refNames.data.organization.repository.pullRequests.edges)
  ) {
    refNames.data.organization.repository.pullRequests.edges.forEach(prEdge => {
      // console.log(prEdge);
      // console.log(prEdge.node.commits.edges[0]);
      if (
        prEdge &&
        prEdge.node &&
        prEdge.node.headRefName &&
        prEdge.node.commits &&
        Array.isArray(prEdge.node.commits.edges) &&
        prEdge.node.commits.edges[0] &&
        prEdge.node.commits.edges[0].node &&
        prEdge.node.commits.edges[0].node.commit &&
        prEdge.node.commits.edges[0].node.commit.oid
      )
        refMap.set(
          prEdge.node.headRefName,
          prEdge.node.commits.edges[0].node.commit.oid
        );
    });
  }
  return refMap;
};

exports.deletableBranches = () => exports.remoteTrackingBranches();
// you are deletable if you are:
// not in an open PR

// to make sure all the remote tracking branches are on the remote of interest,
// we should also ask a question of the remote...with some git remote command
